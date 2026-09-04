const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const config = require(path.resolve(__dirname, "../../../.obsidian/plugins/quickadd/data.json"));
const { parseTasks, validateTask } = require("../task-model");

test("preserves Capture idea and adds exactly one safe Personal OS inbox capture", () => {
  assert.ok(config.choices.some(choice => choice.name === "Capture idea"));
  const choices = config.choices.filter(choice => choice.name === "Personal OS: 添加临时任务");
  assert.equal(choices.length, 1);
  const choice = choices[0];
  assert.equal(choice.type, "Capture");
  assert.equal(choice.command, true);
  assert.equal(choice.captureTo, "PersonalOS/Tasks/{{DATE:YYYY}}/{{DATE:YYYY-MM}}");
  assert.equal(choice.format.enabled, true);
  assert.equal(choice.createFileIfItDoesntExist.enabled, true);
  assert.equal(choice.createFileIfItDoesntExist.createWithTemplate, true);
  assert.equal(choice.createFileIfItDoesntExist.template, "PersonalOS/Templates/Monthly Tasks.md");
  assert.equal(choice.newLineCapture.enabled, true);
  assert.equal(choice.newLineCapture.direction, "below");
  assert.equal(choice.prepend, false);

  assert.doesNotMatch(choice.format.format, /SSS/);
  assert.match(choice.format.format, /\{\{RANDOM:\d+\}\}/);
  const quickAddSource = fs.readFileSync(path.resolve(__dirname, "../../../.obsidian/plugins/quickadd/main.js"), "utf8");
  assert.ok(quickAddSource.includes("{{RANDOM:(\\d+)}}"), "installed QuickAdd must support RANDOM length tokens");

  const render = random => choice.format.format
    .replace("{{VALUE:任务}}", "临时验证任务")
    .replace("{{DATE:YYYYMMDD-HHmmss}}", "20260904-123456")
    .replace("{{RANDOM:8}}", random)
    .replace("{{DATE:YYYY-MM-DD}}", "2026-09-04");
  const rendered = render("a1b2c3d4");
  assert.doesNotMatch(rendered, /{{[^}]+}}/);
  const tasks = parseTasks(rendered);
  assert.equal(tasks.length, 1);
  validateTask({ title: tasks[0].title, ...tasks[0].fields }, new Set(["temporary"]));
  assert.notEqual(tasks[0].fields.task_id, parseTasks(render("z9y8x7w6"))[0].fields.task_id);
});
