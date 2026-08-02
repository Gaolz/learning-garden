# Gariel-Brain: Obsidian Vault

个人知识库，Obsidian workspace 根目录。所有笔记按 **主题领域** 组织，部分按 **时间**（年/日）组织。

## 核心需求（Gariel's Key Needs）

目标：**成为一个能深耕技术、能用英文表达、身体强壮、内心平静的完整的人 — 并且每天都有实质进展。**

### 1. 输出驱动学习
不满足于消费信息。每个主题 → 构建/写作/教授。4 层框架（Why → Core → Trade-offs → Sandbox）是深度理解的引擎。Claude 的角色是**高级开发者/导师**，而非代码生成器。

### 2. 结构化时间管理
每日模板高度自律：4 个时间块、输入/输出追踪、时段评分、感恩日记。核心法则：**一个时段搞砸了 ≠ 一天搞砸，立即重启。**

### 3. 全栈技术深耕
计算机基础（TCP/IP、数据库、OS、Kafka、Docker/K8s）+ 多语言（Ruby、Rust、Python、React）+ 算法/LeetCode。追求真正的工程深度，而非表面教程。

### 4. 全人发展（Whole-Person Development）
技术只是一个支柱。音乐（吉他、口琴）、语言学习（中/德/英/日）、运动（健身、跑步、游泳）、冥想、睡眠、书法、烹饪 — 优化作为完整人类的全栈能力。

### 5. 系统化知识管理
Obsidian vault + 模板 + 标签 + 分类体系 + Git 版本控制。知识随实践复合增长，不分散散落。

---

## 目录结构

```
Gariel-Brain/
├── .obsidian/          # Obsidian 配置（插件、主题、热键、工作区）
├── Templates/          # 笔记模板（所有新笔记从此创建）
├── DailyNotes/         # 每日复盘日记
├── RoadMap/            # 学习路线图
├── Article/            # 技术文章笔记（外部分享/博客的阅读笔记）
├── Book/               # 读书笔记，按年份子目录组织（如 2026/）
├── AI/                 # AI 相关主题笔记
├── Computer/           # 计算机科学基础
│   ├── Database/       #   PostgreSQL, Redis, ElasticSearch
│   ├── Network/        #   TCP/IP, DNS
│   ├── OSS/            #   Docker, Kubernetes
│   ├── Nginx/
│   ├── Kafka/
│   ├── Git/
│   ├── Numpy & Pandas/
│   └── OperatingSystem/
├── Programming/        # 编程语言与工程
│   ├── Algorithm/
│   ├── DataStructure/
│   ├── Leetcode/
│   ├── Python/
│   ├── Ruby/
│   ├── Rust/
│   └── React/
├── Language/           # 语言学习（CN/DE/EN/JP）
├── Music/              # 音乐学习
│   ├── Guitar/
│   ├── Harmonica/
│   ├── MusicTheoryKnowledge/
│   └── Musician/
├── Exercise/           # 运动健康（Eye/Gym/Running/Swimming）
├── Rest/               # 休息冥想（Meditation/Sleep）
├── Challenge/          # 个人挑战（如 Sex/）
├── Brush/              # 练字/书法
├── Cook/               # 烹饪笔记
├── Finance/            # 财务管理
├── Math/               # 数学笔记
├── Tourist/            # 旅游/出行
└── RandomThoughts/     # 随想/碎片想法
```

## 笔记分类规则

| 内容类型 | 存放位置 | 模板 |
|---------|---------|------|
| 每日复盘 | `DailyNotes/` | `Templates/Daily Note Template.md` |
| 技术文章阅读笔记 | `Article/` 或对应 `Computer/`/`Programming/` 子目录 | `Templates/Tech Article Note Template.md` |
| 读书笔记 | `Book/<年份>/` | Tech Article Note Template |
| 编程语言/框架学习 | `Programming/<语言>/` | Tech Article Note Template |
| 计算机基础（网络/数据库/OS 等） | `Computer/<主题>/` | Tech Article Note Template |
| 语言学习（中/德/英/日） | `Language/<语言代码>/` | — |
| 音乐/乐器 | `Music/<乐器或主题>/` | — |
| 运动/健康 | `Exercise/<项目>/` | — |
| 学习路线图 | `RoadMap/` | — |
| 随想/碎片想法 | `RandomThoughts/` | — |

## 模板系统

### Tech Article Note Template
用于技术文章、读书笔记、技术学习笔记。结构：
1. **TL;DR** — 一句话总结
2. **核心架构/流程图** — Mermaid 或 ASCII 图，拒绝大段文字
3. **关键问题拆解（4层）** — Why（解决什么问题）→ Core Mechanism（核心机制）→ Trade-offs（权衡取舍）→ Mental Sandbox（边界推演）
4. **代码示例与实践** — 动手验证
5. **记住这一句** — 最核心的 takeaway
6. **延伸阅读** — 相关链接

### Daily Note Template
每日复盘，4 个时间块：
- ☕ 晨间（07-08）
- ☀️ 深度工作（08-12）
- 🌤️ 轻量输入/整理（12-16）
- 🌇 提炼输出/生活（16-20）
- 🌃 晚间习惯/睡前（20-24）

每块包含输入/输出清单 + 时段评分 + 全天总结 + 感恩日记。

## 给 Claude 的指引

1. **创建新笔记前**，先确定它属于哪个目录，参考上述分类规则
2. **技术笔记**使用 `Templates/Tech Article Note Template.md` 格式
3. **每日笔记**使用 `Templates/Daily Note Template.md` 格式
4. **读书笔记**放在 `Book/<年份>/`，按年份归档
5. **笔记文件名**使用英文（方便跨平台、git、命令行操作）
6. **笔记内容**标题和正文可中英混用，以清晰为准
7. **未知归属的新主题**先确认意图再放对应目录，不要随意创建新一级目录
