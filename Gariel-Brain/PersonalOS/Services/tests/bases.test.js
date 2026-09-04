const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = file => fs.readFileSync(path.join(vault, file), "utf8");

const scalar = value => {
  if (value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  return value;
};

const parseYaml = source => {
  const lines = source.split("\n")
    .filter(line => line.trim() && !line.trimStart().startsWith("#"))
    .map(line => ({ indent: line.length - line.trimStart().length, text: line.trim() }));

  const keyValue = text => {
    const separator = text.indexOf(":");
    assert.notEqual(separator, -1, `expected mapping entry: ${text}`);
    return [text.slice(0, separator), text.slice(separator + 1).trim()];
  };

  const parseBlock = (start, indent) => {
    const isList = lines[start].text.startsWith("- ");
    const value = isList ? [] : {};
    let index = start;

    while (index < lines.length && lines[index].indent === indent) {
      const line = lines[index];
      if (isList) {
        assert.ok(line.text.startsWith("- "), `mixed collection at: ${line.text}`);
        const item = line.text.slice(2);
        if (item.includes(":")) {
          const object = {};
          const [key, raw] = keyValue(item);
          object[key] = raw ? scalar(raw) : parseBlock(index + 1, lines[index + 1].indent)[0];
          index += 1;
          while (index < lines.length && lines[index].indent > indent) {
            const [nested, next] = parseBlock(index, lines[index].indent);
            Object.assign(object, nested);
            index = next;
          }
          value.push(object);
          continue;
        }
        value.push(scalar(item));
        index += 1;
        continue;
      }

      assert.ok(!line.text.startsWith("- "), `mixed collection at: ${line.text}`);
      const [key, raw] = keyValue(line.text);
      if (raw) {
        value[key] = scalar(raw);
        index += 1;
      } else if (lines[index + 1]?.indent > indent) {
        const [nested, next] = parseBlock(index + 1, lines[index + 1].indent);
        value[key] = nested;
        index = next;
      } else {
        value[key] = null;
        index += 1;
      }
    }
    return [value, index];
  };

  assert.ok(lines.length, "expected YAML content");
  return parseBlock(0, lines[0].indent)[0];
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
