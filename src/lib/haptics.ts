function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

/** A short, discrete tick for state changes (drag pickup/drop, chip/toggle switches). */
export function tick() {
  vibrate(10);
}

/** A slightly longer pulse for a completed action (e.g. reorder committed). */
export function success() {
  vibrate([10, 30, 10]);
}
