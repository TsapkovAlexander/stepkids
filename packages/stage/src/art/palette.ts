import type { GridTheme, ItemColor } from '@stepkids/blocks';

/** Shared outline colour: soft dark brown reads friendlier than black. */
export const INK = '#3d2c29';

export interface ThemePalette {
  sky: string;
  tileA: string;
  tileB: string;
  board: string;
  boardShadow: string;
  trail: string;
  /** Round trees on sunny themes, pines in the forest. */
  tree: 'round' | 'pine' | 'palm' | 'snowy' | 'lollipop';
}

export const THEMES: Record<GridTheme, ThemePalette> = {
  meadow: {
    sky: '#d8f1ff',
    tileA: '#a4dc79',
    tileB: '#95d16a',
    board: '#6fae4a',
    boardShadow: '#4f8a33',
    trail: '#ffe07a',
    tree: 'round',
  },
  forest: {
    sky: '#dff3e2',
    tileA: '#8fcb85',
    tileB: '#80bf77',
    board: '#4f8f52',
    boardShadow: '#386d3b',
    trail: '#ffd166',
    tree: 'pine',
  },
  beach: {
    sky: '#d6f3ff',
    tileA: '#f9e3b0',
    tileB: '#f3d69b',
    board: '#d9b36b',
    boardShadow: '#b78f4a',
    trail: '#7fd3f7',
    tree: 'palm',
  },
  snow: {
    sky: '#e8f1ff',
    tileA: '#f4f8ff',
    tileB: '#e5eefb',
    board: '#9fb8dc',
    boardShadow: '#7b95bd',
    trail: '#8ec5ff',
    tree: 'snowy',
  },
  candy: {
    sky: '#fff0f7',
    tileA: '#ffd9ec',
    tileB: '#ffc9e3',
    board: '#f39cc7',
    boardShadow: '#d777a6',
    trail: '#b8f2e6',
    tree: 'lollipop',
  },
};

export const ITEM_COLOR_HEX: Record<ItemColor, { main: string; dark: string }> = {
  yellow: { main: '#ffcc33', dark: '#d99a00' },
  blue: { main: '#5ab8ff', dark: '#2a7fcf' },
  pink: { main: '#ff8fc2', dark: '#d65c95' },
};
