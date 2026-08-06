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

- **Gallery** — Open `Photo/INDEX.md` for month grid + year heatmap + filters
- **Modal Preview** — Cmd/Ctrl + hover any photo link to see the full photo + metadata popup
- **Filter by Tag** — Use INDEX.md tag table or `FROM #photo WHERE contains(tags, "nature")`
- **By Location** — INDEX.md auto-groups all photos by location
- **By Mood** — INDEX.md shows mood distribution

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

## Tips

- Photos auto-order by date on INDEX
- Year heatmap shows your consistency at a glance
- Missing a day is fine — empty cells on the heatmap are part of your story
- Use `feeling_text` as a micro-journal entry
- Tag generously — better to have 5 tags than to lose a photo you can't find later
