import assert from "node:assert/strict";
import test from "node:test";
import { idleActivityEvents, idleResetMs, installIdleReset } from "../js/idle-reset.js";

function fakeTarget() {
  const handlers = new Map();
  return {
    hidden: false,
    handlers,
    addEventListener(name, handler) { handlers.set(name, handler); },
    removeEventListener(name) { handlers.delete(name); }
  };
}

test("idle reset is five minutes and observes user activity", () => {
  assert.equal(idleResetMs, 300_000);
  assert.deepEqual([...idleActivityEvents], ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"]);
});

test("activity postpones reset until five idle minutes have elapsed", () => {
  const eventTarget = fakeTarget();
  const visibilityTarget = fakeTarget();
  let clock = 0;
  let scheduled;
  let resets = 0;
  const stop = installIdleReset(() => { resets += 1; }, {
    eventTarget,
    visibilityTarget,
    now: () => clock,
    setTimer: (callback, delay) => { scheduled = { callback, delay }; return scheduled; },
    clearTimer: () => {}
  });

  assert.equal(scheduled.delay, idleResetMs);
  clock = 299_000;
  eventTarget.handlers.get("pointermove")();
  clock = 300_000;
  scheduled.callback();
  assert.equal(resets, 0);
  assert.equal(scheduled.delay, 299_000);
  clock = 599_000;
  scheduled.callback();
  assert.equal(resets, 1);
  assert.equal(eventTarget.handlers.size, 0);
  stop();
});
