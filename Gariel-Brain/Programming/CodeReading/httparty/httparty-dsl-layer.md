---
creation date: 2026-08-06
type: code-reading-subnote
tags:
  - code-reading
  - ruby
  - dsl
parent_moc: "[[httparty-MOC]]"
source_files:
  - "lib/httparty.rb"
---

# 🔍 httparty DSL 层

> **📌 一句话**：`include HTTParty` 是入口，通过 `self.included` hook 一次性注入类级别 HTTP 方法（get/post/...）和配置接口（base_uri/headers/format/...）。支持两种使用方式：模块级快捷调用和类的配置式调用。

---

## 🗺️ 流程图

```
HTTParty.get("/url")                    class MyApi
     │                                      include HTTParty
     ▼                                      base_uri "api.example.com"
Basement.get("/url")                        │
     │                                      ▼
     ▼                                  MyApi.get("/users")
ClassMethods#get(path, options)              │
     │                                      ▼
     ▼                                  ClassMethods#get(path, options)
perform_request(Net::HTTP::Get, ...)         │
     │                                      ▼
     ▼                                  perform_request(Net::HTTP::Get, ...)
build_request(Get, path, options)            │
     │                                      ▼
     ▼                                  build_request(Get, path, options)
Request.new(http_method, path, opts)         │
     .perform                               ▼
                                       deep_dup(default_options) ← 继承链配置
                                         .merge(options)          ← 本次请求覆盖
```

---

## 🔍 代码拆解

### Step 1: `self.included` — 入口魔法

```ruby
# lib/httparty.rb:21-28
def self.included(base)
  base.extend ClassMethods        # ① 类方法：get/post/base_uri/...
  base.send :include, ModuleInheritableAttributes  # ② 属性继承机制
  base.send(:mattr_inheritable, :default_options)  # ③ 注册可继承类变量
  base.send(:mattr_inheritable, :default_cookies)
  base.instance_variable_set(:@default_options, {})  # ④ 初始化默认值
  base.instance_variable_set(:@default_cookies, CookieHash.new)
end
```

**这做了什么：** `include HTTParty` 触发 Ruby 的 `included` hook，一次性在目标类上装好三样东西：类方法（DSL）、属性继承基础设施、初始配置。

**为什么这么写：** 比手动 `extend ClassMethods; include ModuleInheritableAttributes` 更干净——调用方只需一行 `include HTTParty`。

### Step 2: DSL 配置方法 — 全部 setter/getter 双用

```ruby
# lib/httparty.rb:117-120 — 典型模式
def base_uri(uri = nil)
  return default_options[:base_uri] unless uri           # 无参 = getter
  default_options[:base_uri] = HTTParty.normalize_base_uri(uri)  # 有参 = setter
end

def format(f = nil)
  if f.nil?
    default_options[:format]        # getter
  else
    parser(Parser) if parser.nil?   # lazy default: 首次设置 format 时自动分配 parser
    default_options[:format] = f    # setter
    validate_format                 # 即时校验
  end
end
```

**这做了什么：** 每个 DSL 方法既是 setter（`base_uri 'http://...'`）也是 getter（`base_uri`），读写同一入口。

**为什么这么写：** 简洁。不需要 `set_base_uri` / `get_base_uri` 分离，也不需 `attr_accessor`。所有配置存进 `default_options` 的 Hash 中，一个命名空间管理所有配置。

### Step 3: HTTP 请求方法 — 薄薄一层

```ruby
# lib/httparty.rb:530-598 — 所有 HTTP 方法都是同一种模式
def get(path, options = {}, &block)
  perform_request Net::HTTP::Get, path, options, &block
end

def post(path, options = {}, &block)
  perform_request Net::HTTP::Post, path, options, &block
end
# patch, put, delete, move, copy, head, options, mkcol, lock, unlock — 全一样

def head(path, options = {}, &block)
  ensure_method_maintained_across_redirects options  # HEAD 特殊处理
  perform_request Net::HTTP::Head, path, options, &block
end
```

**这做了什么：** 14 个 HTTP 方法全是同一模式——把 Ruby 符号和 `Net::HTTP::*` 常量映射，然后调用 `perform_request`。

**为什么这么写：** 每个方法只需一行。如果支持更多 HTTP 方法，复制粘贴一行即可。HEAD 方法多了一个 `ensure_method_maintained_across_redirects`（因为 HEAD 的默认 redirect 行为特殊）。

### Step 4: `perform_request` — 两条线汇合点

```ruby
# lib/httparty.rb:599-622
def build_request(http_method, path, options = {})
  options = ModuleInheritableAttributes.hash_deep_dup(default_options).merge(options)
  HeadersProcessor.new(headers, options).call
  process_cookies(options)
  Request.new(http_method, path, options)
end

def perform_request(http_method, path, options, &block)
  build_request(http_method, path, options).perform(&block)
end
```

**这做了什么：** `build_request` 合并类级别默认配置和单次请求配置，然后创建 Request 对象。`perform_request` 两步骤：build → perform。

**为什么这么写：** 分离构建和执行是经典模式。`build_request` 是 public 的（可用于测试/调试），`perform_request` 是 private 的。`hash_deep_dup` 保证子类修改 options 不会污染父类。

### Step 5: Basement — 让模块直接能用

```ruby
# lib/httparty.rb:649-692
class Basement
  include HTTParty
end

def self.get(*args, &block)
  Basement.get(*args, &block)
end
# post, patch, put, delete, move, copy, head, options — 全部同模式委托
```

**这做了什么：** 创建一个内部类 include HTTParty，然后把 `HTTParty.get(...)` 全部委托给它。

**为什么这么写：** Ruby 模块不能直接拥有实例方法调用的 receiver（`self.get` 在模块的 class method 层面），所以需要一个"实例化的壳"。`Basement` 就是那个壳。比 `extend self` 更清晰——不会把 ClassMethods 中的方法暴露为模块的实例方法。

---

## 🧩 设计模式/技巧

| 技巧                            | 代码位置                              | 为什么好                       |
| ------------------------------- | ------------------------------------- | ------------------------------ |
| `included` hook 聚合初始化      | `httparty.rb:21`                      | 一个入口做多件事，调用方零配置 |
| setter/getter 合一              | 所有 DSL 方法                         | 减少方法数，API 简洁           |
| `hash_deep_dup` 隔离默认值      | `module_inheritable_attributes.rb:10` | 防止子类修改污染父类           |
| Basement 委托模式               | `httparty.rb:649-692`                 | 模块和类都能用同一套 DSL       |
| Lazy default（format → parser） | `httparty.rb:280`                     | 不设置 format 就不创建 parser  |

---

## 💡 可复用

```ruby
# 当你需要设计一个 include-able DSL 时，用这个模板：

module MyDSL
  def self.included(base)
    base.extend ClassMethods
    base.instance_variable_set(:@config, default_config)
  end

  module ClassMethods
    def config
      @config
    end

    def configure(key, value = :__no_value__)
      if value == :__no_value__
        config[key]                           # getter
      else
        config[key] = value                   # setter
        validate!(key) if respond_to?(:validate!, true)
      end
    end
  end
end
```
