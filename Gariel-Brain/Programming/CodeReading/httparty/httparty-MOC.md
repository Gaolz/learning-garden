---
creation date: 2026-08-06
type: code-reading-moc
tags:
  - code-reading
  - moc
  - ruby
repo_url: "https://github.com/jnunemaker/httparty"
language: Ruby
lines_of_code: "~4500"
---

# 🗺️ httparty

> **📌 TL;DR**：httparty 是 Ruby 最流行的 HTTP 客户端库之一。`include HTTParty` 后你的类立刻拥有 `get/post/put/delete` 等 HTTP 方法。代码量 ~4500 行，是学习 Ruby DSL 设计、元编程、请求-响应流水线的绝佳教材。

---

## 🗺️ 架构全景

用户调用链：`MyApi.get('/users')` → ClassMethods DSL → Request 构建 → Net::HTTP 发送 → Response 包装 → 返回

```
┌──────────────────────────────────────────────────┐
│  HTTParty.get("/url")                            │
│    │                                             │
│    ▼                                             │
│  Basement.get("/url")   ← include HTTParty        │
│    │                                             │
│    ▼                                             │
│  ClassMethods#get(path, options)                 │
│    │                                             │
│    ▼                                             │
│  perform_request(http_method, path, options)     │
│    │                                             │
│    ▼                                             │
│  build_request(http_method, path, options)       │
│    ├── deep_dup default_options                  │
│    ├── HeadersProcessor → 合并 headers            │
│    ├── process_cookies → 处理 cookies             │
│    └── Request.new(http_method, path, options)   │
│    │                                             │
│    ▼                                             │
│  Request#perform                                 │
│    ├── validate                                  │
│    ├── setup_raw_request (Net::HTTP 对象)         │
│    ├── http.request(raw_request)                 │
│    ├── handle_unauthorized (digest auth 重试)     │
│    └── handle_response                           │
│        ├── response_redirects? → handle_redirect  │
│        └── else → Response.new(req, resp, λ)     │
│            └── lazy parse (parsed_response)       │
└──────────────────────────────────────────────────┘
```

---

## 📂 子笔记索引

| 笔记                                    | 内容                                              | 关联源码文件                                                |
| ------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| [[httparty-dsl-layer]]                | ClassMethods DSL 设计、`include HTTParty` 的魔法      | `lib/httparty.rb` (1-636)                             |
| [[httparty-request-pipeline]]         | Request 构建 → 执行 → 重定向 → 响应处理全链路                 | `lib/httparty/request.rb` (466行)                      |
| [[httparty-module-inheritable-attrs]] | 继承链上的属性传递机制                                     | `lib/httparty/module_inheritable_attributes.rb` (56行) |
| [[httparty-patterns]]                 | 提取的设计模式（Basement、lazy parse、method_missing 代理等） | 跨文件                                                   |

---

## 🔑 关键设计决策

1. **Why `ModuleInheritableAttributes` instead of class variable?** — Ruby 的 `@@var` 在整个继承树中共享（父类修改会污染子类）。MIA 用 `inherited` hook + `clone` 让每个子类有独立副本，父类后续修改不影响子类。这才是 HTTP 客户端库真正需要的隔离级别。
2. **Why `Basement` pattern?** — 同时支持 `HTTParty.get(url)` 和 `class MyApi; include HTTParty; end; MyApi.get(url)` 。Basement 是一个空壳 include HTTParty 的类，模块方法委托给它。避免了对 Module 添加实例方法或用 `extend self` 的奇特行为。
3. **Why lazy `parsed_response`?** — 响应解析（JSON/XML）可能昂贵。用 lambda 延迟执行：`parsed_response` 只在第一次访问时解析并缓存。如果用户只想读 status code 或 raw body，不会付出解析成本。
4. **Why `method_missing` on Response?** — 让 `response.key_name` 自动代理到 `parsed_response['key_name']`（Hash）或 `response.code`（Net::HTTP）。优雅但有风险：解析结果的方法会遮蔽 Response 自身方法。

---

## 🧠 我学到了什么

1. **Module#included 是 Ruby DSL 的入口** — 不直接 extend/include，而是用 `self.included(base)` 作为中央注册点，一次性做三件事：extend ClassMethods、include 工具模块、初始化实例变量。
2. **`Marshal#dump/_load` 支持序列化** — Request 和 Response 都实现了 `_dump`/`_load`，支持 Marshal 序列化（Sidekiq 等 job 系统依赖这个）。
3. **私密信息不进序列化** — `_dump` 方法中显式 `opts.delete(:logger)` 和 `delete(:parser)`（对 Proc），防止不可序列化内容和敏感信息泄露。
4. **SSRF 防护** — `validate_uri_safety!` 在配置了 base_uri 时检查请求目标 host 是否一致，防止凭据泄漏到意外服务器。

---

## 📋 阅读进度

- [x] 第一遍：快速扫读，建立整体印象
- [x] 第二遍：逐模块深读，创建子笔记
- [x] 第三遍：提炼设计模式，填写"关键设计决策"和"我学到了什么"
