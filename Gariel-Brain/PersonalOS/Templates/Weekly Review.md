---
type: personal-os-weekly-review
anchor: <% tp.date.now("YYYY-MM-DD") %>
cssclasses:
  - personal-os
---

# 周复盘 · <% tp.date.now("YYYY-MM-DD") %>

```dataviewjs
await dv.view("PersonalOS/Views/review", {
  kind: dv.current().type === "personal-os-weekly-review" ? "week" : "month",
  anchor: dv.current().anchor
});
```

## 本周保留什么

## 本周停止什么

## 下周唯一重点
