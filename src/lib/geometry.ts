// Re-exported here per the suggested project structure. The actual
// implementations live next to the seed data / easing constants they're
// derived from, since they're pure functions with no framework dependency.
export { roomW, roomH, desks } from '../model/seed';
export { cl, lerp, outBack, outCubic, inOutSine, inOutCubic, NOW, FR } from '../model/constants';
