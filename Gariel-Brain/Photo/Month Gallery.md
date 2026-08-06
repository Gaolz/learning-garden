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
const today = dv.date("now");
const currentYear = today.year;
const currentMonth = today.month;
const monthNames = ['一月/Jan','二月/Feb','三月/Mar','四月/Apr','五月/May','六月/Jun','七月/Jul','八月/Aug','九月/Sep','十月/Oct','十一月/Nov','十二月/Dec'];

// ===== Helper: full card =====
function createCard(p) {
  const d = p.created;
  const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const emoji = p.feeling_emoji || '';
  const location = p.location || '';
  const feeling = p.feeling_text || '';
  const tags = p.tags ? p.tags.filter(t => t !== 'photo') : [];

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

  const card = document.createElement('div');
  card.className = 'photo-card';
  card.appendChild(imgWrap);

  const body = document.createElement('div');
  body.className = 'photo-card-body';
  body.innerHTML = `
    <div class="photo-card-header">
      <span class="photo-card-date">${dateStr}</span>
      ${emoji ? `<span class="photo-card-emoji">${emoji}</span>` : ''}
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
  .where(p => p.created && p.created.year === currentYear)
  .sort(p => p.created, 'asc');

const monthGroups = allPages.groupBy(p => p.created.month).sort(g => g.key, 'asc');

// ===== Month chip bar =====
const barRow = dv.container.createEl('div');
barRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;';

for (const group of monthGroups) {
  const m = group.key;
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
  const m = group.key;
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
| **Moods**: 😊🧘🌧️⚡🔥❤️😢😤🎉🤔😴🥳                                                                                                     | **心情表情**：开心/平静/低落/能量/热爱/伤心/生气/庆祝/思考/困/满足                 |
| **Auto-update**: new note → card appears, nothing to configure                                                                          | **自动更新**：新笔记建好，卡片自动出现                                    |
| Click any card → opens full photo note                                                                                                  | 点击任意卡片 → 打开照片笔记                                          |
