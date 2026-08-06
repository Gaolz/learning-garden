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

// ===== This Month =====
dv.header(2, `📅 ${currentYear} / ${String(currentMonth).padStart(2, '0')}`);

const thisMonth = dv.pages('#photo')
  .where(p => p.created && p.created.year === currentYear && p.created.month === currentMonth)
  .sort(p => p.created, 'asc');

if (thisMonth.length === 0) {
  dv.paragraph("_这个月还没有照片。今天拍第一张吧！ / No photos this month yet. Take your first photo today!_");
} else {
  const grid = dv.container.createEl('div', { cls: 'photo-grid photo-grid-month' });
  for (const p of thisMonth) {
    grid.appendChild(createCard(p));
  }
}
```

## 💡 使用贴士 / Tips

| English | 中文 |
|---------|------|
| **New photo**: create from `[[../../Templates/Photo Note Template\|Photo Note Template]]` → save to `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md` | **新建照片**：从模板创建 → 保存到 `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md` |
| **Image** goes in `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg` | **图片**放在 `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg` |
| **Tags**: scene (`nature` `city` `home`), people (`family` `friends`), activity (`sports` `cooking`) | **标签**：场景（自然/城市/家里）、人物（家人/朋友）、活动（运动/烹饪） |
| **Moods**: 😊🧘🌧️⚡🔥❤️😢😤🎉🤔😴🥳 | **心情表情**：开心/平静/低落/能量/热爱/伤心/生气/庆祝/思考/困/满足 |
| **Auto-update**: new note → card appears, nothing to configure | **自动更新**：新笔记建好，卡片自动出现 |
| Click any card → opens full photo note | 点击任意卡片 → 打开照片笔记 |
