"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createTaskStore } = require("../task-store");
const { createObsidianAdapter } = require("../obsidian-adapter");

function memoryAdapter(seed = {}) {
  const files = new Map(Object.entries(seed));
  const writes = [];
  return {
    files,
    writes,
    async exists(path) { return files.has(path); },
    async read(path) {
      if (!files.has(path)) throw new Error("ENOENT");
      return files.get(path);
    },
    async write(path, text) {
      writes.push([path, text]);
      files.set(path, text);
    },
    async mkdir() {},
    async remove(path) { files.delete(path); }
  };
}

test("creating a P1 demotes the existing P1 and preserves extra fields", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: [
    "# 2026-09 Tasks", "",
    "- [ ] 原主线",
    "  [task_id:: old]",
    "  [date:: 2026-09-04]",
    "  [module:: reading]",
    "  [priority:: P1]",
    "  [custom:: keep-me]", ""
  ].join("\n") });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]), idFactory: () => "new" });

  await store.create({ title: "新主线", date: "2026-09-04", module: "reading", priority: "P1" });

  const text = adapter.files.get(path);
  assert.match(text, /\[task_id:: old\][\s\S]*\[priority:: P2\][\s\S]*\[custom:: keep-me\]/);
  assert.match(text, /\[task_id:: new\][\s\S]*\[priority:: P1\]/);
});

test("completion changes only the selected checkbox", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const before = "# 2026-09 Tasks\n\n- [ ] A\n  [task_id:: a]\n  [date:: 2026-09-04]\n  [module:: reading]\n  [priority:: P2]\n  [custom:: keep-me]\n";
  const adapter = memoryAdapter({ [path]: before });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await store.setDone("a", "2026-09-04", true);

  assert.equal(adapter.files.get(path), before.replace("- [ ] A", "- [x] A"));
});

test("moving a P1 within one month demotes the destination date main", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: [
    "# 2026-09 Tasks", "",
    "- [ ] A", "  [task_id:: a]", "  [date:: 2026-09-04]", "  [module:: reading]", "  [priority:: P1]", "",
    "- [ ] B", "  [task_id:: b]", "  [date:: 2026-09-05]", "  [module:: reading]", "  [priority:: P1]", ""
  ].join("\n") });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await store.move("a", "2026-09-04", "2026-09-05");

  const text = adapter.files.get(path);
  assert.match(text, /\[task_id:: a\][\s\S]*\[date:: 2026-09-05\][\s\S]*\[priority:: P1\]/);
  assert.match(text, /\[task_id:: b\][\s\S]*\[priority:: P2\]/);
});

test("priority updates reject a mismatched date before breaking P1 uniqueness", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const before = [
    "# 2026-09 Tasks", "",
    "- [ ] A", "  [task_id:: a]", "  [date:: 2026-09-04]", "  [module:: reading]", "  [priority:: P1]", "",
    "- [ ] B", "  [task_id:: b]", "  [date:: 2026-09-05]", "  [module:: reading]", "  [priority:: P2]", "",
    "- [ ] C", "  [task_id:: c]", "  [date:: 2026-09-05]", "  [module:: reading]", "  [priority:: P1]", ""
  ].join("\n");
  const adapter = memoryAdapter({ [path]: before });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await assert.rejects(store.setPriority("b", "2026-09-04", "P1"), /date mismatch/);

  assert.equal(adapter.files.get(path), before);
});

test("setting P1 demotes the same-date main and preserves unknown fields", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: [
    "# 2026-09 Tasks", "",
    "- [ ] A", "  [task_id:: a]", "  [date:: 2026-09-04]", "  [module:: reading]", "  [priority:: P1]", "  [custom:: keep-a]", "",
    "- [ ] B", "  [task_id:: b]", "  [date:: 2026-09-04]", "  [module:: reading]", "  [priority:: P2]", "  [custom:: keep-b]", ""
  ].join("\n") });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await store.setPriority("b", "2026-09-04", "P1");

  const text = adapter.files.get(path);
  assert.match(text, /\[task_id:: a\][\s\S]*\[priority:: P2\][\s\S]*\[custom:: keep-a\]/);
  assert.match(text, /\[task_id:: b\][\s\S]*\[priority:: P1\][\s\S]*\[custom:: keep-b\]/);
});

test("starting a task adds the timestamp without dropping unknown fields", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({
    [path]: "# 2026-09 Tasks\n\n- [ ] A\n  [task_id:: a]\n  [date:: 2026-09-04]\n  [module:: reading]\n  [priority:: P2]\n  [custom:: keep-me]\n"
  });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await store.start("a", "2026-09-04", "2026-09-04T09:15:00+08:00");

  assert.match(adapter.files.get(path), /\[custom:: keep-me\]\n  \[started_at:: 2026-09-04T09:15:00\+08:00\]/);
});

test("cross-month move restores both snapshots when the second write fails", async () => {
  const oldPath = "PersonalOS/Tasks/2026/2026-09.md";
  const newPath = "PersonalOS/Tasks/2026/2026-10.md";
  const adapter = memoryAdapter({
    [oldPath]: "# 2026-09 Tasks\n\n- [ ] A\n  [task_id:: a]\n  [date:: 2026-09-30]\n  [module:: reading]\n  [priority:: P2]\n",
    [newPath]: "# 2026-10 Tasks\n"
  });
  const originalWrite = adapter.write;
  let writes = 0;
  adapter.write = async (path, text) => {
    writes += 1;
    if (writes === 2) throw new Error("disk");
    return originalWrite(path, text);
  };
  const before = new Map(adapter.files);
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await assert.rejects(store.move("a", "2026-09-30", "2026-10-01"), /disk/);

  assert.deepEqual(adapter.files, before);
});

test("cross-month move removes a final source block without a trailing newline", async () => {
  const oldPath = "PersonalOS/Tasks/2026/2026-09.md";
  const newPath = "PersonalOS/Tasks/2026/2026-10.md";
  const adapter = memoryAdapter({
    [oldPath]: "# 2026-09 Tasks\n\n- [ ] A\n  [task_id:: a]\n  [date:: 2026-09-30]\n  [module:: reading]\n  [priority:: P2]\n  [custom:: keep-me]",
    [newPath]: "# 2026-10 Tasks\n"
  });
  const store = createTaskStore(adapter, { enabledModules: new Set(["reading"]) });

  await store.move("a", "2026-09-30", "2026-10-01");

  assert.equal(adapter.files.get(oldPath), "# 2026-09 Tasks\n");
  assert.match(adapter.files.get(newPath), /\[date:: 2026-10-01\][\s\S]*\[custom:: keep-me\]/);
});

test("queued creates do not overwrite each other", async () => {
  const path = "PersonalOS/Tasks/2026/2026-09.md";
  const adapter = memoryAdapter({ [path]: "# 2026-09 Tasks\n" });
  const originalRead = adapter.read;
  adapter.read = async target => {
    const source = await originalRead(target);
    await new Promise(resolve => setTimeout(resolve, 5));
    return source;
  };
  let id = 0;
  const store = createTaskStore(adapter, {
    enabledModules: new Set(["reading"]),
    idFactory: () => `id-${++id}`
  });

  await Promise.all([
    store.create({ title: "A", date: "2026-09-04", module: "reading" }),
    store.create({ title: "B", date: "2026-09-04", module: "reading" })
  ]);

  const text = adapter.files.get(path);
  assert.match(text, /\[task_id:: id-1\]/);
  assert.match(text, /\[task_id:: id-2\]/);
});

test("invalid dates are rejected before any adapter write", async () => {
  const adapter = memoryAdapter();
  const store = createTaskStore(adapter, {
    enabledModules: new Set(["reading"]),
    idFactory: () => "id-1"
  });

  await assert.rejects(
    store.create({ title: "escape", date: "../../DailyNotes", module: "reading" }),
    /date must be YYYY-MM-DD/
  );

  assert.deepEqual(adapter.writes, []);
  assert.deepEqual(adapter.files, new Map());
});

test("Obsidian adapter creates missing directory segments", async () => {
  const entries = new Set(["PersonalOS"]);
  const created = [];
  const raw = {
    async exists(path) { return entries.has(path); },
    async mkdir(path) { created.push(path); entries.add(path); },
    async read() {},
    async write() {},
    async remove() {}
  };
  const adapter = createObsidianAdapter({ vault: { adapter: raw } });

  await adapter.mkdir("PersonalOS/Tasks/2026");

  assert.deepEqual(created, ["PersonalOS/Tasks", "PersonalOS/Tasks/2026"]);
});
