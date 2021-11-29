import { Display } from 'electron';
import { vec2 } from 'gl-matrix';

export const floatingWindowEdgeMargin = 25;

export default function calculateWindowTarget(
  currentTime: number,
  lastTime: number,
  x: number,
  y: number,
  lastX: number,
  lastY: number,
  windowSize: { width: number; height: number },
  windowPosition: vec2,
  activeDisplay: Display
  // valid, hasVelocity, target vec2s
): [boolean, boolean, vec2, vec2] {
  const deltaTime = currentTime - lastTime;
  const multiple = 1 / deltaTime;
  const augment = 0.75;
  const windowVelocity = vec2.fromValues(
    (x - lastX) * multiple * augment,
    (y - lastY) * multiple * augment
  );
  const maxSpeed = 5000;
  if (vec2.len(windowVelocity) > maxSpeed) {
    vec2.normalize(windowVelocity, windowVelocity);
    vec2.scale(windowVelocity, windowVelocity, maxSpeed);
  }

  const padding = floatingWindowEdgeMargin;

  const targets = [
    vec2.fromValues(padding, padding),
    vec2.fromValues(
      activeDisplay.workAreaSize.width - windowSize.width - padding,
      padding
    ),
    vec2.fromValues(
      activeDisplay.workAreaSize.width - windowSize.width - padding,
      activeDisplay.workAreaSize.height - windowSize.height - padding
    ),
    vec2.fromValues(
      padding,
      activeDisplay.workAreaSize.height - windowSize.height - padding
    ),
  ];

  targets.forEach((target) => {
    target[0] += activeDisplay.workArea.x;
    target[1] += activeDisplay.workArea.y;
  });

  const toTargets = [
    vec2.create(),
    vec2.create(),
    vec2.create(),
    vec2.create(),
  ];

  const angles = [0, 0, 0, 0];

  const radToDeg = 180 / Math.PI;

  for (let i = 0; i < toTargets.length; i += 1) {
    vec2.sub(toTargets[i], targets[i], windowPosition);
    angles[i] = vec2.angle(windowVelocity, toTargets[i]) * radToDeg;
  }

  const indexOfClosestAngle = angles.indexOf(Math.min(...angles));
  let indexOfClosest = 0;
  let smallestSqrDist = 100000000;
  for (let i = 0; i < targets.length; i += 1) {
    const sqrDist = vec2.sqrDist(targets[i], windowPosition);
    if (sqrDist < smallestSqrDist) {
      smallestSqrDist = sqrDist;
      indexOfClosest = i;
    }
  }

  const target = vec2.create();
  const windowSpeed = vec2.len(windowVelocity);
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
