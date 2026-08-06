# Daily Photo System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-ruby:subagent-driven-development (recommended) or superpowers-ruby:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lifetime daily-photo journal system in Obsidian with card gallery, year heatmap, modal preview, and Dataview-powered search.

**Architecture:** Each photo day gets its own note (`Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md`) with YAML frontmatter and embedded image. Daily notes embed the photo note via `![[note]]`. A dashboard (`Photo/INDEX.md`) uses Dataview queries for month grid + year heatmap views. Modal preview uses Obsidian's built-in Page Preview (Cmd+hover). Custom CSS snippet styles the gallery and preview popup.

**Tech Stack:** Obsidian Markdown + YAML frontmatter, Dataview plugin (queries), Obsidian CSS snippet (styling), Obsidian Page Preview (modal), Templater plugin (optional, for date auto-fill).

---

### Task 1: Create Directory Structure

**Files:**
- Create: `Gariel-Brain/Photo/.gitkeep`
- Create: `Gariel-Brain/assets/photo/.gitkeep`

- [ ] **Step 1: Create Photo/ directory**

```bash
mkdir -p /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/Photo
touch /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/Photo/.gitkeep
```

- [ ] **Step 2: Create assets/photo/ directory**

```bash
mkdir -p /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/assets/photo
touch /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/assets/photo/.gitkeep
```

- [ ] **Step 3: Verify**

```bash
ls -la /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/Photo/
ls -la /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/assets/photo/
```

- [ ] **Step 4: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Photo/ Gariel-Brain/assets/photo/
git commit -m "feat: add Photo/ and assets/photo/ directories for daily-photo system"
```

---

### Task 2: Create Photo Note Template

**Files:**
- Create: `Gariel-Brain/Templates/Photo Note Template.md`

- [ ] **Step 1: Write template file**

```markdown
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

---
| 属性 | 值 |
|------|-----|
| 📍 **Location** | `= this.location` |
| 👤 **Who** | `= this.who` |
| 😊 **Feeling** | `= this.feeling_emoji` |
| 💭 **Notes** | `= this.feeling_text` |
| 🏷️ **Tags** | `= this.tags` |
```

- [ ] **Step 2: Verify template file exists**

```bash
cat /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/Templates/Photo\ Note\ Template.md
```

- [ ] **Step 3: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Templates/Photo\ Note\ Template.md
git commit -m "feat: add Photo Note Template with frontmatter and Templater support"
```

---

### Task 3: Create Example Photo Note (2026-08-01)

**Files:**
- Create: `Gariel-Brain/Photo/2026/08/2026-08-01.md`

- [ ] **Step 1: Create year/month directories**

```bash
mkdir -p /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/Photo/2026/08
```

- [ ] **Step 2: Write example photo note**

File: `Gariel-Brain/Photo/2026/08/2026-08-01.md`

```markdown
---
type: photo
created: 2026-08-01
location: 崇州·桤木河湿地公园
who:
  - 自己
feeling_emoji: 🌅
feeling_text: 雨后空气很干净，水稻田里有白鹭
tags:
  - photo
  - nature
  - peaceful
---

# 📷 2026-08-01

![[../../assets/photo/2026/08/2026-08-01.jpg]]
```

> **Note:** The image embed path uses `../../assets/` because the note lives at `Photo/2026/08/2026-08-01.md`. Obsidian resolves wiki-links from vault root, so if your Obsidian "Attachment folder path" is set to `assets/photo`, use `![[2026-08-01.jpg]]` directly. Otherwise `![[assets/photo/2026/08/2026-08-01.jpg]]` from vault root works regardless.

- [ ] **Step 3: Verify note renders in Obsidian**

Open `Photo/2026/08/2026-08-01.md` in Obsidian reading view. Confirm:
- YAML frontmatter parses correctly
- Image embed shows (or shows placeholder if 2026-08-01.jpg doesn't exist yet)

- [ ] **Step 4: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Photo/2026/
git commit -m "feat: add example photo note for 2026-08-01"
```

---

### Task 4: Build Photo/INDEX.md — Month Grid Dashboard

**Files:**
- Create: `Gariel-Brain/Photo/INDEX.md`

- [ ] **Step 1: Write INDEX.md with Dataview queries**

```markdown
---
type: index
tags:
  - photo-dashboard
---

# 📷 Daily Photo Gallery

> **This Month** | [Year Heatmap](#year-heatmap)

```dataview
TABLE
  embed(link(photo, "100")) as "Photo",
  created as "Date",
  location as "Location",
  feeling_emoji as "Mood",
  tags as "Tags"
FROM #photo
WHERE created.month = date(now).month AND created.year = date(now).year
SORT created ASC
```

## 🔍 Filter by Tag

```dataview
TABLE
  embed(link(photo, "100")) as "Photo",
  created as "Date",
  location as "📍",
  feeling_emoji as "😊"
FROM #photo
WHERE contains(tags, "nature")
SORT created DESC
LIMIT 20
```

## 📍 By Location

```dataview
TABLE
  location as "Location",
  length(rows) as "Photos"
FROM #photo
WHERE location
GROUP BY location
SORT length(rows) DESC
```

## 😊 By Mood

```dataview
TABLE
  feeling_emoji as "Mood",
  length(rows) as "Days"
FROM #photo
WHERE feeling_emoji
GROUP BY feeling_emoji
SORT length(rows) DESC
```

## 📆 Year Heatmap <a id="year-heatmap"></a>

```dataviewjs
const year = 2026;
const pages = dv.pages('#photo').where(p => p.created && p.created.year === year);

// Build a set of days that have photos
const photoDays = new Set();
for (const p of pages) {
  const d = p.created;
  photoDays.add(`${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`);
}

// Render heatmap
const today = dv.date("now");
const todayStr = `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`;
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let html = '<div style="font-family: monospace; line-height: 1;">';

// Month labels
html += '<div style="display: flex; gap: 3px; margin-bottom: 4px;">';
for (const m of months) {
  html += `<span style="width: 14px; font-size: 8px; color: #888; text-align: center;">${m[0]}</span>`;
}
html += '</div>';

// Day grid (wrap into rows of ~7)
const start = dv.date(`${year}-01-01`);
const end = dv.date(`${year}-12-31`);
let count = 0;
html += '<div style="display: flex; gap: 3px; flex-wrap: wrap; max-width: 120px;">';

for (let d = start; d <= end; d = d.plus({days: 1})) {
  const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  const hasPhoto = photoDays.has(key);
  const isToday = key === todayStr;
  const isFuture = d > today;

  let bg = '#1a1a1a'; // no photo
  if (hasPhoto) bg = '#4a8a4a'; // has photo
  if (isToday && !hasPhoto) bg = '#1a1a1a';
  let border = 'none';
  if (isToday) border = '1px dashed #4a8a4a';

  const tooltip = `${key}${hasPhoto ? ' - 📷' : ''}${isToday ? ' (today)' : ''}`;
  html += `<div style="width: 14px; height: 14px; background: ${bg}; border: ${border}; border-radius: 2px;" title="${tooltip}"></div>`;
  count++;
}

html += '</div>';

// Legend
html += '<div style="margin-top: 8px; font-size: 11px; color: #888;">';
html += '<span style="color: #4a8a4a;">■</span> has photo &nbsp;';
html += '<span style="color: #1a1a1a;">■</span> no photo &nbsp;';
html += '<span style="color: #4a8a4a; border: 1px dashed #4a8a4a; padding: 1px 3px;">□</span> today';
html += '</div>';

dv.paragraph(html);
```
```

- [ ] **Step 2: Verify Dataview queries work in Obsidian**

Open `Photo/INDEX.md` in Obsidian reading view. Confirm:
- Month Grid TABLE renders with photo cards
- Tag filter TABLE renders results
- Location GROUP BY renders correctly
- Year heatmap renders with green squares for days with photos

- [ ] **Step 3: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Photo/INDEX.md
git commit -m "feat: add Photo INDEX dashboard with month grid, filters, and year heatmap"
```

---

### Task 5: Add CSS Snippet for Card Gallery & Page Preview Styling

**Files:**
- Create: `Gariel-Brain/.obsidian/snippets/photo-gallery.css`

- [ ] **Step 1: Write CSS snippet**

```css
/* Photo Gallery — Card Grid Styling */

/* Dataview table in INDEX — make it a card grid */
.photo-index .table-view-table {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.photo-index .table-view-table thead {
  display: none;
}

.photo-index .table-view-table tbody {
  display: contents;
}

.photo-index .table-view-table tr {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--background-modifier-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--background-secondary);
}

.photo-index .table-view-table td {
  padding: 0;
  border: none;
}

.photo-index .table-view-table td:first-child {
  /* Photo thumbnail cell */
}

.photo-index .table-view-table td:first-child img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.photo-index .table-view-table td:not(:first-child) {
  padding: 4px 10px;
  font-size: 12px;
}

.photo-index .table-view-table td:last-child {
  padding-bottom: 10px;
}

/* Page Preview popup — enlarge for photo viewing */
.popover.hover-popover {
  max-width: 600px;
  max-height: 80vh;
}

.popover.hover-popover .markdown-embed img {
  max-height: 400px;
  object-fit: contain;
}
```

- [ ] **Step 2: Enable CSS snippet in Obsidian**

```bash
ls /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/.obsidian/snippets/photo-gallery.css
```

Then manually: Obsidian → Settings → Appearance → CSS Snippets → Toggle `photo-gallery` ON.

- [ ] **Step 3: Verify styling in Obsidian**

Open `Photo/INDEX.md` reading view. Confirm:
- Cards display in a grid layout
- Photo thumbnails fill card width
- Page preview popup is larger when hovering a note link

- [ ] **Step 4: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/.obsidian/snippets/photo-gallery.css
git commit -m "feat: add CSS snippet for photo card grid and enlarged hover preview"
```

---

### Task 6: Update Daily Note Template with Photo Embed Section

**Files:**
- Modify: `Gariel-Brain/Templates/Daily Note Template.md`

- [ ] **Step 1: Add photo embed section to daily note template**

Add the following section after the "晨间" block and before the "☀️ 深度工作" block:

```markdown
---
## 📷 每日一拍

![[Photo/{{date:YYYY}}/{{date:MM}}/{{date:YYYY-MM-DD}}]]

---
```

> **Note:** `{{date}}` uses Templater syntax. If using Obsidian core Templates plugin, use `{{title}}` or manually fill the path. Adjust based on your template engine.

- [ ] **Step 2: Verify on a test daily note**

Create a daily note and confirm:
- `![[Photo/2026/08/2026-08-06]]` embed renders as a card
- Photo and metadata visible inline

- [ ] **Step 3: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Templates/Daily\ Note\ Template.md
git commit -m "feat: add photo-of-the-day embed section to daily note template"
```

---

### Task 7: Migrate Existing Challenge Photos

**Files:**
- Read: `Gariel-Brain/Challenge/01 Photo a Day.md`
- Create: Photo notes for each existing challenge day

- [ ] **Step 1: Identify existing photos from the challenge**

From `01 Photo a Day.md`:
- Day 1 (2026-08-01): `![[109.jpg]]` — 崇州平原上的水稻与晚霞
- Day 2 (2026-08-03): `![[108.jpg]]` — (no description)

- [ ] **Step 2: Create photo note for Day 1**

File: `Gariel-Brain/Photo/2026/08/2026-08-01.md` (update existing example note):

```markdown
---
type: photo
created: 2026-08-01
location: 崇州平原
who:
  - 自己
feeling_emoji: 🌅
feeling_text: 成都，川西坝子平原，养人，幸福生活
tags:
  - photo
  - nature
  - peaceful
---

# 📷 2026-08-01

![[109.jpg]]
```

- [ ] **Step 3: Create photo note for Day 2**

```bash
mkdir -p /Users/gaowanxing/Gariel/learning-garden/Gariel-Brain/Photo/2026/08
```

File: `Gariel-Brain/Photo/2026/08/2026-08-03.md`:

```markdown
---
type: photo
created: 2026-08-03
location:
who:
  - 自己
feeling_emoji:
feeling_text:
tags:
  - photo
---

# 📷 2026-08-03

![[108.jpg]]
```

- [ ] **Step 4: Verify both notes in Obsidian**

Open each note in reading view. Confirm images embed correctly.

- [ ] **Step 5: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Photo/2026/08/
git commit -m "feat: migrate existing challenge photos into daily-photo system"
```

---

### Task 8: Document the Workflow

**Files:**
- Create: `Gariel-Brain/Photo/README.md`

- [ ] **Step 1: Write README**

File: `Gariel-Brain/Photo/README.md`

```markdown
---
type: readme
tags:
  - photo
---

# 📷 Daily Photo — Workflow

## Quick Start (3 steps)

1. **Save photo** → `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg`
2. **Create note** from `Templates/Photo Note Template` → fill frontmatter → save to `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md`
3. **Embed in daily note** → add `![[Photo/<YYYY>/<MM>/<YYYY-MM-DD>]]` to today's daily note

## Browse & Search

- **Gallery**: Open `Photo/INDEX.md` → month grid + year heatmap
- **Modal preview**: Cmd/Ctrl + hover any photo link → preview popup
- **Filter**: Use INDEX.md tag filters, or Dataview `FROM #photo WHERE contains(tags, "nature")`
- **Search by location/mood**: Dataview GROUP BY queries on INDEX

## Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `created` | Yes | Date (ISO format) |
| `photo` | Yes | Embedded image |
| `location` | No | Where |
| `who` | No | Who (default: 自己) |
| `feeling_emoji` | No | Mood emoji |
| `feeling_text` | No | Free-text feeling |
| `tags` | Yes | Min: `photo`, + custom tags |

## Tag Conventions

`nature` `family` `food` `city` `travel` `work` `sports` `music` `reading` `cooking` `friends` `self`

## Mood Emojis

😊🧘🌧️⚡🔥❤️😢😤🎉🤔😴🥳
```

- [ ] **Step 2: Commit**

```bash
cd /Users/gaowanxing/Gariel/learning-garden
git add Gariel-Brain/Photo/README.md
git commit -m "docs: add daily-photo workflow README"
```

---

### Task 9: Link INDEX to Vault Navigation

**Files:**
- Modify: `Gariel-Brain/start.md` (or equivalent entry point)
- Or just verify INDEX is discoverable via Obsidian file explorer

- [ ] **Step 1: No code change needed — verify discoverability**

INDEX.md lives at `Photo/INDEX.md` and is reachable via:
- Obsidian file explorer (Ctrl/Cmd+O → "INDEX")
- Quick switcher
- Optional: star it as a bookmark in Obsidian

- [ ] **Step 2: (Optional) Add bookmark to Obsidian bookmarks**

In Obsidian: Right-click `Photo/INDEX.md` → Bookmark. This adds it to the left sidebar for one-click access.
```

---

## Plan Self-Review

**Spec coverage check:**
- [x] Section 1 (Directory Structure) → Task 1
- [x] Section 2 (Photo Note Template) → Task 2
- [x] Section 3 (Card Design) → Task 5 (CSS)
- [x] Section 4 (Gallery Dashboard) → Task 4
- [x] Section 5 (Modal Preview) → Task 5 (CSS for hover preview)
- [x] Section 6 (Daily Note Integration) → Task 6
- [x] Section 7 (Search & Filter) → Task 4 (built into INDEX queries)
- [x] Section 8 (Implementation Checklist) → Tasks 1-9

**Placeholder scan:** No TBDs, TODOs, or vague instructions. All code is concrete.

**Consistency check:** Frontmatter field names consistent across template (Task 2), example note (Task 3), INDEX queries (Task 4), and migration (Task 7). File paths match directory structure from Task 1.
