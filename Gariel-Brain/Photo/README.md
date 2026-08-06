---
type: readme
tags:
  - photo
---

# 📷 每日一拍 / Daily Photo System

> 每天一张照片，记录生活里有温度的画面。一张照片 + 地点 + 谁 + 心情 + 标签 = 一个不会被遗忘的日子。
>
> One photo a day. Location + people + feeling + tags = a day worth remembering.

## 📑 目录 / Catalogue

- [快速开始 / Quick Start](#-快速开始--quick-start)
- [每日笔记集成 / Daily Note Integration](#-每日笔记集成--daily-note-integration)
- [浏览与搜索 / Browse & Search](#-浏览与搜索--browse--search)
- [属性说明 / Frontmatter Fields](#-属性说明--frontmatter-fields)
- [标签规范 / Tag Conventions](#-标签规范--tag-conventions)
- [目录结构 / Directory Structure](#-目录结构--directory-structure)
- [贴士 / Tips](#-贴士--tips)

---

## 🚀 快速开始 / Quick Start

三步完成今天的照片记录。Three steps, under one minute.

| Step | English | 中文 |
|------|---------|------|
| **1** | Save photo to `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg` | 把照片存到 `assets/photo/<YYYY>/<MM>/<YYYY-MM-DD>.jpg` |
| **2** | Create note from `[[../Templates/Photo Note Template\|Photo Note Template]]` → fill frontmatter → save as `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md` | 从模板创建笔记 → 填写属性 → 保存到 `Photo/<YYYY>/<MM>/<YYYY-MM-DD>.md` |
| **3** | Done — photo card auto-appears on daily note and galleries | 完成 —— 照片卡片自动出现在每日笔记和画廊中 |

---

## 📝 每日笔记集成 / Daily Note Integration

你的每日笔记模板已包含照片嵌入区。Your daily note template already includes the photo embed：

```markdown
![[Photo/<YYYY>/<MM>/<YYYY-MM-DD>]]
```

当你创建了当天的照片笔记后，它会以内嵌卡片的形式出现在每日笔记中。
When you create a photo note for the day, it renders as a card inside your daily note.

---

## 🔍 浏览与搜索 / Browse & Search

| 功能 Feature | 位置 Where | 说明 What |
|-------------|-----------|-----------|
| **月度画廊 / Month Gallery** | `[[Month Gallery\|Month Gallery]]` | 当月所有照片，大卡片展示，每行 4 张 / Full cards, 4 per row |
| **年度画廊 / Year Gallery** | `[[Year Gallery\|Year Gallery]]` | 全年所有照片，小卡片 + 热力图 + 统计 / Compact cards + heatmap + stats |
| **悬停预览 / Hover Preview** | — | Cmd/Ctrl + 悬停任意照片链接 → 弹出完整预览 / Hover any photo link for full preview |

---

## 📋 属性说明 / Frontmatter Fields

每张照片笔记的 YAML 头部字段。Fields in each photo note's frontmatter.

| 字段 Field | 必填 Required | 默认值 Default | 说明 Purpose |
|-----------|:---:|---------|--------------|
| `type` | √ | `photo` | Dataview 数据源过滤 / Source filter |
| `created` | √ | 当天 today | 排序键，ISO 格式 / Sort key (YYYY-MM-DD) |
| `location` | — | — | 拍摄地点，空格分隔层级。例：`成都 崇州 元通古镇`。搜索"崇州"即匹配 / Space-separated hierarchy. Search by any word |
| `who` | — | `[自己]` | 照片中的人 / People in the photo |
| `feeling` | — | — | 心情描述（纯文字）/ How you felt, free text |
| `tags` | √ | `[photo]` | 必须包含 `photo` + 自定义标签 / Must include `photo` |

---

## 🏷️ 标签规范 / Tag Conventions

多打标签，方便以后搜索。Tag generously for easier searching later.

| 类别 Category | 标签 Tags |
|--------------|-----------|
| **场景 / Scene** | `nature` `city` `indoor` `travel` `home` |
| **人物 / People** | `self` `family` `friends` `colleagues` |
| **活动 / Activity** | `work` `sports` `music` `reading` `cooking` `walking` |
| **心情 / Mood** | `peaceful` `energetic` `melancholy` `joyful` `thoughtful` |

---

## 📁 目录结构 / Directory Structure

```
Photo/
├── Month Gallery.md              ← 月度画廊 / Month card grid
├── Year Gallery.md               ← 年度画廊 / Year gallery + heatmap
├── README.md                     ← 本文件 / This file
└── <YYYY>/
    └── <MM>/
        └── <YYYY-MM-DD>.md       ← 照片笔记 / Photo note

assets/photo/
└── <YYYY>/
    └── <MM>/
        └── <YYYY-MM-DD>.jpg      ← 照片文件 / Image file
```

---

## 💡 贴士 / Tips

| English | 中文 |
|---------|------|
| Photos auto-order by date — no manual maintenance | 照片按日期自动排列，无需手动维护 |
| Year heatmap shows your rhythm at a glance | 年度热力图，一眼看出记录节奏 |
| Missing days are normal — empty cells are part of your story | 漏拍很正常，空格也是你生活的一部分 |
| Use `feeling` as a micro-journal: one sentence = one memory | 用 feeling 写微型日记：一句话 = 一段回忆 |
| Search photos by location: type any word (e.g. "崇州") to filter | 按地点搜索：输入任意词语（如"崇州"）过滤照片 |
| Tag generously — 5 tags are better than losing a photo forever | 多打标签，宁多勿少，好过以后找不到 |
| No social sharing — these photos are for you | 不发朋友圈，不选角度，只为自己记录 |
