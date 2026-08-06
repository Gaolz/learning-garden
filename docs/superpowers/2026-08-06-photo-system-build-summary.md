# 📷 Daily Photo System — Build Summary

**Date**: 2026-08-06
**Branch**: `mike`
**Status**: ✅ complete & working

> 一日一图，一年 365 天。照片 + 地点 + 心情 + 标签 = 不遗忘的每一天。
>
> One photo a day. Location + feeling + tags = every day worth remembering.

---

## 📑 Catalogue

1. [System Overview](#1-system-overview)
2. [Workflow: Create & Process a Photo](#2-workflow-create--process-a-photo)
3. [Location Convention & Search](#3-location-convention--search)
4. [Feeling Field Simplification](#4-feeling-field-simplification)
5. [Photo Galleries](#5-photo-galleries)
6. [Year Heatmap](#6-year-heatmap)
7. [File Inventory](#7-file-inventory)
8. [Bug Fixes](#8-bug-fixes)

---

## 1. System Overview

```
📷 Daily Photo System
│
├── Templates/
│   ├── Photo Note Template.md      ← new photo note from template
│   ├── Daily Note Template.md      ← auto-creates today's photo note
│   └── Process Photo Drop.md       ← Templater script: rename & move dropped images
│
├── Photo/
│   ├── README.md                   ← system docs & conventions
│   ├── Month Gallery.md            ← monthly card grid + location search
│   ├── Year Gallery.md             ← year card grid + heatmap + stats
│   └── <YYYY>/<MM>/<YYYY-MM-DD>.md ← individual photo notes
│
├── assets/photo/<YYYY>/<MM>/       ← image files
│
└── scripts/
    └── process-photo-drop.js       ← reference (logic now in Templater template)
```

---

## 2. Workflow: Create & Process a Photo

### Step 1 — Create Photo Note

**Option A**: Click calendar date → auto-creates daily note → auto-creates photo note with correct date.

**Option B**: Open Month Gallery → click "📷 今日照片" button.

**Option C**: Create from `Templates/Photo Note Template.md` manually.

### Step 2 — Add Photo

Drag image into the photo note. Obsidian copies it to `assets/photo/` with original filename.

### Step 3 — Process (Rename & Organize)

Press `Cmd+Shift+P` (bound to **Templater: Insert Templates/Process Photo Drop.md**).

What it does:
- Finds unprocessed images in `assets/photo/` (files NOT matching `YYYY-MM-DD.ext`)
- Picks the most recently modified one
- Renames to `YYYY-MM-DD.ext` and moves to `assets/photo/YYYY/MM/`
- Fixes the `![[...]]` embed in the current note
- Shows confirmation notice: `✅ IMG_0035.jpeg → 2026/08/2026-08-06.jpeg`

### Step 4 — Fill Metadata

Edit frontmatter fields:

| Field | Example | Description |
|-------|---------|-------------|
| `location` | `成都 崇州 元通古镇` | Space-separated hierarchy |
| `who` | `[自己, 老王]` | People in photo |
| `feeling` | `夕阳下骑摩托，人生一大幸福` | Free-text mood |
| `tags` | `[photo, motor, sunset]` | Must include `photo` |

---

## 3. Location Convention & Search

### Format

Space-separated hierarchy, coarse → fine:

```
成都 崇州 元通古镇
泰国 芭提雅
云南 大理
成都 金沙
```

### Search

Both **Month Gallery** and **Year Gallery** have a search box:

- Type any keyword (e.g. `崇州`, `成都`, `泰国`)
- Cards auto-filter to matching locations
- Click ✕ to clear

### How It Works

Cards carry a `data-location` attribute. The search splits input into space-separated keywords, shows cards where location contains ANY keyword.

---

## 4. Feeling Field Simplification

**Before**: Two fields — `feeling_emoji` (emoji picker) + `feeling_text` (text)
**After**: One field — `feeling` (text only)

- All 10 existing photo notes migrated, data preserved
- Galleries read `p.feeling || p.feeling_text` for backward compat
- Year Gallery stats query updated to group by `feeling`

---

## 5. Photo Galleries

### Month Gallery (`Photo/Month Gallery.md`)

- Month chip bar + card grid (4 per row)
- Image lookup tries `[jpg, jpeg, png, gif, webp]` — not just `.jpg`
- "📷 今日照片" quick-action button creates today's note
- Location search filter

### Year Gallery (`Photo/Year Gallery.md`)

- Year chip bar + compact card grid
- Same extension-tolerant image lookup
- Location search filter
- Stats: location breakdown, feeling breakdown

---

## 6. Year Heatmap

Standalone block under `## 🔥 年度热力图 / Year Heatmap` in Year Gallery.

### Design

```
     J  F  M  A  M  J  J  A  S  O  N  D
 1  ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ 🟢 ⬛ ⬛ ⬛ ⬛    ← day 1
 2  ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ 🟢 ⬛ ⬛ ⬛ ⬛    ← day 2
 ...
 5  ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ 🟢 🟢 ⬛ ⬛ ⬛ ⬛    ← Jul day 5, Aug day 5
 ...
10  ⬛ ⬛ ⬛ ⬛ ⬛ 🟢 ⬛ ⬛ ⬛ ⬛ ⬛ ⬛    ← Jun day 10
 ...
29  ⬛    ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛    ← Feb has no day 29 in 2026
30  ⬛    ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛ ⬛
31  ⬛    ⬛    ⬛    ⬛ ⬛    ⬛    ⬛  ← months with 31 days only
     0  0  0  0  0  2  2  6  0  0  0  0
```

### Key Features

- **31 rows** = days 1-31, **12 columns** = months
- 🟢 Green cell = photo taken on that exact day (clickable)
- ⬛ Dark cell = day exists but no photo
- Transparent = day doesn't exist in that month (Feb 29-31, Apr 31, etc.)
- Count labels at bottom
- Year chips to switch between years

---

## 7. File Inventory

### Templates

| File | Purpose |
|------|---------|
| `Templates/Photo Note Template.md` | New photo note structure |
| `Templates/Daily Note Template.md` | Auto-creates photo note on daily note creation |
| `Templates/Process Photo Drop.md` | Templater script: rename/move dropped images |

### Gallery Pages

| File | Purpose |
|------|---------|
| `Photo/README.md` | System documentation & conventions |
| `Photo/Month Gallery.md` | Monthly card grid + search |
| `Photo/Year Gallery.md` | Year gallery + heatmap + stats |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/process-photo-drop.js` | Reference implementation (original QuickAdd script) |

### Photo Notes (10 total)

| File | Location | Feeling |
|------|----------|---------|
| `Photo/2026/06/2026-06-10.md` | 杭州 西湖 | 初夏的西湖，荷叶刚冒出来 |
| `Photo/2026/06/2026-06-20.md` | 成都 家里 | 泡茶看《禅与摩托车维修艺术》 |
| `Photo/2026/07/2026-07-05.md` | 健身房 | 深蹲突破 PR 110kg |
| `Photo/2026/07/2026-07-18.md` | 春熙路 小龙坎火锅 | 老王回国，吃到扶墙 |
| `Photo/2026/08/2026-08-01.md` | 成都 崇州 | 川西坝子平原，养人 |
| `Photo/2026/08/2026-08-02.md` | 成都 崇州 元通古镇 | 青山河流映石塔，晚霞 |
| `Photo/2026/08/2026-08-03.md` | 成都 金沙 | 自己动手换下水管道 |
| `Photo/2026/08/2026-08-04.md` | 成都 彭州 | 骑摩托，观夕阳 |
| `Photo/2026/08/2026-08-05.md` | 成都 金沙 | 投喂家门口的小瘦猫 |
| `Photo/2026/08/2026-08-06.md` | 成都 金沙 | 重新恢复自己做饭的习惯 |

### Images

```
assets/photo/2026/08/
├── 2026-08-01.jpg
├── 2026-08-02.jpg
├── 2026-08-03.jpg
├── 2026-08-04.jpg
├── 2026-08-05.jpeg
└── 2026-08-06.jpg
```

---

## 8. Bug Fixes

| # | Bug | Fix |
|---|-----|-----|
| 1 | Template error on calendar click — unescaped backticks in JS template literal | Escaped `` \` `` in Daily Note Template lines 43-44 |
| 2 | Historical date notes pointed to today's photo (`tp.date.now()`) | Changed to `tp.file.title` with `.slice()` for year/month |
| 3 | `Process Photo Drop.md` was empty stub (1 byte) | Wrote full Templater script with date-from-note-title logic |
| 4 | `Cmd+Shift+P` hotkey pointed to deleted QuickAdd choice | Bound to Templater command |
| 5 | Gallery only found `.jpg` images, missed `.jpeg` files | Extension-tolerant lookup: `[jpg, jpeg, png, gif, webp]` |
| 6 | `new Array(12).fill(null).map(() => [])` failed in Dataview eval | Replaced with safe for-loop init |
| 7 | Duplicate `if (imgFile)` in gallery code | Removed duplicate inner `if` |
| 8 | `innerHTML` with double quotes inside double-quoted string | Changed outer quotes to single quotes |
| 9 | Photo note table not rendering — blank line + hint text before `---` | Removed hint text & blank line, clean `embed` → `---` → `table` |
| 10 | Heatmap cells didn't align to month columns | Redesigned to 12-column layout |
| 11 | Heatmap compact-stack didn't show actual day positions | Redesigned to 31-row grid, green at exact day position |

---

## 🔧 Hotkeys

| Key | Command |
|-----|---------|
| `Cmd+Shift+P` | Templater: Insert Templates/Process Photo Drop.md — process dropped image |

---

*Built with Claude Code. 2026-08-06.*
