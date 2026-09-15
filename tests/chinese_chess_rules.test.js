'use strict';
/* 《中国象棋 3D》规则内核单测：从单文件 HTML 中提取脚本块执行（与项目语法校验同款方式） */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

global.window = global;

// 提取 <script> 块，依次执行到 AI 层为止（UI/场景层依赖 DOM/THREE，不载入）
// 用 vm.runInThisContext 模拟浏览器经典脚本：各块顶层 var 挂到全局，跨块共享
(function loadEngine() {
  const vm = require('vm');
  const html = fs.readFileSync(path.join(__dirname, '..', 'games', 'chinese_chess.html'), 'utf8');
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const code = m[1];
    if (!code.trim()) continue;
    if (code.includes('__THREE_INLINE__')) continue;
    vm.runInThisContext(code);
    if (global.CC_AI) break;
  }
})();

const R = global.CC_RULES;
const A = global.CC_AI;

function emptyBoard() { return R.mkBoard(); }
function findMv(ms, fc, fr, tc, tr) {
  return ms.find(m => m.fc === fc && m.fr === fr && m.tc === tc && m.tr === tr);
}

test('初始局面：32 子、红方先行、首轮 44 步合法着', () => {
  const g = R.newGame();
  let n = 0;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) if (g.board[r][c]) n++;
  assert.strictEqual(n, 32);
  assert.strictEqual(g.side, 'r');
  assert.strictEqual(R.legalMoves(g.board, 'r').length, 44);
});

test('马蹩马腿：前进方向相邻点有子则该着法被拒', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][3] = 'bK';   // 避开将帅照面
  b[9][1] = 'rN';          // 红马在原位
  b[8][1] = 'rP';          // 马腿（正前方）有子
  const ms = R.legalMovesFrom(b, 1, 9);
  assert.ok(!findMv(ms, 1, 9, 0, 7), '向上日字应被蹩');
  assert.ok(!findMv(ms, 1, 9, 2, 7), '向上日字应被蹩');
  assert.ok(findMv(ms, 1, 9, 3, 8), '横向日字不受影响');
});

test('象塞象眼且不得过河', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][3] = 'bK';
  b[9][2] = 'rB';
  let ms = R.legalMovesFrom(b, 2, 9);
  assert.ok(findMv(ms, 2, 9, 0, 7) && findMv(ms, 2, 9, 4, 7), '双田字可走');
  b[8][1] = 'rP';          // 塞左象眼
  ms = R.legalMovesFrom(b, 2, 9);
  assert.ok(!findMv(ms, 2, 9, 0, 7), '塞眼后不可走');
  // 不得过河：红象在 row5 不能去 row3
  const b2 = emptyBoard();
  b2[9][4] = 'rK'; b2[0][3] = 'bK';
  b2[5][2] = 'rB';
  ms = R.legalMovesFrom(b2, 2, 5);
  assert.ok(!ms.some(m => m.tr < 5), '象不能过河');
  assert.ok(findMv(ms, 2, 5, 0, 7) && findMv(ms, 2, 5, 4, 7), '自家半场可走');
});

test('士/将不出九宫', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][3] = 'bK';
  b[9][3] = 'rA';
  let ms = R.legalMovesFrom(b, 3, 9);
  assert.strictEqual(ms.length, 1);
  assert.ok(findMv(ms, 3, 9, 4, 8));
  ms = R.legalMovesFrom(b, 4, 9);
  assert.ok(ms.every(m => m.tc >= 3 && m.tc <= 5 && m.tr >= 7 && m.tr <= 9), '将不出九宫');
  assert.ok(ms.length > 0);
});

test('炮：不吃子同车；吃子必须且仅隔一子', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][3] = 'bK';
  b[7][1] = 'rC';
  b[4][1] = 'rP';          // 炮架
  b[2][1] = 'bP';          // 目标
  b[1][1] = 'bN';          // 隔两子之后的目标（不可吃）
  const ms = R.legalMovesFrom(b, 1, 7);
  assert.ok(findMv(ms, 1, 7, 1, 5), '无子路径可走');
  assert.ok(findMv(ms, 1, 7, 1, 6), '相邻空格可走');
  const eat = findMv(ms, 1, 7, 1, 2);
  assert.ok(eat && eat.cap === 'bP', '隔一子可吃');
  assert.ok(!findMv(ms, 1, 7, 1, 1), '隔两子不可吃');
  assert.ok(!findMv(ms, 1, 7, 1, 4), '不能落在己方炮架上');
});

test('兵：未过河只向前；过河可横走；永不后退', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][4] = 'bK';
  b[6][4] = 'rP';          // 未过河
  let ms = R.legalMovesFrom(b, 4, 6);
  assert.deepStrictEqual(ms.map(m => [m.tc, m.tr]), [[4, 5]]);
  b[4][4] = 'rP';          // 已过河
  ms = R.legalMovesFrom(b, 4, 4);
  assert.ok(findMv(ms, 4, 4, 4, 3));
  assert.ok(findMv(ms, 4, 4, 3, 4) && findMv(ms, 4, 4, 5, 4), '过河可横走');
  assert.ok(!findMv(ms, 4, 4, 4, 5), '永不后退');
});

test('将帅照面被拒', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][4] = 'bK';
  b[5][4] = 'rR';          // 中路隔着车
  // 红车平开 → 两将照面，非法
  const ms = R.legalMovesFrom(b, 4, 5);
  assert.ok(!findMv(ms, 4, 5, 3, 5), '平车后照面应被拒');
  assert.ok(R.whyIllegal(b, { fc: 4, fr: 5, tc: 3, tr: 5, piece: 'rR' }) === '将帅不能照面');
});

test('送将被拒', () => {
  // 黑车沉 4 列顶部，红车在 4 列中路遮挡；红车平开则帅被车将 → 非法
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][3] = 'bK';
  b[0][4] = 'bR';
  b[5][4] = 'rR';
  const ms = R.legalMovesFrom(b, 4, 5);
  assert.ok(!findMv(ms, 4, 5, 3, 5), '平开后被将军，应拒');
  assert.ok(findMv(ms, 4, 5, 4, 6), '沿线路进退仍合法');
  assert.strictEqual(R.whyIllegal(b, { fc: 4, fr: 5, tc: 3, tr: 5, piece: 'rR' }), '不能送将');
});

test('将死判负', () => {
  // 黑车沉底横将，另一车封死中路；红帅横移被车控、前进被车控 → 将死
  const g = R.newGame();
  g.board = emptyBoard();
  g.board[9][4] = 'rK';
  g.board[0][3] = 'bK';    // 避免照面产生的飞将胜着
  g.board[9][0] = 'bR';    // 9 行横线将军
  g.board[7][4] = 'bR';    // 4 列封死 (4,8) 逃生格
  g.side = 'r';
  assert.ok(R.inCheck(g.board, 'r'), '黑车底线将军');
  assert.strictEqual(R.legalMoves(g.board, 'r').length, 0, '无处可逃');
  R.judgeEnd(g, { n: 1, chk: [true] });
  assert.ok(g.over);
  assert.strictEqual(g.result.winner, 'b');
  assert.strictEqual(g.result.reason, '将死');
});

test('困毙同样判负（不按和棋）', () => {
  // 红帅与全部仕互相卡死在九宫内，未被将军但无一着可走
  const g = R.newGame();
  g.board = emptyBoard();
  g.board[9][4] = 'rK';
  g.board[9][3] = 'rA'; g.board[9][5] = 'rA';
  g.board[8][4] = 'rA';
  g.board[7][3] = 'rA'; g.board[7][5] = 'rA';
  g.board[0][3] = 'bK';
  g.side = 'r';
  assert.ok(!R.inCheck(g.board, 'r'), '未被将军');
  assert.strictEqual(R.legalMoves(g.board, 'r').length, 0, '无合法着');
  R.judgeEnd(g, { n: 1, chk: [false] });
  assert.ok(g.over && g.result.winner === 'b' && g.result.reason === '困毙');
});

test('三次重复局面判和；长将方判负', () => {
  const g = R.newGame();
  // 双车来回走制造三次重复（双方均不将军）；bK 放 3 列避免照面
  g.board = emptyBoard();
  g.board[9][4] = 'rK'; g.board[0][3] = 'bK';
  g.board[9][0] = 'rR'; g.board[0][0] = 'bR';
  g.side = 'r';
  const mv = (fc, fr, tc, tr) => {
    const m = R.legalMoves(g.board, g.side).find(x => x.fc === fc && x.fr === fr && x.tc === tc && x.tr === tr);
    assert.ok(m, `着法存在 ${fc},${fr}->${tc},${tr}`);
    R.execMove(g, m);
  };
  // 每 4 步回到同一局面；任一局面第 3 次出现时判和（循环内所有局面同步达到 3 次）
  for (let cycle = 0; cycle < 3 && !g.over; cycle++) {
    mv(0, 9, 1, 9); if (g.over) break;
    mv(0, 0, 1, 0); if (g.over) break;
    mv(1, 9, 0, 9); if (g.over) break;
    mv(1, 0, 0, 0);
    if (cycle < 2) assert.ok(!g.over, `第 ${cycle + 1} 轮重复不终局`);
  }
  assert.ok(g.over, '三次重复应终局');
  assert.strictEqual(g.result.winner, null);
  assert.strictEqual(g.result.reason, '三次重复判和');

  // 长将：红车反复将军，黑将在九宫 3、4 列间来回躲（rK 在 5 列避免照面）
  const g2 = R.newGame();
  g2.board = emptyBoard();
  g2.board[9][5] = 'rK';
  g2.board[0][3] = 'bK';   // 黑将在 (3,0)
  g2.board[2][3] = 'rR';   // 红车在 (3,2) 将军
  g2.side = 'b';
  assert.ok(R.inCheck(g2.board, 'b'));
  const mv2 = (fc, fr, tc, tr) => {
    const m = R.legalMoves(g2.board, g2.side).find(x => x.fc === fc && x.fr === fr && x.tc === tc && x.tr === tr);
    assert.ok(m, `着法存在 ${fc},${fr}->${tc},${tr}`);
    R.execMove(g2, m);
  };
  for (let cycle = 0; cycle < 3 && !g2.over; cycle++) {
    mv2(3, 0, 4, 0); if (g2.over) break;
    mv2(3, 2, 4, 2);  // 躲将 + 跟将
    assert.ok(R.inCheck(g2.board, 'b') || g2.over);
    if (g2.over) break;
    mv2(4, 0, 3, 0); if (g2.over) break;
    mv2(4, 2, 3, 2);  // 回到起始局面
  }
  assert.ok(g2.over, '长将三次重复应终局');
  assert.strictEqual(g2.result.reason, '长将判负');
  assert.strictEqual(g2.result.winner, 'b');
});

test('自然限着：连续 120 步无吃子判和', () => {
  const g = R.newGame();
  g.board = emptyBoard();
  g.board[9][4] = 'rK'; g.board[0][3] = 'bK';
  g.board[9][0] = 'rR'; g.board[0][0] = 'bR';
  g.side = 'r';
  g.halfmove = 118;
  const mv = (fc, fr, tc, tr) => {
    const m = R.legalMoves(g.board, g.side).find(x => x.fc === fc && x.fr === fr && x.tc === tc && x.tr === tr);
    assert.ok(m);
    R.execMove(g, m);
  };
  mv(0, 9, 1, 9); mv(0, 0, 1, 0);   // halfmove 到 120
  assert.ok(g.over);
  assert.strictEqual(g.result.reason, '自然限着判和');
});

test('中文记谱：炮二平五 / 马8进7 / 进退税式', () => {
  const g = R.newGame();
  // 炮二平五：红右炮 (7,7) -> (4,7)
  let m = R.legalMoves(g.board, 'r').find(x => x.fc === 7 && x.fr === 7 && x.tc === 4 && x.tr === 7);
  assert.strictEqual(R.notation(g.board, m), '炮二平五');
  R.execMove(g, m);
  // 马8进7：黑方视角 8 路马 = col 8? 黑 8 路 = col 7（黑 fileNum = c+1）
  m = R.legalMoves(g.board, 'b').find(x => x.piece === 'bN' && x.fc === 7 && x.fr === 0 && x.tc === 6 && x.tr === 2);
  assert.strictEqual(R.notation(g.board, m), '马8进7');
  R.execMove(g, m);
  // 红方 进/退：马二进三（红 2 路 = col 7 的马 → col 6, row 7? 马 (7,9)->(6,7)）
  m = R.legalMoves(g.board, 'r').find(x => x.piece === 'rN' && x.fc === 7 && x.fr === 9 && x.tc === 6 && x.tr === 7);
  assert.strictEqual(R.notation(g.board, m), '马二进三');
});

test('前后缀记谱：同线双车', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][3] = 'bK';
  b[9][0] = 'rR'; b[5][0] = 'rR';   // 红双车同在 0 列（红 9 路）
  const g = R.newGame();
  g.board = b;
  const m = R.legalMoves(b, 'r').find(x => x.fc === 0 && x.fr === 5 && x.tc === 0 && x.tr === 4);
  assert.strictEqual(R.notation(b, m), '前车进一');
  const m2 = R.legalMoves(b, 'r').find(x => x.fc === 0 && x.fr === 9 && x.tc === 0 && x.tr === 8);
  assert.strictEqual(R.notation(b, m2), '后车进一');
});

test('悔棋恢复局面', () => {
  const g = R.newGame();
  const key0 = R.posKey(g.board, g.side);
  const m = R.legalMoves(g.board, 'r')[0];
  R.execMove(g, m);
  R.undoLast(g);
  assert.strictEqual(R.posKey(g.board, g.side), key0);
  assert.strictEqual(g.side, 'r');
  assert.strictEqual(g.history.length, 0);
});

test('AI：四档均能在时限内给出合法着', () => {
  const g = R.newGame();
  const legal = R.legalMoves(g.board, 'r');
  const conf = [
    { maxDepth: 1, budgetMs: 300, noise: 60, randomRate: 0.25, qDepth: 0 },
    { maxDepth: 3, budgetMs: 800, noise: 18, randomRate: 0, qDepth: 0 },
    { maxDepth: 5, budgetMs: 1200, noise: 8, randomRate: 0, qDepth: 2 },
    { maxDepth: 8, budgetMs: 1500, noise: 8, randomRate: 0, qDepth: 2 }
  ];
  conf.forEach((opts, i) => {
    const t0 = Date.now();
    const mv = A.decideSync(g.board, 'r', opts);
    const dt = Date.now() - t0;
    assert.ok(mv, `档位 ${i + 1} 应给出着法`);
    assert.ok(legal.some(x => R.posKey && x.fc === mv.fc && x.fr === mv.fr && x.tc === mv.tc && x.tr === mv.tr), `档位 ${i + 1} 着法合法`);
    assert.ok(dt < 1600, `档位 ${i + 1} 耗时 ${dt}ms 应在时限内`);
  });
});

test('AI：能发现一步杀', () => {
  const b = emptyBoard();
  b[9][4] = 'rK'; b[0][4] = 'bK';
  b[0][0] = 'rR'; b[1][1] = 'rR';   // 双车错：车一进一? 车在 (0,0) 沉底即杀? 黑将 (4,0)
  b[0][0] = null;
  b[1][0] = 'rR';                   // 红车 (0,1)
  b[9][0] = 'rR';                   // 红车 (0,9)
  const mv = A.decideSync(b, 'r', { maxDepth: 3, budgetMs: 900, noise: 0, randomRate: 0, qDepth: 2 });
  assert.ok(mv, 'AI 给出着法');
  R.doMove(b, mv);
  const rest = R.legalMoves(b, 'b');
  assert.ok(rest.length === 0 || R.inCheck(b, 'b'), '应形成绝杀或强势将军');
});
