// Process Photo Drop — rename & move dropped image to assets/photo/YYYY/MM/
module.exports = async (params) => {
  const { app, quickAddApi } = params;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const srcFolder = app.vault.getAbstractFileByPath("assets/photo");
  if (!srcFolder) {
    new Notice("❌ assets/photo/ not found");
    return;
  }

  // Find jpg/png files that don't match YYYY-MM-DD pattern
  const datePattern = /^\d{4}-\d{2}-\d{2}\.(jpg|png|jpeg|gif|webp)$/;
  const candidates = srcFolder.children.filter(f =>
    ['jpg', 'png', 'jpeg', 'gif', 'webp'].includes(f.extension) && !datePattern.test(f.name)
  );

  if (candidates.length === 0) {
    new Notice("ℹ️ No unprocessed images in assets/photo/");
    return;
  }

  // Pick most recently modified
  candidates.sort((a, b) => b.stat.mtime - a.stat.mtime);
  const file = candidates[0];
  const ext = file.extension;

  // Ensure target directory
  const targetDirPath = `assets/photo/${year}/${month}`;
  const dir = app.vault.getAbstractFileByPath(targetDirPath);
  if (!dir) await app.vault.createFolder(targetDirPath);

  // Move & rename
  const newPath = `${targetDirPath}/${today}.${ext}`;
  const oldName = file.name;
  await app.vault.rename(file, newPath);

  // Fix embed in current note (replace old filename with new path)
  const activeFile = app.workspace.getActiveFile();
  if (activeFile) {
    let content = await app.vault.read(activeFile);
    const oldEmbed = `![[${oldName}]]`;
    const newEmbed = `![[${targetDirPath}/${today}.${ext}]]`;
    if (content.includes(oldEmbed)) {
      content = content.replace(oldEmbed, newEmbed);
      await app.vault.modify(activeFile, content);
    }
  }

  // Open today's photo note
  const notePath = `Photo/${year}/${month}/${today}.md`;
  const noteFile = app.vault.getAbstractFileByPath(notePath);
  if (noteFile) {
    await app.workspace.openLinkText(notePath, '', false);
  }

  new Notice(`✅ ${oldName} → ${year}/${month}/${today}.${ext}`);
};
