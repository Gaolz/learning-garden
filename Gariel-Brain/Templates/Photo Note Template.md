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

> 💡 拖拽图片到这里 → `Cmd+P` → 运行 `Photo: Process Drop` → 自动重命名归类到 assets/photo/YYYY/MM/
> 💡 Drag image here → `Cmd+P` → run `Photo: Process Drop` → auto-rename & move to assets/photo/YYYY/MM/

---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | `= this.location` |
| 👤 **Who** | `= this.who` |
| 😊 **Feeling** | `= this.feeling_emoji` |
| 💭 **Notes** | `= this.feeling_text` |
| 🏷️ **Tags** | `= this.tags` |
