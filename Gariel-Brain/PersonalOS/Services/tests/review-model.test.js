const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { dailyHighlights, dateRange, normalizeAnchor, summarize } = require("../review-model");

const task = (id, date, module, priority, done) => ({
  title: id,
  done,
  fields: { task_id: id, date, module, priority }
});

test("week range starts Monday and ends Sunday across a month boundary", () => {
  assert.deepEqual(dateRange("week", "2026-09-04"), {
    start: "2026-08-31",
    end: "2026-09-06"
  });
});

test("month range uses the real last day in UTC", () => {
  assert.deepEqual(dateRange("month", "2024-02-29"), {
    start: "2024-02-01",
    end: "2024-02-29"
  });
});

test("dateRange rejects unsupported kinds and invalid calendar dates", () => {
  assert.throws(() => dateRange("year", "2026-09-04"), /week or month/);
  for (const value of ["2026-9-04", "2026-02-29", "2026-02-30", "not-a-date"]) {
    assert.throws(() => dateRange("week", value), /valid YYYY-MM-DD/);
  }
});

test("Luxon-like Dataview anchors normalize before strict date validation", () => {
  const anchor = { toISODate: () => "2026-09-04", toString: () => "September 4" };
  assert.equal(normalizeAnchor(anchor), "2026-09-04");
  assert.deepEqual(dateRange("week", anchor), { start: "2026-08-31", end: "2026-09-06" });
});

test("summary counts modules and daily main completion", () => {
  const summary = summarize([
    task("a", "2026-09-01", "reading", "P1", true),
    task("b", "2026-09-01", "reading", "P2", false),
    task("c", "2026-09-02", "body", "P1", false),
    task("outside", "2026-09-07", "reading", "P1", false)
  ], { start: "2026-08-31", end: "2026-09-06" });

  assert.deepEqual(summary.modules.reading, { total: 2, done: 1 });
  assert.deepEqual(summary.modules.body, { total: 1, done: 0 });
  assert.equal(summary.main.total, 2);
  assert.equal(summary.main.done, 1);
  assert.deepEqual(summary.carryover.map(item => item.fields.task_id), ["b", "c"]);
});

test("summary rejects malformed or reversed ranges", () => {
  assert.throws(() => summarize([], { start: "2026-02-30", end: "2026-03-01" }), /valid YYYY-MM-DD/);
  assert.throws(() => summarize([], { start: "2026-09-06", end: "2026-08-31" }), /start must not be after end/);
});

test("carryover is chronological regardless of task-file traversal order", () => {
  const summary = summarize([
    task("later", "2026-09-03", "reading", "P2", false),
    task("same-z", "2026-09-01", "reading", "P2", false),
    task("same-a", "2026-09-01", "reading", "P2", false)
  ], { start: "2026-09-01", end: "2026-09-30" });
  assert.deepEqual(summary.carryover.map(item => item.fields.task_id), ["same-a", "same-z", "later"]);
});

test("Daily Note highlights return payloads and ignore empty Markdown placeholders", () => {
  const source = [
    "- [ ] **成果输出：**",
    "- [x] **成果输出：** 完成 [[Personal OS]]",
    "- **Blocker:** 睡眠不足",
    "下一步：整理复盘",
    "普通内容"
  ].join("\n");
  assert.deepEqual(dailyHighlights(source), ["完成 [[Personal OS]]", "睡眠不足", "整理复盘"]);
});

test("review templates pass the raw Dataview anchor to the review view", () => {
  const templates = ["Weekly Review.md", "Monthly Review.md"];
  for (const name of templates) {
    const source = fs.readFileSync(path.join(__dirname, "../../Templates", name), "utf8");
    const codeBlock = source.match(/```dataviewjs\n([\s\S]*?)\n```/)?.[1] || "";
    assert.match(codeBlock, /anchor:\s*dv\.current\(\)\.anchor\s*[,\n]/, name);
    assert.doesNotMatch(codeBlock, /anchor:\s*String\s*\(/, name);
  }
});
