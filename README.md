# Range Day

Training companion for competitive shooters and law enforcement. Drill library,
tap-to-score USPSA-style scoring, pre-planned range sessions, armory tracking,
and analytics — offline-first, synced to Supabase.

> **Name status:** "Range Day" is the working name and is still subject to
> change. Nothing permanent is committed yet: `app.json` deliberately does
> **not** set `ios.bundleIdentifier` or `android.package` — those become
> effectively permanent at first store submission (see the construction plan's
> Naming section). Set them only when the name is final.

## Status — M0 scaffold

- [x] Expo (React Native) + TypeScript, Expo Router
- [x] Theme system: 3 themes (light / moderate / dark) + 7 accent overlays,
      ported 1:1 from the v0.3 HTML mockup, persisted with AsyncStorage
- [x] Type roles: Barlow Condensed (display) + Share Tech Mono (digits)
- [x] Drawer navigation shell with the mockup's icon set (react-native-svg)
- [x] Settings screen with working theme/accent switchers
- [ ] M1: Supabase Auth, profiles, RLS test suite ← **next**
- [ ] M2: drill library, scoring screen, offline run store (MVP core loop)
- [ ] M3: sessions, notes, analytics (**MVP line**)

## Getting started

```bash
npm install
npx expo install --fix   # aligns all native deps to the installed Expo SDK
npm start                # then press w (web), i (iOS sim), or a (Android)
```

Dependency versions in `package.json` are intentionally unpinned (`*`) for the
first install; `npx expo install --fix` resolves them to the versions matched
to the current Expo SDK. After the first successful install, commit the
resolved `package.json` + lockfile so the team is pinned from then on.

Fastest phone testing before Apple credentials are sorted: `npm start`, then
scan the QR code with Expo Go, or open the web build on the phone browser.

## Project structure

```
app/
  _layout.tsx          Root: fonts, ThemeProvider, gesture root, splash
  (drawer)/
    _layout.tsx        Drawer navigator, themed header, profile pill (stub)
    index.tsx          Home — dashboard stat grid (placeholder data)
    settings.tsx       Working theme + accent switchers
    *.tsx              Placeholder screens labeled with their milestone
src/
  theme/
    tokens.ts          Design tokens — the single source of truth for color,
                       type roles, radii, spacing (ported from the mockup)
    ThemeContext.tsx   Provider + useTheme(), persisted appearance prefs
  components/
    Icons.tsx          Stroke icon set (mockup SVGs → react-native-svg)
    DrawerContent.tsx  Custom drawer matching the mockup nav
    UI.tsx             Screen, Card, Stat, SectionTitle, SubTitle primitives
```

## Engineering rules (from the construction plan)

- **RLS is the security model.** The client is untrusted; nothing is gated
  only in the UI. The drawer's admin-only entry is a rendering convenience —
  real enforcement is Postgres policies.
- **Offline-first from M2.** Writes land in SQLite with a pending flag; a
  background task flushes to Supabase; reads prefer local.
- **Test the math.** Scoring functions are pure and unit-tested before use.
- **Append-only runs.** Saved runs never mutate; corrections supersede.

## Design tokens

All colors, type roles, radii, and spacing live in `src/theme/tokens.ts` and
mirror the mockup's CSS variables. If a value needs to change, change it there
and in the mockup, or note the divergence — the mockup is the UX spec.

One deliberate exception to theming: the hit-factor readout (`READOUT` in
tokens) is always a dark LED shot-timer panel, even in the light theme.
