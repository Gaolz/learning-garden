---
type: personal-os-monthly-review
anchor: <% tp.date.now("YYYY-MM-DD") %>
cssclasses:
  - personal-os
---

# 月复盘 · <% tp.date.now("YYYY-MM") %>

```dataviewjs
await dv.view("PersonalOS/Views/review", {
  kind: dv.current().type === "personal-os-weekly-review" ? "week" : "month",
  anchor: dv.current().anchor
});
```

## 本月保留什么

## 本月停止什么

## 下月唯一方向
