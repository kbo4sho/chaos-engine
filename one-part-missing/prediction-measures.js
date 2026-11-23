// A portal moves its load without traversing the space between its two mouths.
export function firstCross(path, axis, line, dir) {
  for (let t = 1; t < path.length; t++) {
    if (path[t][2]) continue;
    if ((path[t - 1][axis] - line) * dir < 0 && (path[t][axis] - line) * dir >= 0) return t;
  }
  return null;
}
