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

test("toggleCheckbox changes only the checkbox marker", () => {
  const changed = model.toggleCheckbox(block, true);
  assert.match(changed, /^- \[x\] 完成 Rails 登录验证/);
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

test("validateTask requires a stable task id", () => {
  assert.throws(() => model.validateTask({ title: "x", date: "2026-09-04", module: "reading", priority: "P2" }, new Set(["reading"])), /task_id/);
});

test("validateTask rejects impossible dates and accepts leap day", () => {
  const base = { title: "x", task_id: "id-1", module: "reading", priority: "P2" };
  const modules = new Set(["reading"]);
  for (const date of ["2026-13-40", "2026-02-30", "2025-02-29"]) {
    assert.throws(() => model.validateTask({ ...base, date }, modules), /date/);
    assert.throws(() => model.monthPath(date), /date/);
  }
  assert.doesNotThrow(() => model.validateTask({ ...base, date: "2024-02-29" }, modules));
  assert.equal(model.monthPath("2024-02-29"), "PersonalOS/Tasks/2024/2024-02.md");
});

test("validateTask rejects multiline titles and task ids", () => {
  const valid = { title: "x", task_id: "id-1", date: "2026-09-04", module: "reading", priority: "P2" };
  assert.throws(() => model.validateTask({ ...valid, title: "x\n- [ ] injected" }, new Set(["reading"])), /line break/);
  assert.throws(() => model.validateTask({ ...valid, task_id: "id-1\r\nnext" }, new Set(["reading"])), /line break/);
});

test("paths cannot escape PersonalOS Tasks", () => {
  assert.equal(model.monthPath("2026-09-04"), "PersonalOS/Tasks/2026/2026-09.md");
  assert.throws(() => model.assertTaskPath("../DailyNotes/2026-09-04.md"), /outside/);
});
