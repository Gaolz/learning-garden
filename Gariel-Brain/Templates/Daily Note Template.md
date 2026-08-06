---
creation date: <% tp.file.creation_date("YYYY-MM-DD HH:mm") %>
type: daily-note
tags:
  - daily-review
---

# 📅 <% tp.file.title %> 每日复盘

> 💡 **核心法则**：一个时段搞砸了，不等于一天搞砸了。进入新时段，立即重启人生！

---

## 📷 每日一拍 / Photo of the Day

![[Photo/<% tp.date.now("YYYY") %>/<% tp.date.now("MM") %>/<% tp.date.now("YYYY-MM-DD") %>]]

> 点击上方卡片进入当日照片页面 / Click the card above to open today's photo page

<%*
// Auto-create today's photo note if it doesn't exist
const today = tp.date.now("YYYY-MM-DD");
const year = tp.date.now("YYYY");
const month = tp.date.now("MM");
const notePath = `Photo/${year}/${month}/${today}.md`;

try {
  const existingFile = app.vault.getAbstractFileByPath(notePath);
  if (!existingFile) {
    // Ensure directory exists
    const dirPath = `Photo/${year}/${month}`;
    const dir = app.vault.getAbstractFileByPath(dirPath);
    if (!dir) {
      await app.vault.createFolder(dirPath);
    }
    // Create photo note with pre-filled frontmatter
    const content = [
      '---',
      'type: photo',
      `created: ${today}`,
      'location:',
      'who:',
      '  - 自己',
      'feeling_emoji:',
      'feeling_text:',
      'tags:',
      '  - photo',
      '---',
      '',
      `# 📷 ${today}`,
      '',
      `![[assets/photo/${year}/${month}/${today}.jpg]]`,
      '',
      '---',
      '| 属性 | 值 |',
      '|------|-----|',
      '| 📍 **Location** | `= this.location` |',
      '| 👤 **Who** | `= this.who` |',
      '| 😊 **Feeling** | `= this.feeling_emoji` |',
      '| 💭 **Notes** | `= this.feeling_text` |',
      '| 🏷️ **Tags** | `= this.tags` |',
      ''
    ].join('\n');
    await app.vault.create(notePath, content);
  }
} catch(e) {
  // Silently fail — photo note will still work if created manually
}
%>

---

## ☕ 晨间准备与习惯 (07:00 - 08:00)
- [ ] 🧘‍♂️ 静坐冥想
- [ ] ✍️ 练字（手脑激活）
- [ ] 补水 / 早餐

---

## ☀️ 第一天：深度输入与输出 (08:00 - 12:00)
> **重点**：大脑最清醒的时段，攻坚高难度的输入与核心输出。

### 📥 输入 (Input)
- [ ] 看书（如《图解 TCP/IP》）
- [ ] 看源代码 / 深入底层机制

### 📤 输出 (Output)
- [ ] 写核心代码 / 动手实践

### ⭐️ 时段评分：⭐⭐⭐⭐⭐ ( / 5)
* **状态与复盘**：（若有卡顿或未完成，在此结算归零，不影响下一段）

---

## 🌤️ 第二天：轻量输入与整理 (12:00 - 16:00)
> **重点**：午后能量平缓期，进行轻度阅读、语言学习与内容整理。

### 📥 输入 (Input)
- [ ] 🎧 英语听力练习
- [ ] 📰 看技术文章 / 资讯阅读

### 📤 输出 (Output)
- [ ] 📝 整理 Learning Garden 笔记

### ⭐️ 时段评分：⭐⭐⭐⭐⭐ ( / 5)
* **状态与复盘**：

---

## 🌇 第三天：提炼输出与生活 (16:00 - 20:00)
> **重点**：知识沉淀、表达输出与物理/精神状态切换。

### 📤 输出 (Output)
- [ ] ✍️ 写博客 / 英文文章写作

### 🏃‍♂️ 生活与转换
- [ ] 运动 / 散步
- [ ] 晚餐与休息

### ⭐️ 时段评分：⭐⭐⭐⭐⭐ ( / 5)
* **状态与复盘**：

---

## 🌃 晚间习惯与睡前 (20:00 - 24:00)
- [ ] 📖 自由阅读 / 低压力探索
- [ ] 📑 写感恩日记 & 今日总复盘
- [ ] 😴 早睡准备（23:30 前熄屏）

---

## 📊 全天总结 (Daily Review)

### 📈 综合评估
- **输入/输出平衡度**：⭐⭐⭐⭐⭐ ( / 5)
- **心态恢复力**（有无及时重启）：⭐⭐⭐⭐⭐ ( / 5)

### 🙏 每日感恩日记 (Gratitude)
1. 
2. 
3. 

### 🔍 今日收获与改进 (Takeaways)
* **收获 (Wins)**：
* **改进 (Improvement)**：