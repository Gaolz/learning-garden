# Tag System

The garden uses YAML frontmatter at the top of each note so notes can be queried and grouped by broad area, topic, and type.

## Format

Add the frontmatter as the very first lines of every content note:

```markdown
---
tags:
  - dns
  - networking
  - ruby
---
```

Inline arrays are also supported:

```markdown
---
tags: [dns, networking, ruby]
---
```

`start.md`, `AGENTS.md`, `CLAUDE.md`, and this file are system files and do not need tags.

## Tag Rules

- Use lowercase English tags.
- Use hyphens between words, for example `book-notes`, not `Book Notes`.
- Prefer 3-5 tags per note: a broad area, the main topics, and the note type.
- Reuse existing tags when possible. Run `python3 scripts/tags.py --list` before inventing new ones.
- Keep type tags consistent: `roadmap`, `guide`, `deep-dive`, `qa`, `essay`, `reading-notes`.

## Commands

Fish aliases make the common commands short:

```fish
tags dns
tags find dns ruby
tags list
tags index
tags check
```

The aliases are `tags` and `tg`; both run `scripts/tag`. If you do not have the
aliases loaded, use `./scripts/tag` directly.

`tags help` lists every command and its purpose:

```fish
tags help
```

| Purpose | Command |
| --- | --- |
| Show all commands and descriptions | `tags help` |
| List all tags and counts | `tags list` |
| Find notes with one tag | `tags dns` |
| Find notes with all tags | `tags find dns ruby` |
| Pick and open a matched note in Zed | `tags open dns` |
| Search title or path | `tags --contains resolver` |
| List notes without tags | `tags untagged` |
| Check that all notes are tagged | `tags check` |
| Regenerate [tags/index.md](tags/index.md) | `tags index` |

After adding or changing tags, run `tags check` and then `tags index` so the
generated index stays current.

## Automatic Tags

You can infer tags from the note path, filename, and title instead of writing
them by hand:

```fish
tags autotag new-note.md
```

Preview first with:

```fish
tags autotag new-note.md --dry-run
```

Tag every currently untagged note:

```fish
tags autotag --all
```

Auto-tagging is a starting point, not a substitute for a quick review. It infers
from known keywords and the folder structure, so the suggested tags should still
make sense for the actual content.

## New Note Template

Start new content from [templates/note.md](templates/note.md). It already has the
`title` and `tags` frontmatter sections, plus a 4-layer skeleton.

Copy it to the right folder:

```fish
cp templates/note.md Computer/DNS/my-dns-note.md
```

Then fill in the title and tags before saving. If you prefer automatic inference,
run `tags autotag my-note.md` afterward and review the generated tags.

## Zed Markdown Snippet

Zed does not currently fill new files from a template automatically. This repo
includes a Markdown snippet as the closest built-in workflow:

1. Create a new `.md` file in Zed.
2. Type `garden` and press Tab.
3. Fill in the title, tags, and body content.

The snippet is defined in `.zed/snippets/markdown.json` and mirrors
`templates/note.md`.

## Pick and Open

`tags open` finds notes with the same tag filters as `tags find`, then opens the
result in Zed:

```fish
tags open dns
```

If only one note matches, it opens immediately. If several match, fzf shows a
picker with the note titles, and the selected file opens in Zed.
