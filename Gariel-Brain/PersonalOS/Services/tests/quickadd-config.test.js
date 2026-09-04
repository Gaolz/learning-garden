const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const config = require(path.resolve(__dirname, "../../../.obsidian/plugins/quickadd/data.json"));

test("preserves Capture idea and adds exactly one safe Personal OS inbox capture", () => {
  assert.ok(config.choices.some(choice => choice.name === "Capture idea"));
  const choices = config.choices.filter(choice => choice.name === "Personal OS: 添加临时任务");
  assert.equal(choices.length, 1);
  assert.equal(choices[0].type, "Capture");
  assert.equal(choices[0].captureTo, "PersonalOS/Tasks/{{DATE:YYYY}}/{{DATE:YYYY-MM}}");
  assert.match(choices[0].format.format, /\[priority:: P2\]/);
  assert.match(choices[0].format.format, /\[module:: temporary\]/);
  assert.equal(choices[0].createFileIfItDoesntExist.template, "PersonalOS/Templates/Monthly Tasks.md");
});
