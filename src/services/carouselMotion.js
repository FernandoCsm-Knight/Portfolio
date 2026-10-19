const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smootherstep = (value) => value * value * value * (value * (value * 6 - 15) + 10);

// Movimento angular compartilhado pelos cartões WebGL e pelos cartões HTML.
export function createCarouselMotion(count, reducedMotion = false) {
  let angle = 0;
  let transitionFrom = 0;
  let transitionTarget = 0;
  let transitionStart = 0;
  let transitionDuration = 0.75;
  let transitioning = false;
  let dragging = false;
  let dragStartAngle = 0;
  let lastDragTime = 0;
  let dragVelocity = 0;
  let angularVelocity = 0;
  let lastWheelTime = 0;
  const step = TAU / Math.max(1, count);

  function settle(time) {
    if (dragging || transitioning || count < 2) return;
    transitionFrom = angle;
    transitionTarget = Math.round(angle / step) * step;
    if (Math.abs(transitionTarget - angle) < 0.001) {
      angle = transitionTarget;
      return;
    }
    transitionStart = time;
    transitionDuration = 0.38;
    transitioning = true;
  }

  function navigate(direction, time = performance.now() / 1000) {
    if (count < 2 || dragging) return false;
    angularVelocity = 0;
    transitionFrom = angle;
    transitionTarget = angle - Math.sign(direction || 1) * step;
    transitionStart = time;
    transitionDuration = 0.75;
    transitioning = true;
    return true;
  }

  function beginDrag(time = performance.now() / 1000) {
    if (count < 2) return false;
    transitioning = false;
    angularVelocity = 0;
    dragVelocity = 0;
    dragging = true;
    dragStartAngle = angle;
    lastDragTime = time;
    return true;
  }

  function dragBy(distance, viewportWidth, time = performance.now() / 1000) {
    if (!dragging) return false;
    const nextAngle = dragStartAngle + (distance / Math.max(1, viewportWidth)) * Math.PI * 1.2;
    if (Math.abs(nextAngle - angle) < 0.00001) return true;
    const elapsed = time - lastDragTime;
    if (elapsed > 0) dragVelocity = clamp((nextAngle - angle) / elapsed, -14, 14);
    angle = nextAngle;
    lastDragTime = time;
    return true;
  }

  function endDrag(distance, time = performance.now() / 1000, cancelled = false) {
    if (!dragging) return false;
    dragging = false;
    const moved = Math.abs(distance) >= 8;
    angularVelocity = !cancelled && moved && time - lastDragTime < 0.1 && !reducedMotion
      ? dragVelocity * 0.8
      : 0;
    if (Math.abs(angularVelocity) < 0.18) {
      angularVelocity = 0;
      settle(time);
    }
    return moved;
  }

  function spinWheel(delta, time = performance.now() / 1000) {
    if (count < 2) return false;
    if (reducedMotion) return navigate(Math.sign(delta), time);
    transitioning = false;
    dragging = false;
    angularVelocity = clamp(angularVelocity - delta * 0.06, -12, 12);
    lastWheelTime = time;
    return true;
  }

  function update(time, dt) {
    if (!dragging && !transitioning && Math.abs(angularVelocity) > 0) {
      angle += angularVelocity * dt;
      angularVelocity *= Math.exp(-3.5 * dt);
      if (Math.abs(angularVelocity) < 0.18 && time - lastWheelTime > 0.12) {
        angularVelocity = 0;
        settle(time);
      }
    }
    if (transitioning) {
      const duration = reducedMotion ? 0.01 : transitionDuration;
      const progress = clamp((time - transitionStart) / duration, 0, 1);
      angle = transitionFrom + (transitionTarget - transitionFrom) * smootherstep(progress);
      if (progress >= 1) {
        angle = transitionTarget;
        transitioning = false;
      }
    }
    return angle;
  }

  return {
    get moving() { return dragging || transitioning || Math.abs(angularVelocity) > 0; },
    navigate, beginDrag, dragBy, endDrag, spinWheel, update,
  };
}
