<%*
// Process Photo Drop — rename & move dropped image to assets/photo/YYYY/MM/
// Uses current note title for date; falls back to today if not a date-format title
const title = tp.file.title;
const dateMatch = title.match(/^(\d{4})-(\d{2})-(\d{2})$/);
const now = new Date();
const today = dateMatch ? title : `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const year = today.slice(0,4);
const month = today.slice(5,7);

const srcFolder = app.vault.getAbstractFileByPath("assets/photo");
if (!srcFolder) {
  new Notice("❌ assets/photo/ 不存在");
  return;
}

const datePattern = /^\d{4}-\d{2}-\d{2}\.(jpg|png|jpeg|gif|webp)$/i;
const candidates = srcFolder.children.filter(f =>
  ['jpg','png','jpeg','gif','webp'].includes(f.extension) && !datePattern.test(f.name)
);

if (candidates.length === 0) {
  new Notice("ℹ️ assets/photo/ 中没有未处理的图片");
  return;
}

candidates.sort((a,b) => b.stat.mtime - a.stat.mtime);
const file = candidates[0];
const ext = file.extension;

const targetDir = `assets/photo/${year}/${month}`;
if (!app.vault.getAbstractFileByPath(targetDir)) await app.vault.createFolder(targetDir);

const newPath = `${targetDir}/${today}.${ext}`;
const oldName = file.name;
await app.vault.rename(file, newPath);

const activeFile = app.workspace.getActiveFile();
if (activeFile) {
  let content = await app.vault.read(activeFile);
  const oldEmbed = `![[${oldName}]]`;
  const newEmbed = `![[${targetDir}/${today}.${ext}]]`;
  if (content.includes(oldEmbed)) {
    content = content.replace(oldEmbed, newEmbed);
    await app.vault.modify(activeFile, content);
  }
}

new Notice(`✅ ${oldName} → ${year}/${month}/${today}.${ext}`);
%>
