---
creation date: 2026-08-06
type: code-reading-subnote
tags:
  - code-reading
  - ruby
  - metaprogramming
parent_moc: "[[httparty-MOC]]"
source_files:
  - "lib/httparty/module_inheritable_attributes.rb"
---

# 🔍 ModuleInheritableAttributes

> **📌 一句话**：解决"子类如何继承父类的配置 Hash，但修改时不污染父类"的问题。核心是用 `inherited` hook + `clone` + deep dup 实现类实例变量的继承隔离。代码仅 56 行，是 Ruby 元编程的教科书级范例。

---

## 🗺️ 流程图

```
class BaseApi                     class UsersApi < BaseApi
  include HTTParty                  # 什么都不用写！
  base_uri "api.example.com"
  headers "Accept" => "json"

继承触发：
BaseApi.inherited(UsersApi)
  │
  ├── @default_options.clone  →  UsersApi 有自己的一份
  │    {base_uri: "...", headers: {...}}
  │
  └── 重新定义 UsersApi.default_options
       每次都 deep_dup 自己的副本 + merge 父类的值
       确保读取时不会泄漏引用
```

---

## 🔍 代码拆解

### Step 1: `mattr_inheritable` — 注册可继承属性

```ruby
# module_inheritable_attributes.rb:27-36
def mattr_inheritable(*args)
  @mattr_inheritable_attrs ||= [:mattr_inheritable_attrs]
  @mattr_inheritable_attrs += args

  args.each do |arg|
    singleton_class.attr_accessor(arg)
  end

  @mattr_inheritable_attrs
end
```

**这做了什么：** 把参数名注册到 `@mattr_inheritable_attrs` 列表中，同时为每个参数创建 `self.param_name` / `self.param_name=` accessor。注意这是个白名单——只有注册过的属性才会被继承处理。

**为什么这么写：** `mattr_inheritable` 这个名字直接来自 Rails 的 `mattr_accessor`（module + attribute accessor = mattr）。httparty 剥离了 Rails 依赖后自己实现了精简版。

### Step 2: `inherited` hook — 核心魔法

```ruby
# module_inheritable_attributes.rb:38-53
def inherited(subclass)
  super
  @mattr_inheritable_attrs.each do |inheritable_attribute|
    ivar = :"@#{inheritable_attribute}"
    subclass.instance_variable_set(ivar, instance_variable_get(ivar).clone)

    if instance_variable_get(ivar).respond_to?(:merge)
      subclass.class_eval <<~RUBY, __FILE__, __LINE__ + 1
        def self.#{inheritable_attribute}
          duplicate = ModuleInheritableAttributes.hash_deep_dup(#{ivar})
          #{ivar} = superclass.#{inheritable_attribute}.merge(duplicate)
        end
      RUBY
    end
  end
end
```

**这做了什么：** ClassMethods 中定义了 `inherited`——每次有类继承你的 API 类时自动触发：
1. 把父类的值 `clone` 一份给子类
2. 如果值响应 `merge`（即它是 Hash），重新定义子类的 accessor 方法：每次读取时先 deep_dup 自己的值，再 merge 父类的值，再返回

**为什么这么写：** 纯 `clone` 不够——Hash 的 clone 是浅拷贝，内部的 Hash value 还是共享引用。`hash_deep_dup` 递归 clone 所有嵌套 Hash 和 Proc。动态 `class_eval` 重新定义方法是为了实现"读取时才 merge"的惰性求值——子类可以随时修改父类配置，子类的读取结果也会变化。

### Step 3: `hash_deep_dup`

```ruby
# module_inheritable_attributes.rb:10-24
def self.hash_deep_dup(hash)
  duplicate = hash.dup

  duplicate.each_pair do |key, value|
    if value.is_a?(Hash)
      duplicate[key] = hash_deep_dup(value)   # 递归深拷贝 Hash
    elsif value.is_a?(Proc)
      duplicate[key] = value.dup              # Proc 也 dup
    else
      duplicate[key] = value                  # 标量直接赋值
    end
  end

  duplicate
end
```

**这做了什么：** 递归深拷贝 Hash——嵌套 Hash 继续 deep_dup，Proc 调用 `.dup`，基本类型直接赋值。

**为什么这么写：** `hash.dup` + each_pair 修改，而不是新建 Hash。这样保留了 Hash 的类型（比如 `CookieHash < Hash` 不会丢失）。特殊处理 Proc 是因为 Proc 在被调用前也需要隔离——两个子类不应该共享同一个 Proc 实例。

---

## 🧩 设计模式/技巧

| 技巧 | 代码位置 | 为什么好 |
|------|---------|---------|
| `inherited` hook 实现属性继承 | `mia.rb:38` | Ruby 类系统自带，无需 Rails 依赖 |
| `instance_variable_get/set` 操作类实例变量 | `mia.rb:42` | 绕过 attr_accessor 的封装，直接操作内部状态 |
| 动态 `class_eval` 生成 accessor | `mia.rb:45-50` | 每次读取时才 merge，保证父类修改实时反映 |
| `hash.dup` 而非 `{}` 保持类型 | `mia.rb:11` | CookieHash 等子类不会被降级成普通 Hash |
| Proc 特殊处理 `.dup` | `mia.rb:18` | Proc 是可变的（闭包变量），需要隔离 |

---

## 💡 可复用

```ruby
# 精简版可继承属性模块（可直接用在自己的 DSL 中）
module InheritableAttrs
  def self.included(base)
    base.extend ClassMethods
  end

  module ClassMethods
    def inherited(subclass)
      super
      subclass.instance_variable_set(:@config, @config.clone)
      subclass.class_eval do
        singleton_class.define_method(:config) do
          @config.dup
        end
      end
    end
  end
end
```
