# 单页桌游集 OneTab Tabletop

✨ 轻量级 HTML 桌游集。坚持「一游戏一文件」原则，所有样式与逻辑零依赖内联。专为移动端多人场景设计，强调快速开局与亲密互动，让数字桌游回归线下面对面的温度。

✨ A lightweight collection of HTML board games built on a "one game, one file" philosophy — zero external dependencies, fully self-contained, and mobile-first. Designed for local multiplayer on a single tablet or phone, it puts the warmth of face-to-face tabletop gaming back into your browser.

> **一台设备，三五好友，无限欢乐。**
> **One Device. Many Players. Infinite Fun.**

---

## 在线试玩 Play Online

<a href="https://anseyuyin.github.io/OneTab_Tabletop/games/game_index.html"><img src="https://img.shields.io/badge/🎲_启动游戏菜单-点击试玩-brightgreen?style=for-the-badge" alt="启动游戏菜单"></a>

通过 GitHub Pages 托管，无需下载安装，打开浏览器即可游玩。

---

## 特性 Features

- **一游戏一文件**：每个游戏都是独立的单文件 HTML，双击即玩，无需安装、无需联网、无需构建。
- **零外部依赖**：引擎与素材全部内嵌（Three.js 已打包进文件，纹理均为 Canvas 运行时绘制）。
- **移动端优先**：为手机 / 平板触屏交互深度优化，横竖屏与桌面窗口自动重排。
- **同屏多人**：所有玩家共用一台设备轮流操作，四边坐席布局让每位玩家都有正对自己的界面。
- **即开即玩**：无账号、无房间、无联机配置，打开就能开局。

---

## 游戏目录 Games

当前收录：**1 款成品** + **1 款设计中**。

### 📋 游戏菜单 Game Menu

> `games/game_index.html`

所有游戏的统一入口：卡片式展示全部已实现游戏，支持搜索与筛选，移动端友好。

### ✅ 荣光宝石商 Glory & Gems

> `games/glory_&_gems.html`（约 800 KiB / 819 KB，单文件）

一款 2~4 人同设备轮流的宝石商人桌面游戏。收集宝石、购买发展卡、吸引贵族，率先获得 15 分并完成本轮者获胜。

- **核心玩法**：五种宝石（钻石 / 蓝宝石 / 祖母绿 / 红宝石 / 黑曜石）+ 万能黄金；三级发展卡 90 张提供永久折扣；贵族卡按玩家人数随机登场。
- **四边坐席**：上 / 下 / 左 / 右四个玩家面板，文字分别朝向各坐席玩家（下方正立、上方倒置、左右侧转）。
- **触屏交互**：点击 + 文本提示 + 按钮执行，可选目标边缘发光（绿 = 可选，蓝 = 已选中）。
- **附加功能**：人机对战（AI 对手）、对局记录回看、音效与动画表现、内置玩法说明。

### 🚧 灵石争锋 Spirit Stone Clash（设计中）

> 设计文档：`docs/spirit_stone_clash/conceptual design.md`

《荣光宝石商》的修仙主题变体：五行灵石取代宝石、功法 / 法宝 / 道场取代发展卡、渡劫飞升取代声望获胜。目前处于概念设计阶段，尚未实现。

---

## 快速开始 Quick Start

```bash
# 克隆仓库
git clone https://github.com/anseyuyin/OneTab_Tabletop.git

# 用浏览器打开游戏菜单，浏览并启动所有游戏
games/game_index.html

# 或直接双击任意单文件游戏游玩
games/glory_&_gems.html
```

无需任何依赖与配置，浏览器打开即可。

---

## 目录结构 Structure

```
OneTab_Tabletop/
├── games/                      # 已实现的单文件游戏
│   ├── game_index.html         # 游戏菜单（所有游戏的统一入口）
│   └── glory_&_gems.html       # 《荣光宝石商》单文件成品
├── docs/                       # 设计文档
│   ├── glory_&_gems/           # 《荣光宝石商》概念设计与规则说明
│   │   └── conceptual design.md
│   └── spirit_stone_clash/     # 《灵石争锋》概念设计
│       └── conceptual design.md
├── LICENSE                     # MIT License
└── README.md
```

---

## 设计文档 Design Docs

新游戏遵循「先设计、后实现」的流程，概念文档统一存放于 `docs/<game_name>/conceptual design.md`，包含世界观设定、核心机制映射、卡牌与数值细化等。

已收录的设计文档：

- `docs/glory_&_gems/conceptual design.md` — 《荣光宝石商》
- `docs/spirit_stone_clash/conceptual design.md` — 《灵石争锋》

---

## 贡献 Contributing

欢迎提交新的单文件桌游或改进现有游戏，请遵循项目核心约定：

1. 每个游戏保持**单文件 HTML**，禁止引入外部资源与网络依赖；
2. 界面语言为简体中文，触屏优先、适配移动端；
3. 新游戏请先在 `docs/` 下补充概念设计文档。

---

## License

[MIT](LICENSE) © 2026 anse
