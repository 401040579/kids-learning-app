const test = require('node:test');
const assert = require('node:assert/strict');
const trail = require('../js/butterflyTrail.js');

// 独立按地形广度搜索，找最少的飞行动作；再把路线铺成图块交给真正的解释器。
function solve(rows) {
  const start = trail.start(rows);
  const queue = [{ ...start, path: [] }], seen = new Set();
  for (const node of queue) {
    const {x, y, dir, path} = node;
    const key = [x,y].join(',');
    if (rows[y][x] === 'M') return [...path, [key, { action: 'cha' }]];
    if (seen.has([x,y,dir].join(','))) continue;
    seen.add([x,y,dir].join(','));
    for (const [delta, heading] of [[0, undefined], [-1, 'left'], [1, 'right']]) {
      const nextDir = (dir + delta + 4) % 4;
      const [dx, dy] = [[0,-1],[1,0],[0,1],[-1,0]][nextDir];
      const water = rows[y + dy]?.[x + dx] === '~';
      if (water && rows[y][x] === '*') continue;
      const n = water ? 2 : 1;
      const nx = x + dx*n, ny = y + dy*n;
      if (!trail.isLand(rows[ny]?.[nx])) continue;
      const action = water ? 'jump' : rows[y][x] === '*' ? 'flip' : 'forward';
      queue.push({ x: nx, y: ny, dir: nextDir, path: [...path, [key, { heading, action }]] });
    }
  }
  throw Error('Unreachable mermaid');
}
module.exports = { solve };

test('20 distinct maps, progressively longer routes, each actually danceable with stationary tiles', () => {
  assert.equal(trail.levels.length, 20);
  assert.equal(new Set(trail.levels.map(JSON.stringify)).size, 20);
  let previous = 0;
  for (const rows of trail.levels) {
    assert(rows.every(r => r.length === rows[0].length));
    assert.equal(rows.join('').match(/M/g).length, 1);
    assert.equal(rows.join('').match(/[<>^v]/g).length, 1);
    const solution = solve(rows);
    const frames = [...trail.run(rows, new Map(solution))];
    assert(frames.at(-1).win, rows.join('/'));
    assert(frames.length >= previous, 'difficulty regressed ' + rows.join('/'));
    previous = frames.length;
  }
  assert(previous >= 20);
});

test('turns stay in the same square; a jump crosses exactly one pool, and both dancers meet on M', () => {
  const frames = [...trail.run(['>.', '#~', '#M'], new Map([
    ['0,0',{action:'forward'}], ['1,0',{heading:'right',action:'jump'}], ['1,2',{action:'cha'}]
  ]))];
  assert.deepEqual(frames.map(({pose}) => [pose.x,pose.y,pose.dir]), [[1,0,1],[1,0,2],[1,2,2],[1,2,2]]);
  assert(frames.at(-1).win);
});

test('missing tile, early dance, water, rock, boundary, bad landing, gym mat and loop stop at the relevant tile', () => {
  function error(rows, action, heading) {
    const { x, y } = trail.start(rows);
    return [...trail.run(rows, new Map([[x+','+y,{action,heading}]]))].at(-1).error;
  }
  for (const [row,action,expected] of [['>M',null,'missing'],['>M','cha','tooEarly'],['>~M','forward','needJump'],['>M','jump','noWater'],['>~#M','jump','landing'],['>#M','forward','blocked'],['<M','forward','blocked'],['>M','flip','noMat']]) {
    assert.equal(error([row],action),expected);
  }
  for (const [tile,expected] of [['*','needFlip'],['M','needDance']]) {
    assert.equal([...trail.run(['>'+tile],new Map([['0,0',{action:'forward'}],['1,0',{action:'forward'}]]))].at(-1).error,expected);
  }
  const ring = new Map(['0,0','1,0','0,1','1,1'].map(key=>[key,{heading:'right',action:'forward'}]));
  assert.equal([...trail.run(['^.','..'],ring)].at(-1).error,'loop');
});
