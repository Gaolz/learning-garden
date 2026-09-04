"use strict";

function createObsidianAdapter(app) {
  return {
    exists: path => app.vault.adapter.exists(path),
    read: path => app.vault.adapter.read(path),
    write: (path, text) => app.vault.adapter.write(path, text),
    async mkdir(path) {
      const parts = path.split("/");
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        if (!await app.vault.adapter.exists(current)) await app.vault.adapter.mkdir(current);
      }
    },
    remove: path => app.vault.adapter.remove(path)
  };
}

module.exports = { createObsidianAdapter };
