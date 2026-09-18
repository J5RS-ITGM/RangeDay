import { Zone } from '@/store/types';

/**
 * Zone classification for the USPSA SVG target, done in code so tap
 * handling never depends on platform SVG hit-testing (which drops tap
 * coordinates on web). Coordinates are target space: the SVG's own
 * viewBox units, x 80..367 visible, y 0..447.
 *
 * Polygons approximate the artwork's paths; the small corner-rounding
 * radii (7-8.5 units ≈ a bullet hole) are treated as square corners.
 */

type Pt = [number, number];

// Cardboard silhouette (#target-outline)
const OUTLINE: Pt[] = [
  [174, 0], [273, 0], [273, 85.5], [323.5, 85.5], [359.5, 121.5],
  [359.5, 357], [313, 447], [133.5, 447], [87.5, 357], [87.5, 121.5],
  [122.5, 85.5], [174, 85.5],
];

// Dashed outer scoring boundary (#outer-scoring-boundary): inside = scoring
const SCORING: Pt[] = [
  [188, 6.5], [258.5, 6.5], [266.5, 14.5], [266.5, 92], [320.5, 92],
  [353, 124.5], [353, 354.5], [309, 440.5], [137.5, 440.5], [94, 354.5],
  [94, 125], [125.5, 92], [180, 92], [180, 14.5],
];

// Body C boundary (#c-zone-boundary, closed across the neck)
const C_BODY: Pt[] = [
  [179, 93.5], [268, 93.5], [305, 116], [309.5, 125], [309.5, 284.5],
  [307.5, 293.5], [280.5, 354], [167.5, 354], [139.5, 293.5],
  [137.5, 284.5], [137.5, 125], [142, 115.5],
];

// Head scoring region (upper block of SCORING, down to the neck line)
const HEAD: Pt[] = [
  [180, 6.5], [266.5, 6.5], [266.5, 92], [180, 92],
];

const HEAD_A = { x1: 194, y1: 20.5, x2: 253, y2: 51.5 };
const BODY_A = { x1: 180, y1: 122, x2: 266.5, y2: 284.5 };

function inRect(x: number, y: number, r: { x1: number; y1: number; x2: number; y2: number }): boolean {
  return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
}

/** Ray-casting point-in-polygon */
export function inPolygon(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Classify a tap. Returns the zone, or null when the tap misses the
 * cardboard entirely (dead space around the target — ignored).
 * Cardboard outside the dashed boundary is the non-scoring border: miss.
 */
export function classifyHit(x: number, y: number): Zone | null {
  if (inRect(x, y, HEAD_A) || inRect(x, y, BODY_A)) return 'A';
  if (inPolygon(x, y, HEAD)) return 'C';
  if (inPolygon(x, y, C_BODY)) return 'C';
  if (inPolygon(x, y, SCORING)) return 'D';
  if (inPolygon(x, y, OUTLINE)) return 'miss';
  return null;
}
