const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  challengeProgress,
  completedReadings,
  dailyHighlights,
  dateRange,
  normalizeAnchor,
  repeatedBlockers,
  summarize,
  weeklyFocuses
} = require("../review-model");

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

test("Challenge progress counts checklist cells in the existing table", () => {
  const source = [
    "| # | Challenge | Done |",
    "|---|---|---|",
    "| 1 | A | [x] |",
    "| 2 | B | [ ] |",
    "| 3 | C | [X] |"
  ].join("\n");
  assert.deepEqual(challengeProgress(source), { done: 2, total: 3 });
});

test("monthly summary extracts weekly focus in anchor order", () => {
  const reviews = [
    { path: "PersonalOS/Reviews/Weekly/late.md", source: "---\nanchor: 2026-09-21\n---\n## 下周唯一重点\n- 发布 v1\n" },
    { path: "PersonalOS/Reviews/Weekly/early.md", source: "---\nanchor: 2026-09-07\n---\n## 下周唯一重点\n完成首页\n" },
    { path: "PersonalOS/Reviews/Weekly/outside.md", source: "---\nanchor: 2026-10-01\n---\n## 下周唯一重点\n十月事项\n" }
  ];
  assert.deepEqual(weeklyFocuses(reviews, { start: "2026-09-01", end: "2026-09-30" }), [
    { date: "2026-09-07", text: "完成首页", path: "PersonalOS/Reviews/Weekly/early.md" },
    { date: "2026-09-21", text: "发布 v1", path: "PersonalOS/Reviews/Weekly/late.md" }
  ]);
});

test("monthly summary selects completed reading notes by completion date", () => {
  const readings = [
    { path: "Book/01_Readings/B.md", basename: "B", source: "---\n状态: 已读\n结束日期: 2026-09-20\n---\n" },
    { path: "Book/01_Readings/A.md", basename: "A", source: "---\n状态: 已读\n结束日期: 2026-09-02\n---\n" },
    { path: "Book/01_Readings/Reading.md", basename: "Reading", source: "---\n状态: 阅读中\n结束日期: 2026-09-03\n---\n" },
    { path: "Book/01_Readings/Old.md", basename: "Old", source: "---\n状态: 已读\n结束日期: 2026-08-31\n---\n" }
  ];
  assert.deepEqual(completedReadings(readings, { start: "2026-09-01", end: "2026-09-30" }), [
    { title: "A", date: "2026-09-02", path: "Book/01_Readings/A.md" },
    { title: "B", date: "2026-09-20", path: "Book/01_Readings/B.md" }
  ]);
});

test("monthly summary reports only repeated blockers from weekly and Daily Notes", () => {
  const weekly = [
    { path: "w1.md", source: "---\nanchor: 2026-09-07\n---\n## 本周停止什么\n- 睡眠不足\n- 临时会议\n" },
    { path: "w2.md", source: "---\nanchor: 2026-09-14\n---\n## Blocker\n睡眠不足\n" }
  ];
  const daily = [
    { path: "DailyNotes/2026-09-01.md", source: "- **Blocker:** 睡眠不足\n" },
    { path: "DailyNotes/2026-09-02.md", source: "阻碍：需求不清\n" }
  ];
  assert.deepEqual(repeatedBlockers(weekly, daily, { start: "2026-09-01", end: "2026-09-30" }), [
    { text: "睡眠不足", count: 3 }
  ]);
});

test("review view exposes the approved weekly and monthly read-only summaries", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../Views/review.js"), "utf8");
  for (const heading of ["Challenge 当前进度", "每周唯一重点", "当月完成的阅读记录", "重复阻碍"]) {
    assert.match(source, new RegExp(heading));
  }
  assert.match(source, /Challenge\/Personal Challenges\.md/);
  assert.match(source, /Book\/01_Readings/);
  assert.match(source, /PersonalOS\/Reviews\/Weekly/);
  assert.doesNotMatch(source, /vault\.(?:create|modify|delete|rename)|adapter\.(?:write|remove|mkdir)/);
});
