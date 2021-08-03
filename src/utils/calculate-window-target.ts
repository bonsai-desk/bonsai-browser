// eslint-disable-next-line import/no-cycle
import WindowManager from './window-manager';

const glMatrix = require('gl-matrix');

export default function calculateWindowTarget(
  currentTime: number,
  lastTime: number,
  x: number,
  y: number,
  lastX: number,
  lastY: number,
  windowSize: { width: number; height: number },
  windowPosition: number[]
  // valid, hasVelocity, target vec2s
): [boolean, boolean, number[], number[]] {
  const deltaTime = currentTime - lastTime;
  const multiple = 1 / deltaTime;
  const augment = 0.75;
  const windowVelocity = glMatrix.vec2.fromValues(
    (x - lastX) * multiple * augment,
    (y - lastY) * multiple * augment
  );
  const maxSpeed = 5000;
  if (glMatrix.vec2.len(windowVelocity) > maxSpeed) {
    glMatrix.vec2.normalize(windowVelocity, windowVelocity);
    glMatrix.vec2.scale(windowVelocity, windowVelocity, maxSpeed);
  }

  const padding = 25;

  const targets = [
    glMatrix.vec2.fromValues(padding, padding),
    glMatrix.vec2.fromValues(
      WindowManager.display.activeDisplay.workAreaSize.width -
        windowSize.width -
        padding,
      padding
    ),
    glMatrix.vec2.fromValues(
      WindowManager.display.activeDisplay.workAreaSize.width -
        windowSize.width -
        padding,
      WindowManager.display.activeDisplay.workAreaSize.height -
        windowSize.height -
        padding
    ),
    glMatrix.vec2.fromValues(
      padding,
      WindowManager.display.activeDisplay.workAreaSize.height -
        windowSize.height -
        padding
    ),
  ];

  targets.forEach((target) => {
    target[0] += WindowManager.display.activeDisplay.workArea.x;
    target[1] += WindowManager.display.activeDisplay.workArea.y;
  });

  const toTargets = [
    glMatrix.vec2.create(),
    glMatrix.vec2.create(),
    glMatrix.vec2.create(),
    glMatrix.vec2.create(),
  ];

  const angles = [0, 0, 0, 0];

  const radToDeg = 180 / Math.PI;

  for (let i = 0; i < toTargets.length; i += 1) {
    glMatrix.vec2.sub(toTargets[i], targets[i], windowPosition);
    angles[i] = glMatrix.vec2.angle(windowVelocity, toTargets[i]) * radToDeg;
  }

  const indexOfClosestAngle = angles.indexOf(Math.min(...angles));
  let indexOfClosest = 0;
  let smallestSqrDist = 100000000;
  for (let i = 0; i < targets.length; i += 1) {
    const sqrDist = glMatrix.vec2.sqrDist(targets[i], windowPosition);
    if (sqrDist < smallestSqrDist) {
      smallestSqrDist = sqrDist;
      indexOfClosest = i;
    }
  }

  const target = glMatrix.vec2.create();
  const windowSpeed = glMatrix.vec2.len(windowVelocity);
  if (
    // typeof targetWindowPosition !== 'undefined' &&
    typeof targets[indexOfClosest] !== 'undefined' &&
    typeof targets[indexOfClosestAngle] !== 'undefined'
  ) {
    if (windowSpeed < 750 || angles[indexOfClosestAngle] > 91) {
      // eslint-disable-next-line prefer-destructuring
      target[0] = targets[indexOfClosest][0];
      // eslint-disable-next-line prefer-destructuring
      target[1] = targets[indexOfClosest][1];

      return [true, false, target, windowVelocity];
    }

    // eslint-disable-next-line prefer-destructuring
    target[0] = targets[indexOfClosestAngle][0];
    // eslint-disable-next-line prefer-destructuring
    target[1] = targets[indexOfClosestAngle][1];

    return [true, true, target, windowVelocity];
  }

  return [false, false, [0, 0], [0, 0]];
}
