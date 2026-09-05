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

- **Programming｜今天的下一步：**

> 只写一个能立刻开始的动作；被打断后，从这里重新开始 25 分钟。

## 📈 为学 · 日益

- 今天在主线上推进了什么：
- 明天从哪里继续：

## 📉 为道 · 日损

- **身体：** 今天如何照顾身体：
- **留白：** 哪一段时间留给了自己：
- **今天放下：**

## ✅ 每日三问

- [ ] 主线得到了实质推进
- [ ] 身体得到了一点照顾
- [ ] 留白没有被挤掉
