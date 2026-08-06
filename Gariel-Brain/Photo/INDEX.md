---
type: index
tags:
  - photo-dashboard
cssclass: photo-index
---

# 📷 Daily Photo Gallery

```dataviewjs
const today = dv.date("now");
const currentYear = today.year;
const currentMonth = today.month;

// ===== Helper: build card DOM element =====
function createCard(p, compact) {
  const d = p.created;
  const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const mmdd = `${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const emoji = p.feeling_emoji || '';
  const location = p.location || '';
  const feeling = p.feeling_text || '';
  const tags = p.tags ? p.tags.filter(t => t !== 'photo') : [];

  // Build image
  const imgRelPath = `assets/photo/${d.year}/${String(d.month).padStart(2, '0')}/${dateStr}.jpg`;
  const imgWrap = document.createElement('div');
  imgWrap.className = 'photo-card-image';

  try {
    const imgFile = app.vault.getAbstractFileByPath(imgRelPath);
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

  // Build card
  const card = document.createElement('div');
  card.className = compact ? 'photo-card photo-card-compact' : 'photo-card';
  card.appendChild(imgWrap);

  const body = document.createElement('div');
  body.className = 'photo-card-body';

  if (compact) {
    body.innerHTML = `
      <span class="photo-card-compact-date">${mmdd}</span>
      ${emoji ? `<span class="photo-card-compact-emoji">${emoji}</span>` : ''}
      ${location ? `<div class="photo-card-compact-location">📍 ${location}</div>` : ''}
    `;
  } else {
    body.innerHTML = `
      <div class="photo-card-header">
        <span class="photo-card-date">${dateStr}</span>
        ${emoji ? `<span class="photo-card-emoji">${emoji}</span>` : ''}
      </div>
      ${location ? `<div class="photo-card-location">📍 ${location}</div>` : ''}
      ${feeling ? `<div class="photo-card-feeling">${feeling}</div>` : ''}
      ${tags.length ? `<div class="photo-card-tags">${tags.map(t => `<span class="tag-chip">#${t}</span>`).join(' ')}</div>` : ''}
    `;
  }

  card.appendChild(body);

  card.addEventListener('click', () => {
    app.workspace.openLinkText(p.file.path, '', false);
  });

  return card;
}

// ===== 📅 This Month =====
dv.header(2, `📅 ${currentYear} / ${String(currentMonth).padStart(2, '0')}`);

const thisMonth = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear && p.created.month === currentMonth)
  .sort(p => p.created, 'asc');

if (thisMonth.length === 0) {
  dv.paragraph("_No photos this month yet. Take your first photo today!_");
} else {
  const grid = dv.container.createEl('div', { cls: 'photo-grid photo-grid-month' });
  for (const p of thisMonth) {
    grid.appendChild(createCard(p, false));
  }
}

// ===== 📆 This Year =====
dv.header(2, `📆 ${currentYear}`);

const thisYear = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear)
  .sort(p => p.created, 'asc');

if (thisYear.length === 0) {
  dv.paragraph("_No photos this year yet._");
} else {
  const grid = dv.container.createEl('div', { cls: 'photo-grid photo-grid-year' });
  for (const p of thisYear) {
    grid.appendChild(createCard(p, true));
  }
}
```

## 📊 Stats

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

## 📆 Year Heatmap

```dataviewjs
const year = 2026;
const pages = dv.pages('#photo').where(p => p.created && p.created.year === year);

const photoDays = new Set();
const photoPagesByDay = {};
for (const p of pages) {
  const key = `${p.created.year}-${String(p.created.month).padStart(2, '0')}-${String(p.created.day).padStart(2, '0')}`;
  photoDays.add(key);
  photoPagesByDay[key] = p;
}

const now = dv.date("now");
const todayStr = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];

let html = '';

html += '<div style="display: flex; gap: 3px; margin-bottom: 4px;">';
for (const m of months) {
  html += `<span style="width: 14px; font-size: 8px; color: #888; text-align: center;">${m}</span>`;
}
html += '</div>';

const start = dv.date(`${year}-01-01`);
const end = dv.date(`${year}-12-31`);

html += '<div style="display: flex; gap: 3px; flex-wrap: wrap; max-width: 120px;">';

for (let d = start; d <= end; d = d.plus({days: 1})) {
  const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const hasPhoto = photoDays.has(key);
  const isToday = key === todayStr;
  const isFuture = d > now;

  let bg = '#1a1a1a';
  if (hasPhoto) bg = '#4a8a4a';
  if (isFuture) bg = 'transparent';
  let border = 'none';
  if (isToday && hasPhoto) border = '2px solid #88cc88';
  if (isToday && !hasPhoto) border = '1px dashed #4a8a4a';

  const tooltip = `${key}${hasPhoto ? ' - 📷' : ''}${isToday ? ' (today)' : ''}`;
  const notePath = hasPhoto && photoPagesByDay[key] ? photoPagesByDay[key].file.path : '';

  html += `<div style="width:14px;height:14px;background:${bg};border:${border};border-radius:2px;" title="${tooltip}" data-note="${notePath}"></div>`;
}

html += '</div>';

html += '<div style="margin-top: 8px; font-size: 11px; color: #888;">';
html += '<span style="color:#4a8a4a;">■</span> has photo &nbsp;';
html += '<span style="color:#1a1a1a;">■</span> no photo &nbsp;';
html += '<span style="border:1px dashed #4a8a4a;padding:0 2px;">□</span> today';
html += '</div>';

const heatmapContainer = dv.container.createEl('div');
heatmapContainer.innerHTML = html;

heatmapContainer.querySelectorAll('[data-note]').forEach(cell => {
  const notePath = cell.getAttribute('data-note');
  if (notePath) {
    cell.style.cursor = 'pointer';
    cell.addEventListener('click', () => {
      app.workspace.openLinkText(notePath, '', false);
    });
  }
});
```

## 💡 Tips

- **New photo**: create note from `[[../../Templates/Photo Note Template|Photo Note Template]]` → fill fields → save to `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md`
- **Image goes in** `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg` — card auto-detects it
- **Tags** for scene (`nature`, `city`, `home`), people (`family`, `friends`), activity (`sports`, `cooking`) — mix freely
- **Mood emoji** preset: 😊🧘🌧️⚡🔥❤️😢😤🎉🤔😴🥳
- **Gallery** is auto — no manual update needed. New note = new card appears
- **Missing a day** = fine. Heatmap tells your real story, not a perfect streak
