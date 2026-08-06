---
type: photo
created: <% tp.date.now("YYYY-MM-DD") %>
location:
who:
  - 自己
feeling_emoji:
feeling_text:
tags:
  - photo
---

# 📷 <% tp.date.now("YYYY-MM-DD") %>

![[<% tp.date.now("YYYY-MM-DD") %>.jpg]]

> 💡 拖拽图片到这里 → 重命名为 `<% tp.date.now("YYYY-MM-DD") %>.jpg` → 自动显示
> 💡 Drag image here → rename to `<% tp.date.now("YYYY-MM-DD") %>.jpg` → auto-appears

---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | `= this.location` |
| 👤 **Who** | `= this.who` |
| 😊 **Feeling** | `= this.feeling_emoji` |
| 💭 **Notes** | `= this.feeling_text` |
| 🏷️ **Tags** | `= this.tags` |
