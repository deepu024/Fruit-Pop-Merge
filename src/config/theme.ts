/** UI + world colors. Fruit colors live in src/game/fruits.ts. */
export const theme = {
  // Background gradient slowly cycles between these two palettes.
  bgA: ['#FFE7C7', '#FFC4D6', '#C9B6FF'],
  bgB: ['#D7F5FF', '#FFD9EC', '#FFE9B8'],
  bubble: '#FFFFFF',
  jarGlass: 'rgba(255,255,255,0.22)',
  jarEdge: 'rgba(255,255,255,0.85)',
  jarShadow: 'rgba(80,40,120,0.18)',
  dangerLine: '#FF4D6D',
  guideLine: 'rgba(255,255,255,0.75)',
  text: '#4A2D5E',
  textLight: '#FFFFFF',
  accent: '#FF7AA2',
  accent2: '#7C5CFF',
  panel: 'rgba(255,255,255,0.94)',
  overlay: 'rgba(40,20,60,0.45)',
  gold: '#FFC23D',
  good: '#3DD68C',
};

export type Theme = typeof theme;
