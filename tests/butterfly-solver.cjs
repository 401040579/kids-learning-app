// 独立搜索最短拍数；不读取预设答案，也不调用游戏移动判定。
function solve(rows) {
  const faces = '^>v<';
  const y = rows.findIndex(row => /[<>v^]/.test(row));
  const x = rows[y].search(/[<>v^]/);
  const flowers = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'F') flowers.push(x + ',' + y); }));
  const pending = [{ x, y, dir: faces.indexOf(rows[y][x]), path: [], mask: 0, cost: 0 }];
  const seen = new Set();
  while (pending.length) {
    pending.sort((a,b) => b.cost-a.cost);
    const node = pending.pop();
    const {x,y,dir,path,cost} = node;
    const key = x + ',' + y, state = [key, dir, node.mask].join('/');
    if (seen.has(state)) continue;
    seen.add(state);
    const tile = rows[y][x], dance = { M:'cha', B:'samba', O:'twirl' }[tile];
    if (dance) {
      if (node.mask === 2 ** flowers.length - 1) return [...path, [key, {action:dance}]];
      continue;
    }
    const flower = tile === 'F', mask = flower ? node.mask | (1 << flowers.indexOf(key)) : node.mask;
    for (const [delta,heading] of [[0,undefined],[-1,'left'],[1,'right'],[2,'back']]) {
      const nextDir = (dir+delta+4)%4;
      const [dx,dy] = [[0,-1],[1,0],[0,1],[-1,0]][nextDir];
      const mid = rows[y+dy]?.[x+dx];
      if (tile === 'R' && mid !== '.' || tile === '*' && mid === '~') continue;
      const n = mid === '~' || tile === 'R' ? 2 : 1;
      const nx = x + n*dx, ny = y + n*dy, target = rows[ny]?.[nx];
      if (!target || '#~'.includes(target)) continue;
      const action = tile === 'R' ? 'glide' : tile === '*' ? 'flip' : mid === '~' ? 'jump' : 'forward';
      pending.push({x:nx,y:ny,dir:nextDir,mask,cost:cost+1+Number(!!heading)+Number(flower),
        path:[...path,[key,{heading,flower,action}]]});
    }
  }
  throw Error('Unreachable mermaid on '+rows.join('/'));
}
module.exports = { solve };
