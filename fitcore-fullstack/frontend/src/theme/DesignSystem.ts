export const colors = {
  background: '#121212', // Deep Charcoal
  surface: '#1E1E1E', // Slightly lighter for cards
  surfaceLight: '#2C2C2C', // Even lighter for subtle elements
  textPrimary: '#FFFFFF', // Crisp White
  textSecondary: '#A0A0A0', // Muted Gray
  accentPrimary: '#B76E79', // Rose Gold
  accentSecondary: '#98FF98', // Soft Mint
  border: '#333333',
};

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 64,
};

export const typography = {
  headerHuge: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  headerLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
};

export const DesignSystem = {
  colors,
  spacing,
  typography,
};

export default DesignSystem;
