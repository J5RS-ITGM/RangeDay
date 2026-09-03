# Range Day

Training companion for competitive shooters and law enforcement. Drill library,
tap-to-score USPSA-style scoring, pre-planned range sessions, armory tracking,
and analytics — offline-first, synced to Supabase.

> **Name status:** "Range Day" is the working name and is still subject to
> change. `app.json` deliberately does **not** set `ios.bundleIdentifier` or
> `android.package` — those become effectively permanent at first store
> submission. Set them only when the name is final.

## Status — v0.2: full mockup port on mock data

Every screen from the v0.3 HTML mockup is ported to React Native with the same
seeded data, so the app is populated on first launch:

- Home dashboard · Profile (2 profiles per account, switcher in the header)
- Contacts · Armory (firearms / equipment / maintenance, service-due alerts)
- Sessions: list → editor (clone-on-edit for built-ins) → at-the-range checklist
- Drills: library + community catalog, search/filter/sort, publish → review queue
- **Scoring**: tap-to-score SVG target, counter chips, quick-fill, LED readout,
  run-complete flow (again / next drill / finish / analytics)
- Analytics · History (runs / sessions) · scoped stats · Compare
- Community feed · Admin moderation · Settings (themes, accents, account switch demo)

**Verified in CI-like conditions against Expo SDK 54:** `tsc --strict` clean,
web bundle exports, and the Android bundle compiles to Hermes bytecode (`.hbc`).

What's mock: the store in `src/store/MockStore.tsx` is in-memory. Visibility
(`canSee`) is simulated client-side. Nothing persists across app restarts
except theme/accent. That's the M1/M2 work:

- [ ] M1: Supabase Auth, profiles, RLS policies + RLS test suite ← **next**
- [ ] M2: SQLite run store + sync queue (offline-first), scoring unit tests
- [ ] M3: dictation via OS keyboard mic, analytics polish (**MVP line**)

## Getting started

Dependencies are **pinned to Expo SDK 54** (matches Expo Go on the Play Store /
expo.dev/go). Use `npm ci`, not `npm install`, so the lockfile is respected.

```powershell
npm ci
npx expo start -c
```

Then press `a` (USB-connected Android with adb) or scan the QR with Expo Go
(SDK 54), or `w` for the browser.

Do **not** add `babel.config.js` or install `babel-preset-expo` directly —
SDK 54 resolves the correct preset itself. A mismatched preset is what produced
`SyntaxError: private properties are not supported` on-device.

## Project structure

```
app/
  _layout.tsx            Root Stack: fonts, Theme/Store/Toast providers
  (drawer)/              Drawer navigator + the 11 main screens
  score.tsx              Scoring screen (drillId, sessId params)
  session-edit.tsx       Session editor (clone-on-edit)
  session-run.tsx        At-the-range checklist
  scoped.tsx             Stats scoped to one drill or one session instance
  compare.tsx            Two-run / two-session comparison
src/
  theme/tokens.ts        Design tokens — single source of truth (from the mockup)
  theme/ThemeContext.tsx Persisted theme + accent
  store/types.ts         Domain types (shaped for the Supabase schema)
  store/seed.ts          Seeded mock data (identical to the mockup)
  store/MockStore.tsx    In-memory store + all actions; canSee() rehearsal
  lib/scoring.ts         Pure scoring math: zone points, hit factor, quick fill
  lib/sessions.ts        Session grouping
  components/            UI primitives, Target, Runs (RunCard/HfChart/Readout),
                         Sheet (modals + schema-driven add form), Toast, Icons
```

## Engineering rules (from the construction plan)

- **RLS is the security model.** The client is untrusted; `canSee()` here is a
  rehearsal. Production visibility comes from Postgres policies.
- **Offline-first from M2.** Writes land in SQLite with a pending flag; a
  background task flushes to Supabase; reads prefer local.
- **Test the math.** `src/lib/scoring.ts` is pure functions; unit tests land in M2.
- **Append-only runs.** Saved runs never mutate; corrections supersede.
