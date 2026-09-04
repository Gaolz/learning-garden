async function loadModule(name) {
  const source = await app.vault.adapter.read(`PersonalOS/Services/${name}.js`);
  const module = { exports: {} };
  new Function("module", "exports", "require", source)(module, module.exports, request => {
    throw new Error(`unsupported service dependency: ${request}`);
  });
  return module.exports;
}

function dailyHighlights(source) {
  return source.split(/\r?\n/)
    .filter(line => /(成果输出|Output|阻碍|Blocker|下一步|Next)/i.test(line))
    .map(line => line.replace(/^\s*[-*]\s*(?:\[[ xX]\]\s*)?/, "").trim())
    .filter(line => /[:：]\s*\S/.test(line));
}

const taskModel = await loadModule("task-model");
const reviewModel = await loadModule("review-model");
const range = reviewModel.dateRange(input.kind, input.anchor);
const taskFiles = app.vault.getFiles().filter(file =>
  /^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(file.path)
);
const tasks = [];
for (const file of taskFiles) tasks.push(...taskModel.parseTasks(await app.vault.read(file)));
const summary = reviewModel.summarize(tasks, range);
const dailyFiles = app.vault.getFiles().filter(file =>
  /^DailyNotes\/\d{4}-\d{2}-\d{2}\.md$/.test(file.path) &&
  file.basename >= range.start &&
  file.basename <= range.end
);
const daily = [];
for (const file of dailyFiles) {
  daily.push({ file, highlights: dailyHighlights(await app.vault.read(file)) });
}

dv.header(2, input.kind === "week" ? "本周自动摘要" : "本月自动摘要");
dv.paragraph(`唯一主线：${summary.main.done} / ${summary.main.total}`);
dv.table(
  ["模块", "完成", "总数"],
  Object.entries(summary.modules).map(([module, counts]) => [module, counts.done, counts.total])
);
dv.header(3, "未完成与延期");
dv.list(summary.carryover.map(task => task.title));
dv.header(3, "Daily Note");
for (const item of daily) {
  dv.paragraph(dv.fileLink(item.file.path));
  if (item.highlights.length) dv.list(item.highlights);
}
