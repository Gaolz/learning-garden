"use strict";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const iso = date => date.toISOString().slice(0, 10);

function normalizeAnchor(anchor) {
  return anchor?.toISODate?.() ?? String(anchor);
}

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
  const date = parseDate(normalizeAnchor(anchor));
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
  }).sort((left, right) => {
    if (left.fields.date !== right.fields.date) return left.fields.date < right.fields.date ? -1 : 1;
    const leftId = String(left.fields.task_id || left.title);
    const rightId = String(right.fields.task_id || right.title);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
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

function dailyHighlights(source) {
  return dailyEntries(source).map(entry => entry.value);
}

function dailyEntries(source) {
  return String(source).split(/\r?\n/).flatMap(line => {
    const content = line.replace(/^\s*[-*]\s*(?:\[[ xX]\]\s*)?/, "").trim();
    const match = content.match(/^\*{0,2}(?:成果输出|Output|阻碍|Blocker|下一步|Next)\s*[:：]\*{0,2}\s*(.*?)\s*$/i);
    if (!match?.[1]) return [];
    const label = content.match(/^\*{0,2}([^:：*]+)/)?.[1]?.trim().toLowerCase();
    const type = label === "阻碍" || label === "blocker" ? "blocker" : label === "下一步" || label === "next" ? "next" : "output";
    return [{ type, value: match[1] }];
  });
}

function frontmatter(source) {
  const match = String(source).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([^:#][^:]*):\s*(.*?)\s*$/);
    if (field) values[field[1].trim()] = field[2].replace(/^(?:"(.*)"|'(.*)')$/, "$1$2");
  }
  return values;
}

function sectionItems(source, headings) {
  const wanted = new Set(headings.map(item => item.toLowerCase()));
  const lines = String(source).split(/\r?\n/);
  const items = [];
  let active = false;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      active = wanted.has(heading[1].trim().toLowerCase());
      continue;
    }
    if (/^#\s/.test(line)) active = false;
    if (!active) continue;
    const value = line.replace(/^\s*(?:[-*+]\s+|>\s*)/, "").trim();
    if (value && value !== "-") items.push(value);
  }
  return items;
}

function inRange(value, range) {
  try {
    parseDate(value);
    return value >= range.start && value <= range.end;
  } catch {
    return false;
  }
}

function challengeProgress(source) {
  const marks = String(source).split(/\r?\n/).flatMap(line => {
    const match = line.match(/\|\s*\[([ xX])\]\s*\|\s*$/);
    return match ? [match[1].toLowerCase() === "x"] : [];
  });
  return { done: marks.filter(Boolean).length, total: marks.length };
}

function weeklyFocuses(documents, range) {
  return documents.flatMap(document => {
    const date = frontmatter(document.source).anchor;
    const text = sectionItems(document.source, ["下周唯一重点"])[0];
    return inRange(date, range) && text ? [{ date, text, path: document.path }] : [];
  }).sort((left, right) => left.date.localeCompare(right.date) || left.path.localeCompare(right.path));
}

function completedReadings(documents, range) {
  return documents.flatMap(document => {
    const fields = frontmatter(document.source);
    const status = fields["状态"] || fields.status;
    const date = fields["结束日期"] || fields["完成日期"] || fields.finished || fields.finished_at;
    if (status !== "已读" || !inRange(date, range)) return [];
    return [{ title: document.basename || document.path.split("/").pop().replace(/\.md$/i, ""), date, path: document.path }];
  }).sort((left, right) => left.date.localeCompare(right.date) || left.path.localeCompare(right.path));
}

function repeatedBlockers(weeklyDocuments, dailyDocuments, range) {
  const values = [];
  for (const document of weeklyDocuments) {
    const date = frontmatter(document.source).anchor;
    if (inRange(date, range)) values.push(...sectionItems(document.source, ["本周停止什么", "阻碍", "Blocker"]));
  }
  for (const document of dailyDocuments) {
    const date = document.path.match(/(\d{4}-\d{2}-\d{2})\.md$/)?.[1];
    if (inRange(date, range)) values.push(...dailyEntries(document.source).filter(entry => entry.type === "blocker").map(entry => entry.value));
  }
  const counts = new Map();
  for (const value of values.map(item => item.trim()).filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1)
    .map(([text, count]) => ({ text, count }))
    .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text, "zh-CN"));
}

module.exports = {
  challengeProgress,
  completedReadings,
  dailyEntries,
  dailyHighlights,
  dateRange,
  normalizeAnchor,
  repeatedBlockers,
  summarize,
  weeklyFocuses
};
