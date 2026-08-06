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

> 💡 **拖拽图片到这里** → 图片自动保存到 `assets/photo/` → 重命名为 `<% tp.date.now("YYYY-MM-DD") %>.jpg` → 自动显示在上方
>
> 💡 **Drag & drop image here** → auto-saved to `assets/photo/` → rename to `<% tp.date.now("YYYY-MM-DD") %>.jpg` → appears above

---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | `= this.location` |
| 👤 **Who** | `= this.who` |
| 😊 **Feeling** | `= this.feeling_emoji` |
| 💭 **Notes** | `= this.feeling_text` |
| 🏷️ **Tags** | `= this.tags` |
