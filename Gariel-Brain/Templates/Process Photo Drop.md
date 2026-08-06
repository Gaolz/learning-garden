<%*
const today = tp.date.now("YYYY-MM-DD");
const year = tp.date.now("YYYY");
const month = tp.date.now("MM");

const srcFolder = app.vault.getAbstractFileByPath("assets/photo");
if (!srcFolder) {
  new Notice("❌ assets/photo/ 目录不存在 / folder not found");
  return;
}

// Find jpg files that don't match YYYY-MM-DD.jpg pattern
const datePattern = /^\d{4}-\d{2}-\d{2}\.jpg$/;
const candidates = srcFolder.children.filter(f =>
  f.extension === 'jpg' && !datePattern.test(f.name)
);

if (candidates.length === 0) {
  new Notice("ℹ️ 没有需要处理的图片 / No unprocessed images");
  return;
}

// Pick most recently modified
candidates.sort((a, b) => b.stat.mtime - a.stat.mtime);
const file = candidates[0];

// Ensure target directory
const targetDir = `assets/photo/${year}/${month}`;
const dir = app.vault.getAbstractFileByPath(targetDir);
if (!dir) await app.vault.createFolder(targetDir);

// Move & rename
const newPath = `${targetDir}/${today}.jpg`;
await app.vault.rename(file, newPath);

// Open today's photo note
const notePath = `Photo/${year}/${month}/${today}.md`;
const noteFile = app.vault.getAbstractFileByPath(notePath);
if (noteFile) {
  await app.workspace.openLinkText(notePath, '', false);
}

new Notice(`✅ ${file.name} → ${year}/${month}/${today}.jpg`);
%>
