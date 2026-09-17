'use strict';
/* 《五子棋 3D》规则内核单测：从单文件 HTML 中提取脚本块执行（与项目语法校验同款方式） */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

global.window = global;

// 提取 <script> 块，依次执行到 AI 层为止（UI/场景层依赖 DOM/THREE，不载入）
(function loadEngine() {
  const vm = require('vm');
  const html = fs.readFileSync(path.join(__dirname, '..', 'games', 'wuziqi.html'), 'utf8');
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    if (!code.trim()) continue;
    if (code.length > 100000) continue; // 跳过内联 three.js
    vm.runInThisContext(code);
    if (global.WZQ_AI) break;
  }
})();

const R = global.WZQ_RULES;
const A = global.WZQ_AI;

function mk(N) { return R.newGame({ N: N || 15 }); }
function setB(g, list) { for (const [x, y, c] of list) g.board[y * g.N + x] = c; }
function at(g, x, y) { return g.board[y * g.N + x]; }
function playSeq(g, list) {
  for (const [x, y] of list) {
    const r = R.play(g, x, y);
    assert.ok(r.ok, `play ${x},${y} 应合法`);
  }
}

test('初始局面：空盘、黑先、默认 15 路，9/13/15 均可开局', () => {
  const g = R.newGame();
  assert.strictEqual(g.N, 15);
  assert.strictEqual(g.board.length, 225);
  assert.strictEqual(g.turn, 1);
  assert.strictEqual(g.over, false);
  assert.strictEqual(mk(9).board.length, 81);
  assert.strictEqual(mk(13).board.length, 169);
  assert.strictEqual(R.newGame({ N: 99 }).N, 15, '非法路数回退 15 路');
});

test('横向五连判胜，winLine 记录五子，终局后拒绝落子', () => {
  const g = mk();
  playSeq(g, [[7, 7], [0, 0], [8, 7], [0, 1], [9, 7], [0, 2], [10, 7], [0, 3]]);
  assert.strictEqual(g.over, false);
  const r = R.play(g, 11, 7);
  assert.ok(r.ok && r.over);
  assert.strictEqual(g.result.winner, 'black');
  assert.strictEqual(g.result.winLine.length, 5);
  assert.deepStrictEqual(g.result.winLine[0], [7, 7]);
  assert.strictEqual(R.play(g, 5, 5).ok, false, '终局后不可再落子');
});

test('斜线五连判胜；跳空补子形成长连（6 子）同样算胜', () => {
  const g = mk();
  // 黑斜线 (3,3)→(7,7) 五连（白子走远处）
  playSeq(g, [[3, 3], [0, 0], [4, 4], [0, 2], [5, 5], [2, 0], [6, 6], [1, 3]]);
  assert.strictEqual(g.over, false);
  const r = R.play(g, 7, 7);
  assert.ok(r.over);
  assert.strictEqual(g.result.winner, 'black');
  // 长连：黑已有 (3,7)(4,7) 与 (6,7)(7,7)(8,7)，补 (5,7) 一次连成 6 子
  const g2 = mk();
  playSeq(g2, [[3, 7], [0, 0], [4, 7], [0, 2], [6, 7], [2, 0], [7, 7], [1, 3], [8, 7], [13, 13]]);
  assert.strictEqual(g2.over, false, '两段未接通前不应判胜');
  const r2 = R.play(g2, 5, 7);
  assert.ok(r2.over);
  assert.strictEqual(g2.result.winLine.length, 6, '长连连线应为 6 子');
});

test('占用点与越界点拒绝落子', () => {
  const g = mk();
  playSeq(g, [[7, 7], [8, 8]]);
  assert.strictEqual(R.play(g, 7, 7).reason, 'occupied');
  assert.strictEqual(R.tryPlay(g, -1, 0, 2).reason, 'out');
  assert.strictEqual(R.tryPlay(g, 15, 0, 2).reason, 'out');
});

test('未连五则对局继续、行棋方交替', () => {
  const g = mk();
  R.play(g, 7, 7);
  assert.strictEqual(g.turn, 2);
  R.play(g, 8, 7);
  assert.strictEqual(g.turn, 1);
  assert.strictEqual(g.over, false);
});

test('悔棋还原行棋方与局面，且可撤销终局', () => {
  const g = mk();
  playSeq(g, [[7, 7], [0, 0], [8, 7], [0, 1], [9, 7], [0, 2], [10, 7], [0, 3], [11, 7]]);
  assert.ok(g.over);
  assert.ok(R.undo(g));
  assert.strictEqual(g.over, false);
  assert.strictEqual(g.result, null);
  assert.strictEqual(at(g, 11, 7), 0);
  assert.strictEqual(g.turn, 1, '撤销黑方胜着后轮到黑');
  assert.ok(R.undo(g));
  assert.strictEqual(g.turn, 2);
});

test('满盘无人五连判和棋', () => {
  // (x + 2y) % 4 二值着色：任意方向最长连 ≤2，必无五连
  const g = mk(9);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    g.board[y * 9 + x] = ((x + 2 * y) % 4) < 2 ? 1 : 2;
  }
  g.board[0] = 0;
  g.history = Array.from({ length: 80 }, (_, i) => ({ n: i + 1, c: (i % 2) ? 2 : 1, x: 0, y: 0 }));
  g.turn = 1;
  const r = R.play(g, 0, 0);
  assert.ok(r.over);
  assert.strictEqual(g.result.winner, 'draw');
});

test('坐标记谱：跳过 I，H8 / P15 与内部坐标一一对应', () => {
  assert.strictEqual(R.coordName(7, 7), 'H8');
  assert.strictEqual(R.coordName(14, 14), 'P15');
  assert.strictEqual(R.coordName(8, 0), 'J1', 'I 被跳过');
  assert.strictEqual(R.moveText({ c: 1, x: 7, y: 7 }), '黑 H8');
  assert.strictEqual(R.moveText({ c: 2, x: 0, y: 0 }), '白 A1');
});

test('存档序列化 / 反序列化自洽，坏档返回 null', () => {
  const g = mk();
  playSeq(g, [[7, 7], [8, 8], [9, 7], [10, 8]]);
  const o = JSON.parse(JSON.stringify(R.serialize(g)));
  const g2 = R.deserialize(o);
  assert.ok(g2);
  assert.strictEqual(g2.history.length, 4);
  assert.strictEqual(g2.turn, g.turn);
  for (let i = 0; i < 225; i++) assert.strictEqual(g2.board[i], g.board[i]);
  assert.strictEqual(R.deserialize(null), null);
  assert.strictEqual(R.deserialize({ v: 2 }), null);
  const bad = JSON.parse(JSON.stringify(o));
  bad.history[1].x = 7; // 与重放冲突（占用点）
  assert.strictEqual(R.deserialize(bad), null);
});

test('AI：四档均能在合理预算内给出合法着', () => {
  const g = mk();
  playSeq(g, [[7, 7], [8, 8], [9, 7], [10, 8], [6, 7], [5, 8]]);
  for (let lvl = 1; lvl <= 4; lvl++) {
    const t0 = Date.now();
    const mv = A.decideSync(g, g.turn, lvl);
    assert.ok(mv && mv.x !== undefined, `lvl${lvl} 应返回着法`);
    assert.strictEqual(at(g, mv.x, mv.y), 0, `lvl${lvl} 着法应为空点`);
    assert.ok(Date.now() - t0 < 2500, `lvl${lvl} 应在预算内完成`);
  }
});

test('AI：对手活四必堵（普通 / 困难 / 大师）', () => {
  // 黑方斜线活四 (7,7)(8,8)(9,9)(10,10)，白方必须堵 (6,6) 或 (11,11)
  const g = mk();
  playSeq(g, [[7, 7], [0, 0], [8, 8], [0, 2], [9, 9], [2, 0], [10, 10], [1, 3]]);
  for (let lvl = 2; lvl <= 4; lvl++) {
    const mv = A.decideSync(g, 2, lvl);
    const blocked = (mv.x === 6 && mv.y === 6) || (mv.x === 11 && mv.y === 11);
    assert.ok(blocked, `lvl${lvl} 应封堵活四，实际 ${mv.x},${mv.y}`);
  }
});

test('AI：有一步必胜必走（普通 / 困难 / 大师）', () => {
  // 黑方横向四连 (7,7)~(10,7)，黑走 (6,7) 或 (11,7) 即胜
  const g = mk();
  playSeq(g, [[7, 7], [0, 0], [8, 7], [0, 2], [9, 7], [2, 0], [10, 7], [1, 3]]);
  for (let lvl = 2; lvl <= 4; lvl++) {
    const mv = A.decideSync(g, 1, lvl);
    const wins = (mv.x === 6 && mv.y === 7) || (mv.x === 11 && mv.y === 7);
    assert.ok(wins, `lvl${lvl} 应直接取胜，实际 ${mv.x},${mv.y}`);
  }
});

test('AI：空盘首手取天元', () => {
  for (const [N, c] of [[9, 4], [13, 6], [15, 7]]) {
    const mv = A.decideSync(mk(N), 1, 3);
    assert.strictEqual(mv.x, c);
    assert.strictEqual(mv.y, c);
  }
});
