const loaded = {};

async function loadModule(name, dependencies = {}) {
  const source = await app.vault.adapter.read(`PersonalOS/Services/${name}.js`);
  const module = { exports: {} };
  const localRequire = request => {
    const key = request.replace(/^\.\//, "");
    if (!(key in dependencies)) throw new Error(`unsupported service dependency: ${request}`);
    return dependencies[key];
  };
  new Function("module", "exports", "require", source)(module, module.exports, localRequire);
  loaded[name] = module.exports;
  return module.exports;
}

const taskModel = await loadModule("task-model");
const taskStoreModule = await loadModule("task-store", { "task-model": taskModel });
const adapterModule = await loadModule("obsidian-adapter");
const homeModel = await loadModule("home-model", { "task-model": taskModel });
const today = window.moment().format("YYYY-MM-DD");
const settings = dv.page("PersonalOS/Settings");
const modules = dv.pages('"PersonalOS/Module Registry"')
  .where(page => page.type === "personal-os-module" && page.enabled)
  .array();
const enabledModules = new Set(modules.map(page => String(page.id)));
const adapter = adapterModule.createObsidianAdapter(app);
const store = taskStoreModule.createTaskStore(adapter, { enabledModules });

async function readTasks() {
  const files = app.vault.getFiles().filter(file =>
    /^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(file.path)
  );
  const tasks = [];
  for (const file of files) {
    const parsed = taskModel.parseTasks(await app.vault.read(file));
    tasks.push(...parsed.map(task => ({ ...task, sourcePath: file.path })));
  }
  return tasks;
}

function action(parent, label, run) {
  const button = parent.createEl("button", { text: label, cls: "pos-action" });
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await run();
      await render();
    } catch (error) {
      button.disabled = false;
      parent.createDiv({ text: error.message, cls: "pos-error" });
    }
  });
}

async function render() {
  dv.container.empty();
  const root = dv.container.createDiv({ cls: "personal-os-dashboard" });
  const tasks = await readTasks();
  const state = homeModel.selectToday(tasks, today, {
    enabledModules,
    linkExists: (target, task) => Boolean(app.metadataCache.getFirstLinkpathDest(target, task.sourcePath || ""))
  });

  const top = root.createDiv({ cls: "pos-top" });
  top.createEl("strong", { text: today });
  const dailyPath = `DailyNotes/${today}.md`;
  if (app.vault.getAbstractFileByPath(dailyPath)) {
    top.createEl("a", { text: "打开 Daily Note ↗", href: dailyPath, cls: "internal-link" });
  } else {
    top.createSpan({ text: "Daily Note 尚未创建", cls: "pos-muted" });
  }

  const hero = root.createDiv({ cls: "pos-hero" });
  hero.createEl("h1", { text: "只推进一件真正重要的事" });
  hero.createEl("p", { text: String(settings.principle) });

  const main = root.createDiv({ cls: "pos-card pos-main" });
  main.createEl("h2", { text: "🔥 唯一主线" });
  if (!state.main) {
    main.createEl("p", { text: "尚未选择今日主线" });
  } else {
    main.createEl("h3", { text: state.main.title });
    if (state.main.fields.output) {
      const output = homeModel.parseInternalLink(state.main.fields.output);
      main.createEl("a", { text: `${output.label} ↗`, href: output.target, cls: "internal-link" });
    }
    action(main, state.main.done ? "恢复" : "完成", () =>
      store.setDone(state.main.fields.task_id, state.main.fields.date, !state.main.done)
    );
    action(main, "开始 25 分钟", () =>
      store.start(state.main.fields.task_id, state.main.fields.date, new Date().toISOString())
    );
  }

  const body = root.createDiv({ cls: "pos-card pos-body" });
  body.createEl("h2", { text: "🌿 身体照顾" });
  body.createEl("p", { text: state.body ? state.body.title : String(settings.minimum_body_action) });
  if (state.body) {
    action(body, state.body.done ? "恢复" : "完成", () =>
      store.setDone(state.body.fields.task_id, state.body.fields.date, !state.body.done)
    );
  }

  const blank = root.createDiv({ cls: "pos-card pos-blank" });
  blank.createEl("h2", { text: "☁️ 保护留白" });
  blank.createEl("p", { text: String(settings.blank_space) });

  const others = root.createDiv({ cls: "pos-card pos-others" });
  others.createEl("h2", { text: "其他今日任务" });
  for (const task of state.others) {
    const row = others.createDiv({ cls: "pos-task" });
    row.createSpan({ text: task.title });
    action(row, task.done ? "恢复" : "完成", () =>
      store.setDone(task.fields.task_id, task.fields.date, !task.done)
    );
    action(row, "设为主线", () =>
      store.setPriority(task.fields.task_id, task.fields.date, "P1")
    );
  }

  const capture = root.createDiv({ cls: "pos-card pos-capture" });
  capture.createEl("h2", { text: "快速添加" });
  const title = capture.createEl("input", { attr: { type: "text", placeholder: "输入一件需要完成的事…" } });
  const date = capture.createEl("input", { attr: { type: "date", value: today } });
  const module = capture.createEl("select");
  for (const item of modules.sort((a, b) => Number(a.order) - Number(b.order))) {
    module.createEl("option", { text: String(item.name), value: String(item.id) });
  }
  const submit = capture.createEl("button", { text: "＋ 添加", cls: "pos-action pos-primary" });
  submit.addEventListener("click", async () => {
    submit.disabled = true;
    try {
      await store.create({ title: title.value, date: date.value, module: module.value, priority: "P2" });
      title.value = "";
      await render();
    } catch (error) {
      submit.disabled = false;
      capture.createDiv({ text: error.message, cls: "pos-error" });
    }
  });

  const shortcuts = root.createDiv({ cls: "pos-shortcuts" });
  for (const [label, href] of [
    ["📚 阅读主页", "Book/阅读主页"],
    ["⌘ Programming", "Programming/Algorithm/Binary-Search"],
    ["⚑ Challenge", "Challenge/Personal Challenges"],
    ["◎ 目标中心", "00 Home/目标中心"]
  ]) {
    shortcuts.createEl("a", { text: label, href, cls: "internal-link pos-shortcut" });
  }

  const activeWeek = dv.pages('"PersonalOS/Goals"')
    .where(page => page.type === "personal-os-goal" && page.level === "week" && page.status === "active")
    .sort(page => page.start, "desc")
    .first();
  const week = root.createDiv({ cls: "pos-card pos-week" });
  week.createEl("h2", { text: "本周重点" });
  if (!activeWeek) {
    week.createEl("p", { text: "尚未设置" });
  } else {
    const linked = tasks.filter(task => homeModel.goalMatches(task.fields.goal, activeWeek.file));
    week.createEl("p", { text: activeWeek.file.name });
    week.createEl("small", {
      text: linked.length ? `${linked.filter(task => task.done).length} / ${linked.length}` : "尚未开始"
    });
  }

  if (state.invalid.length) {
    const details = root.createEl("details", { cls: "pos-diagnostics" });
    details.createEl("summary", { text: `待整理（${state.invalid.length}）` });
    for (const task of state.invalid) {
      details.createEl("p", {
        text: `${task.title} · ${task.sourcePath || "未知来源"} · ${task.diagnostic || "需要整理"}`
      });
    }
  }
}

await render();
