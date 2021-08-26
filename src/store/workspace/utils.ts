import { mat4, vec3, vec4 } from 'gl-matrix';

const noAllocPos = vec4.create();
const noAllocPos3 = vec3.create();
const WorldToClip = mat4.create();
const ClipToWorld = mat4.create();
const ScreenToClip = mat4.create();
const ClipToScreen = mat4.create();

export function calculateMatrices(
  width: number,
  height: number,
  cameraZoom: number,
  cameraX: number,
  cameraY: number
) {
  const aspectRatio = width / height;
  mat4.ortho(
    WorldToClip,
    -aspectRatio / cameraZoom,
    aspectRatio / cameraZoom,
    -1 / cameraZoom,
    1 / cameraZoom,
    -1,
    1
  );
  noAllocPos3[0] = -cameraX;
  noAllocPos3[1] = -cameraY;
  noAllocPos3[2] = 0;
  mat4.translate(WorldToClip, WorldToClip, noAllocPos3);
  mat4.invert(ClipToWorld, WorldToClip);
  mat4.ortho(ScreenToClip, 0, width, height, 0, -1, 1);
  mat4.invert(ClipToScreen, ScreenToClip);

  return {
    worldToClip: WorldToClip,
    clipToWorld: ClipToWorld,
    screenToClip: ScreenToClip,
    clipToScreen: ClipToScreen,
  };
}

export function transformPosition(
  x: number,
  y: number,
  m1: mat4,
  m2: mat4
): [number, number] {
  noAllocPos[0] = x;
  noAllocPos[1] = y;
  noAllocPos[2] = 0;
  noAllocPos[3] = 1;
  vec4.transformMat4(noAllocPos, noAllocPos, m1);
  vec4.transformMat4(noAllocPos, noAllocPos, m2);
  return [noAllocPos[0], noAllocPos[1]];
}
