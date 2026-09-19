"""Media storage behind a small interface so the backend (local disk today,
Backblaze B2 later) can be swapped without touching call sites.

Local implementation: files under UPLOAD_DIR, served back by the API at
/api/media/{name}. Names are random, so URLs are unguessable and uploads
can't collide or overwrite each other.
"""
import io
import logging
import os
import secrets

log = logging.getLogger("rangeday.storage")

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/srv/uploads")
MAX_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))  # 8 MB

# Pillow does the real validation: if it can't decode+re-encode it, it's
# not an image we accept. This also strips EXIF (incl. GPS) by re-saving.
try:
    from PIL import Image
    _PIL = True
except Exception:  # pragma: no cover
    _PIL = False

_EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}


class ImageError(ValueError):
    pass


def process_and_store(raw: bytes) -> tuple[str, str]:
    """Validate bytes as an image, strip metadata, downscale very large
    images, store, and return (public_name, mime). Raises ImageError."""
    if not _PIL:
        raise ImageError("Image processing unavailable on the server")
    if len(raw) > MAX_BYTES:
        raise ImageError(f"Image is too large (max {MAX_BYTES // (1024 * 1024)} MB)")
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()  # detect truncated/garbage
        img = Image.open(io.BytesIO(raw))  # reopen after verify()
        fmt = (img.format or "").upper()
    except Exception:
        raise ImageError("That file isn't a valid image")
    if fmt not in _EXT:
        raise ImageError("Use JPG, PNG, WEBP, or GIF")

    # Re-encode to strip EXIF/GPS and normalize. Animated GIFs pass through
    # as-is (first frame re-save would kill the animation); others get a
    # clean re-encode with no metadata.
    name = secrets.token_urlsafe(18)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    if fmt == "GIF" and getattr(img, "is_animated", False):
        out_name = name + ".gif"
        with open(os.path.join(UPLOAD_DIR, out_name), "wb") as f:
            f.write(raw)  # animated: keep original bytes (GIF carries no GPS)
        return out_name, "image/gif"

    # Downscale anything huge to keep the volume sane (max 2000px long edge)
    if max(img.size) > 2000:
        img.thumbnail((2000, 2000))

    if fmt in ("JPEG",):
        img = img.convert("RGB")
        out_name = name + ".jpg"
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88, optimize=True)  # no exif= → stripped
        mime = "image/jpeg"
    elif fmt == "PNG":
        out_name = name + ".png"
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        mime = "image/png"
    elif fmt == "WEBP":
        out_name = name + ".webp"
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=88)
        mime = "image/webp"
    else:  # non-animated GIF → PNG
        out_name = name + ".png"
        buf = io.BytesIO()
        img.convert("RGBA").save(buf, format="PNG", optimize=True)
        mime = "image/png"

    with open(os.path.join(UPLOAD_DIR, out_name), "wb") as f:
        f.write(buf.getvalue())
    return out_name, mime


def open_media(name: str) -> tuple[bytes, str] | None:
    # Guard against path traversal: names we mint have no slashes/dots-dirs.
    if "/" in name or "\\" in name or ".." in name:
        return None
    path = os.path.join(UPLOAD_DIR, name)
    if not os.path.isfile(path):
        return None
    ext = os.path.splitext(name)[1].lower()
    mime = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        return f.read(), mime


def delete_media(name: str) -> None:
    if not name or "/" in name or "\\" in name or ".." in name:
        return
    try:
        os.remove(os.path.join(UPLOAD_DIR, name))
    except OSError:
        pass
