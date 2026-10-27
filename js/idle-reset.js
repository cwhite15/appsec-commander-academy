export const idleResetMs = 5 * 60 * 1000;
export const idleActivityEvents = Object.freeze(["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"]);

export function installIdleReset(onIdle, options = {}) {
  if (typeof onIdle !== "function") throw new TypeError("onIdle must be a function");

  const eventTarget = options.eventTarget ?? window;
  const visibilityTarget = options.visibilityTarget ?? document;
  const now = options.now ?? (() => Date.now());
  const setTimer = options.setTimer ?? ((callback, delay) => window.setTimeout(callback, delay));
  const clearTimer = options.clearTimer ?? ((timer) => window.clearTimeout(timer));
  const timeoutMs = options.timeoutMs ?? idleResetMs;
  let lastActivity = now();
  let timer = null;
  let stopped = false;

  const noteActivity = () => { lastActivity = now(); };

  function stop() {
    if (stopped) return;
    stopped = true;
    if (timer !== null) clearTimer(timer);
    idleActivityEvents.forEach((eventName) => eventTarget.removeEventListener(eventName, noteActivity));
    visibilityTarget.removeEventListener("visibilitychange", checkVisibility);
  }

  function check() {
    if (stopped) return;
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    const remaining = timeoutMs - (now() - lastActivity);
    if (remaining <= 0) {
      stop();
      onIdle();
      return;
    }
    timer = setTimer(check, remaining);
  }

  function checkVisibility() {
    if (!visibilityTarget.hidden) check();
  }

  idleActivityEvents.forEach((eventName) => eventTarget.addEventListener(eventName, noteActivity, { passive: true }));
  visibilityTarget.addEventListener("visibilitychange", checkVisibility);
  timer = setTimer(check, timeoutMs);
  return stop;
}
