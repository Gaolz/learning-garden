const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const read = file => fs.readFileSync(path.join(vault, file), "utf8");

test("goal base filters only Personal OS goals and exposes hierarchy fields", () => {
  const source = read("PersonalOS/Goals.base");
  assert.match(source, /file\.inFolder\("PersonalOS\/Goals"\)/);
  for (const field of ["level", "status", "module", "parent", "start", "end", "success_criteria"]) {
    assert.match(source, new RegExp(`note\\.${field}|note\\["${field}"\\]`));
  }
});

test("module base cannot hide the temporary registry row by folder scope", () => {
  const source = read("PersonalOS/Modules.base");
  assert.match(source, /file\.inFolder\("PersonalOS\/Module Registry"\)/);
  assert.match(read("PersonalOS/Module Registry/temporary.md"), /enabled:\s*true/);
});

test("goal template has the exact Personal OS goal property contract", () => {
  const source = read("PersonalOS/Templates/Goal.md");
  for (const field of ["type", "level", "status", "module", "parent", "start", "end", "success_criteria"]) {
    assert.match(source, new RegExp(`^${field}:`, "m"));
  }
  assert.match(source, /^type:\s*personal-os-goal$/m);
  assert.match(source, /^module:\s*temporary$/m);
});

test("goal and module centers embed their Base files", () => {
  assert.match(read("00 Home/目标中心.md"), /!\[\[PersonalOS\/Goals\.base\]\]/);
  assert.match(read("00 Home/模块中心.md"), /!\[\[PersonalOS\/Modules\.base\]\]/);
});
