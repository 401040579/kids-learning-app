const test = require('node:test');
const assert = require('node:assert/strict');
const trail = require('../js/butterflyTrail.js');

const { solve } = require('./butterfly-solver.cjs');

test('20 distinct maps, progressively longer routes, each actually danceable with stationary tiles', () => {
  assert.equal(trail.levels.length, 20);
  assert.equal(new Set(trail.levels.map(JSON.stringify)).size, 20);
  let previous = 0;
  for (const rows of trail.levels) {
    assert(rows.every(r => r.length === rows[0].length));
    assert.equal(rows.join('').match(/[MBO]/g).length, 1);
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

test('turn back, harvest in place, glide two squares, match the invited duet', () => {
  const rows = ['<FR.O'];
  const tiles = new Map([['0,0',{heading:'back',action:'forward'}],['1,0',{flower:true,action:'forward'}],
    ['2,0',{action:'glide'}],['4,0',{action:'twirl'}]]);
  const run = () => [...trail.run(rows,tiles)];
  assert.deepEqual(run().map(f=>[f.move,f.pose.x]),[['back',0],['forward',1],['nectar',1],['forward',2],['glide',4],['twirl',4]]);
  assert(run().at(-1).win);
  tiles.set('4,0',{action:'samba'});assert.equal(run().at(-1).wanted,'twirl');
  tiles.set('4,0',{action:'twirl'});tiles.set('1,0',{action:'forward'});assert.equal(run().at(-1).error,'needNectar');
  tiles.set('2,0',{action:'forward'});assert.equal(run().at(-1).error,'needGlide');
  tiles.set('1,0',{action:'glide'});assert.equal(run().at(-1).error,'noRainbow');
  tiles.set('0,0',{flower:true});assert.equal(run().at(-1).error,'noFlower');
});
