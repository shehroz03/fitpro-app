// Imperative singleton — lets any screen trigger a theme ripple without prop drilling
let _trigger = null;

export function _registerThemeTrigger(fn) {
  _trigger = fn;
}

export function triggerThemeTransition(x, y, rippleColor, onPeak) {
  if (_trigger) {
    _trigger(x, y, rippleColor, onPeak);
  } else {
    // Overlay not mounted yet — just switch immediately
    onPeak?.();
  }
}
