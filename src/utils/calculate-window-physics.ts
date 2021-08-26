import WindowManager from './window-manager';
import { clamp } from './utils';

const glMatrix = require('gl-matrix');

export default function windowFixedUpdate(
  wm: WindowManager,
  deltaTime: number,
  floatingWidth: number,
  floatingHeight: number
) {
  const shouldCalculatePhysics =
    wm.windowFloating && !wm.movingWindow && wm.mainWindow !== null;
  if (!shouldCalculatePhysics) {
    return;
  }

  const padding = 25;

  if (
    Math.round(wm.windowPosition[0]) ===
      Math.round(
        wm.display.workAreaSize.width / 2.0 -
          floatingWidth / 2.0 +
          wm.display.workArea.x
      ) &&
    Math.round(wm.windowPosition[1]) ===
      Math.round(
        wm.display.workAreaSize.height / 2.0 -
          floatingHeight / 2.0 +
          wm.display.workArea.y
      )
  ) {
    return;
  }

  const up = wm.windowPosition[1];
  const down =
    wm.display.workAreaSize.height -
    (wm.windowPosition[1] + wm.windowSize.height);
  const left = wm.windowPosition[0];
  const right =
    wm.display.workAreaSize.width -
    (wm.windowPosition[0] + wm.windowSize.width);

  const distance = glMatrix.vec2.distance(
    wm.windowPosition,
    wm.targetWindowPosition
  );
  const distanceScaled = Math.min(
    distance / (wm.display.workAreaSize.width / 3),
    1
  );
  const distanceScaledOpposite = 1 - distanceScaled;
  const moveTowardsThreshold = wm.display.workAreaSize.height * 0.005;
  const moveTowardsSpeedThreshold = 100;
  const windowSpeed = glMatrix.vec2.len(wm.windowVelocity);
  if (
    distance < moveTowardsThreshold &&
    windowSpeed < moveTowardsSpeedThreshold
  ) {
    wm.windowVelocity[0] = 0;
    wm.windowVelocity[1] = 0;
  } else {
    // calculate vector pointing towards target position
    const towardsTarget = glMatrix.vec2.create();
    glMatrix.vec2.sub(
      towardsTarget,
      wm.targetWindowPosition,
      wm.windowPosition
    );
    glMatrix.vec2.normalize(towardsTarget, towardsTarget);

    // apply drag
    const drag = Math.max(
      10 *
        (distanceScaledOpposite *
          distanceScaledOpposite *
          distanceScaledOpposite),
      1
    );
    let xDrag = drag;
    let yDrag = drag;

    // force to keep inside screen
    const springConstant = 100000;
    const maxSpring = 40000;
    const minEdgeDrag = 2;

    const screenOffsetX = wm.display.workArea.x;
    const screenOffsetY = wm.display.workArea.y;

    if (up < padding + screenOffsetY) {
      const dist =
        -(wm.windowPosition[1] - (padding + screenOffsetY)) /
        wm.display.workAreaSize.height;
      wm.windowVelocity[1] +=
        deltaTime * Math.min(dist * springConstant, maxSpring);
      if (wm.windowVelocity[1] > 0) {
        const edgeDrag = clamp(dist * wm.windowVelocity[1], minEdgeDrag, 10);
        yDrag = Math.max(yDrag, edgeDrag);
      }
      wm.windowVelocity[1] = Math.min(
        wm.windowVelocity[1],
        dist * dist * 1000 * 1000
      );
    }
    if (down < padding - screenOffsetY) {
      const bottomY = wm.windowPosition[1] + wm.windowSize.height;
      const dist =
        -(
          wm.display.workAreaSize.height -
          bottomY -
          (padding - screenOffsetY)
        ) / wm.display.workAreaSize.height;
      wm.windowVelocity[1] +=
        deltaTime * Math.min(-dist * springConstant, maxSpring);
      if (wm.windowVelocity[1] < 0) {
        const edgeDrag = clamp(dist * -wm.windowVelocity[1], minEdgeDrag, 10);
        yDrag = Math.max(yDrag, edgeDrag);
      }
      wm.windowVelocity[1] = Math.max(
        wm.windowVelocity[1],
        -dist * dist * 1000 * 1000
      );
    }
    if (left < padding + screenOffsetX) {
      const dist =
        -(wm.windowPosition[0] - (padding + screenOffsetX)) /
        wm.display.workAreaSize.height;
      wm.windowVelocity[0] +=
        deltaTime * Math.min(dist * springConstant, maxSpring);
      if (wm.windowVelocity[0] > 0) {
        const edgeDrag = clamp(dist * wm.windowVelocity[0], minEdgeDrag, 10);
        xDrag = Math.max(xDrag, edgeDrag);
      }
      wm.windowVelocity[0] = Math.min(
        wm.windowVelocity[0],
        dist * dist * 1000 * 1000
      );
    }
    if (right < padding - screenOffsetX) {
      const rightX = wm.windowPosition[0] + wm.windowSize.width;
      const dist =
        -(wm.display.workAreaSize.width - rightX - (padding - screenOffsetX)) /
        wm.display.workAreaSize.height;
      wm.windowVelocity[0] +=
        deltaTime * Math.min(-dist * springConstant, maxSpring);
      if (wm.windowVelocity[0] < 0) {
        const edgeDrag = clamp(dist * -wm.windowVelocity[0], minEdgeDrag, 10);
        xDrag = Math.max(xDrag, edgeDrag);
      }
      wm.windowVelocity[0] = Math.max(
        wm.windowVelocity[0],
        -dist * dist * 1000 * 1000
      );
    }

    wm.windowVelocity[0] *= 1 - deltaTime * xDrag;
    wm.windowVelocity[1] *= 1 - deltaTime * yDrag;

    if (windowSpeed < Math.max(distanceScaled * 3500, 500)) {
      // calculate force to target
      const forceToTarget = glMatrix.vec2.create();
      const force = Math.max(distanceScaled * 2500, 1500);
      glMatrix.vec2.scale(forceToTarget, towardsTarget, deltaTime * force);
      glMatrix.vec2.add(wm.windowVelocity, wm.windowVelocity, forceToTarget);
    }

    // apply velocity
    wm.windowPosition[0] += wm.windowVelocity[0] * deltaTime;
    wm.windowPosition[1] += wm.windowVelocity[1] * deltaTime;

    wm.windowSize.width = floatingWidth;
    wm.windowSize.height = floatingHeight;
    wm.updateMainWindowBounds();
  }
}
