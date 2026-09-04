"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = relativePath => fs.readFileSync(path.join(vault, relativePath), "utf8");

test("the new home exists and the old home is recoverably archived", () => {
  assert.ok(fs.existsSync(path.join(vault, "00 Home/Personal OS.md")));
  assert.ok(fs.existsSync(path.join(vault, "Archive/旧首页/🏠 我的知识宇宙.md")));
  assert.equal(fs.existsSync(path.join(vault, "🏠 我的知识宇宙.md")), false);
});

test("all exact old-home backlinks have transitioned to the Personal OS home", () => {
  const expectedBacklinks = [
    "Tourist/石刻之旅计划.md",
    "生活 SOP.md",
    "docs/superpowers/specs/2026-09-04-gariel-brain-personal-os-design.md",
    "docs/superpowers/plans/2026-09-04-gariel-brain-personal-os.md",
    "DailyNotes/2026-08-20.md"
  ];
  for (const file of expectedBacklinks) {
    const source = read(file);
    assert.doesNotMatch(source, /\[\[(?:🏠 )?我的知识宇宙(?:\||\]\])/);
    assert.match(source, /\[\[00 Home\/Personal OS\]\]/);
  }
});

test("the four entry pages and review interfaces remain connected", () => {
  assert.match(read("00 Home/Personal OS.md"), /PersonalOS\/Views\/home/);
  assert.match(read("00 Home/目标中心.md"), /!\[\[PersonalOS\/Goals\.base\]\]/);
  assert.match(read("00 Home/模块中心.md"), /!\[\[PersonalOS\/Modules\.base\]\]/);
  assert.match(read("00 Home/复盘中心.md"), /周复盘/);
  assert.ok(fs.existsSync(path.join(vault, "PersonalOS/Templates/Weekly Review.md")));
  assert.ok(fs.existsSync(path.join(vault, "PersonalOS/Templates/Monthly Review.md")));
});

test("task storage is constrained to canonical monthly task paths", () => {
  const model = require("../task-model");
  assert.equal(model.monthPath("2026-09-04"), "PersonalOS/Tasks/2026/2026-09.md");
  for (const forbidden of ["DailyNotes/2026-09-04.md", "Book/阅读主页.md", "../outside.md"]) {
    assert.throws(() => model.assertTaskPath(forbidden), /outside/);
  }
});

test("runtime JavaScript has no direct write target outside PersonalOS", () => {
  const roots = ["PersonalOS/Views", "PersonalOS/Services"];
  const files = roots.flatMap(root => fs.readdirSync(path.join(vault, root))
    .filter(name => name.endsWith(".js"))
    .map(name => path.join(vault, root, name)));
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /DailyNotes.*(?:write|modify|create)|(?:write|modify|create).*DailyNotes/);
    assert.doesNotMatch(source, /Book.*(?:write|modify|create)|(?:write|modify|create).*Book/);
  }
});

test("the Personal OS stylesheet remains enabled", () => {
  const appearance = JSON.parse(read(".obsidian/appearance.json"));
  assert.ok(appearance.enabledCssSnippets.includes("personal-os"));
  assert.ok(fs.existsSync(path.join(vault, ".obsidian/snippets/personal-os.css")));
});
