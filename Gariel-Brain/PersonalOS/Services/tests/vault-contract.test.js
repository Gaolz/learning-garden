"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = relativePath => fs.readFileSync(path.join(vault, relativePath), "utf8");
const oldHomeLink = /\[\[(?:🏠 )?我的知识宇宙(?:\||\]\])/;

function findExactOldHomeBacklinks(root) {
  const matches = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      const relative = path.relative(root, file).split(path.sep).join("/");
      if (!entry.isFile() || !relative.endsWith(".md") || relative === "Archive/旧首页/🏠 我的知识宇宙.md") continue;
      if (oldHomeLink.test(fs.readFileSync(file, "utf8"))) matches.push(relative);
    }
  };
  visit(root);
  return matches.sort();
}

test("the new home exists and the old home is recoverably archived", () => {
  assert.ok(fs.existsSync(path.join(vault, "00 Home/Personal OS.md")));
  assert.ok(fs.existsSync(path.join(vault, "Archive/旧首页/🏠 我的知识宇宙.md")));
  assert.equal(fs.existsSync(path.join(vault, "🏠 我的知识宇宙.md")), false);
});

test("all exact old-home backlinks have transitioned across the Vault", () => {
  assert.deepEqual(findExactOldHomeBacklinks(vault), []);
});

test("old-home backlink scan catches both link forms in nested Markdown", t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "personal-os-backlinks-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture, "nested", "deeper"), { recursive: true });
  fs.mkdirSync(path.join(fixture, "Archive", "旧首页"), { recursive: true });
  fs.writeFileSync(path.join(fixture, "nested", "one.md"), "[[🏠 我的知识宇宙]]\n");
  fs.writeFileSync(path.join(fixture, "nested", "deeper", "two.md"), "[[我的知识宇宙|旧首页]]\n");
  fs.writeFileSync(path.join(fixture, "nested", "ignored.txt"), "[[我的知识宇宙]]\n");
  fs.writeFileSync(path.join(fixture, "Archive", "旧首页", "🏠 我的知识宇宙.md"), "[[我的知识宇宙]]\n");

  assert.deepEqual(findExactOldHomeBacklinks(fixture), [
    "nested/deeper/two.md",
    "nested/one.md"
  ]);
});

test("the four entry pages and review interfaces remain connected", () => {
  assert.match(read("00 Home/Personal OS.md"), /PersonalOS\/Views\/home/);
  assert.match(read("00 Home/目标中心.md"), /!\[\[PersonalOS\/Goals\.base\]\]/);
  assert.match(read("00 Home/模块中心.md"), /!\[\[PersonalOS\/Modules\.base\]\]/);
  assert.match(read("00 Home/复盘中心.md"), /周复盘/);
  assert.ok(fs.existsSync(path.join(vault, "PersonalOS/Templates/Weekly Review.md")));
  assert.ok(fs.existsSync(path.join(vault, "PersonalOS/Templates/Monthly Review.md")));
});

test("home shortcuts point to existing meaningful notes", () => {
  const source = read("PersonalOS/Views/home.js");
  for (const target of ["Book/阅读主页", "Programming/Algorithm/Binary-Search", "Challenge/Personal Challenges", "00 Home/目标中心"]) {
    assert.match(source, new RegExp(JSON.stringify(target).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(fs.existsSync(path.join(vault, `${target}.md`)), `${target}.md must exist`);
  }
  assert.doesNotMatch(source, /\["⌘ Programming", "Programming"\]/);
  assert.doesNotMatch(source, /\["⚑ Challenge", "Challenge"\]/);
});

test("empty weekly goal progress is rendered as not started", () => {
  const source = read("PersonalOS/Views/home.js");
  assert.match(source, /linked\.length\s*\?[^:]+:\s*"尚未开始"/s);
  assert.match(source, /goalMatches/);
  assert.doesNotMatch(source, /includes\(activeWeek\.file\.name\)/);
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
