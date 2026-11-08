export type GameMode = 'classic' | 'daily';

export type Screen = { name: 'menu' } | { name: 'game'; mode: GameMode } | { name: 'collection' } | { name: 'settings' };

export type Navigate = (s: Screen) => void;
