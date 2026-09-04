"use strict";

const { validateTask } = require("./task-model");

function parseInternalLink(value) {
  const content = value.slice(2, -2);
  const separator = content.indexOf("|");
  return separator < 0
    ? { target: content.trim(), label: content.trim() }
    : { target: content.slice(0, separator).trim(), label: content.slice(separator + 1).trim() };
}

function selectToday(tasks, date, options = {}) {
  const enabledModules = options.enabledModules || new Set();
  const linkExists = options.linkExists || (() => true);
  const valid = [];
  const invalid = [];

  for (const task of tasks) {
    try {
      validateTask({ title: task.title, ...task.fields, priority: task.fields.priority || "P2" }, enabledModules);
      const missing = ["goal", "output"]
        .filter(key => task.fields[key])
        .map(key => parseInternalLink(task.fields[key]).target)
        .filter(target => !linkExists(target, task));
      if (missing.length) throw new Error(`链接目标不存在：${missing.join("、")}`);
      valid.push(task);
    } catch (error) {
      invalid.push({ ...task, diagnostic: error.message });
    }
  }

  const dated = valid.filter(task => task.fields.date === date);
  const mains = dated.filter(task => task.fields.priority === "P1");
  const main = mains[0] || null;
  const duplicateMains = new Set(mains.slice(1));
  invalid.push(...mains.slice(1).map(task => ({ ...task, diagnostic: "同日存在多个 P1" })));
  const actionable = dated.filter(task => !duplicateMains.has(task));
  const body = actionable.find(task => task !== main && !task.done && task.fields.module === "body") || null;
  const others = actionable.filter(task => task !== main && task !== body);
  return { main, body, others, invalid };
}

module.exports = { parseInternalLink, selectToday };
