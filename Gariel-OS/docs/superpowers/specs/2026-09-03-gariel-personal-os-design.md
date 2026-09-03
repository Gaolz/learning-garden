# Gariel Personal OS 设计说明

- **日期**：2026-09-03
- **状态**：已确认，等待实施计划
- **目标 Vault**：`/Users/gaowanxing/Gariel/learning-garden/Gariel-OS`
- **参考项目**：`oi0411/Personal-OS`

## 1. 项目目标

建立一个独立的 Obsidian Vault，作为 Gariel 的行动操作系统：管理目标、任务、每日聚焦、进度和周期复盘。现有 `Gariel-Brain` 保持为知识库，继续保存技术笔记、阅读笔记、文章、照片、旅行计划和 Daily Note。

系统每天打开后，应在十秒内回答三个问题：

1. 今天唯一需要实质推进的主线是什么？
2. 今天怎样照顾身体并保护留白？
3. 其他任务中哪些确实需要今天完成？

## 2. 核心原则

1. **行动与知识分离**：Gariel-OS 决定做什么；Gariel-Brain 沉淀学到了什么。
2. **唯一主线**：每天最多一个 `main` 任务。
3. **最低可行的一天**：状态不好时降低强度，不中断闭环。
4. **不补偿、不追赶**：中断以后重新开始一个 25 分钟行动。
5. **保护留白**：留白是原则提醒，不被建模为任务或习惯打卡。
6. **文件优先**：业务数据保存在普通 Markdown 中，自定义界面只是可替换的视图层。
7. **低维护成本**：第一版只实现每天会用到的功能，不复制参考项目的全部复杂管理界面。

## 3. 系统边界

### 3.1 Gariel-OS 负责

- 长期方向、当前阶段和本周重点
- 每日任务及完成状态
- 唯一主线和身体照顾
- 周复盘和月复盘
- 指向 Gariel-Brain 成果的跨 Vault 链接

### 3.2 Gariel-Brain 继续负责

- Daily Note 与每日反思
- 技术、编程和英语学习笔记
- 阅读笔记和书籍资料
- 文章、照片、旅行、Challenge 详情及其他知识内容

### 3.3 明确不做

- 不迁移或复制 Gariel-Brain 内容
- 不创建第二份 Daily Note
- 不自动修改 Gariel-Brain
- 不实现循环任务、连续天数和游戏化积分
- 不实现批量任务管理器
- 不实现手机专项布局
- 不实现云同步
- 不在第一版提供模块级联删除

## 4. 总体架构

```text
Gariel-OS/
├── 00 Home/
│   ├── 今日.md
│   ├── 目标中心.md
│   ├── 模块中心.md
│   └── 复盘中心.md
├── 01 Tasks/
│   └── YYYY-MM.md
├── 02 Modules/
│   ├── programming-english/
│   │   └── Goals/
│   ├── reading/
│   │   └── Goals/
│   ├── body/
│   │   └── Goals/
│   ├── life/
│   │   └── Goals/
│   ├── finance/
│   │   └── Goals/
│   └── challenge/
│       └── Goals/
├── 03 Reviews/
│   ├── Weekly/
│   └── Monthly/
├── 90 Templates/
│   ├── Goal.md
│   ├── Weekly Review.md
│   └── Monthly Review.md
├── 99 System/
│   ├── Module Registry/
│   ├── Views/
│   ├── Services/
│   ├── Assets/Hero/
│   └── Settings.md
└── .obsidian/
```

### 4.1 分层职责

| 层 | 职责 |
|---|---|
| `00 Home` | 用户每天直接打开的入口页 |
| `01 Tasks` | 按月份保存的任务事实数据 |
| `02 Modules` | 各模块目标及模块入口 |
| `03 Reviews` | 周、月行动复盘 |
| `90 Templates` | 可手工复制和由核心 Templates 使用的模板 |
| `99 System` | 注册数据、DataviewJS 视图、写入服务、设置和图片 |

### 4.2 依赖

- Obsidian 核心插件：Properties、Bases、Templates
- 唯一必需社区插件：Dataview，并开启 JavaScript Queries
- 不要求 QuickAdd、Tasks 或 Templater

## 5. 模块设计

| `module_id` | 名称 | 角色 | 主要用途 |
|---|---|---|---|
| `programming-english` | Programming + English | `main` | 唯一长期主线；构建、测试和英文表达 |
| `reading` | 阅读 | `support` | 阅读行动、进度与读书成果链接 |
| `body` | 身体 | `care` | 健身、跑步、游泳、静坐和睡眠 |
| `life` | 生活与探索 | `normal` | 摄影、旅行、口琴、恢复和个人事务 |
| `finance` | 财经 | `normal` | 理财学习、财务整理和长期计划 |
| `challenge` | Challenge | `normal` | 挑战清单、进行状态、完成记录和复盘入口 |
| `temporary` | 临时任务 | `inbox` | 尚未归类的一次性事项 |

模块由 `99 System/Module Registry/*.md` 注册。模块中心第一版使用 Bases 编辑注册文件，不实现自定义增删模块弹窗。

模块属性：

```yaml
id: programming-english
name: Programming + English
icon: code-2
order: 10
enabled: true
role: main
page: 02 Modules/programming-english/Programming + English
```

## 6. 目标模型

目标采用轻量三级结构：

```text
direction  长期方向
└── phase  当前阶段
    └── week  本周重点
```

目标属性：

```yaml
id: programming-direction-001
module_id: programming-english
level: direction
parent_id: ""
title: 成为能持续构建、解释与分享的人
status: active
start_date: 2026-09-01
end_date:
success_criteria: 持续产生可以运行、验证和解释的作品
order: 10
```

规则：

- 每个正式模块允许多个历史目标，但首页只突出一个活动中的当前阶段。
- `phase` 必须关联同模块的 `direction`。
- `week` 必须关联同模块的 `phase`。
- 任务可以不关联目标；只有包含 `goal_id` 的任务才参与目标完成率计算。
- 周目标完成率为关联任务的完成数除以任务总数。
- 阶段和长期方向按直接子目标完成率取平均值。
- 子目标或任务为空时显示“尚未开始”，不显示误导性的 `0%`。

目标文件由 Bases 编辑。第一版不提供自定义目标弹窗，也不提供级联删除。

## 7. 任务模型

任务按月保存在 `01 Tasks/YYYY-MM.md`，使用 Markdown checkbox 和 Dataview inline fields：

```markdown
- [ ] 完成 Rails 登录验证 [task_id:: task-uuid] [date:: 2026-09-03] [module_id:: programming-english] [priority:: P1] [goal_id:: auth-week] [focus:: main]
```

字段：

| 字段 | 必填 | 说明 |
|---|---:|---|
| `task_id` | 是 | 全局唯一稳定标识 |
| `date` | 是 | `YYYY-MM-DD` |
| `module_id` | 是 | 必须对应已启用模块 |
| `priority` | 是 | `P0`、`P1` 或 `P2` |
| `goal_id` | 否 | 可选关联本周重点 |
| `focus` | 是 | `main`、`care` 或 `normal` |

任务标题来自 checkbox 正文，不重复存储为字段。

### 7.1 唯一主线规则

- 同一天最多一个未完成或已完成的 `focus:: main` 任务。
- 将新任务设置为主线时，写入服务在同一操作中把旧主线改为 `normal`。
- 更换主线不会删除、完成或移动旧任务。
- 首页没有主线时显示明确空状态和“选择今日主线”操作。

### 7.2 身体照顾规则

- 首页优先显示当日第一个未完成的 `body + care` 任务。
- 如果当天没有身体任务，显示固定最低行动：“走路 10 分钟或静坐 5 分钟”。
- 不记录连续天数，不把最低行动自动写入任务文件。

### 7.3 写入规则

- 写入前验证日期、模块、优先级、目标归属和 `focus` 值。
- 使用串行写入队列，避免快速连续操作相互覆盖。
- 只重写受影响的月份文件。
- 月份发生变化时，同时重写原月份和新月份文件。
- 保留无法识别的额外 inline fields，避免未来扩展时丢数据。

## 8. 今日工作台

`00 Home/今日.md` 是固定入口，不按天创建文件。它通过 DataviewJS 渲染聚焦型工作台。

页面顺序：

1. 日期与 Gariel-Brain 当天 Daily Note 链接
2. 原创自然系水彩 Hero
3. 唯一主线
4. 身体照顾
5. 保护留白
6. Gariel-Brain 今日记录提示
7. 其他今日任务
8. 快速添加任务
9. 本周重点简要进度

首页原则文案默认值：

> 只推进一件真正重要的事。
>
> 不补偿，不追赶。中断以后，只需重新开始一个 25 分钟行动。

“保护留白”默认文案：

> 未安排的时间不需要被填满。今天不因为焦虑追加任务。

文案保存在 `99 System/Settings.md`，以后可以直接通过 Properties 修改。

### 8.1 快速添加

快速添加表单包含：

- 任务标题
- 日期，默认今天
- 模块
- 优先级，默认 `P1`
- 首页位置，默认 `normal`
- 可选本周重点

创建成功后刷新任务区域；创建失败时保留用户输入并显示错误，不写入部分数据。

### 8.2 Daily Note 跨库链接

首页按当天日期动态生成：

```text
obsidian://open?vault=Gariel-Brain&file=DailyNotes/YYYY-MM-DD
```

系统只负责打开链接。目标文件不存在时不自动创建，也不修改 Gariel-Brain。

## 9. 模块页与管理页

### 9.1 模块页

每个模块页面使用同一通用视图，显示：

1. 长期方向
2. 当前阶段
3. 本周重点
4. 今日与本周任务
5. 指向 Gariel-Brain 成果或知识入口的链接

模块页不复制知识正文。

### 9.2 目标中心

- 顶部嵌入目标 Bases 视图
- 提供“活动目标”“按模块”“全部目标”三个视图
- 目标层级和父目标主要通过属性编辑
- 下方只读展示轻量目标树与自动进度

### 9.3 模块中心

- 使用 Bases 编辑模块名称、排序、启用状态和入口页面
- `temporary` 不允许删除或禁用
- 第一版不提供级联删除按钮

## 10. 复盘系统

### 10.1 周复盘

周复盘模板自动查询指定周的任务并显示：

- 唯一主线完成情况
- 各模块任务完成情况
- 关联周目标的完成率
- 未完成任务列表
- 指向 Gariel-Brain 成果的链接区域

人工回答四个问题：

1. 我产生了哪些可以检查的 Programming 成果？
2. English 是否真正用于输入和解释？
3. 什么在持续消耗能量？
4. 下周只调整哪一件事？

### 10.2 月复盘

月复盘显示：

- 每周唯一主线与完成情况
- 各模块任务数量与完成率
- 已完成的本周重点
- 阅读和 Challenge 的完成记录
- 下月继续、停止和开始各一项

复盘只汇总行动数据，不复制 Gariel-Brain 的日记正文。

## 11. 视觉系统

- 主题方向：鼠尾草绿、奶油白、暖米色、低饱和金色强调
- 首页 Hero：原创低对比度自然水彩横幅
- 信息层级：文字优先，使用细进度条，避免 KPI 堆叠和大型圆环
- 卡片：浅边框、轻阴影、充足留白
- 字体：优先系统字体与宋体标题组合，不要求安装额外字体
- 样式只作用于 Gariel-OS，不影响 Gariel-Brain
- 第一版只保证桌面端体验；窄窗口可自然堆叠，但不承诺手机专项设计

生成的 Hero 在实施时保存为：

```text
99 System/Assets/Hero/focus-landscape.png
```

## 12. 容错与安全

- 无任务、无目标、无复盘和无外部链接时均提供可理解的空状态。
- 页面渲染失败时，原始 Markdown 数据仍可直接打开和编辑。
- 文件写入使用 Obsidian Vault API，不通过浏览器存储保存业务数据。
- 删除任务前确认任务仍存在；第一版不实现目标和模块的界面删除。
- 无效字段不参与统计，并在管理视图中单独显示为“需要修复”。
- 跨 Vault 链接不可用时只显示提示，不创建目录或文件。
- 所有写入只发生在 Gariel-OS；Gariel-Brain 在第一版中严格只读。

## 13. 第一版实施范围

1. 创建独立 Vault 骨架与 Obsidian 配置。
2. 创建七个模块注册文件与模块页。
3. 创建目标属性模板和 Bases 管理视图。
4. 创建月度任务格式、最小任务服务和快速添加表单。
5. 创建 Focus First 今日工作台。
6. 创建周/月复盘模板和复盘中心。
7. 加入 Gariel-Brain 的只读跨库链接。
8. 加入原创 Hero 和专用 CSS。
9. 创建最少量示例数据，用于验证后明确标记并可删除。

## 14. 验收标准

### 14.1 静态验证

- 所有 JSON 能被标准 JSON 解析器读取。
- 所有 YAML 和 `.base` 文件能够解析。
- 所有 JavaScript 通过 `node --check`。
- Markdown 不包含未闭合代码块或无效 frontmatter。
- 所有本地图片和视图引用均指向存在的文件。

### 14.2 任务行为

- 能在首页创建普通、主线和身体照顾任务。
- 同一天设置新主线时，旧主线自动降级为普通任务。
- 完成任务后只改变目标 checkbox 和相关进度。
- 移动跨月任务时，原月份和目标月份都正确更新。
- 没有关联目标的任务可以正常创建和完成。
- 无效输入不会写入部分内容。

### 14.3 目标与汇总

- Bases 可以编辑模块和目标属性。
- 周目标只统计关联任务。
- 阶段与长期方向正确汇总直接子目标。
- 空目标显示“尚未开始”。

### 14.4 页面与链接

- 首页默认展示唯一主线、身体照顾和保护留白。
- 无任务和无目标时首页仍完整可用。
- Gariel-Brain Daily Note 链接使用当天日期。
- 模块页只显示本模块的数据。
- Hero、卡片和文字在真实 Obsidian 浅色主题中清晰可读。

## 15. 实施约束

- 在开始实现前先制定逐文件实施计划。
- 不修改 Gariel-Brain。
- 不复制参考仓库的 Hero 图片或大段源代码；只借鉴公开架构思想并重新实现所需最小功能。
- 每一阶段都先运行对应验证，再进入下一阶段。
- 发现需要扩大第一版范围时，停止实施并重新确认。
