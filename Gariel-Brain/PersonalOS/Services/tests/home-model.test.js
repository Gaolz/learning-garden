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
