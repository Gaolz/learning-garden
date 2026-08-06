---
type: index
tags:
  - photo-dashboard
cssclass: photo-index
---

# 📷 Daily Photo Gallery

> Hover any photo link to preview the full card + photo.

## 📅 This Month

```dataview
TABLE WITHOUT ID
  file.link as "📷 Photo",
  created as "Date",
  location as "📍",
  feeling_emoji as "😊",
  feeling_text as "Notes"
FROM #photo
WHERE created.month = date(now).month AND created.year = date(now).year
SORT created ASC
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

## 📆 Year Heatmap <a id="year-heatmap"></a>

```dataviewjs
const year = 2026;
const pages = dv.pages('#photo').where(p => p.created && p.created.year === year);

const photoDays = new Set();
for (const p of pages) {
  const d = p.created;
  photoDays.add(`${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`);
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
  html += `<div style="width:14px;height:14px;background:${bg};border:${border};border-radius:2px;" title="${tooltip}"></div>`;
}

html += '</div>';

// Legend
html += '<div style="margin-top: 8px; font-size: 11px; color: #888;">';
html += '<span style="color:#4a8a4a;">■</span> has photo &nbsp;';
html += '<span style="color:#1a1a1a;">■</span> no photo &nbsp;';
html += '<span style="border:1px dashed #4a8a4a;padding:0 2px;">□</span> today (pending)';
html += '</div>';

dv.paragraph(html);
```

## 🔗 Quick Links

- [[../Templates/Photo Note Template|New Photo Note]]
- [[README|📷 Workflow Guide]]
