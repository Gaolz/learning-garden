const test = require("node:test");
const assert = require("node:assert/strict");
const { dateRange, summarize } = require("../review-model");

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
