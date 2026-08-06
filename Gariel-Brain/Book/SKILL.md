---
name: book
description: Use when creating, managing, or processing book notes with the dual-line reading method. Triggers on "book new", "book list", "book help", "create reading note", "add book", or any request related to the Book/ reading note system.
---

# Book — 双线拆书笔记管理

## Overview

管理基于"双线拆书原理"的读书笔记系统。核心工具是 `book` 可执行脚本，通过子命令完成创建、列出、帮助等操作。

## When to Use

- 用户说"新建读书笔记"、"book new"、"添加一本书"
- 用户说"列出所有读书笔记"、"book list"、"有哪些书"
- 用户说"book help"、问如何使用读书笔记系统
- 任何涉及 `Book/` 目录下笔记创建、管理的请求

## 系统原理

```
第一条线（宏观骨架线）: 全书缘起 ➔ 脉络发展 ➔ 终局落脚
第二条线（章节问题线）: 核心问题 ➔ 推进思路 ➔ 解决方案 ➔ 正反评估
```

## Commands

所有操作通过 `book` 脚本完成：

```bash
./book new "书名" ["作者"]   # 创建新书笔记，自动更新 INDEX.md
./book list                   # 列出所有读书笔记
./book help                   # 显示帮助文档
```

## Implementation Details

### `book new "书名" ["作者"]`

1. 从 `00_Templates/template_book.md` 读模板
2. 替换 `{{title}}`、`{{author}}`、`{{date}}` 占位符
3. 写入 `01_Readings/<书名>.md`
4. 在 `INDEX.md` "阅读中" 表格追加一行
5. 更新 INDEX.md 的时间戳

### `book list`

列出 `01_Readings/` 下所有 `.md` 文件。

### `book help`

输出完整使用帮助。

## 工作流

1. `book new "XXX" "作者"` → 创建笔记骨架
2. 阅读时逐章填写第二条线（每章 5 个问题）
3. 读完后填写第一条线（宏观骨架）+ 个人复盘
4. 手动将 INDEX.md 中条目从"阅读中"移到"已完结"

## File Structure

```
Book/
├── SKILL.md              ← 本文件
├── book                  ← 可执行管理脚本
├── 00_Templates/
│   └── template_book.md  ← 笔记模板
├── 01_Readings/
│   └── <书名>.md         ← 各书笔记
└── INDEX.md              ← 总书单索引
```

## Common Mistakes

- **不要在模板外手写笔记**：始终 `book new` 从模板生，确保格式一致
- **不要忘记填第二条线**：每条线有不同目的，只填宏观骨架 = 浅读
- **不要跳过正反评估**：每条章节必须有"正面/红利"和"反面/局限"，没有完美理论
