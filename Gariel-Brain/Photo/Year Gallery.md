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
  const emoji = p.feeling_emoji || '';
  const location = p.location || '';

  const imgPath = `assets/photo/${d.year}/${String(d.month).padStart(2, '0')}/${d.full}.jpg`;
  const imgWrap = document.createElement('div');
  imgWrap.className = 'photo-card-image';

  try {
    const imgFile = app.vault.getAbstractFileByPath(imgPath);
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
  card.appendChild(imgWrap);

  const body = document.createElement('div');
  body.className = 'photo-card-body';
  body.innerHTML = `
    <span class="photo-card-compact-date">${mmdd}</span>
    ${emoji ? `<span class="photo-card-compact-emoji">${emoji}</span>` : ''}
    ${location ? `<div class="photo-card-compact-location">📍 ${location}</div>` : ''}
  `;

  card.appendChild(body);
  card.addEventListener('click', () => {
    app.workspace.openLinkText(p.file.path, '', false);
  });

  return card;
}

// ===== Helper: heatmap (uses vanilla Date, no dv.date) =====
function buildHeatmap(year, pages) {
  const photoDays = new Set();
  const photoPagesByDay = {};
  for (const p of pages) {
    const d = parseDate(p);
    const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
    photoDays.add(key);
    photoPagesByDay[key] = p;
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  const container = document.createElement('div');

  // Month labels
  const labels = document.createElement('div');
  labels.style.cssText = 'display:flex;gap:3px;margin-bottom:4px;';
  for (const m of months) {
    const span = document.createElement('span');
    span.style.cssText = 'width:14px;font-size:8px;color:#888;text-align:center;';
    span.textContent = m;
    labels.appendChild(span);
  }
  container.appendChild(labels);

  // Day grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;max-width:120px;';

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const nowTime = now.getTime();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hasPhoto = photoDays.has(key);
    const isToday = key === todayStr;
    const isFuture = d.getTime() > nowTime;

    const cell = document.createElement('div');
    cell.style.cssText = `width:14px;height:14px;border-radius:2px;`;
    cell.title = `${key}${hasPhoto ? ' - 📷' : ''}${isToday ? ' (today)' : ''}`;

    if (hasPhoto) {
      cell.style.background = '#4a8a4a';
      if (isToday) cell.style.border = '2px solid #88cc88';
      if (photoPagesByDay[key]) {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
          app.workspace.openLinkText(photoPagesByDay[key].file.path, '', false);
        });
      }
    } else if (isFuture) {
      cell.style.background = 'transparent';
    } else {
      cell.style.background = '#1a1a1a';
      if (isToday) cell.style.border = '1px dashed #4a8a4a';
    }

    grid.appendChild(cell);
  }
  container.appendChild(grid);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'margin-top:8px;font-size:11px;color:#888;';
  legend.innerHTML = '<span style="color:#4a8a4a;">■</span> 有照片 / has photo &nbsp;<span style="color:#1a1a1a;">■</span> 没有 / no photo &nbsp;<span style="border:1px dashed #4a8a4a;padding:0 2px;">□</span> 今天 / today';
  container.appendChild(legend);

  return container;
}

// ===== Gather all years that have photos =====
const allPages = dv.pages('#photo')
  .where(p => p.created)
  .sort(p => p.created, 'asc');

const yearGroups = allPages.groupBy(p => String(p.created).slice(0, 4)).sort(g => g.key, 'desc');

// Guard: no pages found
if (yearGroups.length === 0) {
  dv.paragraph("_No photos yet. Start today! / 还没有照片，从今天开始吧！_");
} else {

// ===== Year chip bar =====
const barRow = dv.container.createEl('div');
barRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;';

for (const group of yearGroups) {
  const y = parseInt(group.key);
  const count = group.rows.length;
  const isCurrent = y === currentYear;

  const chip = document.createElement('span');
  chip.className = isCurrent ? 'month-chip month-chip-active' : 'month-chip';
  chip.setAttribute('data-year', y);
  chip.innerHTML = `📆 ${y} · ${count} 张`;
  chip.title = `${y}: ${count} photos`;

  barRow.appendChild(chip);
}

// ===== Content per year (card grid + heatmap, hidden except active) =====
const contentWrapper = dv.container.createEl('div');

for (const group of yearGroups) {
  const y = parseInt(group.key);
  const isCurrent = y === currentYear;

  const yearSection = document.createElement('div');
  yearSection.setAttribute('data-year-section', y);
  yearSection.style.display = isCurrent ? 'block' : 'none';

  // Year header
  const header = document.createElement('h2');
  header.innerHTML = `📆 ${y} — ${group.rows.length} 张照片`;
  yearSection.appendChild(header);

  // Card grid
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

  // Heatmap
  const hmHeader = document.createElement('h3');
  hmHeader.textContent = '年度热力图 / Year Heatmap';
  hmHeader.style.marginTop = '24px';
  yearSection.appendChild(hmHeader);

  yearSection.appendChild(buildHeatmap(y, group.rows));

  contentWrapper.appendChild(yearSection);
}

// ===== Chip click: switch year =====
barRow.querySelectorAll('.month-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const targetYear = parseInt(chip.getAttribute('data-year'));

    barRow.querySelectorAll('.month-chip').forEach(c => c.classList.remove('month-chip-active'));
    chip.classList.add('month-chip-active');

    contentWrapper.querySelectorAll('[data-year-section]').forEach(s => {
      const sy = parseInt(s.getAttribute('data-year-section'));
      s.style.display = sy === targetYear ? 'block' : 'none';
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
  feeling_emoji as "😊 Mood",
  length(rows) as "Days"
FROM #photo
WHERE feeling_emoji
GROUP BY feeling_emoji
SORT length(rows) DESC
```

## 💡 使用贴士 / Tips

| English | 中文 |
|---------|------|
| Each card = one day. Click to open full note | 每张卡片 = 一天生活。点击打开完整笔记 |
| Click year chips above to switch between years | 点击顶部年份标签切换不同年份 |
| Green dot in heatmap = you took a photo that day | 热力图绿点 = 那天你拍了照片 |
| Empty days are normal — life isn't a perfect streak | 空白天数很正常 —— 生活不是完美的连续打卡 |
| Stats show all-time data across all years | 统计数据展示所有年份的汇总 |
| Come back at end of year to see your visual journal | 年底回来看看你的视觉日记 |
