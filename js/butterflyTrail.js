// 地图只定义地形。每次起飞都解释孩子实际摆下的图块。
const ButterflyTrail = (() => {
  const levels = [
    ['>M'],
    ['>.M'],
    ['>.', '#M'],
    ['#M', '#.', '>.'],
    ['v#', '..', '#.', '#M'],
    ['>~.#', '##.#', '##.M'],
    ['v###M', '..~..'],
    ['##.<', '##~#', '...#', 'M###'],
    ['M~.#v', '##.#.', '##.~.'],
    ['M####', '.####', '~####', '....#', '###~#', '###.<'],
    ['.*M', '~##', '.#v', '...'],
    ['M~.', '##.', 'v#*', '.#.', '.~.'],
    ['#*..~.', '#.#.#~', '..###M', '^#####'],
    ['..~.*##', '~###..<', '..M##.#'],
    ['M*.*', '###~', '....', '~#.#', '.###', '.<##'],
    ['####.~.', '####M#~', '######.', '#.#*.~.', '>..*###'],
    ['#.~*###', '>.#.###', '#.#~###', '###.##M', '###~##.', '##..*..'],
    ['###v##.', '###~##.', 'M.#*.~.', '#.####.', '#.~..*.'],
    ['#####v#', '.####.#', '.####..', '.*.*##.', '.##~##~', 'M##..~.'],
    ['*...###', '^#~####', '##.....', '####.#.', '#####**', '#M~.~.#'],
  ];
  const headings = '^>v<';
  const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function start(rows) {
    for (const [y, row] of rows.entries()) {
      const x = row.search(/[<>^v]/);
      if (x !== -1) return { x, y, dir: headings.indexOf(row[x]) };
    }
    throw new Error('Missing butterfly start');
  }
  function isLand(tile) {
    return Boolean(tile && '.M*^>v<'.includes(tile));
  }
  function turn(dir, block) {
    if (block === 'left') return (dir + 3) % 4;
    if (block === 'right') return (dir + 1) % 4;
    return dir;
  }
  function advance(rows, pose, action) {
    const { x, y, dir } = pose;
    const tile = rows[y][x];
    if (!action) return { error: 'missing' };
    if (action === 'cha') return tile === 'M' ? { win: true } : { error: 'tooEarly' };
    if (tile === 'M') return { error: 'needDance' };
    if (tile === '*' && action !== 'flip') return { error: 'needFlip' };
    if (action === 'flip' && tile !== '*') return { error: 'noMat' };
    const [dx, dy] = vectors[dir];
    const ahead = rows[y + dy]?.[x + dx];
    const leap = action === 'jump';
    if (leap && ahead !== '~') return { error: 'noWater' };
    if (!leap && ahead === '~') return { error: 'needJump' };
    const n = leap ? 2 : 1;
    const target = { x: x + n * dx, y: y + n * dy, dir };
    if (!isLand(rows[target.y]?.[target.x])) return { error: leap ? 'landing' : 'blocked' };
    return { pose: target };
  }
  // 原地转向和移动各占一拍。循环按完整坐标及朝向检测。
  function* run(rows, program) {
    let pose = start(rows);
    const visited = new Set();
    while (true) {
      const key = pose.x + ',' + pose.y;
      const state = key + ',' + pose.dir;
      if (visited.has(state)) { yield { pose, error: 'loop' }; return; }
      visited.add(state);
      const { heading, action } = program.get(key) || {};
      if (heading) {
        pose = { ...pose, dir: turn(pose.dir, heading) };
        yield { pose, move: heading, key };
      }
      const result = advance(rows, pose, action);
      pose = result.pose || pose;
      yield { ...result, pose, move: action, key };
      if (result.error || result.win) return;
    }
  }
  return { levels, start, isLand, run };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ButterflyTrail;
