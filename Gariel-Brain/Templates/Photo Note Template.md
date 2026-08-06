---
type: photo
created: <% tp.date.now("YYYY-MM-DD") %>
location:
who:
  - 自己
feeling:
tags:
  - photo
---

# 📷 <% tp.date.now("YYYY-MM-DD") %>

![[assets/photo/<% tp.date.now("YYYY") %>/<% tp.date.now("MM") %>/<% tp.date.now("YYYY-MM-DD") %>.jpg]]
---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | `= this.location` |
| 👤 **Who** | `= this.who` |
| 💭 **Feeling** | `= this.feeling` |
| 🏷️ **Tags** | `= this.tags` |
