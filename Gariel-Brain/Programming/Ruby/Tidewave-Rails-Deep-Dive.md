---
tags: [computer-science, rails, ruby, mcp, ai-coding, deep-dive]
source_url: "https://github.com/tidewave-ai/tidewave_rails"
---
# Tidewave Rails — Deep Technical Analysis

> Source: [tidewave-ai/tidewave_rails](https://github.com/tidewave-ai/tidewave_rails)
>
> An open-source MCP (Model Context Protocol) server that gives AI coding agents runtime-level access to Ruby on Rails applications during development. Built by Dashbit as part of the Tidewave agentic development environment.

---

## What Is It?

Tidewave Rails is an MCP server embedded as Rack middleware inside a running Rails app. It lets AI coding agents (Claude Code, Cursor, etc.) interact with the live Rails runtime — evaluating Ruby code in-process, querying the dev database, looking up source locations, and reading docs — all through JSON-RPC over HTTP at `/tidewave/mcp`.

---

## 1. Concrete Mental Models & Analogies

**Analogy: On-Call Surgeon with a Direct Line to the Patient**

Normal AI coding workflow: agent reads static files (anatomy textbook), writes code, runs CLI commands (external diagnostic machine). Each cycle requires spawning a new process, booting Rails, doing work, tearing down.

Tidewave: agent has a **live IV line into the running patient**. It can ask "what's your heart rate?" (`execute_sql_query`), "show me the surgical notes on Organ X" (`get_docs`), or "inject this drug and tell me what happens" (`project_eval`) — all without starting a new surgical procedure each time.

**ASCII Flow Diagram:**

```
┌──────────────────────┐     JSON-RPC (HTTP POST)      ┌──────────────────────────┐
│   AI Coding Agent    │ ──────────────────────────────▶│  Rails Server (puma)      │
│  (Claude Code/VS Code)│◀────────────────────────────── │                           │
│                      │     JSON-RPC Response          │  ┌─────────────────────┐ │
│  "What models exist?" │                              │  │ Tidewave Middleware  │ │
│  "Eval: User.count"   │                              │  │                     │ │
│  "Where is User#auth?" │                              │  │ POST /tidewave/mcp  │ │
└──────────────────────┘                              │  │  ├─ project_eval    │ │
                                                       │  │  ├─ get_models      │ │
                                                       │  │  ├─ execute_sql_query│ │
                                                       │  │  ├─ get_docs        │ │
                                                       │  │  ├─ get_source_location│
                                                       │  │  └─ get_logs        │ │
                                                       │  └─────────────────────┘ │
                                                       │            │              │
                                                       │     Talks directly to:   │
                                                       │  ┌─────────────────────┐ │
                                                       │  │ ActiveRecord/Sequel │ │
                                                       │  │ Ruby runtime (eval) │ │
                                                       │  │ Bundler gem specs   │ │
                                                       │  │ log/development.log │ │
                                                       │  └─────────────────────┘ │
                                                       └──────────────────────────┘
```

**Limitations of the Analogy:**

- The "surgeon" can only ask questions through pre-defined tools (6 tools), not arbitrary introspection
- `project_eval` runs in a `Timeout.timeout` block with stdout/stderr capture — not truly unrestricted console access
- No write access to the filesystem (only `tmp/tidewave/` uploads for screenshots/recordings)
- The connection is localhost-only by default — no remote surgery

---

## 2. Trade-offs & Engineering Decisions

**The Primary Problem Solved:**

Before Tidewave, AI agents working on Rails had two bad options:
1. **Shell commands** (`rails runner "User.count"`) — each invocation boots Rails from scratch (seconds of latency), no persistence
2. **File-only context** — agent reads files but can't test behavior live, leading to hallucinated APIs and version mismatches

Tidewave solves this by making the already-running Rails process double as an MCP server.

**Trade-offs:**

| Dimension | Tidewave Approach | Alternative (rails runner CLI) |
|-----------|-------------------|-------------------------------|
| **Latency** | Sub-millisecond (in-process) | 3-10s per invocation (boot overhead) |
| **State** | Shares process memory (loaded classes, DB connections) | Fresh process each time |
| **Safety** | `Timeout` wrapper, exit if reloading disabled | Process isolation by default |
| **Security** | Only loopback IP by default, CSP modified | No attack surface on running server |
| **Coupling** | Agent talks to one specific running server | Works on any environment with Rails |

**Deliberate Omissions:**

The README explicitly states they omit tools for routes and associations — agents should "read their respective source files" instead. Rationale: source files give richer context (comments, implementation details) than a flat list. This is a counter-intuitive but defensible choice — AI agents parse source well, and static lists go stale.

**Failure Modes:**

1. **`project_eval` timeout (30s default)**: Agent-evaluated code that runs too long gets `Timeout::Error`. The timeout is per-invocation, not cumulative.
2. **Name resolution failure in `get_source_location`**: If a class hasn't been loaded yet (lazy autoloading), `Object.const_get` raises `NameError`. The tool doesn't trigger autoloading.
3. **Encoded HTML response**: If `Rack::Deflater` is placed after Tidewave in the middleware stack, the toolbar injection silently breaks. Tidewave warns once, then skips injection.
4. **Wrong Ruby version docs**: `get_docs` reads comment strings from gem source files at the version locked in `Gemfile.lock` — but the actual runtime behavior might differ if there are native extensions.

---

## 3. Hands-On Experiments & Commands

**Inspection Commands:**

```bash
# 1. Check if Tidewave is responding (from within the Rails app directory)
curl -s http://localhost:3000/tidewave/config | jq .

# 2. List all available MCP tools
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq .

# 3. Get all ActiveRecord models in the app
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_models","arguments":{}}}' | jq .

# 4. Evaluate Ruby code in-process
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"project_eval","arguments":{"code":"User.count"}}}' | jq .

# 5. Find where User#valid_password? is defined
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_source_location","arguments":{"reference":"User#valid_password?"}}}' | jq .

# 6. Run a SQL query directly
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"execute_sql_query","arguments":{"query":"SELECT COUNT(*) FROM users"}}}' | jq .

# 7. Tail recent logs
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"get_logs","arguments":{"lines":50}}}' | jq .
```

**Toy Implementation (Minimal MCP-in-Rack):**

```ruby
# A 20-line "toy" version of the core idea: in-process eval via HTTP
class MiniMcp
  def initialize(app)
    @app = app
  end

  def call(env)
    req = Rack::Request.new(env)
    if req.path == "/mcp" && req.post?
      msg = JSON.parse(req.body.read)
      result = eval(msg.dig("params", "arguments", "code") || "nil")
      [200, {"content-type" => "application/json"},
       [JSON.generate({jsonrpc: "2.0", id: msg["id"], result: {content: [{type: "text", text: result.to_s}]}})]]
    else
      @app.call(env)
    end
  rescue => e
    [500, {}, [e.message]]
  end
end
# Insert: config.middleware.insert_after ActionDispatch::Callbacks, MiniMcp
```

This toy version has no auth, no timeout, no schema validation — Tidewave adds all of those.

---

## 4. Comparative Analysis (Tidewave vs. Alternatives)

| Aspect | Tidewave Rails | rails runner CLI | Ruby LSP (solargraph/ruby-lsp) | Standard MCP File Server |
|--------|---------------|------------------|-------------------------------|--------------------------|
| **Runtime access** | Live process, in-memory | Fresh boot each call | Static analysis only | Files only |
| **Latency** | ~1ms (in-process) | 3-10s (boot) | N/A (indexed) | Varies (file I/O) |
| **DB access** | Direct ORM connection | Direct ORM connection | None | None |
| **Gem version accuracy** | Exact (loaded in process) | Exact (loaded in process) | Approximate (from lockfile) | N/A |
| **Setup** | Add gem, configure | None needed | Install editor extension | Add MCP server config |
| **Security boundary** | Loopback-only by default | Process isolation | Editor LSP socket | File permissions |
| **Protocol** | MCP (JSON-RPC over HTTP) | CLI (stdout) | LSP (stdio/socket) | MCP (stdio/HTTP) |
| **Statefulness** | Stateful (process lives) | Stateless | Varies | Varies |

**Key Insight:** Tidewave sits in a unique niche — **runtime introspection via standardized AI protocol**. rails runner gives runtime access but not via MCP. LSP servers give editor integration but not runtime. File servers give file access but not runtime. Tidewave bridges the gap.

**Closest Comparison: Pry/IRB over WebSocket.** But those are designed for humans in a terminal, not structured tool calls from an LLM.

---

## 5. First-Principles Deconstruction

**Core Primitives Tidewave Relies On:**

1. **Rack Middleware Stack** — Rails processes HTTP through a chain of middleware. Tidewave inserts itself after `ActionDispatch::Callbacks` so it has full access to the loaded application. It's just another link in the chain.

2. **Ruby's `eval` in the Server Process** — `project_eval` calls `Kernel#eval(code, binding)` inside the puma worker process. This means it shares the same memory space, loaded constants, database connection pool, and monkey-patches. Powerful, dangerous.

3. **Ruby's Reflection API** — `get_source_location` uses `Object.const_get`, `Module#instance_method`, and `Method#source_location`. These are standard Ruby introspection APIs that work because the classes are already loaded in memory.

4. **Bundler's Runtime Gem Resolution** — `dep:PACKAGE_NAME` uses `Bundler.load.specs` to find the exact gem path for the version in `Gemfile.lock`. No guessing — it's the same gem the app is using.

5. **JSON-RPC 2.0 over HTTP (MCP Streamable Transport)** — The wire protocol. Each MCP message is a JSON-RPC request/response. Notifications (no `id` field) get `202 Accepted`. Responses get `200` with JSON body. The `/tidewave/mcp` endpoint answers `POST` for requests, `GET`/`DELETE` return `405` as per MCP spec.

6. **Timeout.timeout for Safety** — `project_eval` wraps code in `Timeout.timeout(timeout_seconds)`. This is a Ruby-level interrupt that raises `Timeout::Error` in the executing thread. It's not a process-level kill, so it can leave shared state corrupted in theory — but acceptable for dev tooling.

**Hidden Mechanics:**

- **Toolbar Injection:** Tidewave modifies HTML responses to inject a `<script>` tag and `<meta>` config tag right before `</head>`. It does this by wrapping the response body in `ToolbarBody`, which buffers chunks until it finds `</head>`, inserts the toolbar HTML, then streams the rest. Content-Length and ETag are stripped to prevent mismatches. Encoded responses (gzip) are skipped.
- **CSP Modification:** The Railtie patches Content-Security-Policy in development: adds `'unsafe-eval'` to `script-src` (needed for browser-based eval in the Tidewave client toolbar), adds the Tidewave client origin, removes `frame-ancestors`.
- **Exception Interception:** Registers an interceptor on `ActionDispatch::DebugExceptions` that stuffs the exception into a request header. `ExceptionsMiddleware` (inserted before DebugExceptions) then reads it for the Tidewave client to display.
- **Quiet Logging:** `QuietRequestsMiddleware` is inserted before `Rails::Rack::Logger` to suppress log output from `/tidewave/*` requests, so they don't pollute development logs.

---

## 6. Real-World Debugging & SRE Perspective

**How It Fails in Production:**

Tidewave refuses to load in production (`raise unless app.config.enable_reloading`). But if someone bypasses this, or in staging:

| Failure | Symptom | Root Cause |
|---------|---------|------------|
| **Tool timeout** | Agent gets `Timeout::Error` | `project_eval` code took >30s. Infinite loop, large query, or blocking I/O |
| **Memory bloat** | Server OOM | `project_eval` assigned large objects to constants/globals that aren't GC'd |
| **DB connection exhaustion** | `ActiveRecord::ConnectionTimeoutError` | `execute_sql_query` leaked connections (should use connection pool properly) |
| **NameError** | `get_source_location` returns error | Class not autoloaded. Need to reference it first or call `eager_load!` |
| **CSP blocks toolbar** | Toolbar doesn't appear in browser | CSP `frame-ancestors` not stripped, or `unsafe-eval` not added |
| **Toolbar not injected** | No toolbar in HTML | `Rack::Deflater` placed after Tidewave in middleware stack — response is gzipped |

**Diagnostic Commands:**

```bash
# Check if Tidewave is alive
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tidewave/config
# 200 = healthy, anything else = problem

# Check Rails middleware stack order
bundle exec rails middleware | grep -i tidewave

# See what tools are registered
curl -s -X POST http://localhost:3000/tidewave/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.result.tools[].name'

# Check for toolbar injection issues
curl -s -I http://localhost:3000/ | grep -i content-encoding
# If "gzip" or "deflate" present, toolbar won't inject

# Inspect Tidewave gem version
bundle exec ruby -e "require 'tidewave/version'; puts Tidewave::VERSION"

# Verify loopback restriction is active
curl -s http://localhost:3000/tidewave/config
# Should return 403 from non-localhost
```

**Key Metrics to Monitor:**

- **MCP request latency**: Tidewave is Rack middleware — you can wrap it with `ActiveSupport::Notifications.instrument` to emit `process_action.action_controller`-style events
- **`project_eval` timeout rate**: High timeout rate = agent is writing bad code or queries are too large
- **`project_eval` error rate**: Distinguish between agent-code errors (expected, non-zero) and Tidewave internal errors (unexpected, should be near-zero)
- **DB query count from `execute_sql_query`**: Should correlate with agent activity, not spike independently

**Log Signals:**

```
# Normal operation
Tidewave: handled tools/call (project_eval) in 12ms

# Timeout
Tidewave: tool project_eval timed out after 30000ms

# Security block
Tidewave: rejected remote connection from 192.168.1.5

# Toolbar injection skip (silent after first warning)
Tidewave could not inject the toolbar because the HTML response is encoded.
```

---

## Architecture Overview

### MCP Tools

| Tool | Function | Key Implementation Detail |
|------|----------|--------------------------|
| `project_eval` | Evaluate Ruby code in the running app context | `Kernel#eval(code, binding)` with `Timeout.timeout`, stdout/stderr capture via `StringIO` |
| `execute_sql_query` | Run SQL against the dev database | Uses ORM adapter pattern (`ActiveRecord` or `Sequel`) for cross-ORM support |
| `get_docs` | Look up documentation for a constant/method | Reads comments from source files at the line number from `Method#source_location` |
| `get_logs` | Return output from the running server's log | Reads last N lines from `log/development.log` |
| `get_models` | List all models with file and line locations | Uses ORM adapter's model discovery |
| `get_source_location` | Return file:line for classes, modules, or methods | Uses `Object.const_source_location`, `Module#instance_method`, also supports `dep:GEM_NAME` via Bundler |

### Middleware Stack Position

```
Rails Middleware Chain:
  ...
  ActionDispatch::Callbacks
  Tidewave                        ← MCP endpoint + toolbar injection
  Tidewave::QuietRequestsMiddleware ← Suppresses /tidewave/* from logs
  Tidewave::ExceptionsMiddleware  ← Captures exceptions for client display
  ActionDispatch::DebugExceptions
  Rails::Rack::Logger
  ...
```

### Configuration Options

```ruby
# config/application.rb (development only)
config.tidewave.allow_remote_access = false  # loopback only by default
config.tidewave.preferred_orm = :active_record  # or :sequel
config.tidewave.toolbar = true  # inject client toolbar into HTML
config.tidewave.team = {}  # Tidewave Team configuration
config.tidewave.logger_middleware = Rails::Rack::Logger  # which middleware to quiet
```

### Security Design

1. **Loopback-only by default** — `valid_client_ip?` checks `REMOTE_ADDR` against `IPAddr#loopback?` and `::ffff:127.0.0.1`
2. **No production loading** — `Railtie` raises if `config.enable_reloading` is false
3. **Origin header rejection** — MCP endpoint rejects requests with `Origin` header (allows it only for `/tidewave`, `/tidewave/app`, `/tidewave/config`, `/tidewave/upload`)
4. **Upload restrictions** — Max 10MB, only PNG/JPEG/WebM, magic byte validation, filename sanitization
5. **CSP patching** — Development-only, adds `unsafe-eval` and removes `frame-ancestors`

---

## Summary

Tidewave Rails is a **zero-friction bridge between AI agents and the live Rails runtime**. It's a Rack middleware that speaks MCP, exposing 6 tools for code eval, SQL queries, doc lookup, source location, model listing, and log reading. The key insight: instead of making AI agents boot Rails repeatedly (slow) or work from static files alone (blind), give them a persistent IV line into the running dev server. It's deliberately limited — no write access, no remote access by default, no production loading — but those constraints are the right ones for its purpose.

**Key files to read for deeper understanding:**

| File | Purpose |
|------|---------|
| `lib/tidewave.rb` | Main Rack middleware + MCP router (~400 lines) |
| `lib/tidewave/railtie.rb` | Rails integration hook points |
| `lib/tidewave/tool.rb` | Base class with custom JSON Schema validator |
| `lib/tidewave/tools/project_eval.rb` | In-process Ruby code evaluation |
| `lib/tidewave/tools/get_source_location.rb` | Reflection-based source lookup |
| `lib/tidewave/tools/get_docs.rb` | Comment extraction from source files |
| `lib/tidewave/tools/execute_sql_query.rb` | ORM-abstracted SQL execution |
| `lib/tidewave/database_adapter.rb` | ORM adapter pattern (ActiveRecord/Sequel) |
| `lib/tidewave/magic_bytes.rb` | File type detection via binary signatures |
