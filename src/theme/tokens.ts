/**
 * Design tokens — ported 1:1 from the v0.3 HTML mockup (the UX spec).
 * Three neutral graphite themes + a selectable accent overlay.
 *
 * Anything added here should exist in the mockup first, or be flagged
 * as a divergence in the PR description.
 */

export type ThemeName = 'dark' | 'moderate' | 'light';
export type AccentName =
  | 'blue'
  | 'red'
  | 'orange'
  | 'green'
  | 'violet'
  | 'teal'
  | 'brass';

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  muted: string;
  shadow: string;
  /** Zone / result colors (USPSA-style scoring) */
  alpha: string;
  charlie: string;
  delta: string;
  miss: string;
  /** Target cardboard tones */
  tgtD: string;
  tgtC: string;
  tgtA: string;
  tgtLine: string;
}

export interface AccentColors {
  accent: string;
  accentDim: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  dark: {
    bg: '#101214',
    surface: '#191C1F',
    surface2: '#22262A',
    line: '#32383E',
    ink: '#E8EAED',
    muted: '#8B939C',
    shadow: 'rgba(0,0,0,0.5)',
    alpha: '#4CAF6D',
    charlie: '#D9A93B',
    delta: '#DB6B3B',
    miss: '#D14840',
    tgtD: '#8f7f66',
    tgtC: '#a08e6e',
    tgtA: '#b29d77',
    tgtLine: '#0c0b09',
  },
  moderate: {
    bg: '#2E3236',
    surface: '#383D42',
    surface2: '#43494F',
    line: '#545C64',
    ink: '#EFF1F3',
    muted: '#A9B1BA',
    shadow: 'rgba(0,0,0,0.35)',
    // Zone colors inherit the dark values in the mockup
    alpha: '#4CAF6D',
    charlie: '#D9A93B',
    delta: '#DB6B3B',
    miss: '#D14840',
    tgtD: '#98876c',
    tgtC: '#a89673',
    tgtA: '#b9a37c',
    tgtLine: '#181510',
  },
  light: {
    bg: '#F2F3F5',
    surface: '#FFFFFF',
    surface2: '#E9EBEF',
    line: '#D3D8DE',
    ink: '#1E2226',
    muted: '#6E7681',
    shadow: 'rgba(30,40,50,0.14)',
    alpha: '#2E8B4F',
    charlie: '#A97E12',
    delta: '#BC4F1E',
    miss: '#B4342C',
    tgtD: '#cdb691',
    tgtC: '#bda57e',
    tgtA: '#a78e64',
    tgtLine: '#453b28',
  },
};

export const ACCENTS: Record<AccentName, AccentColors> = {
  blue: { accent: '#3D7DDB', accentDim: '#2E5FA8' },
  red: { accent: '#D64545', accentDim: '#A83636' },
  orange: { accent: '#E07B39', accentDim: '#B45F2A' },
  green: { accent: '#3BA26B', accentDim: '#2C7D52' },
  violet: { accent: '#8A63E8', accentDim: '#6A4BB8' },
  teal: { accent: '#2FA6A0', accentDim: '#23807B' },
  brass: { accent: '#C79A3B', accentDim: '#99762D' },
};

/**
 * The hit-factor readout is a shot timer: always a dark LED panel,
 * even in the light theme. These are theme-independent by design.
 */
export const READOUT = {
  bg: '#101208',
  line: '#2b2f24',
  digits: '#FFB03B',
  label: '#7d8270',
  sub: '#a8ad99',
  voidTag: '#ff5c47',
  voidDigits: '#3d4034',
} as const;

/**
 * Type roles. Load these families in the root layout before rendering.
 * display  → structure: headings, nav, buttons (condensed, uppercase)
 * digits   → scores, timers, round counts
 * body     → system default (matches the mockup's -apple-system stack)
 */
export const FONTS = {
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_500Medium',
  digits: 'ShareTechMono_400Regular',
} as const;

/** Sharp radius scale from the mockup's design pass */
export const RADII = {
  card: 6,
  control: 4,
  pill: 3,
  bar: 2,
  modalTop: 10,
} as const;

export const SPACING = {
  screen: 18,
  cardPad: 14,
  gap: 10,
} as const;
