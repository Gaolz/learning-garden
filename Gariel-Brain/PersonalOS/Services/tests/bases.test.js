const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = file => fs.readFileSync(path.join(vault, file), "utf8");
const parseYaml = source => {
  const result = spawnSync(
    "ruby",
    ["-ryaml", "-rjson", "-e", "puts JSON.generate(YAML.safe_load(STDIN.read, permitted_classes: [], aliases: false))"],
    { input: source, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
const parseFrontmatter = source => {
  const match = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert.ok(match, "expected YAML frontmatter");
  return parseYaml(match[1]);
};

const goalProperties = [
  "file.name",
  'note["level"]',
  'note["status"]',
  'note["module"]',
  'note["parent"]',
  'note["start"]',
  'note["end"]',
  'note["success_criteria"]'
];
const moduleProperties = [
  'note["name"]',
  'note["id"]',
  'note["enabled"]',
  'note["order"]',
  'note["folders"]',
  'note["icon"]',
  'note["color"]'
];

test("goal base filters only Personal OS goals and exposes hierarchy fields", () => {
  const base = parseYaml(read("PersonalOS/Goals.base"));
  assert.deepEqual(base.filters.and, [
    'file.inFolder("PersonalOS/Goals")',
    'note["type"] == "personal-os-goal"'
  ]);
  assert.deepEqual(Object.keys(base.properties), goalProperties);
  assert.deepEqual(base.views, [
    {
      type: "table",
      name: "活动目标",
      filters: 'note["status"] == "active"',
      order: [
        "file.name",
        'note["level"]',
        'note["module"]',
        'note["parent"]',
        'note["start"]',
        'note["end"]',
        'note["success_criteria"]'
      ]
    },
    {
      type: "table",
      name: "按模块",
      groupBy: { property: 'note["module"]', direction: "ASC" },
      order: ["file.name", 'note["level"]', 'note["status"]', 'note["parent"]']
    },
    {
      type: "table",
      name: "全部目标",
      order: ["file.name", 'note["level"]', 'note["status"]', 'note["module"]', 'note["parent"]']
    }
  ]);
});

test("module base cannot hide the temporary registry row by folder scope", () => {
  const base = parseYaml(read("PersonalOS/Modules.base"));
  assert.deepEqual(base.filters.and, [
    'file.inFolder("PersonalOS/Module Registry")',
    'note["type"] == "personal-os-module"'
  ]);
  assert.deepEqual(Object.keys(base.properties), moduleProperties);
  assert.deepEqual(base.views, [{
    type: "table",
    name: "模块注册表",
    order: moduleProperties,
    sort: [{ property: 'note["order"]', direction: "ASC" }]
  }]);

  const temporary = parseFrontmatter(read("PersonalOS/Module Registry/temporary.md"));
  assert.equal(temporary.type, "personal-os-module");
  assert.equal(temporary.id, "temporary");
  assert.equal(temporary.enabled, true);
});

test("goal template has the exact Personal OS goal property contract", () => {
  const frontmatter = parseFrontmatter(read("PersonalOS/Templates/Goal.md"));
  assert.deepEqual(Object.keys(frontmatter), [
    "type", "level", "status", "module", "parent", "start", "end", "success_criteria"
  ]);
  assert.deepEqual(frontmatter, {
    type: "personal-os-goal",
    level: "direction",
    status: "active",
    module: "temporary",
    parent: null,
    start: '<% tp.date.now("YYYY-MM-DD") %>',
    end: null,
    success_criteria: null
  });
});

test("goal and module centers embed their Base files", () => {
  assert.match(read("00 Home/目标中心.md"), /!\[\[PersonalOS\/Goals\.base\]\]/);
  assert.match(read("00 Home/模块中心.md"), /!\[\[PersonalOS\/Modules\.base\]\]/);
});
