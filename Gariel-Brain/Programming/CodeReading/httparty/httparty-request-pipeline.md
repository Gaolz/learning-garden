---
creation date: 2026-08-06
type: code-reading-subnote
tags:
  - code-reading
  - ruby
  - http
parent_moc: "[[httparty-MOC]]"
source_files:
  - "lib/httparty/request.rb"
---

# 🔍 httparty Request Pipeline

> **📌 一句话**：Request 类是 httparty 的核心引擎——接收 HTTP 方法和参数，构建原生 Net::HTTP 请求，发送，处理重定向/认证/解压，最终返回 Response 对象。全链路在 `perform` 方法中展开。

---

## 🗺️ 流程图

```mermaid
sequenceDiagram
    ClassMethods->>Request: new(http_method, path, options)
    ClassMethods->>Request: perform(&block)

    Note over Request: ① validate
    Request->>Request: check limit, method, headers, auth conflicts

    Note over Request: ② setup_raw_request
    Request->>Request: build Net::HTTP::Get object
    Request->>Request: set body, content-type, auth headers

    Note over Request: ③ send
    Request->>NetHTTP: http.request(raw_request)
    NetHTTP-->>Request: http_response

    Note over Request: ④ handle_response
    alt is redirect?
        Request->>Request: handle_redirection
        Request->>Request: capture_cookies
        Request->>Request: decrement limit
        Request->>Request: perform (recursive)
    else is 401 + digest auth?
        Request->>Request: handle_unauthorized
        Request->>Request: setup_digest_auth
        Request->>Request: perform (recursive, once)
    else success
        Request->>Request: decompress body
        Request->>Request: encode text (UTF-16 → UTF-8)
        Request->>Response: new(request, response, parse_lambda)
    end
```

---

## 🔍 代码拆解

### Step 1: 初始化 — 默认值合并

```ruby
# request.rb:61-77
def initialize(http_method, path, o = {})
  @changed_hosts = false
  @credentials_sent = false

  self.http_method = http_method
  self.options = {
    limit: o.delete(:no_follow) ? 1 : 5,      # :no_follow 不是 limit=0，而是 limit=1
    assume_utf16_is_big_endian: true,
    default_params: {},
    follow_redirects: true,
    parser: Parser,
    uri_adapter: URI,
    connection_adapter: ConnectionAdapter
  }.merge(o)
  self.path = path
  set_basic_auth_from_uri          # http://user:pass@host.com → basic_auth
end
```

**这做了什么：** 设定合理的默认值，然后用调用方传入的 options 覆盖。`:no_follow` 的语义是"不跟随重定向"，但内部实现是限 limit=1（发出一次请求就停，等价于不跟随）。

**为什么这么写：** `:no_follow` → `limit: 1` 的映射很巧妙——不需要额外的 flag，重定向处理逻辑只用 `limit` 一个变量就能工作。

### Step 2: URI 构建 — 相对路径 + base_uri 拼接

```ruby
# request.rb:100-128
def uri
  if redirect && path.relative? && path.path[0] != '/'
    # 重定向时，相对路径需要拼到 last_uri 的目录后面
    last_uri_host = @last_uri.path.gsub(/[^\/]+$/, '')
    path.path = "/#{path.path}" if last_uri_host[-1] != '/'
    path.path = "#{last_uri_host}#{path.path}"
  end

  if path.relative? && path.host
    new_uri = options[:uri_adapter].parse("#{@last_uri.scheme}:#{path}")
  elsif path.relative?
    new_uri = options[:uri_adapter].parse("#{base_uri}#{path}")
  else
    new_uri = path.clone
  end

  validate_uri_safety!(new_uri) unless redirect  # SSRF 防护
  new_uri.query = query_string(new_uri) unless redirect  # 首次请求拼 query string
  # redirect 时跳过 query_string（已经在之前的请求里拼过了）

  @last_uri = new_uri
end
```

**这做了什么：** 三种情况处理 URI：(1) redirect + 相对路径 → 拼到上次 URI 后 (2) 首次请求 + 相对路径 → 拼 base_uri (3) 绝对路径 → 直接用。同时做 query string 拼接和 SSRF 安全校验。

**为什么这么写：** 三个分支覆盖所有 URI 场景。`validate_uri_safety!` 防 SSRF 是安全意识——很多 HTTP 客户端库没有这个。

### Step 3: `perform` — 主循环

```ruby
# request.rb:152-180
def perform(&block)
  validate
  setup_raw_request
  chunked_body = nil
  current_http = http

  begin
    self.last_response = current_http.request(@raw_request) do |http_response|
      if block
        chunks = []
        http_response.read_body do |fragment|
          encoded_fragment = encode_text(fragment, http_response['content-type'])
          chunks << encoded_fragment if !options[:stream_body]
          block.call ResponseFragment.new(encoded_fragment, http_response, current_http)
        end
        chunked_body = chunks.join
      end
    end

    handle_host_redirection if response_redirects?
    result = handle_unauthorized      # digest auth 重试
    result ||= handle_response(chunked_body, &block)  # 正常解析或继续重定向
    result
  rescue *COMMON_NETWORK_ERRORS => e
    raise options[:foul] ? HTTParty::NetworkError.new(...) : e
  end
end
```

**这做了什么：** validate → 构建 raw request → 发送 → 处理结果链。block 模式支持 streaming（逐块回调）。错误处理有三种策略：foul 模式包装异常，否则透传。

**为什么这么写：** `handle_unauthorized ||= handle_response` 用 `||=` 实现 digest auth 的"先试 auth 再试正常响应"逻辑。如果 `handle_unauthorized` 返回非 nil（即它发起了重试并拿到结果），就不走 `handle_response`。

### Step 4: `handle_response` — 重定向 vs 正常

```ruby
# request.rb:311-330
def handle_response(raw_body, &block)
  if response_redirects?
    handle_redirection(&block)
  else
    raw_body ||= last_response.body
    body = decompress(raw_body, last_response['content-encoding']) unless raw_body.nil?
    unless body.nil?
      body = encode_text(body, last_response['content-type'])
      if decompress_content?
        last_response.delete('content-encoding')
        raw_body = body
      end
    end
    Response.new(self, last_response, lambda { parse_response(body) }, body: raw_body)
  end
end
```

**这做了什么：** 两条路：(1) 是重定向 → 递归处理 (2) 正常 → 解压 → 编码转换 → 创建 Response（lazy parse）。

**为什么这么写：** `last_response.delete('content-encoding')` 是一个精细的设计——解压后删掉 Content-Encoding 头，防止上层调用者再解压一次。

### Step 5: `handle_redirection` — 递归重试

```ruby
# request.rb:332-354
def handle_redirection(&block)
  options[:limit] -= 1
  # log if logger configured
  self.path = last_response['location']
  self.redirect = true

  if last_response.class == Net::HTTPSeeOther  # 303
    unless options[:maintain_method_across_redirects] && options[:resend_on_redirect]
      self.http_method = Net::HTTP::Get
    end
  elsif last_response.code != '307' && last_response.code != '308'
    unless options[:maintain_method_across_redirects]
      self.http_method = Net::HTTP::Get
    end
  end

  if http_method == Net::HTTP::Get
    clear_body  # WAF 兼容：GET 请求带 body 可能被拒绝
  end

  capture_cookies(last_response)
  perform(&block)  # 递归
end
```

**这做了什么：** 遵循 HTTP 规范处理重定向——303 → GET、307/308 → 保持原方法、其他 → 默认 GET。切换为 GET 后清空 body（兼容 WAF）。捕获 Set-Cookie，递归调用 perform。

**为什么这么写：** 递归而不是循环。递归让代码干净——每次递归的 Request 对象状态独立，不需要手动管理循环变量。limit 递减在递归中自然工作，到 0 时 validate 抛出 `RedirectionTooDeep`。

---

## 🧩 设计模式/技巧

| 技巧 | 代码位置 | 为什么好 |
|------|---------|---------|
| `||=` 短路求值控制流程 | `request.rb:174-175` | digest auth 结果优先，正常响应作为 fallback |
| `:no_follow` → `limit: 1` 映射 | `request.rb:67` | 统一参数，一个变量控制两种语义 |
| `delete('content-encoding')` 防重复解压 | `request.rb:323` | 防御性设计，调用链安全 |
| SSRF 校验 | `request.rb:448-464` | 配置 base_uri 时自动启用，防止凭据泄漏到外部 |
| `_dump` 中删除敏感/不可序列化内容 | `request.rb:193-198` | logger 和 Proc parser 不能序列化，显式排除 |
| 递归处理重定向 | `request.rb:353` | 代码干净，状态自然隔离 |

---

## 💡 可复用

```ruby
# 递归处理重定向/重试的模式
def perform
  validate
  response = send_request

  if should_retry?(response)
    prepare_retry(response)
    perform  # 递归，limit 在 validate 中检查
  else
    build_result(response)
  end
end

# 短路求值控制多步 fallback
result = try_auth(response)
result ||= try_cache
result ||= handle_normal(response)
```
