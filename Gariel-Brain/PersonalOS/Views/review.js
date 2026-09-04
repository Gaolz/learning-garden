async function loadModule(name) {
  const source = await app.vault.adapter.read(`PersonalOS/Services/${name}.js`);
  const module = { exports: {} };
  new Function("module", "exports", "require", source)(module, module.exports, request => {
    throw new Error(`unsupported service dependency: ${request}`);
  });
  return module.exports;
}

const taskModel = await loadModule("task-model");
const reviewModel = await loadModule("review-model");
const anchor = reviewModel.normalizeAnchor(input.anchor);
const range = reviewModel.dateRange(input.kind, anchor);
const taskFiles = app.vault.getFiles().filter(file =>
  /^PersonalOS\/Tasks\/\d{4}\/\d{4}-\d{2}\.md$/.test(file.path)
).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
const tasks = [];
for (const file of taskFiles) tasks.push(...taskModel.parseTasks(await app.vault.read(file)));
const summary = reviewModel.summarize(tasks, range);
const dailyFiles = app.vault.getFiles().filter(file =>
  /^DailyNotes\/\d{4}-\d{2}-\d{2}\.md$/.test(file.path) &&
  file.basename >= range.start &&
  file.basename <= range.end
).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
const daily = [];
for (const file of dailyFiles) {
  const source = await app.vault.read(file);
  daily.push({ file, source, highlights: reviewModel.dailyHighlights(source) });
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

if (input.kind === "week") {
  dv.header(3, "Challenge 当前进度");
  const challengeFile = app.vault.getAbstractFileByPath("Challenge/Personal Challenges.md");
  if (challengeFile) {
    const progress = reviewModel.challengeProgress(await app.vault.read(challengeFile));
    dv.paragraph(`${progress.done} / ${progress.total}`);
  } else {
    dv.paragraph("Challenge 清单尚未创建");
  }
}

if (input.kind === "month") {
  const weeklyRoot = "PersonalOS/Reviews/Weekly/";
  const weeklyFiles = app.vault.getFiles().filter(file =>
    file.path.startsWith(weeklyRoot) && file.path.endsWith(".md")
  ).sort((left, right) => left.path.localeCompare(right.path));
  const weeklyDocuments = [];
  for (const file of weeklyFiles) weeklyDocuments.push({ path: file.path, source: await app.vault.read(file) });

  const readingRoot = "Book/01_Readings/";
  const readingFiles = app.vault.getFiles().filter(file =>
    file.path.startsWith(readingRoot) && file.path.endsWith(".md")
  ).sort((left, right) => left.path.localeCompare(right.path));
  const readingDocuments = [];
  for (const file of readingFiles) {
    readingDocuments.push({ path: file.path, basename: file.basename, source: await app.vault.read(file) });
  }

  const focuses = reviewModel.weeklyFocuses(weeklyDocuments, range);
  dv.header(3, "每周唯一重点");
  if (focuses.length) dv.list(focuses.map(item => `${item.date} · ${item.text}`));
  else dv.paragraph("本月暂无周重点记录");

  const readings = reviewModel.completedReadings(readingDocuments, range);
  dv.header(3, "当月完成的阅读记录");
  if (readings.length) dv.list(readings.map(item => `${item.date} · ${dv.fileLink(item.path)}`));
  else dv.paragraph("本月暂无已读记录");

  const blockers = reviewModel.repeatedBlockers(
    weeklyDocuments,
    daily.map(item => ({ path: item.file.path, source: item.source })),
    range
  );
  dv.header(3, "重复阻碍（出现两次以上）");
  if (blockers.length) dv.list(blockers.map(item => `${item.text} · ${item.count} 次`));
  else dv.paragraph("本月没有重复阻碍");
}
