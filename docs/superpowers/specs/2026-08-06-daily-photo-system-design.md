# Daily Photo System — Design Spec

**Date**: 2026-08-06
**Status**: approved
**Scope**: Lifetime daily-photo habit system in Obsidian

## Overview

A daily-photo journaling system inside the Gariel-Brain Obsidian vault. One photo per day with metadata. Browse via card gallery (month grid + year heatmap), click for modal preview. Search and filter via Dataview queries.

---

## 1. Directory Structure

```
Gariel-Brain/
├── Photo/
│   ├── INDEX.md                    ← Gallery dashboard (Dataview queries)
│   ├── 2026/
│   │   ├── 08/
│   │   │   ├── 2026-08-06.md       ← Photo note per day
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── assets/
│   └── photo/
│       └── <YYYY>/
│           └── <MM>/
│               └── <YYYY-MM-DD>.jpg ← Image assets
└── Templates/
    └── Photo Note Template.md      ← Template for new photo entries
```

---

## 2. Photo Note Template

File: `Templates/Photo Note Template.md`

```markdown
---
type: photo
created: {{date}}
location:
who:
  - 自己
feeling_emoji:
feeling_text:
tags:
  - photo
---
![[assets/photo/{{date:YYYY}}/{{date:MM}}/{{date:YYYY-MM-DD}}.jpg]]
```

### Frontmatter Fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `type` | string | `photo` | Dataview source filter |
| `created` | date | today | Primary sort key, ISO format |
| `location` | string | — | Where the photo was taken |
| `who` | list | `[自己]` | People in the photo |
| `feeling_emoji` | string | — | Mood emoji from preset set |
| `feeling_text` | string | — | Free-text feeling description |
| `tags` | list | `[photo]` | Includes `photo` + custom tags |

### Tag Presets

Suggested custom tags: `nature`, `family`, `food`, `city`, `travel`, `work`, `sports`, `music`, `reading`, `cooking`, `friends`, `self`

### Mood Emoji Presets

😊🧘🌧️⚡🔥❤️😢😤🎉🤔😴🥳

---

## 3. Card Design (Obsidian Reading View)

Each photo note renders as a card with:

```
┌──────────────────────────┐
│                          │
│   📷 Photo (embedded)    │
│                          │
├──────────────────────────┤
│ 2026-08-06          🧘   │
│ 📍 location  👤 who      │
│ feeling text...          │
│ #tag1 #tag2 #photo       │
└──────────────────────────┘
```

- Photo fills card width, maintains aspect ratio
- Date + mood emoji header row
- Location and who as pill badges
- Feeling text in italic
- Tags as colored chips

---

## 4. Gallery Dashboard — `Photo/INDEX.md`

### Month Grid Mode (default)

- All photos of current month in a card grid
- Each card shows photo thumbnail + date + location
- Empty dashed slot for today if no photo yet
- Prev/Next month navigation
- Sorted by date ascending

### Year Heatmap Mode

- Full year as GitHub-style contribution grid
- Each cell = one day
- Green cell = photo exists (click to open modal)
- Black cell = no photo
- Dashed cell = today, pending
- Month labels on top

### Toggle

- Both modes on same `INDEX.md`
- Tab or button toggle between month/year view

---

## 5. Modal Preview

Clicking any card in the gallery opens a modal overlay **without navigating away** from INDEX.

### Behavior

- Dark backdrop overlay
- Large photo + full metadata (date, feeling, location, who, tags)
- ◀ ▶ arrows or left/right keys → navigate prev/next day photo
- ✕ button, Esc key, or click backdrop → close modal, return to gallery
- Optional "Open note" link → jump to the raw `.md` file

---

## 6. Daily Note Integration

Each day's daily note embeds the photo note:

```markdown
![[Photo/2026/08/2026-08-06]]
```

The embedded card renders inline in the daily note's reading view.

### Workflow

1. Take photo → save to `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg`
2. Create note from `Templates/Photo Note Template.md` → fill fields
3. Save as `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md`
4. Add `![[Photo/<YYYY>/<MM>/<YYYY-MM-DD>]]` to daily note (or automate via Templater)

---

## 7. Search & Filter

All queries on `Photo/INDEX.md` powered by Obsidian Dataview plugin.

### Built-in Filters

| Filter | Dataview |
|--------|----------|
| All photos this month | `FROM #photo WHERE created.month = date(now).month` |
| Photos by tag | `FROM #photo WHERE contains(tags, "nature")` |
| Photos by location | `FROM #photo WHERE location` (group by location) |
| Photos by mood | `FROM #photo GROUP BY feeling_emoji` |
| Search text | Dataview `WHERE contains(feeling_text, "search term")` |

---

## 8. Implementation Checklist

- [ ] Create `Templates/Photo Note Template.md`
- [ ] Create directory structure (`Photo/`, `assets/photo/`)
- [ ] Build `Photo/INDEX.md` with Month Grid Dataview query
- [ ] Build Year Heatmap view on INDEX
- [ ] Add modal preview (CSS + Dataview JS or community plugin)
- [ ] Update daily note template with photo embed section
- [ ] Migrate existing challenge photos into new system
- [ ] Document workflow in README

---

## 9. Dependencies

- **Obsidian Dataview** plugin — query engine for INDEX dashboard
- **Obsidian Templater** plugin (optional) — auto-fill date in template
- No external services required

---

## 10. Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate photo note + embed in daily note | Clean separation, queryable backlinks, visible in daily review |
| Dataview over native search | Dynamic dashboards, tag/date/mood grouping not possible with native search |
| Modal preview over page jump | Stays in gallery context, faster browsing |
| `assets/photo/` not `Photo/` for images | Standard Obsidian attachment convention, keeps vault structured |
| Year/month directory hierarchy | Browsable in file explorer, no single flat folder with 365+ files |
