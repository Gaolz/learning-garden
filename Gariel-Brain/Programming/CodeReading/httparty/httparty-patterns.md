---
creation date: 2026-08-06
type: code-reading-subnote
tags:
  - code-reading
  - ruby
  - design-patterns
parent_moc: "[[httparty-MOC]]"
source_files:
  - cross-file
---

# 🔍 httparty 设计模式提炼

> **📌 一句话**：httparty 中提炼的 5 个设计模式：Basement 委托、Lazy Parse、method_missing 代理、递归重试、可序列化的请求/响应。都是 Ruby 库设计中可复用的经典模式。

---

## 模式 1: Basement 委托 — 模块和类都能用 DSL

**问题：** 你想让用户既能 `HTTParty.get(url)` 又能 `class MyApi; include HTTParty; end; MyApi.get(url)`。但 Ruby 模块没有实例，class methods 只是模块的单例方法，和 include 后注入的方法是完全不同的两套。

**解决：** 创建内部类 `Basement` include HTTParty，然后把模块级方法全部委托给它。

```ruby
# httparty.rb:649-692
class Basement
  include HTTParty
end

def self.get(*args, &block)
  Basement.get(*args, &block)
end
```

**何时用：** 设计一个既可以独立使用又可以 mixin 的 Ruby 库时。httparty、RSpec、Minitest 都用类似模式。

---

## 模式 2: Lazy Parse — 延迟昂贵的操作

**问题：** JSON/XML 解析可能很昂贵。如果用户只想检查 `response.code` 或 `response.body`，不应该强制解析。

**解决：** 用 lambda 包装解析逻辑，只在第一次访问 `parsed_response` 时执行，结果缓存到实例变量。

```ruby
# response.rb:17-38
def initialize(request, response, parsed_block, options = {})
  @parsed_block = parsed_block     # lambda { parse_response(body) }
end

def parsed_response
  @parsed_response ||= @parsed_block.call  # 首次访问才执行，后续用缓存
end
```

**何时用：** 任何可能不需要结果值的昂贵操作——解析、数据库查询、API 调用、文件读取。

---

## 模式 3: method_missing 代理 — Response 是透明代理

**问题：** 用户想 `response.name` 直接拿到解析后的 JSON 里的 `name` 字段，但 Response 自己也有方法。

**解决：** method_missing 优先代理给 parsed_response，其次给底层 Net::HTTP response。

```ruby
# response.rb:125-133
def method_missing(name, *args, &block)
  if parsed_response.respond_to?(name)
    parsed_response.send(name, *args, &block)
  elsif response.respond_to?(name)
    response.send(name, *args, &block)
  else
    super
  end
end
```

**风险：** parsed_response 如果恰好定义了和 Response 自身方法同名的 key（比如 `code`、`inspect`、`class`），method_missing 不会被触发（因为这些方法在 Response 上已定义）。httparty 解决了一部分（`code` 显式转发），但不是全部。这是 method_missing 代理的固有限制。

**何时用：** 装饰器模式、适配器模式、代理模式。但要谨慎——method_missing 慢且有遮蔽风险。

---

## 模式 4: 递归重试 — 重定向和认证

**问题：** HTTP 重定向可能多级跳转，digest auth 需要先收到 401 再重试。循环实现需要手动管理状态。

**解决：** 递归。每次重定向/重试调用 `perform` 自身。状态（limit、last_uri、credentials_sent）存在实例变量中，天然隔离。

```ruby
# request.rb:332-354
def handle_redirection(&block)
  options[:limit] -= 1
  self.path = last_response['location']
  self.redirect = true
  # ... method switching logic ...
  capture_cookies(last_response)
  perform(&block)  # 递归
end

def handle_unauthorized(&block)
  return unless digest_auth? && response_unauthorized?
  return if @credentials_sent        # 只重试一次
  @credentials_sent = true
  perform(&block)                     # 递归
end
```

**何时用：** 有限次数重试（重定向、认证、网络断开重连）。每次重试状态独立变化。注意：limit 必须递减且有终止条件（validate 中 `raise RedirectionTooDeep`）。

---

## 模式 5: _dump/_load — 可序列化的网络请求

**问题：** Sidekiq 等异步 job 系统需要序列化 HTTP 请求对象，然后在 worker 中反序列化执行。但 `@raw_request`（Net::HTTP 对象）、logger、Proc parser 都不可序列化。

**解决：** 实现 `_dump`/`_load`（Marshal 协议），在序列化时删除不可序列化内容，反序列化时重建对象。

```ruby
# request.rb:193-198
def _dump(_level)
  opts = options.dup
  opts.delete(:logger)                # 不序列化 logger
  opts.delete(:parser) if opts[:parser].is_a?(Proc)  # Proc 不可序列化
  Marshal.dump([http_method, path, opts, last_response, @last_uri, @raw_request])
end

def self._load(data)
  http_method, path, options, last_response, last_uri, raw_request = Marshal.load(data)
  instance = new(http_method, path, options)
  instance.last_response = last_response
  instance.last_uri = last_uri
  instance.instance_variable_set("@raw_request", raw_request)
  instance
end
```

**何时用：** 需要支持 `Marshal.dump(obj)` 的任何对象——用于 Sidekiq、Resque、DelayedJob、DRb、Ruby Ractor。

---

## 🧩 模式总结

| 模式 | 核心技巧 | 适用场景 |
|------|---------|---------|
| Basement 委托 | 内部空类 + 模块方法全委托 | 模块既能独立用又能 mixin |
| Lazy Parse | lambda + `||=` 缓存 | 昂贵操作可能不需要执行 |
| method_missing 代理 | 优先级链：parsed_response → response → super | 装饰/代理/适配 |
| 递归重试 | 实例变量存状态 + perform 自调 | 有限次数重试（重定向/认证） |
| _dump/_load | 删不可序列化内容 + 重建对象 | 异步 job 系统序列化 |
