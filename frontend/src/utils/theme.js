import { useThemeStore } from '../store/themeStore';

export const DARK = {
  bg:        '#0A0A0F',
  card:      '#111118',
  card2:     '#16161F',
  border:    '#1E1E2A',
  accent:    '#C8F135',
  accentDim: 'rgba(200,241,53,0.15)',
  text:      '#FFFFFF',
  muted:     '#8A8A9A',
  dim:       '#55556A',
  red:       '#FF453A',
  blue:      '#4D8DFF',
  purple:    '#9B6DFF',
  orange:    '#FF8C42',
  teal:      '#2FCFA0',
};

export const LIGHT = {
  bg:        '#F2F4F8',
  card:      '#FFFFFF',
  card2:     '#F0F3F8',
  border:    '#DEE3ED',
  accent:    '#5E7800',
  accentDim: 'rgba(94,120,0,0.12)',
  text:      '#0D0D14',
  muted:     '#52526A',
  dim:       '#8888A0',
  red:       '#D42B28',
  blue:      '#1F5FD4',
  purple:    '#6425E5',
  orange:    '#C45000',
  teal:      '#0A7A59',
};

// Static dark reference for backward compat (module-level StyleSheets that haven't been migrated)
export const C = DARK;

export function useC() {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? DARK : LIGHT;
}

export const FONTS = {
  regular: 'DM-Sans',
  bold:    'DM-Sans-Bold',
  black:   'Barlow-Condensed',
};
