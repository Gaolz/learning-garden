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
  const day = String(d.day).padStart(2, '0');
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
    const dateEl = document.createElement('span');
    dateEl.className = 'photo-card-compact-date';
    dateEl.textContent = day;
    body.appendChild(dateEl);

    if (emoji) {
      const emojiEl = document.createElement('span');
      emojiEl.className = 'photo-card-compact-emoji';
      emojiEl.textContent = emoji;
      body.appendChild(emojiEl);
    }

    if (location) {
      const locEl = document.createElement('span');
      locEl.className = 'photo-card-compact-location';
      // Show as own div for alignment
      const locDiv = document.createElement('div');
      locDiv.className = 'photo-card-compact-location';
      locDiv.textContent = `📍 ${location}`;
      body.appendChild(locDiv);
    }
  } else {
    // Header: date + emoji
    const header = document.createElement('div');
    header.className = 'photo-card-header';

    const dateEl = document.createElement('span');
    dateEl.className = 'photo-card-date';
    dateEl.textContent = dateStr;
    header.appendChild(dateEl);

    if (emoji) {
      const emojiEl = document.createElement('span');
      emojiEl.className = 'photo-card-emoji';
      emojiEl.textContent = emoji;
      header.appendChild(emojiEl);
    }

    body.appendChild(header);

    // Location
    if (location) {
      const locEl = document.createElement('div');
      locEl.className = 'photo-card-location';
      locEl.textContent = `📍 ${location}`;
      body.appendChild(locEl);
    }

    // Feeling
    if (feeling) {
      const feelEl = document.createElement('div');
      feelEl.className = 'photo-card-feeling';
      feelEl.textContent = feeling;
      body.appendChild(feelEl);
    }

    // Tags
    if (tags.length > 0) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'photo-card-tags';
      tags.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = `#${t}`;
        tagsDiv.appendChild(chip);
      });
      body.appendChild(tagsDiv);
    }
  }

  card.appendChild(body);

  // Click → open note
  card.addEventListener('click', () => {
    app.workspace.openLinkText(p.file.path, '', false);
  });

  return card;
}

// ===== Month Mode =====
dv.header(2, `📅 ${currentYear} / ${String(currentMonth).padStart(2, '0')}`);

const monthPages = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear && p.created.month === currentMonth)
  .sort(p => p.created, 'asc');

if (monthPages.length === 0) {
  dv.paragraph("_No photos this month yet. Take your first photo today!_");
} else {
  const grid = dv.container.createEl('div', { cls: 'photo-grid photo-grid-month' });
  for (const p of monthPages) {
    grid.appendChild(createCard(p, false));
  }
}

// ===== Year Mode =====
dv.header(2, `📆 ${currentYear} — All Photos`);

const yearPages = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear)
  .sort(p => p.created, 'asc');

if (yearPages.length === 0) {
  dv.paragraph("_No photos this year yet._");
} else {
  const grid = dv.container.createEl('div', { cls: 'photo-grid photo-grid-year' });
  for (const p of yearPages) {
    grid.appendChild(createCard(p, true));
  }
}
```

## 📊 Stats

```dataview
TABLE WITHOUT ID
  length(rows) as "Total Photos",
  rows.location as "Where",
  rows.feeling_emoji as "Moods"
FROM #photo
FLATTEN location
FLATTEN feeling_emoji
WHERE location OR feeling_emoji
```

## 🔍 Filter by Tag

```dataview
TABLE WITHOUT ID
  file.link as "📷 Photo",
  created as "Date",
  location as "📍",
  feeling_emoji as "😊"
FROM #photo
WHERE contains(tags, "nature")
SORT created DESC
LIMIT 20
```

## 📍 By Location

```dataview
TABLE WITHOUT ID
  location as "Location",
  length(rows) as "Photos"
FROM #photo
WHERE location
GROUP BY location
SORT length(rows) DESC
```

## 😊 By Mood

```dataview
TABLE WITHOUT ID
  feeling_emoji as "Mood",
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
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let html = '<div style="font-family: monospace; line-height: 1;">';

// Month labels
html += '<div style="display: flex; gap: 3px; margin-bottom: 4px;">';
for (const m of months) {
  html += `<span style="width: 14px; font-size: 8px; color: #888; text-align: center;">${m[0]}</span>`;
}
html += '</div>';

// Day grid
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
html += '<span style="color:#4a8a4a;">■</span> has photo (clickable) &nbsp;';
html += '<span style="color:#1a1a1a;">■</span> no photo &nbsp;';
html += '<span style="border:1px dashed #4a8a4a;padding:0 2px;">□</span> today (pending)';
html += '</div>';

const heatmapContainer = dv.container.createEl('div');
heatmapContainer.innerHTML = html;

// Click handler for heatmap cells (attached via DOM, not stripped)
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

## 🔗 Quick Links

- [[../Templates/Photo Note Template|New Photo Note]]
- [[README|📷 Workflow Guide]]
