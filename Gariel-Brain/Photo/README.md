---
type: readme
tags:
  - photo
---

# 📷 Daily Photo — Workflow

## Quick Start (3 steps)

1. **Save photo** to `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg`
2. **Create note** from `Templates/Photo Note Template` → fill frontmatter → save as `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md`
3. **Done** — photo automatically appears on your daily note and in the gallery

## Daily Note Integration

Your daily note template already includes:

```markdown
![[Photo/<YYYY>/<MM>/<YYYY-MM-DD>]]
```

When you create a photo note for the day, it will embed inline in your daily note as a card.

## Browse & Search

- **Month Gallery / 月度画廊** — `Photo/Month Gallery.md` — all photos this month, full cards (4 per row)
- **Year Gallery / 年度画廊** — `Photo/Year Gallery.md` — all photos this year, compact cards (7 per row) + heatmap + stats
- **Modal Preview** — Cmd/Ctrl + hover any photo link in your daily note

## Frontmatter Fields

| Field | Required | Default | Purpose |
|-------|----------|---------|---------|
| `type` | Yes | `photo` | Dataview source filter |
| `created` | Yes | today | Sort key (YYYY-MM-DD) |
| `location` | No | — | Where was this taken |
| `who` | No | `[自己]` | People in the photo |
| `feeling_emoji` | No | — | Mood from preset list |
| `feeling_text` | No | — | Free-text reflection |
| `tags` | Yes | `[photo]` | Must include `photo` + custom |

## Tag Conventions

**Scene:** `nature` `city` `indoor` `travel` `home`
**People:** `self` `family` `friends` `colleagues`
**Activity:** `work` `sports` `music` `reading` `cooking` `walking`
**Mood:** `peaceful` `energetic` `melancholy` `joyful` `thoughtful`

## Mood Emoji Presets

😊 🧘 🌧️ ⚡ 🔥 ❤️ 😢 😤 🎉 🤔 😴 🥳

## Directory Structure

```
Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md   ← Photo note
assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg  ← Image file
```

## Tips / 贴士

- Photos auto-order by date on Month Gallery / 照片按日期自动排序
- Year heatmap shows your consistency at a glance / 年度热力图一眼看穿坚持程度
- Missing a day is fine — empty cells are part of your story / 漏拍没关系，空格也是故事
- Use `feeling_text` as a micro-journal entry / 用心情文字写微型日记
- Tag generously — 5 tags better than losing a photo / 多打标签，好过以后找不到
