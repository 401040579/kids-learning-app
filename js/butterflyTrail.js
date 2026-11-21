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
    ['##.<', '##~#', '...#', 'B###'],
    ['B~.#v', '##.#F', '##.~.'],
    ['M####', '.####', '~####', '....#', '###~#', '###F<'],
    ['.*B', '~##', '.#v', '..F'],
    ['B~.', '##.', '^#*', 'F#.', '.~.'],
    ['#*..~.', '#.#.#~', 'F.###M', '^#####'],
    ['..~.*##', '~###.F<', 'R.B##.#'],
    ['B*.*', '###~', 'R...', '~#.#', '.###', 'F<##'],
    ['####.~.', '####M#~', '######.', '#.#*F~.', '<R.*###'],
    ['#.~*###', '>F#.###', '#.#~###', '###.##O', '###~##.', '##..*FR'],
    ['###v##.', '###~##.', 'BF#*F~R', '#.####.', '#.~..*.'],
    ['#####v#', '.####F#', '.####..', 'R*F*##.', '.##~##~', 'M##..~.'],
    ['*F..###', 'v#~####', '##R....', '####.#.', '#####**', '#O~F~.#'],
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
  const finale = { M: 'cha', B: 'samba', O: 'twirl' };
  function isLand(tile) {
    return Boolean(tile && '.MBOFR*^>v<'.includes(tile));
  }
  function turn(dir, block) {
    if (block === 'left') return (dir + 3) % 4;
    if (block === 'right') return (dir + 1) % 4;
    if (block === 'back') return (dir + 2) % 4;
    return dir;
  }
  function advance(rows, pose, action, remaining) {
    const { x, y, dir } = pose;
    const tile = rows[y][x];
    if (!action) return { error: 'missing' };
    if (finale[tile]) {
      if (action !== finale[tile]) return { error: 'needDance', wanted: finale[tile] };
      return remaining ? { error: 'needNectar' } : { win: true };
    }
    if (Object.values(finale).includes(action)) return { error: 'tooEarly' };
    if (tile === 'R' && action !== 'glide') return { error: 'needGlide' };
    if (action === 'glide' && tile !== 'R') return { error: 'noRainbow' };
    if (tile === '*' && action !== 'flip') return { error: 'needFlip' };
    if (action === 'flip' && tile !== '*') return { error: 'noMat' };
    const [dx, dy] = vectors[dir];
    const ahead = rows[y + dy]?.[x + dx];
    const leap = action === 'jump';
    if (leap && ahead !== '~') return { error: 'noWater' };
    if (!leap && ahead === '~') return { error: 'needJump' };
    if (action === 'glide' && ahead !== '.') return { error: 'glidePath' };
    const n = leap || action === 'glide' ? 2 : 1;
    const target = { x: x + n * dx, y: y + n * dy, dir };
    if (!isLand(rows[target.y]?.[target.x])) return { error: leap ? 'landing' : 'blocked' };
    return { pose: target };
  }
  // 原地转向和移动各占一拍。循环按完整坐标及朝向检测。
  function* run(rows, program) {
    let pose = start(rows);
    const visited = new Set(), flowers = new Set();
    const total = rows.join('').split('F').length - 1;
    while (true) {
      const key = pose.x + ',' + pose.y;
      const state = key + ',' + pose.dir + ',' + flowers.size;
      if (visited.has(state)) { yield { pose, error: 'loop' }; return; }
      visited.add(state);
      const { heading, flower, action } = program.get(key) || {};
      if (heading) {
        pose = { ...pose, dir: turn(pose.dir, heading) };
        yield { pose, move: heading, key };
      }
      if (flower) {
        if (rows[pose.y][pose.x] !== 'F') { yield { pose, error: 'noFlower', key }; return; }
        flowers.add(key);
        yield { pose, key, move: 'nectar', harvest: true };
      }
      const result = advance(rows, pose, action, total - flowers.size);
      pose = result.pose || pose;
      yield { ...result, pose, move: action, key };
      if (result.error || result.win) return;
    }
  }
  return { levels, start, isLand, finale, run };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ButterflyTrail;
