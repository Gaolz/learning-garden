"use strict";

const model = require("./task-model");

function createTaskStore(adapter, options = {}) {
  const modules = options.enabledModules || new Set();
  const idFactory = options.idFactory || (() => new Date().toISOString().replace(/[-:.TZ]/g, ""));
  let queue = Promise.resolve();

  const serial = operation => {
    const next = queue.then(operation, operation);
    queue = next.catch(() => {});
    return next;
  };

  async function ensureMonth(date) {
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    if (!await adapter.exists(path)) {
      await adapter.mkdir(path.split("/").slice(0, -1).join("/"));
      await adapter.write(path, `# ${date.slice(0, 7)} Tasks\n`);
    }
    return path;
  }

  const appendBlock = (source, block) => `${source.trimEnd()}\n\n${block}\n`;
  const removeBlock = (source, block) => source
    .replace(`\n\n${block}\n`, "\n")
    .replace(`\n\n${block}`, "\n")
    .replace(`${block}\n`, "")
    .replace(block, "");

  function findTask(source, taskId, date) {
    const task = model.parseTasks(source).find(item => item.fields.task_id === taskId);
    if (!task) throw new Error(`task not found: ${taskId}`);
    if (task.fields.date !== date) throw new Error(`task date mismatch: ${taskId}`);
    return task;
  }

  function demoteOtherMainTasks(source, date, exceptId) {
    let next = source;
    for (const task of model.parseTasks(source)) {
      if (task.fields.date !== date || task.fields.priority !== "P1" || task.fields.task_id === exceptId) continue;
      next = next.replace(task.raw, model.replaceField(task.raw, "priority", "P2"));
    }
    return next;
  }

  async function createInternal(input) {
    const normalized = { priority: "P2", ...input };
    model.validateTask(normalized, modules);
    const path = await ensureMonth(normalized.date);
    let source = await adapter.read(path);
    if (model.parseTasks(source).some(task => task.fields.task_id === normalized.task_id)) {
      throw new Error(`duplicate task_id: ${normalized.task_id}`);
    }
    if (normalized.priority === "P1") source = demoteOtherMainTasks(source, normalized.date, normalized.task_id);
    const block = model.formatTask(normalized);
    await adapter.write(path, appendBlock(source, block));
    return model.parseTasks(block)[0];
  }

  async function updatePriority(taskId, date, priority) {
    if (!["P1", "P2", "P3"].includes(priority)) throw new Error("priority is invalid");
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    let source = await adapter.read(path);
    const task = findTask(source, taskId, date);
    if (priority === "P1") source = demoteOtherMainTasks(source, date, taskId);
    source = source.replace(task.raw, model.replaceField(task.raw, "priority", priority));
    await adapter.write(path, source);
  }

  async function updateDone(taskId, date, done) {
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    const source = await adapter.read(path);
    const task = findTask(source, taskId, date);
    await adapter.write(path, source.replace(task.raw, model.toggleCheckbox(task.raw, Boolean(done))));
  }

  async function updateStartedAt(taskId, date, timestamp) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) throw new Error("timestamp is invalid");
    const path = model.monthPath(date);
    model.assertTaskPath(path);
    const source = await adapter.read(path);
    const task = findTask(source, taskId, date);
    await adapter.write(path, source.replace(task.raw, model.replaceField(task.raw, "started_at", timestamp)));
  }

  async function moveInternal(taskId, oldDate, newDate) {
    const oldPath = model.monthPath(oldDate);
    const newPath = model.monthPath(newDate);
    model.assertTaskPath(oldPath);
    model.assertTaskPath(newPath);
    if (oldPath === newPath) {
      const source = await adapter.read(oldPath);
      const task = findTask(source, taskId, oldDate);
      let next = source;
      if (task.fields.priority === "P1") next = demoteOtherMainTasks(next, newDate, taskId);
      next = next.replace(task.raw, model.replaceField(task.raw, "date", newDate));
      await adapter.write(oldPath, next);
      return;
    }

    const oldSource = await adapter.read(oldPath);
    const newExisted = await adapter.exists(newPath);
    const newSource = newExisted ? await adapter.read(newPath) : `# ${newDate.slice(0, 7)} Tasks\n`;
    const task = findTask(oldSource, taskId, oldDate);
    const moved = model.replaceField(task.raw, "date", newDate);
    const nextOld = removeBlock(oldSource, task.raw);
    let nextNew = newSource;
    if (task.fields.priority === "P1") nextNew = demoteOtherMainTasks(nextNew, newDate, taskId);
    nextNew = appendBlock(nextNew, moved);

    await adapter.mkdir(newPath.split("/").slice(0, -1).join("/"));
    try {
      await adapter.write(oldPath, nextOld);
      await adapter.write(newPath, nextNew);
    } catch (error) {
      await adapter.write(oldPath, oldSource);
      if (newExisted) await adapter.write(newPath, newSource);
      else if (await adapter.exists(newPath)) await adapter.remove(newPath);
      throw error;
    }
  }

  return {
    create(input) { return serial(() => createInternal({ priority: "P2", ...input, task_id: idFactory() })); },
    setPriority(taskId, date, priority) { return serial(() => updatePriority(taskId, date, priority)); },
    setDone(taskId, date, done) { return serial(() => updateDone(taskId, date, done)); },
    start(taskId, date, timestamp) { return serial(() => updateStartedAt(taskId, date, timestamp)); },
    move(taskId, oldDate, newDate) { return serial(() => moveInternal(taskId, oldDate, newDate)); }
  };
}

module.exports = { createTaskStore };
