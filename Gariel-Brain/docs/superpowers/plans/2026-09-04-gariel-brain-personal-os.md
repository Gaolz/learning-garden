# Gariel-Brain Personal OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Gariel-Brain 中建立一个以 Markdown 为事实来源、以唯一主线为核心、能够连接任务、知识、Daily Note 和复盘的轻量 Personal OS。

**Architecture:** `00 Home/` 保存用户入口，`PersonalOS/` 保存运行数据、纯函数服务、DataviewJS 视图、模板和资源。任务按月写入普通 Markdown；所有自动写入由单一 TaskStore 边界完成，并严格限制在 `PersonalOS/Tasks/`。现有知识目录和 DailyNotes 只被读取和链接。

**Tech Stack:** Obsidian Markdown、Dataview/DataviewJS、QuickAdd 2.20.0、Templater、Bases、局部 CSS、Node.js 内置 `node:test`

**Spec:** `Gariel-Brain/docs/superpowers/specs/2026-09-04-gariel-brain-personal-os-design.md`

## Global Constraints

- 使用同一个 Vault：`/Users/gaowanxing/Gariel/learning-garden/Gariel-Brain`。
- 运行时自动写入只允许发生在 `PersonalOS/Tasks/`、`PersonalOS/Goals/` 和 `PersonalOS/Reviews/`；任何路径越界请求都必须拒绝。
- Book、Programming、Language、Exercise、Rest、Tourist、Photo、Music、Finance、Challenge 和 DailyNotes 默认只读。
- 每个日期最多一个 `P1`；新 `P1` 会把同日旧 `P1` 降为 `P2`。
- 任务完成状态只由 Markdown checkbox 决定。
- 不新增 Tasks、Buttons、Meta Bind 或其他重复能力插件。
- 不修改现有 Daily Note 模板。
- 不永久删除 `🏠 我的知识宇宙.md`；只在最终迁移任务中归档。
- 不批量移动、重命名或补属性到现有知识笔记。
- CSS 必须限定在 `cssclasses: [personal-os]` 范围内。
- 每个任务只暂存计划列出的文件；仓库中的其他未提交修改属于用户。

---

## File Map

| 文件 | 职责 |
|---|---|
| `PersonalOS/Settings.md` | 原则文案、留白文案、默认优先级和最低身体行动 |
| `PersonalOS/Module Registry/*.md` | 七个模块的稳定 ID、显示信息和知识目录映射 |
| `PersonalOS/Tasks/YYYY/YYYY-MM.md` | 月度任务事实数据 |
| `PersonalOS/Services/task-model.js` | 纯函数：解析、序列化、校验和局部修改任务块 |
| `PersonalOS/Services/task-store.js` | 受限 I/O、串行队列、唯一 P1 和跨月回滚 |
| `PersonalOS/Services/obsidian-adapter.js` | 将 Obsidian Vault API 适配为 TaskStore 接口 |
| `PersonalOS/Services/home-model.js` | 纯函数：首页选择主线、身体任务和其他任务 |
| `PersonalOS/Services/review-model.js` | 纯函数：周/月范围与汇总 |
| `PersonalOS/Services/tests/*.test.js` | Node 单元测试和集成测试 |
| `PersonalOS/Views/home.js` | 加载服务、渲染首页并绑定有限交互 |
| `PersonalOS/Views/review.js` | 渲染周/月复盘自动摘要 |
| `PersonalOS/Goals.base` | 目标的 Bases 管理界面 |
| `PersonalOS/Modules.base` | 模块的 Bases 管理界面 |
| `PersonalOS/Templates/*.md` | 目标、周复盘和月复盘模板 |
| `00 Home/*.md` | Personal OS、目标、模块、复盘四个入口 |
| `.obsidian/plugins/quickadd/data.json` | 保留现有选择并新增 Personal OS 快速捕获 |
| `.obsidian/snippets/personal-os.css` | 仅作用于 Personal OS 页面的视觉样式 |
| `PersonalOS/Assets/home-hero.png` | 本地自然水彩 Hero |
| `Archive/旧首页/🏠 我的知识宇宙.md` | 旧首页的可恢复归档 |

---

### Task 1: 建立静态骨架、设置和模块注册

**Files:**
- Create: `Gariel-Brain/PersonalOS/Settings.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/programming-english.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/reading.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/body.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/life.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/finance.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/challenge.md`
- Create: `Gariel-Brain/PersonalOS/Module Registry/temporary.md`
- Create: `Gariel-Brain/PersonalOS/Tasks/2026/2026-09.md`
- Create: `Gariel-Brain/PersonalOS/Templates/Monthly Tasks.md`
- Create: `Gariel-Brain/PersonalOS/Services/tests/foundation.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: module registry notes with `type: personal-os-module`; settings keys `principle`, `blank_space`, `minimum_body_action`, `default_priority`; canonical monthly task header.

- [ ] **Step 1: Write the failing foundation test**

```js
// PersonalOS/Services/tests/foundation.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = (...parts) => fs.readFileSync(path.join(vault, ...parts), "utf8");

test("all seven module ids are registered and temporary stays enabled", () => {
  const ids = ["programming-english", "reading", "body", "life", "finance", "challenge", "temporary"];
  for (const id of ids) {
    const source = read("PersonalOS", "Module Registry", `${id}.md`);
    assert.match(source, /type:\s*personal-os-module/);
    assert.match(source, new RegExp(`id:\\s*${id}`));
    assert.match(source, /enabled:\s*true/);
  }
});

test("settings preserve the minimum-day principles", () => {
  const source = read("PersonalOS", "Settings.md");
  assert.match(source, /不补偿，不追赶/);
  assert.match(source, /走路 10 分钟或静坐 5 分钟/);
  assert.match(source, /default_priority:\s*P2/);
});

test("the initial month is readable empty Markdown", () => {
  assert.equal(read("PersonalOS", "Tasks", "2026", "2026-09.md"), "# 2026-09 Tasks\n");
});

test("QuickAdd can initialize later months from a canonical template", () => {
  assert.equal(read("PersonalOS", "Templates", "Monthly Tasks.md"), "# {{DATE:YYYY-MM}} Tasks\n");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain
node --test PersonalOS/Services/tests/foundation.test.js
```

Expected: FAIL with `ENOENT` for `PersonalOS/Module Registry/programming-english.md`.

- [ ] **Step 3: Create settings and module notes**

`PersonalOS/Settings.md`:

```yaml
---
type: personal-os-settings
principle: 只推进一件真正重要的事。不补偿，不追赶。中断以后，只需重新开始一个 25 分钟行动。
blank_space: 未安排的时间不需要被填满。今天不因为焦虑追加任务。
minimum_body_action: 走路 10 分钟或静坐 5 分钟
default_priority: P2
---
```

Create seven registry files with this exact schema, substituting the row values:

| file | id | name | icon | color | order | folders |
|---|---|---|---|---|---:|---|
| programming-english.md | programming-english | Programming + English | code-2 | #71836B | 10 | Programming, Language |
| reading.md | reading | 阅读 | book-open | #8C9A78 | 20 | Book |
| body.md | body | 身体 | heart-pulse | #79A38B | 30 | Exercise, Rest |
| life.md | life | 生活与探索 | compass | #B28D68 | 40 | Tourist, Photo, Music |
| finance.md | finance | 财经 | chart-no-axes-combined | #9A866E | 50 | Finance |
| challenge.md | challenge | Challenge | flag | #B47B68 | 60 | Challenge |
| temporary.md | temporary | 临时任务 | inbox | #8B8F91 | 99 | empty list |

```yaml
---
type: personal-os-module
id: programming-english
name: Programming + English
icon: code-2
color: "#71836B"
order: 10
enabled: true
folders:
  - Programming
  - Language
---
```

Create `PersonalOS/Tasks/2026/2026-09.md` with exactly:

```markdown
# 2026-09 Tasks
```

Create `PersonalOS/Templates/Monthly Tasks.md` with exactly:

```markdown
# {{DATE:YYYY-MM}} Tasks
```

- [ ] **Step 4: Run foundation verification**

Run:

```bash
node --test PersonalOS/Services/tests/foundation.test.js
git diff --check -- PersonalOS
```

Expected: 3 tests PASS; `git diff --check` prints nothing.

- [ ] **Step 5: Commit the foundation**

```bash
git add -- PersonalOS/Settings.md "PersonalOS/Module Registry" PersonalOS/Tasks/2026/2026-09.md "PersonalOS/Templates/Monthly Tasks.md" PersonalOS/Services/tests/foundation.test.js
git commit -m "feat: add Personal OS foundation"
```

---

### Task 2: 实现无 I/O 的任务格式模型

**Files:**
- Create: `Gariel-Brain/PersonalOS/Services/task-model.js`
- Create: `Gariel-Brain/PersonalOS/Services/tests/task-model.test.js`

**Interfaces:**
- Consumes: canonical task blocks from monthly Markdown files.
- Produces:
  - `parseTasks(source: string): Task[]`
  - `formatTask(input: TaskInput): string`
  - `replaceField(block: string, key: string, value: string): string`
  - `toggleCheckbox(block: string, done: boolean): string`
  - `validateTask(input: TaskInput, enabledModules: Set<string>): void`
  - `monthPath(date: string): string`
  - `assertTaskPath(path: string): void`

- [ ] **Step 1: Write parsing and validation tests**

```js
// PersonalOS/Services/tests/task-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../task-model");

const block = [
  "- [ ] 完成 Rails 登录验证",
  "  [task_id:: 20260904-091500-auth]",
  "  [date:: 2026-09-04]",
  "  [module:: programming-english]",
  "  [priority:: P1]",
  "  [goal:: [[完成 Rails 项目身份认证]]]",
  "  [custom:: keep-me]"
].join("\n");

test("parseTasks returns typed values and preserves the raw block", () => {
  const [task] = model.parseTasks(`# 2026-09 Tasks\n\n${block}\n`);
  assert.equal(task.title, "完成 Rails 登录验证");
  assert.equal(task.done, false);
  assert.equal(task.fields.priority, "P1");
  assert.equal(task.fields.goal, "[[完成 Rails 项目身份认证]]");
  assert.equal(task.raw, block);
});

test("replaceField preserves unknown fields", () => {
  const changed = model.replaceField(block, "priority", "P2");
  assert.match(changed, /\[priority:: P2\]/);
  assert.match(changed, /\[custom:: keep-me\]/);
});

test("formatTask emits the canonical multiline format", () => {
  const text = model.formatTask({
    title: "读书 20 分钟",
    task_id: "id-1",
    date: "2026-09-04",
    module: "reading",
    priority: "P2"
  });
  assert.equal(text, [
    "- [ ] 读书 20 分钟",
    "  [task_id:: id-1]",
    "  [date:: 2026-09-04]",
    "  [module:: reading]",
    "  [priority:: P2]"
  ].join("\n"));
});

test("validateTask rejects invalid modules and malformed links", () => {
  const modules = new Set(["reading"]);
  assert.throws(() => model.validateTask({ title: "x", date: "2026-09-04", module: "missing", priority: "P2" }, modules), /module/);
  assert.throws(() => model.validateTask({ title: "x", date: "2026-09-04", module: "reading", priority: "P2", output: "../escape" }, modules), /output/);
});

test("paths cannot escape PersonalOS Tasks", () => {
  assert.equal(model.monthPath("2026-09-04"), "PersonalOS/Tasks/2026/2026-09.md");
  assert.throws(() => model.assertTaskPath("../DailyNotes/2026-09-04.md"), /outside/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test PersonalOS/Services/tests/task-model.test.js`

Expected: FAIL with `Cannot find module '../task-model'`.

- [ ] **Step 3: Implement the minimal task model**

```js
// PersonalOS/Services/task-model.js
"use strict";

const FIELD = /^\s{2}\[([a-z_]+)::\s*((?:\[\[[^\]]+\]\]|[^\]])*)\]\s*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITIES = new Set(["P1", "P2", "P3"]);

function splitBlocks(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^- \[[ xX]\] /.test(lines[i])) continue;
    const part = [lines[i]];
    while (i + 1 < lines.length && /^\s{2}\[/.test(lines[i + 1])) part.push(lines[++i]);
    blocks.push(part.join("\n"));
  }
  return blocks;
}

function parseTasks(source) {
  return splitBlocks(source).map(raw => {
    const lines = raw.split("\n");
    const match = lines[0].match(/^- \[([ xX])\] (.+)$/);
    const fields = {};
    for (const line of lines.slice(1)) {
      const field = line.match(FIELD);
      if (field) fields[field[1]] = field[2].trim();
    }
    return { title: match[2], done: match[1].toLowerCase() === "x", fields, raw };
  });
}

function formatTask(input) {
  const ordered = ["task_id", "date", "module", "priority", "goal", "output", "started_at"];
  const lines = [`- [${input.done ? "x" : " "}] ${input.title.trim()}`];
  for (const key of ordered) if (input[key]) lines.push(`  [${key}:: ${input[key]}]`);
  return lines.join("\n");
}

function replaceField(block, key, value) {
  const pattern = new RegExp(`^  \\\[${key}::.*\\\]$`, "m");
  return pattern.test(block) ? block.replace(pattern, `  [${key}:: ${value}]`) : `${block}\n  [${key}:: ${value}]`;
}

function toggleCheckbox(block, done) {
  return block.replace(/^- \[[ xX]\]/, done ? "- [x]" : "- [ ]");
}

function validLink(value) {
  return value === undefined || /^\[\[[^\n]+\]\]$/.test(value);
}

function validateTask(input, enabledModules) {
  if (!input.title || !input.title.trim()) throw new Error("title is required");
  if (!DATE.test(input.date)) throw new Error("date must be YYYY-MM-DD");
  if (!enabledModules.has(input.module)) throw new Error("module is not enabled");
  if (!PRIORITIES.has(input.priority || "P2")) throw new Error("priority is invalid");
  if (!validLink(input.goal)) throw new Error("goal must be an internal link");
  if (!validLink(input.output)) throw new Error("output must be an internal link");
}

function monthPath(date) {
  if (!DATE.test(date)) throw new Error("date must be YYYY-MM-DD");
  return `PersonalOS/Tasks/${date.slice(0, 4)}/${date.slice(0, 7)}.md`;
}

function assertTaskPath(path) {
  if (!/^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(path)) throw new Error("path is outside PersonalOS Tasks");
}

module.exports = { parseTasks, formatTask, replaceField, toggleCheckbox, validateTask, monthPath, assertTaskPath };
```

- [ ] **Step 4: Run model tests**

Run:

```bash
node --test PersonalOS/Services/tests/task-model.test.js
node --check PersonalOS/Services/task-model.js
```

Expected: 5 tests PASS and syntax check exits 0.

- [ ] **Step 5: Commit the model**

```bash
git add -- PersonalOS/Services/task-model.js PersonalOS/Services/tests/task-model.test.js
git commit -m "feat: add Personal OS task model"
```

---

### Task 3: 实现受限 TaskStore 与回滚

**Files:**
- Create: `Gariel-Brain/PersonalOS/Services/task-store.js`
- Create: `Gariel-Brain/PersonalOS/Services/obsidian-adapter.js`
- Create: `Gariel-Brain/PersonalOS/Services/tests/task-store.test.js`

**Interfaces:**
- Consumes: Task 2 exports; an adapter with `exists(path)`, `read(path)`, `write(path, text)`, `mkdir(path)`, `remove(path)`.
- Produces:
  - `createTaskStore(adapter, options): TaskStore`
  - `TaskStore.create(input): Promise<Task>`
  - `TaskStore.setPriority(taskId, date, priority): Promise<void>`
  - `TaskStore.setDone(taskId, date, done): Promise<void>`
  - `TaskStore.start(taskId, date, timestamp): Promise<void>`
  - `TaskStore.move(taskId, oldDate, newDate): Promise<void>`
  - `createObsidianAdapter(app): Adapter`

- [ ] **Step 1: Write TaskStore integration tests with an in-memory adapter**

```js
// PersonalOS/Services/tests/task-store.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTaskStore } = require("../task-store");

function memoryAdapter(seed = {}) {
  const files = new Map(Object.entries(seed));
  return {
    files,
    async exists(path) { return files.has(path); },
    async read(path) { if (!files.has(path)) throw new Error("ENOENT"); return files.get(path); },
    async write(path, text) { files.set(path, text); },
    async mkdir() {},
    async remove(path) { files.delete(path); }
  };
}

test("creating a P1 demotes the existing P1 and preserves extra fields", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: [
    "# 2026-09 Tasks", "",
    "- [ ] 原主线",
    "  [task_id:: old]",
    "  [date:: 2026-09-04]",
    "  [module:: reading]",
    "  [priority:: P1]",
    "  [custom:: keep-me]", ""
  ].join("\n") });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]), idFactory: () => "new" });
  await store.create({ title: "新主线", date: "2026-09-04", module: "reading", priority: "P1" });
  const text = adapter.files.get(path);
  assert.match(text, /\[task_id:: old\][\s\S]*\[priority:: P2\][\s\S]*\[custom:: keep-me\]/);
  assert.match(text, /\[task_id:: new\][\s\S]*\[priority:: P1\]/);
});

test("completion changes only the selected checkbox", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: "# 2026-09 Tasks\n\n- [ ] A\n  [task_id:: a]\n  [date:: 2026-09-04]\n  [module:: reading]\n  [priority:: P2]\n" });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });
  await store.setDone("a", "2026-09-04", true);
  assert.match(adapter.files.get(path), /- \[x\] A/);
});

test("moving a P1 within one month demotes the destination date main", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: [
    "# 2026-09 Tasks", "",
    "- [ ] A", "  [task_id:: a]", "  [date:: 2026-09-04]", "  [module:: reading]", "  [priority:: P1]", "",
    "- [ ] B", "  [task_id:: b]", "  [date:: 2026-09-05]", "  [module:: reading]", "  [priority:: P1]", ""
  ].join("\n") });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });
  await store.move("a", "2026-09-04", "2026-09-05");
  const text = adapter.files.get(path);
  assert.match(text, /\[task_id:: a\][\s\S]*\[date:: 2026-09-05\][\s\S]*\[priority:: P1\]/);
  assert.match(text, /\[task_id:: b\][\s\S]*\[priority:: P2\]/);
});

test("cross-month move restores both snapshots when the second write fails", async () => {
  const oldPath = "PersonalOS/Tasks/2026/2026-09.md";
  const newPath = "PersonalOS/Tasks/2026/2026-10.md";
  const adapter = memoryAdapter({
    [oldPath]: "# 2026-09 Tasks\n\n- [ ] A\n  [task_id:: a]\n  [date:: 2026-09-30]\n  [module:: reading]\n  [priority:: P2]\n",
    [newPath]: "# 2026-10 Tasks\n"
  });
  const originalWrite = adapter.write;
  let writes = 0;
  adapter.write = async (path, text) => { writes += 1; if (writes === 2) throw new Error("disk"); return originalWrite(path, text); };
  const before = new Map(adapter.files);
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });
  await assert.rejects(store.move("a", "2026-09-30", "2026-10-01"), /disk/);
  assert.deepEqual(adapter.files, before);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test PersonalOS/Services/tests/task-store.test.js`

Expected: FAIL with `Cannot find module '../task-store'`.

- [ ] **Step 3: Implement TaskStore and Obsidian adapter**

`task-store.js` must:

```js
const model = require("./task-model");

function createTaskStore(adapter, options = {}) {
  const modules = options.enabledModules || new Set();
  const idFactory = options.idFactory || (() => new Date().toISOString().replace(/[-:.TZ]/g, ""));
  let queue = Promise.resolve();

  const serial = operation => {
    const next = queue.then(operation, operation);
    queue = next.catch(() => {});
    return next;
  };

  async function ensureMonth(date) {
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    if (!await adapter.exists(path)) {
      await adapter.mkdir(path.split("/").slice(0, -1).join("/"));
      await adapter.write(path, `# ${date.slice(0, 7)} Tasks\n`);
    }
    return path;
  }

  const appendBlock = (source, block) => `${source.trimEnd()}\n\n${block}\n`;
  const removeBlock = (source, block) => source
    .replace(`\n\n${block}\n`, "\n")
    .replace(`${block}\n`, "")
    .replace(/\n{3,}/g, "\n\n");

  function findTask(source, taskId) {
    const task = model.parseTasks(source).find(item => item.fields.task_id === taskId);
    if (!task) throw new Error(`task not found: ${taskId}`);
    return task;
  }

  function demoteOtherMainTasks(source, date, exceptId) {
    let next = source;
    for (const task of model.parseTasks(source)) {
      if (task.fields.date !== date || task.fields.priority !== "P1" || task.fields.task_id === exceptId) continue;
      next = next.replace(task.raw, model.replaceField(task.raw, "priority", "P2"));
    }
    return next;
  }

  async function createInternal(input) {
    const normalized = { priority: "P2", ...input };
    model.validateTask(normalized, modules);
    const path = await ensureMonth(normalized.date);
    let source = await adapter.read(path);
    if (model.parseTasks(source).some(task => task.fields.task_id === normalized.task_id)) {
      throw new Error(`duplicate task_id: ${normalized.task_id}`);
    }
    if (normalized.priority === "P1") source = demoteOtherMainTasks(source, normalized.date, normalized.task_id);
    const block = model.formatTask(normalized);
    await adapter.write(path, appendBlock(source, block));
    return model.parseTasks(block)[0];
  }

  async function updatePriority(taskId, date, priority) {
    if (!["P1", "P2", "P3"].includes(priority)) throw new Error("priority is invalid");
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    let source = await adapter.read(path);
    const task = findTask(source, taskId);
    if (priority === "P1") source = demoteOtherMainTasks(source, date, taskId);
    source = source.replace(task.raw, model.replaceField(task.raw, "priority", priority));
    await adapter.write(path, source);
  }

  async function updateDone(taskId, date, done) {
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    const source = await adapter.read(path);
    const task = findTask(source, taskId);
    await adapter.write(path, source.replace(task.raw, model.toggleCheckbox(task.raw, Boolean(done))));
  }

  async function updateStartedAt(taskId, date, timestamp) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) throw new Error("timestamp is invalid");
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    const source = await adapter.read(path);
    const task = findTask(source, taskId);
    await adapter.write(path, source.replace(task.raw, model.replaceField(task.raw, "started_at", timestamp)));
  }

  async function moveInternal(taskId, oldDate, newDate) {
    const oldPath = model.monthPath(oldDate);
    const newPath = model.monthPath(newDate);
    model.assertTaskPath(oldPath);
    model.assertTaskPath(newPath);
    if (oldPath === newPath) {
      const source = await adapter.read(oldPath);
      const task = findTask(source, taskId);
      let next = source;
      if (task.fields.priority === "P1") next = demoteOtherMainTasks(next, newDate, taskId);
      next = next.replace(task.raw, model.replaceField(task.raw, "date", newDate));
      await adapter.write(oldPath, next);
      return;
    }

    const oldSource = await adapter.read(oldPath);
    const newExisted = await adapter.exists(newPath);
    const newSource = newExisted ? await adapter.read(newPath) : `# ${newDate.slice(0, 7)} Tasks\n`;
    const task = findTask(oldSource, taskId);
    const moved = model.replaceField(task.raw, "date", newDate);
    const nextOld = removeBlock(oldSource, task.raw);
    let nextNew = newSource;
    if (task.fields.priority === "P1") nextNew = demoteOtherMainTasks(nextNew, newDate, taskId);
    nextNew = appendBlock(nextNew, moved);

    await adapter.mkdir(newPath.split("/").slice(0, -1).join("/"));
    try {
      await adapter.write(oldPath, nextOld);
      await adapter.write(newPath, nextNew);
    } catch (error) {
      await adapter.write(oldPath, oldSource);
      if (newExisted) await adapter.write(newPath, newSource);
      else if (await adapter.exists(newPath)) await adapter.remove(newPath);
      throw error;
    }
  }

  return {
    create(input) { return serial(() => createInternal({ priority: "P2", ...input, task_id: idFactory() })); },
    setPriority(taskId, date, priority) { return serial(() => updatePriority(taskId, date, priority)); },
    setDone(taskId, date, done) { return serial(() => updateDone(taskId, date, done)); },
    start(taskId, date, timestamp) { return serial(() => updateStartedAt(taskId, date, timestamp)); },
    move(taskId, oldDate, newDate) { return serial(() => moveInternal(taskId, oldDate, newDate)); }
  };
}

module.exports = { createTaskStore };
```

`obsidian-adapter.js`:

```js
"use strict";

function createObsidianAdapter(app) {
  return {
    exists: path => app.vault.adapter.exists(path),
    read: path => app.vault.adapter.read(path),
    write: (path, text) => app.vault.adapter.write(path, text),
    async mkdir(path) {
      const parts = path.split("/");
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        if (!await app.vault.adapter.exists(current)) await app.vault.adapter.mkdir(current);
      }
    },
    remove: path => app.vault.adapter.remove(path)
  };
}

module.exports = { createObsidianAdapter };
```

Do not add write methods for DailyNotes or knowledge directories.

- [ ] **Step 4: Run all service tests**

Run:

```bash
node --test PersonalOS/Services/tests/*.test.js
node --check PersonalOS/Services/task-store.js
node --check PersonalOS/Services/obsidian-adapter.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the store**

```bash
git add -- PersonalOS/Services/task-store.js PersonalOS/Services/obsidian-adapter.js PersonalOS/Services/tests/task-store.test.js
git commit -m "feat: add safe Personal OS task store"
```

---

### Task 4: 构建首页模型、视图与四个入口页

**Files:**
- Create: `Gariel-Brain/PersonalOS/Services/home-model.js`
- Create: `Gariel-Brain/PersonalOS/Services/tests/home-model.test.js`
- Create: `Gariel-Brain/PersonalOS/Views/home.js`
- Create: `Gariel-Brain/00 Home/Personal OS.md`
- Create: `Gariel-Brain/00 Home/目标中心.md`
- Create: `Gariel-Brain/00 Home/模块中心.md`
- Create: `Gariel-Brain/00 Home/复盘中心.md`

**Interfaces:**
- Consumes: `parseTasks`, module registry, settings, TaskStore and Obsidian adapter.
- Produces:
  - `selectToday(tasks, date): { main, body, others, invalid }`
  - Dataview custom view loaded by `dv.view("PersonalOS/Views/home")`.

- [ ] **Step 1: Write home selection tests**

```js
// PersonalOS/Services/tests/home-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { selectToday } = require("../home-model");

const task = (id, module, priority, date = "2026-09-04", done = false) => ({
  title: id, done, fields: { task_id: id, module, priority, date }
});

test("selectToday separates main, body and ordinary work", () => {
  const result = selectToday([
    task("main", "programming-english", "P1"),
    task("walk", "body", "P2"),
    task("read", "reading", "P2"),
    task("tomorrow", "reading", "P2", "2026-09-05")
  ], "2026-09-04");
  assert.equal(result.main.fields.task_id, "main");
  assert.equal(result.body.fields.task_id, "walk");
  assert.deepEqual(result.others.map(x => x.fields.task_id), ["read"]);
});

test("invalid or duplicate main tasks go to diagnostics without crashing", () => {
  const result = selectToday([task("a", "reading", "P1"), task("b", "reading", "P1"), { title: "broken", done: false, fields: {} }], "2026-09-04");
  assert.equal(result.main.fields.task_id, "a");
  assert.equal(result.invalid.length, 2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test PersonalOS/Services/tests/home-model.test.js`

Expected: FAIL with `Cannot find module '../home-model'`.

- [ ] **Step 3: Implement home-model and the Dataview view**

`home-model.js`:

```js
"use strict";

function selectToday(tasks, date) {
  const dated = tasks.filter(task => task.fields.date === date);
  const mains = dated.filter(task => task.fields.priority === "P1");
  const main = mains[0] || null;
  const body = dated.find(task => !task.done && task.fields.module === "body") || null;
  const invalid = [
    ...tasks.filter(task => !task.fields.task_id || !task.fields.date || !task.fields.module),
    ...mains.slice(1)
  ];
  const excluded = new Set([main, body, ...invalid].filter(Boolean));
  const others = dated.filter(task => !excluded.has(task));
  return { main, body, others, invalid };
}

module.exports = { selectToday };
```

`Views/home.js` must:

1. Read all `PersonalOS/Tasks/**/*.md` files through `app.vault.adapter.read`.
2. Load CommonJS services in dependency order with this local loader:

```js
const loaded = {};

async function loadModule(name, dependencies = {}) {
  const source = await app.vault.adapter.read(`PersonalOS/Services/${name}.js`);
  const module = { exports: {} };
  const localRequire = request => {
    const key = request.replace(/^\.\//, "");
    if (!(key in dependencies)) throw new Error(`unsupported service dependency: ${request}`);
    return dependencies[key];
  };
  new Function("module", "exports", "require", source)(module, module.exports, localRequire);
  loaded[name] = module.exports;
  return module.exports;
}

const taskModel = await loadModule("task-model");
const taskStoreModule = await loadModule("task-store", { "task-model": taskModel });
const adapterModule = await loadModule("obsidian-adapter");
const homeModel = await loadModule("home-model");
```

3. Build state and bind all mutations through TaskStore:

```js
const today = window.moment().format("YYYY-MM-DD");
const settings = dv.page("PersonalOS/Settings");
const modules = dv.pages('"PersonalOS/Module Registry"')
  .where(page => page.type === "personal-os-module" && page.enabled)
  .array();
const enabledModules = new Set(modules.map(page => String(page.id)));
const adapter = adapterModule.createObsidianAdapter(app);
const store = taskStoreModule.createTaskStore(adapter, { enabledModules });

async function readTasks() {
  const files = app.vault.getFiles().filter(file =>
    /^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(file.path)
  );
  const tasks = [];
  for (const file of files) {
    const parsed = taskModel.parseTasks(await app.vault.read(file));
    tasks.push(...parsed.map(task => ({ ...task, sourcePath: file.path })));
  }
  return tasks;
}

function action(parent, label, run) {
  const button = parent.createEl("button", { text: label, cls: "pos-action" });
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await run();
      await render();
    } catch (error) {
      button.disabled = false;
      parent.createDiv({ text: error.message, cls: "pos-error" });
    }
  });
}

async function render() {
  dv.container.empty();
  const root = dv.container.createDiv({ cls: "personal-os-dashboard" });
  const tasks = await readTasks();
  const state = homeModel.selectToday(tasks, today);

  const top = root.createDiv({ cls: "pos-top" });
  top.createEl("strong", { text: today });
  const dailyPath = `DailyNotes/${today}.md`;
  if (app.vault.getAbstractFileByPath(dailyPath)) {
    top.createEl("a", { text: "打开 Daily Note ↗", href: dailyPath, cls: "internal-link" });
  } else {
    top.createSpan({ text: "Daily Note 尚未创建", cls: "pos-muted" });
  }

  const hero = root.createDiv({ cls: "pos-hero" });
  hero.createEl("h1", { text: "只推进一件真正重要的事" });
  hero.createEl("p", { text: String(settings.principle) });

  const main = root.createDiv({ cls: "pos-card pos-main" });
  main.createEl("h2", { text: "🔥 唯一主线" });
  if (!state.main) {
    main.createEl("p", { text: "尚未选择今日主线" });
  } else {
    main.createEl("h3", { text: state.main.title });
    if (state.main.fields.output) {
      const outputPath = state.main.fields.output.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0];
      main.createEl("a", { text: "打开成果 ↗", href: outputPath, cls: "internal-link" });
    }
    action(main, state.main.done ? "恢复" : "完成", () =>
      store.setDone(state.main.fields.task_id, state.main.fields.date, !state.main.done)
    );
    action(main, "开始 25 分钟", () =>
      store.start(state.main.fields.task_id, state.main.fields.date, new Date().toISOString())
    );
  }

  const body = root.createDiv({ cls: "pos-card pos-body" });
  body.createEl("h2", { text: "🌿 身体照顾" });
  body.createEl("p", { text: state.body ? state.body.title : String(settings.minimum_body_action) });
  if (state.body) {
    action(body, state.body.done ? "恢复" : "完成", () =>
      store.setDone(state.body.fields.task_id, state.body.fields.date, !state.body.done)
    );
  }

  const blank = root.createDiv({ cls: "pos-card pos-blank" });
  blank.createEl("h2", { text: "☁️ 保护留白" });
  blank.createEl("p", { text: String(settings.blank_space) });

  const others = root.createDiv({ cls: "pos-card pos-others" });
  others.createEl("h2", { text: "其他今日任务" });
  for (const task of state.others) {
    const row = others.createDiv({ cls: "pos-task" });
    row.createSpan({ text: task.title });
    action(row, task.done ? "恢复" : "完成", () =>
      store.setDone(task.fields.task_id, task.fields.date, !task.done)
    );
    action(row, "设为主线", () =>
      store.setPriority(task.fields.task_id, task.fields.date, "P1")
    );
  }

  const capture = root.createDiv({ cls: "pos-card pos-capture" });
  capture.createEl("h2", { text: "快速添加" });
  const title = capture.createEl("input", { attr: { type: "text", placeholder: "输入一件需要完成的事…" } });
  const date = capture.createEl("input", { attr: { type: "date", value: today } });
  const module = capture.createEl("select");
  for (const item of modules.sort((a, b) => Number(a.order) - Number(b.order))) {
    module.createEl("option", { text: String(item.name), value: String(item.id) });
  }
  const submit = capture.createEl("button", { text: "＋ 添加", cls: "pos-action pos-primary" });
  submit.addEventListener("click", async () => {
    submit.disabled = true;
    try {
      await store.create({ title: title.value, date: date.value, module: module.value, priority: "P2" });
      title.value = "";
      await render();
    } catch (error) {
      submit.disabled = false;
      capture.createDiv({ text: error.message, cls: "pos-error" });
    }
  });

  const shortcuts = root.createDiv({ cls: "pos-shortcuts" });
  for (const [label, href] of [
    ["📚 阅读主页", "Book/阅读主页"],
    ["⌘ Programming", "Programming"],
    ["⚑ Challenge", "Challenge"],
    ["◎ 目标中心", "00 Home/目标中心"]
  ]) {
    shortcuts.createEl("a", { text: label, href, cls: "internal-link pos-shortcut" });
  }

  const activeWeek = dv.pages('"PersonalOS/Goals"')
    .where(page => page.type === "personal-os-goal" && page.level === "week" && page.status === "active")
    .sort(page => page.start, "desc")
    .first();
  const week = root.createDiv({ cls: "pos-card pos-week" });
  week.createEl("h2", { text: "本周重点" });
  if (!activeWeek) {
    week.createEl("p", { text: "尚未设置" });
  } else {
    const linked = tasks.filter(task => String(task.fields.goal || "").includes(activeWeek.file.name));
    week.createEl("p", { text: activeWeek.file.name });
    week.createEl("small", { text: `${linked.filter(task => task.done).length} / ${linked.length}` });
  }

  if (state.invalid.length) {
    const details = root.createEl("details", { cls: "pos-diagnostics" });
    details.createEl("summary", { text: `待整理（${state.invalid.length}）` });
    for (const task of state.invalid) {
      details.createEl("p", {
        text: `${task.title} · ${task.sourcePath || "未知来源"} · ${task.fields.task_id || "缺少 task_id"}`
      });
    }
  }
}

await render();
```

Do not add another write path. The final DOM order is: date/Daily Note, Hero, main task, body care, blank-space message, other tasks, quick-add form, knowledge shortcuts, week progress, collapsed diagnostics.

`00 Home/Personal OS.md`:

````markdown
---
cssclasses:
  - personal-os
tags:
  - moc
  - personal-os
---

```dataviewjs
await dv.view("PersonalOS/Views/home");
```
````

Create the other three entry pages with stable embeds that become populated when Tasks 6 and 7 add their data files:

`00 Home/目标中心.md`:

```markdown
---
cssclasses:
  - personal-os
---

[[00 Home/Personal OS|← Personal OS]]

# 目标中心

![[PersonalOS/Goals.base]]
```

`00 Home/模块中心.md`:

```markdown
---
cssclasses:
  - personal-os
---

[[00 Home/Personal OS|← Personal OS]]

# 模块中心

![[PersonalOS/Modules.base]]
```

`00 Home/复盘中心.md`:

````markdown
---
cssclasses:
  - personal-os
---

[[00 Home/Personal OS|← Personal OS]]

# 复盘中心

## 周复盘

```dataview
LIST FROM "PersonalOS/Reviews/Weekly"
SORT file.name DESC
```

## 月复盘

```dataview
LIST FROM "PersonalOS/Reviews/Monthly"
SORT file.name DESC
```
````

- [ ] **Step 4: Run automated and static checks**

Run:

```bash
node --test PersonalOS/Services/tests/*.test.js
node --check PersonalOS/Views/home.js
rg -n 'app\.vault\.(create|modify|delete|rename)' PersonalOS/Views/home.js
```

Expected: all tests PASS; syntax exits 0; final `rg` prints nothing because the view delegates writes to TaskStore.

- [ ] **Step 5: Manually smoke-test in Obsidian**

Open `00 Home/Personal OS.md` and verify:

- Empty main state is visible.
- Minimum body action is visible without creating a task.
- Today’s Daily Note link opens only when clicked.
- A temporary P2 task added through the page appears under “其他今日任务”.
- Setting it to P1 moves it to “唯一主线”.

Remove the temporary task through the Markdown file after the smoke test.

- [ ] **Step 6: Commit the home slice**

```bash
git add -- "00 Home" PersonalOS/Services/home-model.js PersonalOS/Services/tests/home-model.test.js PersonalOS/Views/home.js
git commit -m "feat: add Personal OS home dashboard"
```

---

### Task 5: 添加 QuickAdd 快速捕获且保留现有配置

**Files:**
- Modify: `Gariel-Brain/.obsidian/plugins/quickadd/data.json`
- Create: `Gariel-Brain/PersonalOS/Services/tests/quickadd-config.test.js`

**Interfaces:**
- Consumes: QuickAdd 2.20.0 Capture schema already present in `data.json`; `PersonalOS/Templates/Monthly Tasks.md`.
- Produces: command choice `Personal OS: 添加临时任务` targeting the current monthly file with fixed valid module `temporary` and default `P2`.

- [ ] **Step 1: Write a failing configuration test**

```js
// PersonalOS/Services/tests/quickadd-config.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const config = require(path.resolve(__dirname, "../../../.obsidian/plugins/quickadd/data.json"));

test("preserves Capture idea and adds exactly one safe Personal OS inbox capture", () => {
  assert.ok(config.choices.some(choice => choice.name === "Capture idea"));
  const choices = config.choices.filter(choice => choice.name === "Personal OS: 添加临时任务");
  assert.equal(choices.length, 1);
  assert.equal(choices[0].type, "Capture");
  assert.equal(choices[0].captureTo, "PersonalOS/Tasks/{{DATE:YYYY}}/{{DATE:YYYY-MM}}");
  assert.match(choices[0].format.format, /\[priority:: P2\]/);
  assert.match(choices[0].format.format, /\[module:: temporary\]/);
  assert.equal(choices[0].createFileIfItDoesntExist.template, "PersonalOS/Templates/Monthly Tasks.md");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test PersonalOS/Services/tests/quickadd-config.test.js`

Expected: FAIL because the Personal OS choice count is 0.

- [ ] **Step 3: Append one Capture choice**

Clone the existing `Capture idea` object so every QuickAdd 2.20.0 field remains valid, assign a new UUID, then set:

```json
{
  "name": "Personal OS: 添加临时任务",
  "type": "Capture",
  "command": true,
  "captureTo": "PersonalOS/Tasks/{{DATE:YYYY}}/{{DATE:YYYY-MM}}",
  "createFileIfItDoesntExist": {
    "enabled": true,
    "createWithTemplate": true,
    "template": "PersonalOS/Templates/Monthly Tasks.md"
  },
  "format": {
    "enabled": true,
    "format": "- [ ] {{VALUE:任务}}\n  [task_id:: {{DATE:YYYYMMDD-HHmmssSSS}}]\n  [date:: {{DATE:YYYY-MM-DD}}]\n  [module:: temporary]\n  [priority:: P2]"
  },
  "prepend": false,
  "newLineCapture": {
    "enabled": true,
    "direction": "below"
  }
}
```

Do not replace the whole config; preserve every pre-existing top-level key and choice.

- [ ] **Step 4: Verify JSON and QuickAdd behavior**

Run:

```bash
node --test PersonalOS/Services/tests/quickadd-config.test.js
node -e 'JSON.parse(require("node:fs").readFileSync(".obsidian/plugins/quickadd/data.json","utf8")); console.log("valid json")'
```

Expected: test PASS and `valid json`.

In Obsidian, run “QuickAdd: Personal OS: 添加临时任务”, enter `临时验证任务`, confirm it appears in the current month with module `temporary`, then remove that temporary block.

- [ ] **Step 5: Commit the QuickAdd integration**

```bash
git add -- .obsidian/plugins/quickadd/data.json PersonalOS/Services/tests/quickadd-config.test.js
git commit -m "feat: add Personal OS quick capture"
```

---

### Task 6: 添加目标、模块管理和 Bases

**Files:**
- Create: `Gariel-Brain/PersonalOS/Goals.base`
- Create: `Gariel-Brain/PersonalOS/Modules.base`
- Create: `Gariel-Brain/PersonalOS/Templates/Goal.md`
- Create: `Gariel-Brain/PersonalOS/Services/tests/bases.test.js`

**Interfaces:**
- Consumes: module registry from Task 1 and Obsidian Bases core plugin.
- Produces: editable goal/module tables and the exact goal property contract.

- [ ] **Step 1: Write failing Bases contract tests**

```js
// PersonalOS/Services/tests/bases.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vault = path.resolve(__dirname, "../../..");
const read = file => fs.readFileSync(path.join(vault, file), "utf8");

test("goal base filters only Personal OS goals and exposes hierarchy fields", () => {
  const source = read("PersonalOS/Goals.base");
  assert.match(source, /file\.inFolder\("PersonalOS\/Goals"\)/);
  for (const field of ["level", "status", "module", "parent", "start", "end", "success_criteria"]) {
    assert.match(source, new RegExp(`note\\.${field}|note\\["${field}"\\]`));
  }
});

test("module base cannot hide the temporary registry row by folder scope", () => {
  const source = read("PersonalOS/Modules.base");
  assert.match(source, /file\.inFolder\("PersonalOS\/Module Registry"\)/);
  assert.match(read("PersonalOS/Module Registry/temporary.md"), /enabled:\s*true/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test PersonalOS/Services/tests/bases.test.js`

Expected: FAIL with `ENOENT` for `PersonalOS/Goals.base`.

- [ ] **Step 3: Create the goal template and Base definitions**

`PersonalOS/Templates/Goal.md`:

```markdown
---
type: personal-os-goal
level: direction
status: active
module: temporary
parent:
start: <% tp.date.now("YYYY-MM-DD") %>
end:
success_criteria:
---

# <% tp.file.title %>
```

`PersonalOS/Goals.base`:

```yaml
filters:
  and:
    - file.inFolder("PersonalOS/Goals")
    - note["type"] == "personal-os-goal"
properties:
  file.name:
    displayName: 目标
  note["level"]:
    displayName: 层级
  note["status"]:
    displayName: 状态
  note["module"]:
    displayName: 模块
  note["parent"]:
    displayName: 上级目标
  note["start"]:
    displayName: 开始
  note["end"]:
    displayName: 结束
  note["success_criteria"]:
    displayName: 成功标准
views:
  - type: table
    name: 活动目标
    filters: note["status"] == "active"
    order:
      - file.name
      - note["level"]
      - note["module"]
      - note["parent"]
      - note["start"]
      - note["end"]
      - note["success_criteria"]
  - type: table
    name: 按模块
    groupBy:
      property: note["module"]
      direction: ASC
    order:
      - file.name
      - note["level"]
      - note["status"]
      - note["parent"]
  - type: table
    name: 全部目标
    order:
      - file.name
      - note["level"]
      - note["status"]
      - note["module"]
      - note["parent"]
```

`PersonalOS/Modules.base`:

```yaml
filters:
  and:
    - file.inFolder("PersonalOS/Module Registry")
    - note["type"] == "personal-os-module"
properties:
  note["name"]:
    displayName: 模块
  note["id"]:
    displayName: ID
  note["enabled"]:
    displayName: 启用
  note["order"]:
    displayName: 顺序
  note["folders"]:
    displayName: 知识目录
  note["icon"]:
    displayName: 图标
  note["color"]:
    displayName: 颜色
views:
  - type: table
    name: 模块注册表
    order:
      - note["name"]
      - note["id"]
      - note["enabled"]
      - note["order"]
      - note["folders"]
      - note["icon"]
      - note["color"]
    sort:
      - property: note["order"]
        direction: ASC
```

Embed them:

```markdown
![[PersonalOS/Goals.base]]
```

```markdown
![[PersonalOS/Modules.base]]
```

- [ ] **Step 4: Verify Bases and properties**

Run:

```bash
node --test PersonalOS/Services/tests/bases.test.js
rg -n "FIXME|XXX" PersonalOS/Goals.base PersonalOS/Modules.base PersonalOS/Templates/Goal.md
```

Expected: tests PASS; placeholder scan prints nothing.

Open both center pages in Obsidian and verify the tables render. Create one temporary goal from the template, edit it in Bases, then delete only that temporary goal.

- [ ] **Step 5: Commit goal and module management**

```bash
git add -- PersonalOS/Goals.base PersonalOS/Modules.base PersonalOS/Templates/Goal.md PersonalOS/Services/tests/bases.test.js
git commit -m "feat: add Personal OS goal and module views"
```

---

### Task 7: 实现周复盘和月复盘

**Files:**
- Create: `Gariel-Brain/PersonalOS/Services/review-model.js`
- Create: `Gariel-Brain/PersonalOS/Services/tests/review-model.test.js`
- Create: `Gariel-Brain/PersonalOS/Views/review.js`
- Create: `Gariel-Brain/PersonalOS/Templates/Weekly Review.md`
- Create: `Gariel-Brain/PersonalOS/Templates/Monthly Review.md`

**Interfaces:**
- Consumes: parsed tasks from Task 2 and read-only DailyNote text.
- Produces:
  - `dateRange(kind, anchor): { start, end }`
  - `summarize(tasks, range): ReviewSummary`
  - read-only review view accepting `{ kind: "week" | "month", anchor: "YYYY-MM-DD" }`.

- [ ] **Step 1: Write review aggregation tests**

```js
// PersonalOS/Services/tests/review-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { dateRange, summarize } = require("../review-model");

const task = (id, date, module, priority, done) => ({ title: id, done, fields: { task_id: id, date, module, priority } });

test("week range starts Monday and ends Sunday", () => {
  assert.deepEqual(dateRange("week", "2026-09-04"), { start: "2026-08-31", end: "2026-09-06" });
});

test("summary counts modules and daily main completion", () => {
  const summary = summarize([
    task("a", "2026-09-01", "reading", "P1", true),
    task("b", "2026-09-01", "reading", "P2", false),
    task("c", "2026-09-02", "body", "P1", false)
  ], { start: "2026-08-31", end: "2026-09-06" });
  assert.deepEqual(summary.modules.reading, { total: 2, done: 1 });
  assert.equal(summary.main.total, 2);
  assert.equal(summary.main.done, 1);
  assert.deepEqual(summary.carryover.map(x => x.fields.task_id), ["b", "c"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test PersonalOS/Services/tests/review-model.test.js`

Expected: FAIL with `Cannot find module '../review-model'`.

- [ ] **Step 3: Implement review model and templates**

`review-model.js` uses UTC date arithmetic to avoid timezone drift:

```js
"use strict";

const iso = date => date.toISOString().slice(0, 10);
const parse = value => new Date(`${value}T00:00:00Z`);

function dateRange(kind, anchor) {
  const date = parse(anchor);
  if (kind === "week") {
    const day = (date.getUTCDay() + 6) % 7;
    const start = new Date(date); start.setUTCDate(date.getUTCDate() - day);
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    return { start: iso(start), end: iso(end) };
  }
  if (kind === "month") {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return { start: iso(start), end: iso(end) };
  }
  throw new Error("kind must be week or month");
}

function summarize(tasks, range) {
  const selected = tasks.filter(task => task.fields.date >= range.start && task.fields.date <= range.end);
  const modules = {};
  for (const task of selected) {
    const bucket = modules[task.fields.module] ||= { total: 0, done: 0 };
    bucket.total += 1;
    if (task.done) bucket.done += 1;
  }
  const mains = selected.filter(task => task.fields.priority === "P1");
  return {
    modules,
    main: { total: mains.length, done: mains.filter(task => task.done).length },
    carryover: selected.filter(task => !task.done)
  };
}

module.exports = { dateRange, summarize };
```

`Views/review.js` loads only the two pure modules it needs and reads DailyNotes without writing:

```js
async function loadModule(name, dependencies = {}) {
  const source = await app.vault.adapter.read(`PersonalOS/Services/${name}.js`);
  const module = { exports: {} };
  const localRequire = request => {
    const key = request.replace(/^\.\//, "");
    if (!(key in dependencies)) throw new Error(`unsupported service dependency: ${request}`);
    return dependencies[key];
  };
  new Function("module", "exports", "require", source)(module, module.exports, localRequire);
  return module.exports;
}

const taskModel = await loadModule("task-model");
const reviewModel = await loadModule("review-model");
const range = reviewModel.dateRange(input.kind, input.anchor);
const taskFiles = app.vault.getFiles().filter(file =>
  /^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(file.path)
);
const tasks = [];
for (const file of taskFiles) {
  tasks.push(...taskModel.parseTasks(await app.vault.read(file)));
}
const summary = reviewModel.summarize(tasks, range);
const dailyFiles = app.vault.getFiles().filter(file =>
  /^DailyNotes\/\d{4}-\d{2}-\d{2}\.md$/.test(file.path) &&
  file.basename >= range.start &&
  file.basename <= range.end
);

dv.header(2, input.kind === "week" ? "本周自动摘要" : "本月自动摘要");
dv.paragraph(`唯一主线：${summary.main.done} / ${summary.main.total}`);
dv.table(
  ["模块", "完成", "总数"],
  Object.entries(summary.modules).map(([module, counts]) => [module, counts.done, counts.total])
);
dv.header(3, "未完成与延期");
dv.list(summary.carryover.map(task => task.title));
dv.header(3, "Daily Note");
dv.list(dailyFiles.map(file => dv.fileLink(file.path)));
```

Weekly template properties: `type: personal-os-weekly-review`, `anchor`, `cssclasses: [personal-os]`. Monthly template uses `type: personal-os-monthly-review`. Both call:

```dataviewjs
await dv.view("PersonalOS/Views/review", {
  kind: dv.current().type === "personal-os-weekly-review" ? "week" : "month",
  anchor: String(dv.current().anchor)
});
```

Weekly manual headings must be exactly:

```markdown
## 本周保留什么
## 本周停止什么
## 下周唯一重点
```

Monthly manual heading must include `## 下月唯一方向`.

- [ ] **Step 4: Verify review behavior**

Run:

```bash
node --test PersonalOS/Services/tests/review-model.test.js
node --check PersonalOS/Views/review.js
```

Expected: all tests PASS.

Create temporary review notes under `PersonalOS/Reviews/Weekly/` and `Monthly/`, verify both views render, then delete only those temporary notes.

- [ ] **Step 5: Commit reviews**

```bash
git add -- PersonalOS/Services/review-model.js PersonalOS/Services/tests/review-model.test.js PersonalOS/Views/review.js PersonalOS/Templates/Weekly\ Review.md PersonalOS/Templates/Monthly\ Review.md
git commit -m "feat: add Personal OS reviews"
```

---

### Task 8: 应用已批准的视觉样式

**Files:**
- Create: `Gariel-Brain/.obsidian/snippets/personal-os.css`
- Create: `Gariel-Brain/PersonalOS/Assets/home-hero.png`
- Create: `Gariel-Brain/PersonalOS/Services/tests/visual-config.test.js`

**Interfaces:**
- Consumes: `cssclasses: [personal-os]` from home and review pages.
- Produces: scoped warm-paper/sage/gold theme and local Hero asset.

- [ ] **Step 1: Write a failing visual scope test**

```js
// PersonalOS/Services/tests/visual-config.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vault = path.resolve(__dirname, "../../..");

test("every selector is scoped and the local hero exists", () => {
  const css = fs.readFileSync(path.join(vault, ".obsidian/snippets/personal-os.css"), "utf8");
  const selectors = css.split("{").slice(0, -1).map(part => part.split("}").pop().trim()).filter(Boolean);
  for (const selector of selectors) assert.match(selector, /\.personal-os/);
  assert.ok(fs.statSync(path.join(vault, "PersonalOS/Assets/home-hero.png")).size > 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test PersonalOS/Services/tests/visual-config.test.js`

Expected: FAIL because the scoped stylesheet and local Hero do not exist.

- [ ] **Step 3: Create scoped CSS and copy the approved asset**

Every CSS selector must begin with one of:

```css
.personal-os.markdown-preview-view
.personal-os.markdown-source-view
.personal-os .personal-os-dashboard
```

Define only these design tokens:

```css
.personal-os.markdown-preview-view {
  --pos-ink: #2e372f;
  --pos-muted: #778078;
  --pos-sage: #71836b;
  --pos-paper: #fffdf8;
  --pos-cream: #f8f6ee;
  --pos-line: #dfe4dc;
  --pos-gold: #c58e52;
}
```

Copy the approved preview asset:

```bash
cp /Users/gaowanxing/.codex/visualizations/2026/09/01/01a05be0-1e37-7a41-8527-28d40e9915e8/home-hero-preview.png PersonalOS/Assets/home-hero.png
```

Because `.obsidian/appearance.json` already contains unrelated user changes, do not edit or stage it. In Obsidian, open **Settings → Appearance → CSS snippets** and enable `personal-os` manually. Confirm `photo-gallery` and `reading-home` remain enabled.

- [ ] **Step 4: Verify asset, JSON and visual isolation**

Run:

```bash
node --test PersonalOS/Services/tests/visual-config.test.js
file PersonalOS/Assets/home-hero.png
```

Expected: test PASS; `file` reports PNG image data.

Open one ordinary note and one Personal OS page side by side. Verify the ordinary note is visually unchanged.

- [ ] **Step 5: Commit visual styling**

```bash
git add -- .obsidian/snippets/personal-os.css PersonalOS/Assets/home-hero.png PersonalOS/Services/tests/visual-config.test.js
git commit -m "style: add scoped Personal OS theme"
```

---

### Task 9: 归档旧首页并完成端到端验收

**Files:**
- Move: `Gariel-Brain/🏠 我的知识宇宙.md` → `Gariel-Brain/Archive/旧首页/🏠 我的知识宇宙.md`
- Modify only if found by backlink scan: files containing an exact wiki-link to the old homepage
- Create: `Gariel-Brain/PersonalOS/Services/tests/vault-contract.test.js`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: one active Personal OS homepage, recoverable old homepage, and a full contract check.

- [ ] **Step 1: Scan and record exact backlinks before moving**

Run:

```bash
cd /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain
rg -l '\[\[(🏠 )?我的知识宇宙(\||\]\])' --glob '*.md' .
```

Expected: a finite list. Do not modify any file not printed by this command.

- [ ] **Step 2: Write a failing Vault contract test**

```js
// PersonalOS/Services/tests/vault-contract.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vault = path.resolve(__dirname, "../../..");

test("the new home exists and the old home is recoverably archived", () => {
  assert.ok(fs.existsSync(path.join(vault, "00 Home/Personal OS.md")));
  assert.ok(fs.existsSync(path.join(vault, "Archive/旧首页/🏠 我的知识宇宙.md")));
  assert.equal(fs.existsSync(path.join(vault, "🏠 我的知识宇宙.md")), false);
});

test("runtime JavaScript has no direct write target outside PersonalOS", () => {
  const roots = ["PersonalOS/Views", "PersonalOS/Services"];
  const files = roots.flatMap(root => fs.readdirSync(path.join(vault, root))
    .filter(name => name.endsWith(".js"))
    .map(name => path.join(vault, root, name)));
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /DailyNotes.*(?:write|modify|create)|(?:write|modify|create).*DailyNotes/);
    assert.doesNotMatch(source, /Book.*(?:write|modify|create)|(?:write|modify|create).*Book/);
  }
});
```

- [ ] **Step 3: Run the contract test to verify the transition test fails**

Run: `node --test PersonalOS/Services/tests/vault-contract.test.js`

Expected: first test FAIL because the archived file does not yet exist.

- [ ] **Step 4: Update exact backlinks and archive the page**

For each file printed in Step 1, replace only:

```text
[[00 Home/Personal OS]]
[[00 Home/Personal OS]]
```

with:

```text
[[00 Home/Personal OS]]
```

Then:

```bash
mkdir -p "Archive/旧首页"
mv "🏠 我的知识宇宙.md" "Archive/旧首页/🏠 我的知识宇宙.md"
```

Do not delete the archived file.

- [ ] **Step 5: Run full automated verification**

Run:

```bash
node --test PersonalOS/Services/tests/*.test.js
find PersonalOS -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check
rg -n "FIXME|XXX|待补充|以后实现" "00 Home" PersonalOS .obsidian/snippets/personal-os.css
```

Expected: all tests PASS; all syntax checks exit 0; diff check prints nothing; placeholder scan prints nothing.

- [ ] **Step 6: Perform Obsidian acceptance walkthrough**

Verify in this order:

1. Open `00 Home/Personal OS.md`.
2. Confirm date, Hero, empty-or-current main, body care, leave-blank message and Daily Note link.
3. Add one P2 task with module `temporary`.
4. Promote it to P1; confirm any old same-day P1 becomes P2.
5. Click “开始 25 分钟”; confirm only `started_at` is added.
6. Complete it; confirm only its checkbox changes.
7. Open its output link if present; confirm no knowledge file was auto-created.
8. Open goal and module Bases.
9. Open weekly and monthly review views.
10. Disable Dataview temporarily; confirm monthly task Markdown remains readable.
11. Re-enable Dataview and remove the temporary acceptance task.

- [ ] **Step 7: Review the final scoped diff**

Run:

```bash
git status --short
git diff --stat
git diff -- "00 Home" PersonalOS .obsidian/plugins/quickadd/data.json .obsidian/snippets/personal-os.css "Archive/旧首页/🏠 我的知识宇宙.md"
```

Expected: only planned paths plus exact backlink files from Step 1 are part of this feature. Existing unrelated user changes remain unstaged.

- [ ] **Step 8: Commit the transition**

```bash
git add -- PersonalOS/Services/tests/vault-contract.test.js
git add -A -- "🏠 我的知识宇宙.md" "Archive/旧首页/🏠 我的知识宇宙.md"
# Stage only the exact backlink files identified in Step 1.
git commit -m "feat: activate Gariel-Brain Personal OS"
```

Do not stage unrelated files with `git add -A` or `git add .`.

---

## Completion Evidence

Before calling the implementation complete, capture:

- Output of `node --test PersonalOS/Services/tests/*.test.js`.
- Output of JavaScript syntax checks.
- Scoped `git status --short` and final commit file list.
- Confirmation that `Archive/旧首页/🏠 我的知识宇宙.md` exists.
- Confirmation that no original knowledge note or Daily Note was modified by runtime actions.
- One screenshot of the Personal OS homepage in Obsidian.
