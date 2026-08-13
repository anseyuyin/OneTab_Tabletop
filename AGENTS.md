# OneTab Tabletop

单页 HTML 桌游集：每个游戏一个独立 HTML 文件，零外部依赖（Three.js 已内联，纹理用 Canvas 运行时绘制）。

## Project
- 入口：`games/game_index.html`（菜单）、`games/glory_&_gems.html`（《荣光宝石商》成品）
- 技术栈：原生 HTML/CSS/JS，无构建、无包管理器
- 界面语言：简体中文；移动端触屏优先

## Commands
- 运行：直接用浏览器打开 `games/glory_&_gems.html` 或 `games/game_index.html`（无构建步骤）
- 测试：`node --test tests/seat_colors.test.js tests/ai_difficulty.test.js`
- 语法验证（Node 检查所有 `<script>` 块）：
  `node -e 'const fs=require("fs");const h=fs.readFileSync("games/glory_&_gems.html","utf8");const re=/<script[^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(h))){if(m[1].trim())new Function(m[1]);}console.log("JS syntax OK")'`

## Architecture
- 单文件结构：`<style>` + 内联 Three.js（压缩）+ 多个 `<script>` 块（数据层 / 规则引擎 / 渲染层 / 交互层）
- `games/glory_&_gems.html` 关键模块：
  - 数据层：`COLORS` / `COLOR_INFO` / `CARD_DEFS` / `NOBLE_DEFS` / `PLAYER_THEMES` / `POS_THEME`
  - 规则引擎：`newGame`、动作与胜利判定
  - 席位：`panelForPlayer(n, i)` 返回 0下 / 1上 / 2左 / 3右；`POS_THEME` 固定方位→颜色（下=绿 上=红 左=紫 右=蓝）
  - 交互：`Home`（首页）、`GameScreen`（对局）、`AISetupModal`（人机配置）、`AI`（自动回合）

## Conventions
- 每个游戏保持单文件，禁止外部资源与网络依赖
- 界面文案简体中文
- 玩家主题色只通过 `p.theme`（`PLAYER_THEMES[POS_THEME[panelForPlayer(...)]]`）读取，勿按玩家编号直接取色

## Notes
