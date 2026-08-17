export const colors = {
  ink: '#18332F',
  muted: '#6F7E79',
  cream: '#F7F3EC',
  surface: '#FFFFFF',
  line: '#E6E7E1',
  mint: '#C9F0DE',
  mintStrong: '#36A67C',
  blue: '#BDE9F3',
  blueStrong: '#2389A1',
  coral: '#FF826F',
  coralSoft: '#FFE0D9',
  yellow: '#FFD66B',
  yellowSoft: '#FFF1C5',
  lavender: '#DCD5FF',
  shadow: '#173D35',
} as const;

export const radii = { sm: 12, md: 18, lg: 26, pill: 999 } as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
} as const;
