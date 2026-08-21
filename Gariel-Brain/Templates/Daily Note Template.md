---
creation date: <% tp.file.creation_date("YYYY-MM-DD HH:mm") %>
date: <% tp.file.title %>
type: daily-note
tags:
  - daily-review
---

# 📅 <% tp.file.title %>

> 一个时段没做好，不等于一天没做好。现在就可以重新开始。

## 🎯 今天

**锚点任务：**

- [ ] 
- [ ] 
- [ ] 

## 📷 每日一拍

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

## 🌅 开始

- [ ] 醒来 30 分钟不看手机
- [ ] 用 25 分钟先推进锚点任务

## ☀️ 执行

- [ ] 手机离开视线，消息集中处理

**当前最重要的一步：**

**随手记录：**

- 

## 🌙 收尾

**今天完成了：**

- 

**注意力主要浪费在：**

**明天只调整一件事：**

- [ ] 写下未完成事项，停止继续思考
- [ ] 睡前一小时不刷短视频和新闻

## ✅ 每日三问

- [ ] 早晨没有让手机抢走注意力
- [ ] 最重要的事情得到了实质推进
- [ ] 没有用公开承诺或抱怨代替行动

**今日状态：** ⭐️⭐️⭐️⭐️⭐️（ / 5）
