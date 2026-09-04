const test = require("node:test");
const assert = require("node:assert/strict");
const { parseInternalLink, selectToday } = require("../home-model");

const enabledModules = new Set(["programming-english", "reading", "body"]);
const task = (id, module, priority, date = "2026-09-04", done = false, extra = {}) => ({
  title: id, done, fields: { task_id: id, module, priority, date, ...extra }
});

test("selectToday separates main, body and ordinary work", () => {
  const result = selectToday([
    task("main", "programming-english", "P1"),
    task("walk", "body", "P2"),
    task("read", "reading", "P2"),
    task("tomorrow", "reading", "P2", "2026-09-05")
  ], "2026-09-04", { enabledModules });
  assert.equal(result.main.fields.task_id, "main");
  assert.equal(result.body.fields.task_id, "walk");
  assert.deepEqual(result.others.map(x => x.fields.task_id), ["read"]);
});

test("invalid or duplicate main tasks go to diagnostics without crashing", () => {
  const result = selectToday([task("a", "reading", "P1"), task("b", "reading", "P1"), { title: "broken", done: false, fields: {} }], "2026-09-04", { enabledModules });
  assert.equal(result.main.fields.task_id, "a");
  assert.equal(result.invalid.length, 2);
});

test("invalid tasks cannot become actionable selections", () => {
  const result = selectToday([
    task("bad-main", "unknown", "P1"),
    task("good-main", "reading", "P1"),
    task("bad-date", "body", "P2", "09/04/2026"),
    task("bad-priority", "reading", "urgent")
  ], "2026-09-04", { enabledModules });

  assert.equal(result.main.fields.task_id, "good-main");
  assert.equal(result.body, null);
  assert.deepEqual(result.others, []);
  assert.deepEqual(result.invalid.map(item => item.fields.task_id), ["bad-main", "bad-date", "bad-priority"]);
});

test("a duplicate P1 body task is diagnostic only", () => {
  const result = selectToday([
    task("main", "reading", "P1"),
    task("duplicate-body", "body", "P1"),
    task("ordinary-body", "body", "P2")
  ], "2026-09-04", { enabledModules });

  assert.equal(result.body.fields.task_id, "ordinary-body");
  assert.deepEqual(result.others, []);
  assert.deepEqual(result.invalid.map(item => item.fields.task_id), ["duplicate-body"]);
});

test("missing goal or output targets are diagnostic and links keep their labels", () => {
  const result = selectToday([
    task("broken", "reading", "P2", "2026-09-04", false, {
      goal: "[[Goals/Missing|目标别名]]",
      output: "[[Book/Existing|成果别名]]"
    }),
    task("working", "reading", "P2", "2026-09-04", false, {
      output: "[[Book/Existing|保留显示文本]]"
    })
  ], "2026-09-04", {
    enabledModules,
    linkExists: target => target === "Book/Existing"
  });

  assert.deepEqual(result.others.map(item => item.fields.task_id), ["working"]);
  assert.equal(result.invalid[0].fields.goal, "[[Goals/Missing|目标别名]]");
  assert.match(result.invalid[0].diagnostic, /Goals\/Missing/);
  assert.deepEqual(parseInternalLink("[[Book/Existing|成果别名]]"), {
    target: "Book/Existing",
    label: "成果别名"
  });
});
