---
type: index
tags:
  - photo-dashboard
cssclass: photo-index
---

# 📆 年度画廊 / Photo Gallery

> 一整年的画面，全部在这里。每一天一个小卡片，拼出你的 365 天。
>
> Every photo you took this year, laid out on one page. Each small card = one day of your life.

> [[Month Gallery|📅 月度画廊 / Month Gallery →]]

## 🖼️ 年度相册 / Year Gallery

```dataviewjs
const currentYear = new Date().getFullYear();

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

// ===== Helper: compact card =====
function createCompactCard(p) {
  const d = parseDate(p);
  const mmdd = `${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const location = p.location || '';

  const imgBase = `assets/photo/${d.year}/${String(d.month).padStart(2, '0')}/${d.full}`;
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
      img.alt = d.full;
      imgWrap.appendChild(img);
    } else {
      imgWrap.innerHTML = '<div class="photo-card-placeholder">📷</div>';
    }
  } catch(e) {
    imgWrap.innerHTML = '<div class="photo-card-placeholder">📷</div>';
  }

  const card = document.createElement('div');
  card.className = 'photo-card photo-card-compact';
  card.setAttribute('data-location', location.toLowerCase());
  card.appendChild(imgWrap);

  const body = document.createElement('div');
  body.className = 'photo-card-body';
  body.innerHTML = `
    <span class="photo-card-compact-date">${mmdd}</span>
    ${location ? `<div class="photo-card-compact-location">📍 ${location}</div>` : ''}
  `;

  card.appendChild(body);
  card.addEventListener('click', () => {
    app.workspace.openLinkText(p.file.path, '', false);
  });

  return card;
}

// ===== Gather all years that have photos =====
const allPages = dv.pages('#photo')
  .where(p => p.created)
  .sort(p => p.created, 'asc');

const yearGroups = allPages.groupBy(p => String(p.created).slice(0, 4)).sort(g => g.key, 'desc');

if (yearGroups.length === 0) {
  dv.paragraph("_No photos yet. Start today! / 还没有照片，从今天开始吧！_");
} else {

// ===== Location search =====
const searchRow = dv.container.createEl('div');
searchRow.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:16px;';

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

// ===== Year chip bar =====
const barRow = dv.container.createEl('div');
barRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;';

for (const group of yearGroups) {
  const y = parseInt(group.key);
  const count = group.rows.length;
  const isCurrent = y === currentYear;

  const chip = document.createElement('span');
  chip.className = isCurrent ? 'month-chip month-chip-active' : 'month-chip';
  chip.setAttribute('data-year-gallery', y);
  chip.innerHTML = `📆 ${y} · ${count} 张`;
  chip.title = `${y}: ${count} photos`;

  barRow.appendChild(chip);
}

// ===== Card grid per year =====
const contentWrapper = dv.container.createEl('div');

for (const group of yearGroups) {
  const y = parseInt(group.key);
  const isCurrent = y === currentYear;

  const yearSection = document.createElement('div');
  yearSection.setAttribute('data-year-gallery', y);
  yearSection.style.display = isCurrent ? 'block' : 'none';

  const header = document.createElement('h3');
  header.innerHTML = `📆 ${y} — ${group.rows.length} 张照片`;
  yearSection.appendChild(header);

  if (group.rows.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No photos this year.';
    empty.style.color = 'var(--text-muted)';
    yearSection.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'photo-grid photo-grid-year';
    for (const p of group.rows) {
      grid.appendChild(createCompactCard(p));
    }
    yearSection.appendChild(grid);
  }

  contentWrapper.appendChild(yearSection);
}

// ===== Location filter =====
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const keywords = q ? q.split(/\s+/) : [];
  clearBtn.style.display = q ? 'inline-block' : 'none';
  contentWrapper.querySelectorAll('.photo-card').forEach(card => {
    const loc = card.getAttribute('data-location') || '';
    if (keywords.length === 0) {
      card.style.display = '';
    } else {
      const match = keywords.some(kw => loc.includes(kw));
      card.style.display = match ? '' : 'none';
    }
  });
});

// ===== Chip click: switch year =====
barRow.querySelectorAll('.month-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const targetYear = parseInt(chip.getAttribute('data-year-gallery'));

    barRow.querySelectorAll('.month-chip').forEach(c => c.classList.remove('month-chip-active'));
    chip.classList.add('month-chip-active');

    contentWrapper.querySelectorAll('[data-year-gallery]').forEach(s => {
      const sy = parseInt(s.getAttribute('data-year-gallery'));
      s.style.display = sy === targetYear ? 'block' : 'none';
    });
  });
});

} // end guard
```

---

## 🔥 年度热力图 / Year Heatmap

```dataviewjs
const currentYear = new Date().getFullYear();

function parseDate(p) {
  const s = String(p.created);
  return {
    year: parseInt(s.slice(0, 4)),
    month: parseInt(s.slice(5, 7)),
    day: parseInt(s.slice(8, 10)),
    full: s.slice(0, 10)
  };
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function buildHeatmap(year, pages) {
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const cellSize = 10;
  const gap = 2;

  // Map month -> Set of days with photos, and day -> page lookup
  const photoDays = [];
  const photoByDay = [];
  for (let i = 0; i < 12; i++) { photoDays[i] = new Set(); photoByDay[i] = {}; }
  for (const p of pages) {
    const d = parseDate(p);
    const mi = d.month - 1;
    if (mi >= 0 && mi < 12) {
      photoDays[mi].add(d.day);
      photoByDay[mi][d.day] = p;
    }
  }

  // Count photos per month for the count row
  const counts = photoDays.map(s => s.size);

  const container = document.createElement("div");

  // Month labels
  const labels = document.createElement("div");
  labels.style.cssText = `display:flex;gap:${gap}px;margin-bottom:2px;`;
  for (const m of months) {
    const span = document.createElement("span");
    span.style.cssText = `width:${cellSize}px;font-size:7px;color:#888;text-align:center;`;
    span.textContent = m;
    labels.appendChild(span);
  }
  container.appendChild(labels);

  // Grid: 31 rows (day 1-31), 12 columns
  const grid = document.createElement("div");
  grid.style.cssText = `display:flex;flex-direction:column;gap:${gap}px;`;

  for (let day = 1; day <= 31; day++) {
    const rowDiv = document.createElement("div");
    rowDiv.style.cssText = `display:flex;gap:${gap}px;`;

    for (let m = 0; m < 12; m++) {
      const cell = document.createElement("div");
      cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;border-radius:1px;`;

      const dim = daysInMonth(year, m);

      if (day > dim) {
        // Day doesn't exist in this month
        cell.style.background = "transparent";
      } else if (photoDays[m].has(day)) {
        cell.style.background = "#4a8a4a";
        const photo = photoByDay[m][day];
        if (photo) {
          cell.title = photo.created;
          cell.style.cursor = "pointer";
          cell.addEventListener("click", () => {
            app.workspace.openLinkText(photo.file.path, "", false);
          });
        }
      } else {
        cell.style.background = "#1a1a1a";
      }

      rowDiv.appendChild(cell);
    }
    grid.appendChild(rowDiv);
  }
  container.appendChild(grid);

  // Count labels
  const countRow = document.createElement("div");
  countRow.style.cssText = `display:flex;gap:${gap}px;margin-top:2px;`;
  for (let m = 0; m < 12; m++) {
    const span = document.createElement("span");
    span.style.cssText = `width:${cellSize}px;font-size:6px;color:#666;text-align:center;`;
    span.textContent = counts[m] || "";
    countRow.appendChild(span);
  }
  container.appendChild(countRow);

  // Legend
  const legend = document.createElement("div");
  legend.style.cssText = "margin-top:6px;font-size:10px;color:#888;";
  legend.innerHTML = '<span style="color:#4a8a4a;">■</span> 有照片 / has photo &nbsp;<span style="color:#1a1a1a;">■</span> 没有 / no photo &nbsp;<span style="color:transparent;">■</span> 不存在 / no day';
  container.appendChild(legend);

  return container;
}

const allPages = dv.pages('#photo')
  .where(p => p.created)
  .sort(p => p.created, 'asc');

const yearGroups = allPages.groupBy(p => String(p.created).slice(0, 4)).sort(g => g.key, 'desc');

if (yearGroups.length === 0) {
  dv.paragraph("_No photos yet._");
} else {

const barRow = dv.container.createEl('div');
barRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;';

for (const group of yearGroups) {
  const y = parseInt(group.key);
  const isCurrent = y === currentYear;

  const chip = document.createElement('span');
  chip.className = isCurrent ? 'month-chip month-chip-active' : 'month-chip';
  chip.setAttribute('data-year-hm', y);
  chip.innerHTML = `📆 ${y}`;
  chip.title = `${y}: ${group.rows.length} photos`;
  barRow.appendChild(chip);
}

const hmWrapper = dv.container.createEl('div');

for (const group of yearGroups) {
  const y = parseInt(group.key);
  const isCurrent = y === currentYear;

  const hmSection = document.createElement('div');
  hmSection.setAttribute('data-year-hm', y);
  hmSection.style.display = isCurrent ? 'block' : 'none';
  hmSection.appendChild(buildHeatmap(y, group.rows));
  hmWrapper.appendChild(hmSection);
}

barRow.querySelectorAll('.month-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const targetYear = parseInt(chip.getAttribute('data-year-hm'));
    barRow.querySelectorAll('.month-chip').forEach(c => c.classList.remove('month-chip-active'));
    chip.classList.add('month-chip-active');
    hmWrapper.querySelectorAll('[data-year-hm]').forEach(s => {
      s.style.display = parseInt(s.getAttribute('data-year-hm')) === targetYear ? 'block' : 'none';
    });
  });
});

} // end guard
```

## 📊 统计 / Stats

```dataview
TABLE WITHOUT ID
  location as "📍 Location",
  length(rows) as "Photos"
FROM #photo
WHERE location
GROUP BY location
SORT length(rows) DESC
```

```dataview
TABLE WITHOUT ID
  feeling as "💭 Feeling",
  length(rows) as "Days"
FROM #photo
WHERE feeling
GROUP BY feeling
SORT length(rows) DESC
```

## 💡 使用贴士 / Tips

| English | 中文 |
|---------|------|
| Each card = one day. Click to open full note | 每张卡片 = 一天生活。点击打开完整笔记 |
| Click year chips above to switch between years | 点击顶部年份标签切换不同年份 |
| Green dot in heatmap = you took a photo that day | 热力图绿点 = 那天你拍了照片 |
| Search photos by location: type "崇州" or "成都" in the search box | 搜索照片：在搜索框输入"崇州"或"成都"过滤 |
| Empty days are normal — life isn't a perfect streak | 空白天数很正常 —— 生活不是完美的连续打卡 |
| Stats show all-time data across all years | 统计数据展示所有年份的汇总 |
| Come back at end of year to see your visual journal | 年底回来看看你的视觉日记 |
