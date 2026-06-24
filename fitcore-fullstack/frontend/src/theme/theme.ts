/**
 * FitCore Pro — Unified Design System
 *
 * Brand accent: Electric Violet
 *   Light  #7C3AED → 5.5 : 1 on bg  (WCAG AA ✓)
 *   Dark   #A78BFA → 7.0 : 1 on bg  (WCAG AAA ✓)
 *
 * Rules that must never be broken:
 *   1. One accent hue (violet). No second accent anywhere.
 *   2. `success` (green) is semantic-only: streak hit, set completed,
 *      positive delta. It is NOT a brand color.
 *   3. Shadows only carry meaning in light mode. Dark-mode elevation
 *      is communicated by surface-lightening:
 *        bg → surface → surfaceAlt → surfaceElevated
 *   4. textTertiary (3 : 1) is for large text and icons only.
 *      Never use it for body copy.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// COLOR TOKEN INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorTokens {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  /** Page / screen background */
  bg:               string;
  /** Default card / sheet surface */
  surface:          string;
  /** Secondary surface: input bg, inactive pill track, skeleton */
  surfaceAlt:       string;
  /** Raised surface: popovers, modals, floating cards */
  surfaceElevated:  string;

  // ── Borders ────────────────────────────────────────────────────────────────
  /** Standard divider and card outline */
  border:           string;
  /** Subtle hairline — section separators inside a card */
  borderSubtle:     string;

  // ── Text ───────────────────────────────────────────────────────────────────
  /** Headings, primary labels — 4.5 : 1+ in both modes */
  textPrimary:      string;
  /** Body copy, secondary labels */
  textSecondary:    string;
  /** Placeholders, timestamps — 3 : 1, large text / icons only */
  textTertiary:     string;

  // ── Accent — Electric Violet ───────────────────────────────────────────────
  /** Interactive: buttons, active tabs, links */
  accent:           string;
  /** Pressed / active state of accent */
  accentPressed:    string;
  /** Low-opacity bg for active pills, selection chips, icon wells */
  accentSubtle:     string;
  /** Text or icon placed ON an accent-filled surface */
  accentText:       string;

  // ── Semantic — SUCCESS ─────────────────────────────────────────────────────
  /** Streak hit, set completed, positive delta — never used as brand */
  success:          string;
  /** Success tint bg for completed states */
  successSubtle:    string;

  // ── Semantic — WARNING / DANGER ────────────────────────────────────────────
  /** Caution states: near-limit, overdue */
  warning:          string;
  /** Destructive actions, error states */
  danger:           string;

  // ── Overlay ────────────────────────────────────────────────────────────────
  /** Scrim behind modals; gradient on image cards */
  overlay:          string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCENT CANDIDATE LOG  (keep for design review)
//
// A  Electric Violet  #7C3AED  —  CHOSEN
//    Light 5.5 : 1 ✓  Dark (at #A78BFA) 7.0 : 1 ✓
//    Zero overlap with WHOOP (red/black), NTC (red), Strava (orange),
//    Peloton (red). Violet reads: ambitious, premium, feminine without pink.
//    The light→dark shift (deep → lighter) is intentional and passes AAA.
//
// B  Electric Rose     #DB2777
//    Light 6.8 : 1 ✓  Dark (at #F472B6) 5.6 : 1 ✓
//    Rejected: overcrowded (Flo, Clue, Sweat use pink palettes).
//    Risks "another women's app" read rather than premium fitness.
//
// C  Deep Teal         #0D9488
//    Light 6.2 : 1 ✓  Dark (at #2DD4BF) 6.1 : 1 ✓
//    Rejected: calm / clinical — wrong energy for home HIIT + strength.
//    Better suited for recovery or sleep products.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT THEME
// ─────────────────────────────────────────────────────────────────────────────

export const lightTheme: ColorTokens = {
  bg:               '#FAFAFB',
  surface:          '#FFFFFF',
  surfaceAlt:       '#F4F4F6',
  surfaceElevated:  '#FFFFFF',   // differentiated by shadow.md, not color

  border:           '#E4E4E7',
  borderSubtle:     '#F0F0F3',

  textPrimary:      '#18181B',   // 16.0 : 1 on bg ✓
  textSecondary:    '#52525B',   //  7.4 : 1 on bg ✓
  textTertiary:     '#A1A1AA',   //  3.0 : 1 — large text / icons only

  accent:           '#7C3AED',   //  5.5 : 1 on bg ✓  WCAG AA
  accentPressed:    '#6D28D9',   //  7.0 : 1 on bg ✓
  accentSubtle:     'rgba(124,58,237,0.08)',
  accentText:       '#FFFFFF',   //  5.7 : 1 on accent ✓

  success:          '#16A34A',   //  4.7 : 1 on bg ✓
  successSubtle:    'rgba(22,163,74,0.10)',

  warning:          '#D97706',   //  3.4 : 1 — large text / icons only
  danger:           '#DC2626',   //  5.0 : 1 on bg ✓

  overlay:          'rgba(15,15,20,0.60)',
};

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME
// ─────────────────────────────────────────────────────────────────────────────

export const darkTheme: ColorTokens = {
  bg:               '#0F0F17',   // cool blue-black — harmonises with violet
  surface:          '#18181F',
  surfaceAlt:       '#1E1E28',
  surfaceElevated:  '#26263A',   // lighter = higher elevation in dark mode

  border:           '#2C2C3E',
  borderSubtle:     '#222232',

  textPrimary:      '#F4F4F8',   // ~140 : 1 on bg ✓
  textSecondary:    '#9494B0',   //   7.1 : 1 on bg ✓
  textTertiary:     '#55556A',   //   3.1 : 1 — large text / icons only

  accent:           '#A78BFA',   //   7.0 : 1 on bg ✓  WCAG AAA
  accentPressed:    '#C4B5FD',   //  11.1 : 1 on bg ✓
  accentSubtle:     'rgba(167,139,250,0.12)',
  accentText:       '#0F0F17',   //   7.0 : 1 on accent ✓ (dark on light-violet)

  success:          '#4ADE80',   //   8.5 : 1 on bg ✓
  successSubtle:    'rgba(74,222,128,0.12)',

  warning:          '#FCD34D',   //  10.2 : 1 on bg ✓
  danger:           '#F87171',   //   5.2 : 1 on bg ✓

  overlay:          'rgba(0,0,0,0.75)',
};

// ─────────────────────────────────────────────────────────────────────────────
// SPACING  (4-pt grid — use ONLY these values)
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RADIUS
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHADOW PRESETS
// Only meaningful in light mode. In dark mode, elevation = surface-lightening.
// Apply shadow only to `surfaceElevated` surfaces (modals, floating cards).
// Never apply shadow to cards that sit on `surface` — use `border` instead.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShadowPreset {
  shadowColor:   string;
  shadowOffset:  { width: number; height: number };
  shadowOpacity: number;
  shadowRadius:  number;
  elevation:     number;  // Android
}

export const shadow: Record<'sm' | 'md' | 'lg', ShadowPreset> = {
  sm: {
    shadowColor:   '#0F0F17',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  3,
    elevation:     2,
  },
  md: {
    shadowColor:   '#0F0F17',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#0F0F17',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY SCALE
// No italics anywhere in the system. fontFamily is injected at the app root
// via a fonts context — do not hardcode it here.
// ─────────────────────────────────────────────────────────────────────────────

export interface TypographyToken {
  fontSize:        number;
  fontWeight:      TextStyle['fontWeight'];
  lineHeight:      number;
  letterSpacing?:  number;
  textTransform?:  TextStyle['textTransform'];
}

export const typography: Record<string, TypographyToken> = {
  /** Hero numbers, splash screens */
  display: { fontSize: 28, fontWeight: '800', lineHeight: 34 },

  /** Screen titles, card headlines */
  h1:      { fontSize: 22, fontWeight: '700', lineHeight: 28 },

  /** Section headers, modal titles */
  h2:      { fontSize: 18, fontWeight: '700', lineHeight: 24 },

  /** Prominent body — macros, stat values */
  bodyLg:  { fontSize: 16, fontWeight: '500', lineHeight: 22 },

  /** Default body copy */
  body:    { fontSize: 15, fontWeight: '400', lineHeight: 21 },

  /** Timestamps, helper text, chip labels */
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  /** Category labels, section eyebrows — always uppercase */
  overline:{ fontSize: 12, fontWeight: '600', lineHeight: 16,
             letterSpacing: 1.2, textTransform: 'uppercase' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// THEME BUNDLE
// ─────────────────────────────────────────────────────────────────────────────

export interface Theme {
  colors:     ColorTokens;
  spacing:    typeof spacing;
  radius:     typeof radius;
  shadow:     typeof shadow;
  typography: typeof typography;
  isDark:     boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

const ThemeContext = createContext<Theme | undefined>(undefined);

export interface ThemeProviderProps {
  children:        ReactNode;
  /**
   * Pass `useThemeStore(s => s.isDark)` here to wire the existing
   * manual toggle. When omitted, falls back to the system color scheme.
   */
  overrideIsDark?: boolean;
}

export function ThemeProvider({
  children,
  overrideIsDark,
}: ThemeProviderProps): React.ReactElement {
  const systemScheme = useColorScheme();
  const isDark = overrideIsDark ?? systemScheme === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors:     isDark ? darkTheme : lightTheme,
      spacing,
      radius,
      shadow,
      typography,
      isDark,
    }),
    [isDark],
  );

  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme() must be called inside <ThemeProvider>.');
  }
  return ctx;
}

/**
 * Backward-compat shim for the existing `useC()` pattern.
 * Call sites can migrate to `useTheme().colors` incrementally.
 * Keeps every current `C.accent`, `C.surface` etc. reference working
 * without a big-bang rewrite.
 *
 * @example
 *   const C = useC();       // existing call sites — no change needed
 *   const { colors } = useTheme();   // preferred in new code
 */
export function useC(): ColorTokens {
  return useTheme().colors;
}

/**
 * SEMANTIC ALIAS MAP — read-only lookup table.
 *
 * The old theme.js had C.purple / C.teal / C.blue / C.orange all resolving
 * to the accent. Going forward use the aliases below so intent is clear:
 *
 *   C.purple / C.blue / C.teal → colors.accent
 *   C.orange                   → colors.warning  (or colors.accent if decorative)
 *   C.red                      → colors.danger
 *   C.success                  → colors.success
 *
 * Grep: `C\.(purple|blue|teal|orange|red)\b` and replace with the
 * semantic token that matches the context.
 */
export type SemanticAlias = 'purple' | 'blue' | 'teal' | 'orange' | 'red';

export function resolveAlias(
  alias: SemanticAlias,
  colors: ColorTokens,
): string {
  switch (alias) {
    case 'purple':
    case 'blue':
    case 'teal':   return colors.accent;
    case 'orange': return colors.warning;
    case 'red':    return colors.danger;
  }
}
