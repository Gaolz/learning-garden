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

// ===== Helper: build a photo card HTML =====
function cardHTML(p, compact = false) {
  const d = p.created;
  const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const day = String(d.day).padStart(2, '0');
  const emoji = p.feeling_emoji || '';
  const location = p.location || '';
  const feeling = p.feeling_text || '';
  const tags = p.tags ? p.tags.filter(t => t !== 'photo') : [];

  // Try to get image from convention path
  const imgRelPath = `assets/photo/${d.year}/${String(d.month).padStart(2, '0')}/${dateStr}.jpg`;
  let imgSrc = '';
  try {
    const imgFile = app.vault.getAbstractFileByPath(imgRelPath);
    if (imgFile) {
      imgSrc = app.vault.getResourcePath(imgFile);
    }
  } catch(e) {}

  const imgHTML = imgSrc
    ? `<img src="${imgSrc}" alt="${dateStr}" />`
    : `<div class="photo-card-placeholder">📷</div>`;

  const notePath = p.file.path;

  if (compact) {
    // Compact card for year mode
    return `
      <div class="photo-card photo-card-compact" data-path="${notePath}">
        <div class="photo-card-image">${imgHTML}</div>
        <div class="photo-card-body">
          <span class="photo-card-compact-date">${day}</span>
          ${emoji ? `<span class="photo-card-compact-emoji">${emoji}</span>` : ''}
          ${location ? `<span class="photo-card-compact-location">${location}</span>` : ''}
        </div>
      </div>`;
  }

  // Full card for month mode
  return `
    <div class="photo-card" data-path="${notePath}">
      <div class="photo-card-image">${imgHTML}</div>
      <div class="photo-card-body">
        <div class="photo-card-header">
          <span class="photo-card-date">${dateStr}</span>
          ${emoji ? `<span class="photo-card-emoji">${emoji}</span>` : ''}
        </div>
        ${location ? `<div class="photo-card-location">📍 ${location}</div>` : ''}
        ${feeling ? `<div class="photo-card-feeling">${feeling}</div>` : ''}
        ${tags.length ? `<div class="photo-card-tags">${tags.map(t => `<span class="tag-chip">#${t}</span>`).join(' ')}</div>` : ''}
      </div>
    </div>`;
}

// ===== Month Mode =====
dv.header(2, `📅 ${currentYear} / ${String(currentMonth).padStart(2, '0')}`);

const monthPages = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear && p.created.month === currentMonth)
  .sort(p => p.created, 'asc');

if (monthPages.length === 0) {
  dv.paragraph("_No photos this month yet. Take your first photo today!_");
} else {
  let html = '<div class="photo-grid photo-grid-month">';
  for (const p of monthPages) {
    html += cardHTML(p);
  }
  html += '</div>';
  dv.paragraph(html);
}

// ===== Click handler for card opening =====
dv.paragraph(`
<script>
setTimeout(() => {
  document.querySelectorAll('.photo-card[data-path]').forEach(card => {
    card.addEventListener('click', function() {
      const path = this.getAttribute('data-path');
      app.workspace.openLinkText(path, '', false);
    });
  });
}, 100);
</script>
`);

// ===== Year Mode =====
dv.header(2, `📆 ${currentYear} — All Photos`);

const yearPages = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear)
  .sort(p => p.created, 'asc');

if (yearPages.length === 0) {
  dv.paragraph("_No photos this year yet._");
} else {
  let html = '<div class="photo-grid photo-grid-year">';
  for (const p of yearPages) {
    html += cardHTML(p, true);
  }
  html += '</div>';
  dv.paragraph(html);
}

// ===== Year mode click handler =====
dv.paragraph(`
<script>
setTimeout(() => {
  document.querySelectorAll('.photo-card[data-path]').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.photo-card[data-path]') === this) {
        const path = this.getAttribute('data-path');
        app.workspace.openLinkText(path, '', false);
      }
    });
  });
}, 100);
</script>
`);
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
  const onClick = hasPhoto && photoPagesByDay[key]
    ? `onclick="app.workspace.openLinkText('${photoPagesByDay[key].file.path}', '', false)" style="cursor:pointer;"`
    : '';

  html += `<div style="width:14px;height:14px;background:${bg};border:${border};border-radius:2px;" title="${tooltip}" ${onClick}></div>`;
}

html += '</div>';

html += '<div style="margin-top: 8px; font-size: 11px; color: #888;">';
html += '<span style="color:#4a8a4a;">■</span> has photo (clickable) &nbsp;';
html += '<span style="color:#1a1a1a;">■</span> no photo &nbsp;';
html += '<span style="border:1px dashed #4a8a4a;padding:0 2px;">□</span> today (pending)';
html += '</div>';

dv.paragraph(html);
```

## 🔗 Quick Links

- [[../Templates/Photo Note Template|New Photo Note]]
- [[README|📷 Workflow Guide]]
