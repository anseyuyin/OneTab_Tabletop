'use strict';
/* 《围棋 3D》规则内核单测：从单文件 HTML 中提取脚本块执行（与项目语法校验同款方式） */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

global.window = global;

// 提取 <script> 块，依次执行到 AI 层为止（UI/场景层依赖 DOM/THREE，不载入）
(function loadEngine() {
  const vm = require('vm');
  const html = fs.readFileSync(path.join(__dirname, '..', 'games', 'weiqi.html'), 'utf8');
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    if (!code.trim()) continue;
    if (code.length > 100000) continue; // 跳过内联 three.js
    vm.runInThisContext(code);
    if (global.WQ_AI) break;
  }
})();

const R = global.WQ_RULES;
const A = global.WQ_AI;

function mk(N, opts) { return R.newGame(Object.assign({ N: N || 9 }, opts || {})); }
function setB(g, list) { for (const [x, y, c] of list) g.board[y * g.N + x] = c; }
function at(g, x, y) { return g.board[y * g.N + x]; }

test('初始局面：空盘、黑先、贴目默认值', () => {
  const g19 = R.newGame({ N: 19 });
  assert.strictEqual(g19.board.length, 361);
  assert.strictEqual(g19.turn, 1);
  assert.strictEqual(g19.komi, 7.5);
  assert.strictEqual(R.newGame({ N: 13 }).komi, 6.5);
  assert.strictEqual(R.newGame({ N: 9 }).komi, 6.5);
});

test('单子被四面围住 → 提子，提子数 +1', () => {
  const g = mk(9);
  setB(g, [[4, 4, 2], [3, 4, 1], [5, 4, 1], [4, 5, 1]]);
  const r = R.play(g, 4, 3);
  assert.ok(r.ok);
  assert.strictEqual(r.captured.length, 1);
  assert.strictEqual(at(g, 4, 4), 0);
  assert.strictEqual(g.captures.black, 1);
});

test('连通块：气为 1 不提、气为 0 整块提', () => {
  const g = mk(9);
  setB(g, [[4, 4, 2], [4, 5, 2], [3, 4, 1], [5, 4, 1], [3, 5, 1], [5, 5, 1], [4, 6, 1]]);
  // 白块两子连通，仅剩 (4,3) 一口气：此时不应被提
  assert.strictEqual(at(g, 4, 4), 2);
  assert.strictEqual(at(g, 4, 5), 2);
  const r = R.play(g, 4, 3);
  assert.ok(r.ok);
  assert.strictEqual(r.captured.length, 2);
  assert.strictEqual(at(g, 4, 4), 0);
  assert.strictEqual(at(g, 4, 5), 0);
  assert.strictEqual(g.captures.black, 2);
});

test('对角相邻不算连接：角部只提单子', () => {
  const g = mk(9);
  setB(g, [[0, 0, 2], [1, 1, 2], [1, 0, 1]]);
  // (0,0) 白与 (1,1) 白为对角，不共享气；黑落 (0,1) 只提 (0,0)
  const r = R.play(g, 0, 1);
  assert.ok(r.ok);
  assert.strictEqual(r.captured.length, 1);
  assert.strictEqual(at(g, 0, 0), 0);
  assert.strictEqual(at(g, 1, 1), 2, '对角白子应保留');
});

test('自杀手被拒（禁着点）', () => {
  const g = mk(9);
  setB(g, [[1, 0, 2], [0, 1, 2], [2, 0, 2], [1, 1, 2], [0, 2, 2]]);
  // 黑落角 (0,0)：邻点皆白且提不到子 → 自杀
  const r = R.play(g, 0, 0);
  assert.ok(!r.ok);
  assert.strictEqual(r.reason, 'suicide');
  assert.strictEqual(at(g, 0, 0), 0, '棋盘应已回滚');
  assert.strictEqual(g.turn, 1, '回合不应推进');
});

test('提子后自杀为合法手', () => {
  const g = mk(9);
  setB(g, [[1, 0, 2], [0, 1, 2], [2, 0, 1], [1, 1, 1], [0, 2, 1]]);
  // 白 (1,0)/(0,1) 各自仅剩 (0,0) 一口气；黑落 (0,0) 提两子后自身有气
  const r = R.play(g, 0, 0);
  assert.ok(r.ok);
  assert.strictEqual(r.captured.length, 2);
  assert.strictEqual(at(g, 0, 0), 1);
});

test('打劫：立即回提被拒，他处走两手后可回提', () => {
  const g = mk(9);
  setB(g, [
    [3, 2, 2],                          // 白单子（将被提）
    [4, 2, 1], [3, 1, 1], [3, 3, 1],    // 黑包围
    [1, 2, 2], [2, 1, 2], [2, 3, 2]     // 白包围黑落点
  ]);
  // 白子 (1,2)/(2,1)/(2,3) 需有外气，避免已成死形
  setB(g, [[0, 2, 0], [1, 1, 0], [1, 3, 0]]);
  const r1 = R.play(g, 2, 2);           // 黑提白 (3,2)
  assert.ok(r1.ok);
  assert.strictEqual(r1.captured.length, 1);
  const r2 = R.play(g, 3, 2);           // 白立即回提 → 全局同形
  assert.ok(!r2.ok);
  assert.strictEqual(r2.reason, 'ko');
  // 他处各走一手后可回提
  assert.ok(R.play(g, 6, 6).ok);
  assert.ok(R.play(g, 7, 7).ok);
  const r3 = R.play(g, 3, 2);
  assert.ok(r3.ok, '劫材后可回提');
});

test('停一手有效，双方连续停一手进入终局', () => {
  const g = mk(9);
  assert.ok(R.pass(g).ok);
  assert.strictEqual(g.turn, 2);
  const r = R.pass(g);
  assert.ok(r.gameOver);
  assert.ok(g.over);
  assert.ok(!R.play(g, 4, 4).ok, '终局后不可落子');
});

test('数子：单方围空归该方，双方相邻空点为中立', () => {
  const g = mk(9);
  const blacks = [], whites = [];
  for (let x = 0; x < 9; x++) blacks.push([x, 4, 1]);
  for (let x = 0; x < 9; x++) whites.push([x, 8, 2]);
  setB(g, blacks); setB(g, whites);
  const sc = R.score(g, null);
  assert.strictEqual(sc.black.stones, 9);
  assert.strictEqual(sc.black.terr, 36, '下半盘 4×9 全归黑');
  assert.strictEqual(sc.white.stones, 9);
  assert.strictEqual(sc.white.terr, 0, '上部区域邻接双方 → 中立');
});

test('死子移除后目数变化；贴目参与胜负（19 路 185 vs 176+7.5）', () => {
  const g = mk(9);
  const blacks = [];
  for (let x = 0; x < 9; x++) blacks.push([x, 4, 1]);
  setB(g, blacks);
  setB(g, [[4, 1, 2]]); // 黑空中的白死子
  const sc1 = R.score(g, null);
  assert.strictEqual(sc1.black.terr, 36, '死子未移除时仅上盘 36 归黑，下盘含白子为中立');
  const sc2 = R.score(g, [[4, 1]]);
  assert.strictEqual(sc2.black.terr, 72, '移除死子后下盘 36 也归黑');
  assert.strictEqual(sc2.deadWhite, 1);

  const g19 = R.newGame({ N: 19, komi: 7.5 });
  for (let i = 0; i < 361; i++) g19.board[i] = i < 185 ? 1 : 2;
  const sc19 = R.score(g19, null);
  assert.strictEqual(sc19.black.stones, 185);
  assert.strictEqual(sc19.white.stones, 176);
  assert.strictEqual(sc19.diff, 1.5, '黑 185 - 白 176 - 贴目 7.5');
  assert.strictEqual(sc19.winner, 'black');
});

test('坐标记谱：跳过 I，Q16 / D4 与内部坐标一一对应', () => {
  assert.strictEqual(R.coordName(15, 15), 'Q16');
  assert.strictEqual(R.coordName(3, 3), 'D4');
  assert.strictEqual(R.coordName(8, 0), 'J1');
  assert.deepStrictEqual(R.parseCoord('Q16'), [15, 15]);
  assert.deepStrictEqual(R.parseCoord('D4'), [3, 3]);
  assert.strictEqual(R.parseCoord('I9'), null, 'I 不是合法列');
  for (let x = 0; x < 19; x++) for (let y = 0; y < 19; y++) {
    assert.deepStrictEqual(R.parseCoord(R.coordName(x, y)), [x, y]);
  }
});

test('悔棋：提子数、局面哈希、行棋方全部还原', () => {
  const g = mk(9);
  setB(g, [[4, 4, 2], [3, 4, 1], [5, 4, 1], [4, 5, 1]]);
  const h0 = g.hash;
  const r = R.play(g, 4, 3);
  assert.ok(r.ok);
  const h1 = g.hash;
  assert.notStrictEqual(h1, h0);
  assert.ok(R.undo(g));
  assert.strictEqual(at(g, 4, 3), 0);
  assert.strictEqual(at(g, 4, 4), 2, '被提子应还原');
  assert.strictEqual(g.captures.black, 0);
  assert.strictEqual(g.turn, 1);
  assert.strictEqual(g.hash, h0, '哈希应还原');
  assert.strictEqual(g.hashCounts[h1] || 0, 0, '撤销局面哈希计数应清除');
  // 悔棋后可重新落同一点
  assert.ok(R.play(g, 4, 3).ok);
});

test('悔棋还原劫争禁着状态', () => {
  const g = mk(9);
  setB(g, [
    [3, 2, 2],
    [4, 2, 1], [3, 1, 1], [3, 3, 1],
    [1, 2, 2], [2, 1, 2], [2, 3, 2]
  ]);
  assert.ok(R.play(g, 2, 2).ok); // 黑提劫
  assert.strictEqual(R.play(g, 3, 2).reason, 'ko');
  assert.ok(R.undo(g));          // 撤销黑提劫
  assert.ok(R.play(g, 2, 2).ok, '重提应合法');
});

test('AI 不落子填自己的真眼', () => {
  const g = mk(9);
  // 黑真眼 (4,4)：四正交与四角全黑；另留一个普通空点 (0,8)
  setB(g, [[3, 4, 1], [5, 4, 1], [4, 3, 1], [4, 5, 1], [3, 3, 1], [5, 3, 1], [3, 5, 1], [5, 5, 1]]);
  const cand = A.candidates(g, 1);
  assert.ok(!cand.some(c => c.x === 4 && c.y === 4), '真眼点必须被排除');
  assert.ok(cand.some(c => c.x === 0 && c.y === 8), '普通空点应保留');
});

test('AI 无有效着法时自动停一手', () => {
  const g = mk(9);
  // 全盘填满，仅留黑真眼 (4,4)
  for (let i = 0; i < 81; i++) g.board[i] = (i % 3 === 0) ? 2 : 1;
  setB(g, [[4, 4, 0], [3, 4, 1], [5, 4, 1], [4, 3, 1], [4, 5, 1], [3, 3, 1], [5, 3, 1], [3, 5, 1], [5, 5, 1]]);
  const cand = A.candidates(g, 1);
  assert.strictEqual(cand.length, 0);
  const mv = A.decideSync(g, 1, 2);
  assert.ok(mv && mv.pass, '应自动停一手');
});

test('三种盘面与让子 0~9 均可开局并结算', () => {
  for (const N of [9, 13, 19]) {
    for (let h = 0; h <= 9; h++) {
      const g = R.newGame({ N: N, handicap: h });
      if (h >= 2) {
        let n = 0;
        for (let i = 0; i < N * N; i++) if (g.board[i] === 1) n++;
        assert.strictEqual(n, h, `${N}路让${h}子预置数`);
        assert.strictEqual(g.turn, 2, '让子时白先');
        assert.strictEqual(g.komi, 0.5, '让子默认贴目 0.5');
      }
      const color = g.turn;
      const pts = R.legalPoints(g, color);
      assert.ok(pts.length > 0);
      const r = R.play(g, pts[0][0], pts[0][1]);
      assert.ok(r.ok);
      const sc = R.score(g, null);
      assert.ok(sc.winner === 'black' || sc.winner === 'white' || sc.winner === 'draw');
    }
  }
});

test('存档序列化 / 反序列化自洽，坏档返回 null', () => {
  const g = mk(9, { handicap: 2 });
  assert.ok(R.play(g, 4, 4).ok);
  assert.ok(R.play(g, 2, 2).ok);
  assert.ok(R.pass(g).ok);
  const o = R.serialize(g, { mode: 'pvp' });
  const g2 = R.deserialize(o);
  assert.ok(g2, '应能恢复');
  assert.strictEqual(g2.N, 9);
  assert.strictEqual(g2.history.length, 3);
  for (let i = 0; i < 81; i++) assert.strictEqual(g2.board[i], g.board[i]);
  assert.strictEqual(g2.turn, g.turn);
  assert.strictEqual(R.deserialize({ v: 1, N: 9, board: [1, 2, 3] }), null);
  assert.strictEqual(R.deserialize(null), null);
});
