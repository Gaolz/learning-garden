---
creation date: <% tp.file.creation_date("YYYY-MM-DD HH:mm") %>
date: <% tp.file.title %>
type: daily-note
tags:
  - daily-review
---

# 📅 <% tp.file.title %>

> [!quote] 深根五年
> **为学日益，为道日损。**

## 📷 每日一拍

[[Photo/Month Gallery|Month Gallery]]

<%*
// Auto-create photo note for the clicked date (not today)
const t = tp.file.title;
const y = t.slice(0, 4);
const m = t.slice(5, 7);
tR += `![[Photo/${y}/${m}/${t}]]\n`;
const np = `Photo/${y}/${m}/${t}.md`;
try {
  if (!app.vault.getAbstractFileByPath(np)) {
    const dp = `Photo/${y}/${m}`;
    if (!app.vault.getAbstractFileByPath(dp)) await app.vault.createFolder(dp);
    await app.vault.create(np, `---
type: photo
created: ${t}
location:
who:
  - 自己
feeling:
tags:
  - photo
---

# 📷 ${t}

![[assets/photo/${y}/${m}/${t}.jpg]]
---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | \`= this.location\` |
| 👤 **Who** | \`= this.who\` |
| 💭 **Feeling** | \`= this.feeling\` |
| 🏷️ **Tags** | \`= this.tags\` |
`);
  }
} catch(e) {}
%>

## 🎯 今日锚点

- [ ]

## 📈 为学 · 日益

- [ ] **技艺磨砺：**
- [ ] **认知扩容：**
- [ ] **成果输出：**

## 📉 为道 · 日损

- [ ] **觉知与凝神：**
- [ ] **身体觉察：**
- [ ] **今天放下：**

## ✅ 每日三问

- [ ] 最重要的事情得到了实质推进
- [ ] 我更柔和，更少地对抗与消耗了吗
- [ ] 我更快乐更自在了吗
