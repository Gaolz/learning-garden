"use strict";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const iso = date => date.toISOString().slice(0, 10);

function parseDate(value) {
  if (!DATE.test(String(value))) throw new Error("date must be a valid YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || iso(date) !== value) {
    throw new Error("date must be a valid YYYY-MM-DD");
  }
  return date;
}

function dateRange(kind, anchor) {
  if (kind !== "week" && kind !== "month") throw new Error("kind must be week or month");
  const date = parseDate(anchor);
  if (kind === "week") {
    const start = new Date(date);
    start.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start: iso(start), end: iso(end) };
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: iso(start), end: iso(end) };
}

function summarize(tasks, range) {
  parseDate(range?.start);
  parseDate(range?.end);
  if (range.start > range.end) throw new Error("range start must not be after end");
  if (!Array.isArray(tasks)) throw new Error("tasks must be an array");

  const selected = tasks.filter(task => {
    const date = task?.fields?.date;
    return DATE.test(String(date)) && date >= range.start && date <= range.end;
  });
  const modules = {};
  for (const task of selected) {
    const module = task.fields.module || "未分类";
    const bucket = modules[module] ||= { total: 0, done: 0 };
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
