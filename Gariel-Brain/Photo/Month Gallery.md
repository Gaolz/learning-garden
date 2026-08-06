---
type: index
tags:
  - photo-dashboard
cssclass: photo-index
---

# 📷 每月一拍 / Photo of the Month

> 每天一张照片，记录生活里有温度的画面。一张照片 + 地点 + 谁 + 心情 + 标签 = 一个不会被遗忘的日子。
>
> One photo a day. A place, a face, a feeling, a tag — each day worth remembering.

> [[Year Gallery|📆 年度画廊 / Year Gallery →]]

```dataviewjs
// ===== Quick-action: Open or Create Today's Photo =====
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const todayYear = now.getFullYear();
const todayMonth = pad(now.getMonth() + 1);
const notePath = `Photo/${todayYear}/${todayMonth}/${todayStr}.md`;

const btnRow = dv.container.createEl('div');
btnRow.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:16px;';

const btn = document.createElement('button');
btn.textContent = '📷 今日照片 / Today';
btn.style.cssText = 'padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;border:1px solid var(--interactive-accent);background:var(--interactive-accent);color:var(--text-on-accent);';
btn.addEventListener('click', async () => {
  const file = app.vault.getAbstractFileByPath(notePath);
  if (!file) {
    // Create from template
    const template = app.vault.getAbstractFileByPath('Templates/Photo Note Template.md');
    if (template) {
      let content = await app.vault.read(template);
      content = content
        .replace(/<% tp\.date\.now\("YYYY-MM-DD"\) %>/g, todayStr)
        .replace(/<% tp\.date\.now\("YYYY"\) %>/g, String(todayYear))
        .replace(/<% tp\.date\.now\("MM"\) %>/g, todayMonth);
      const dir = app.vault.getAbstractFileByPath(`Photo/${todayYear}/${todayMonth}`);
      if (!dir) await app.vault.createFolder(`Photo/${todayYear}/${todayMonth}`);
      await app.vault.create(notePath, content);
    }
  }
  app.workspace.openLinkText(notePath, '', false);
});
btnRow.appendChild(btn);

const status = document.createElement('span');
status.style.cssText = 'font-size:12px;color:var(--text-muted);';
const exists = app.vault.getAbstractFileByPath(notePath);
status.textContent = exists ? '✅ 已记录 / Recorded' : '点击创建今日照片 / Click to create';
btnRow.appendChild(status);

// ===== Location search =====
const searchRow = dv.container.createEl('div');
searchRow.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:12px;';

const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.placeholder = '🔍 搜索地点... 如：崇州 / 成都 / 泰国';
searchInput.style.cssText = 'padding:4px 10px;border-radius:6px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:13px;width:220px;';
searchRow.appendChild(searchInput);

const clearBtn = document.createElement('button');
clearBtn.textContent = '✕';
clearBtn.style.cssText = 'padding:2px 8px;font-size:12px;cursor:pointer;border-radius:4px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-muted);display:none;';
clearBtn.addEventListener('click', () => { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); });
searchRow.appendChild(clearBtn);

// ===== Gallery =====
const currentYear = todayYear;
const currentMonth = now.getMonth() + 1;
const monthNames = ['一月/Jan','二月/Feb','三月/Mar','四月/Apr','五月/May','六月/Jun','七月/Jul','八月/Aug','九月/Sep','十月/Oct','十一月/Nov','十二月/Dec'];

// ===== Helper: parse date fields from created string =====
function parseDate(p) {
  const s = String(p.created);
  return {
    year: parseInt(s.slice(0, 4)),
    month: parseInt(s.slice(5, 7)),
    day: parseInt(s.slice(8, 10)),
    full: s.slice(0, 10)
  };
}

// ===== Helper: full card =====
function createCard(p) {
  const d = parseDate(p);
  const dateStr = d.full;
  const location = p.location || '';
  const feeling = p.feeling || p.feeling_text || '';
  const tags = p.tags ? p.tags.filter(t => t !== 'photo') : [];

  const imgBase = `assets/photo/${d.year}/${String(d.month).padStart(2, '0')}/${dateStr}`;
  const extensions = ['jpg','jpeg','png','gif','webp'];
  let imgFile = null;
  for (const ext of extensions) {
    imgFile = app.vault.getAbstractFileByPath(`${imgBase}.${ext}`);
    if (imgFile) break;
  }

  const imgWrap = document.createElement('div');
  imgWrap.className = 'photo-card-image';

  try {
    if (imgFile) {
      const img = document.createElement('img');
      img.src = app.vault.getResourcePath(imgFile);
      img.alt = dateStr;
      imgWrap.appendChild(img);
    } else {
      imgWrap.innerHTML = '<div class="photo-card-placeholder">📷</div>';
    }
  } catch(e) {
    imgWrap.innerHTML = '<div class="photo-card-placeholder">📷</div>';
  }

  const card = document.createElement('div');
  card.className = 'photo-card';
  card.setAttribute('data-location', location.toLowerCase());
  card.appendChild(imgWrap);

  const body = document.createElement('div');
  body.className = 'photo-card-body';
  body.innerHTML = `
    <div class="photo-card-header">
      <span class="photo-card-date">${dateStr}</span>
    </div>
    ${location ? `<div class="photo-card-location">📍 ${location}</div>` : ''}
    ${feeling ? `<div class="photo-card-feeling">${feeling}</div>` : ''}
    ${tags.length ? `<div class="photo-card-tags">${tags.map(t => `<span class="tag-chip">#${t}</span>`).join(' ')}</div>` : ''}
  `;

  card.appendChild(body);
  card.addEventListener('click', () => {
    app.workspace.openLinkText(p.file.path, '', false);
  });

  return card;
}

// ===== Gather all months that have photos =====
const allPages = dv.pages('#photo')
  .where(p => p.created && String(p.created).slice(0, 4) === String(currentYear))
  .sort(p => p.created, 'asc');

const monthGroups = allPages.groupBy(p => String(p.created).slice(5, 7)).sort(g => g.key, 'asc');

// ===== Month chip bar =====
const barRow = dv.container.createEl('div');
barRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;';

for (const group of monthGroups) {
  const m = parseInt(group.key);
  const count = group.rows.length;
  const isCurrent = m === currentMonth;

  const chip = document.createElement('span');
  chip.className = isCurrent ? 'month-chip month-chip-active' : 'month-chip';
  chip.setAttribute('data-month', m);
  chip.innerHTML = `📅 ${String(m).padStart(2, '0')} · ${count} 张`;
  chip.title = `${monthNames[m - 1]}: ${count} photos`;

  barRow.appendChild(chip);
}

// ===== All month grids (hidden except active) =====
const gridsWrapper = dv.container.createEl('div');

for (const group of monthGroups) {
  const m = parseInt(group.key);
  const isCurrent = m === currentMonth;
  const monthLabel = monthNames[m - 1];

  const gridContainer = document.createElement('div');
  gridContainer.setAttribute('data-month-grid', m);
  gridContainer.style.display = isCurrent ? 'block' : 'none';

  const header = document.createElement('h3');
  header.style.marginTop = '0';
  header.innerHTML = `📅 ${currentYear} / ${String(m).padStart(2, '0')} — ${monthLabel}`;
  gridContainer.appendChild(header);

  if (group.rows.length === 0) {
    const empty = document.createElement('p');
    empty.innerHTML = '_这个月还没有照片 / No photos this month._';
    empty.style.color = 'var(--text-muted)';
    gridContainer.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'photo-grid photo-grid-month';
    for (const p of group.rows) {
      grid.appendChild(createCard(p));
    }
    gridContainer.appendChild(grid);
  }

  gridsWrapper.appendChild(gridContainer);
}

// ===== Location filter =====
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const keywords = q ? q.split(/\s+/) : [];
  clearBtn.style.display = q ? 'inline-block' : 'none';
  gridsWrapper.querySelectorAll('.photo-card').forEach(card => {
    const loc = card.getAttribute('data-location') || '';
    if (keywords.length === 0) {
      card.style.display = '';
    } else {
      const match = keywords.some(kw => loc.includes(kw));
      card.style.display = match ? '' : 'none';
    }
  });
});

// ===== Chip click: switch month =====
barRow.querySelectorAll('.month-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const targetMonth = parseInt(chip.getAttribute('data-month'));

    // Update chip active state
    barRow.querySelectorAll('.month-chip').forEach(c => c.classList.remove('month-chip-active'));
    chip.classList.add('month-chip-active');

    // Show/hide grids
    gridsWrapper.querySelectorAll('[data-month-grid]').forEach(g => {
      const gm = parseInt(g.getAttribute('data-month-grid'));
      g.style.display = gm === targetMonth ? 'block' : 'none';
    });
  });
});
```

## 💡 使用贴士 / Tips

| English                                                                                                                                 | 中文                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **New photo**: create from `[[../../Templates/Photo Note Template\|Photo Note Template]]` → save to `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md` | **新建照片**：从模板创建 → 保存到 `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md` |
| **Image** goes in `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg`                                                                           | **图片**放在 `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg`     |
| **Tags**: scene (`nature` `city` `home`), people (`family` `friends`), activity (`sports` `cooking`)                                    | **标签**：场景（自然/城市/家里）、人物（家人/朋友）、活动（运动/烹饪）                  |
| **Search**: type location keyword (e.g. "崇州") in the search box to filter                                                           | **搜索**：在搜索框输入地点关键词（如"崇州"）过滤照片                              |
| **Auto-update**: new note → card appears, nothing to configure                                                                          | **自动更新**：新笔记建好，卡片自动出现                                    |
| Click any card → opens full photo note                                                                                                  | 点击任意卡片 → 打开照片笔记                                          |
