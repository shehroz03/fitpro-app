import { Dimensions, PixelRatio } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Base design size (standard Android/iPhone mid-range ~390pt wide)
const BASE_W = 390;
const BASE_H = 844;

// Scale a size proportionally to screen width
export const rw = (size) => Math.round((W / BASE_W) * size);

// Scale height proportionally
export const rh = (size) => Math.round((H / BASE_H) * size);

// Moderate scale for fonts — doesn't grow too much on large phones
// factor=0.45 means 45% of the difference is applied (gentler scaling)
export const rf = (size, factor = 0.45) => {
  const scaled = size + (rw(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

// Spacing scale (for padding/margin) — slightly more aggressive than fonts
export const rs = (size) => {
  const scaled = size + (rw(size) - size) * 0.6;
  return Math.round(scaled);
};

export const SCREEN_W = W;
export const SCREEN_H = H;

// Is this a small phone (< 360px)? e.g. older budget Androids
export const IS_SMALL = W < 360;

// Is this a tablet / large phone (> 420px)?
export const IS_LARGE = W > 420;
