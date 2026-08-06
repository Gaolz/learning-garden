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

![[assets/photo/<% tp.date.now("YYYY") %>/<% tp.date.now("MM") %>/<% tp.date.now("YYYY-MM-DD") %>.jpg]]

> 💡 拖拽图片 → 按快捷键 → 自动重命名归类到 assets/photo/YYYY/MM/
> 💡 Drag image → press hotkey → auto-rename & move to assets/photo/YYYY/MM/

---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | `= this.location` |
| 👤 **Who** | `= this.who` |
| 😊 **Feeling** | `= this.feeling_emoji` |
| 💭 **Notes** | `= this.feeling_text` |
| 🏷️ **Tags** | `= this.tags` |
