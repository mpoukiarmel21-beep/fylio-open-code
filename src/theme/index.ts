// Direction artistique Fylio — valeurs issues des maquettes + fylio_glass_ui_kit + glass-nav-kit
export const C = {
  g1: '#2E90FA', g2: '#155DFB',
  ink: '#0A3A8A', ink2: '#10145D', mute: '#7A8FB8', accent: '#087CFF',
  green: '#1DBA6B', green2: '#54ffbd', orange: '#F59E0B', red: '#EF4444', white: '#FFFFFF',
  // bouton bleu vitré (kit)
  glassBlue: ['rgba(0,225,255,.92)', 'rgba(0,155,255,.98)', 'rgba(0,101,244,.97)', 'rgba(11,82,222,.96)'] as const,
  glassBlueLoc: [0, 0.42, 0.72, 1] as const,
  glassBlueBorder: 'rgba(170,249,255,.78)', glow: '#00E1FF',
  // verre blanc (cartes)
  glassWhite: ['rgba(255,255,255,.80)', 'rgba(228,246,255,.58)'] as const,
  glassWhiteBorder: 'rgba(255,255,255,.85)',
  // verre sur fonds foncés (Nebula 1-3)
  glassDeep: ['rgba(255,255,255,.26)', 'rgba(255,255,255,.12)'] as const,
  glassDeepBorder: 'rgba(255,255,255,.45)',
  dim: 'rgba(6,24,66,.66)',
};
export const R = { pill: 28, card: 20, cardLg: 24, nav: 34, chip: 14 };
export const F = {
  title: 'Outfit_700Bold', titleX: 'Outfit_800ExtraBold',
  body: 'Manrope_500Medium', bodyB: 'Manrope_700Bold', bodyX: 'Manrope_800ExtraBold',
};
export const S = { pad: 20, padTight: 8, gap: 10 };
export const Fonts = {
  Outfit_700Bold: require('@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf'),
  Outfit_800ExtraBold: require('@expo-google-fonts/outfit/800ExtraBold/Outfit_800ExtraBold.ttf'),
  Manrope_500Medium: require('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
  Manrope_700Bold: require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
  Manrope_800ExtraBold: require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
};