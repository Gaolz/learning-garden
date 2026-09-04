"use strict";

const FIELD = /^\s{2}\[([a-z_]+)::\s*((?:\[\[[^\]]+\]\]|[^\]])*)\]\s*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITIES = new Set(["P1", "P2", "P3"]);

function assertSingleLine(value, name) {
  if (value !== undefined && /[\r\n]/.test(String(value))) throw new Error(`${name} cannot contain a line break`);
}

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
  assertSingleLine(input.title, "title");
  for (const key of ordered) assertSingleLine(input[key], key);
  const lines = [`- [${input.done ? "x" : " "}] ${input.title.trim()}`];
  for (const key of ordered) if (input[key]) lines.push(`  [${key}:: ${input[key]}]`);
  return lines.join("\n");
}

function replaceField(block, key, value) {
  assertSingleLine(key, "key");
  assertSingleLine(value, "value");
  const pattern = new RegExp(`^  \\[${key}::.*\\]$`, "m");
  return pattern.test(block) ? block.replace(pattern, `  [${key}:: ${value}]`) : `${block}\n  [${key}:: ${value}]`;
}

function toggleCheckbox(block, done) {
  return block.replace(/^- \[[ xX]\]/, done ? "- [x]" : "- [ ]");
}

function validLink(value) {
  return value === undefined || /^\[\[[^\n]+\]\]$/.test(value);
}

function validDate(value) {
  if (!DATE.test(String(value))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function assertValidDate(value) {
  if (!validDate(value)) throw new Error("date must be YYYY-MM-DD and a real calendar date");
}

function validateTask(input, enabledModules) {
  for (const key of ["title", "task_id", "date", "module", "priority", "goal", "output", "started_at"]) assertSingleLine(input[key], key);
  if (!input.title || !input.title.trim()) throw new Error("title is required");
  assertValidDate(input.date);
  if (!enabledModules.has(input.module)) throw new Error("module is not enabled");
  if (!PRIORITIES.has(input.priority || "P2")) throw new Error("priority is invalid");
  if (!validLink(input.goal)) throw new Error("goal must be an internal link");
  if (!validLink(input.output)) throw new Error("output must be an internal link");
  if (!input.task_id || !String(input.task_id).trim()) throw new Error("task_id is required");
}

function monthPath(date) {
  assertValidDate(date);
  return `PersonalOS/Tasks/${date.slice(0, 4)}/${date.slice(0, 7)}.md`;
}

function assertTaskPath(path) {
  if (!/^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(path)) throw new Error("path is outside PersonalOS Tasks");
}

module.exports = { parseTasks, formatTask, replaceField, toggleCheckbox, validDate, validateTask, monthPath, assertTaskPath };
