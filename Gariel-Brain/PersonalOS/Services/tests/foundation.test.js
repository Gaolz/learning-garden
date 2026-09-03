const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = (...parts) => fs.readFileSync(path.join(vault, ...parts), "utf8");

test("all seven module ids are registered and temporary stays enabled", () => {
  const ids = ["programming-english", "reading", "body", "life", "finance", "challenge", "temporary"];
  for (const id of ids) {
    const source = read("PersonalOS", "Module Registry", `${id}.md`);
    assert.match(source, /type:\s*personal-os-module/);
    assert.match(source, new RegExp(String.raw`id:\s*${id}`));
    assert.match(source, /enabled:\s*true/);
  }
});

test("settings preserve the minimum-day principles", () => {
  const source = read("PersonalOS", "Settings.md");
  assert.match(source, /不补偿，不追赶/);
  assert.match(source, /走路 10 分钟或静坐 5 分钟/);
  assert.match(source, /default_priority:\s*P2/);
});

test("the initial month is readable empty Markdown", () => {
  assert.equal(read("PersonalOS", "Tasks", "2026", "2026-09.md"), "# 2026-09 Tasks\n");
});

test("QuickAdd can initialize later months from a canonical template", () => {
  assert.equal(read("PersonalOS", "Templates", "Monthly Tasks.md"), "# {{DATE:YYYY-MM}} Tasks\n");
});
