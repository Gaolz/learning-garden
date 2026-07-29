# 在 Zed 编辑器中为 Rails 项目配置 Solargraph 和 RuboCop

## 问题

在 Zed 编辑器中打开 bear-api（一个使用 rbenv 管理 Ruby 版本的 Rails 8 API 项目）时，Ruby 文件的代码补全、跳转定义、类型提示全部不可用 — Solargraph language server 没有正常工作。同样，RuboCop 的实时 lint 也没有生效。

在终端中手动执行 `bundle exec solargraph stdio` 一切正常，说明 gem 安装正确，但在 Zed 中就是不行。

## 解决思路：为什么从环境变量开始排查

Language Server Protocol (LSP) 的本质是：**编辑器启动一个子进程，通过 stdin/stdout 与它通信**。当在终端手动运行命令正常、但在编辑器中失败时，最可能的原因是**编辑器启动子进程时的环境变量与终端不同**。

具体到 Ruby 生态，rbenv 通过以下机制改变 Ruby 版本：

1. 修改 `PATH`，将 `~/.rbenv/shims` 插入到最前面
2. shims 目录下的包装脚本根据 `~/.rbenv/version` 选择正确的 Ruby 版本
3. 这些配置通常在 `.bashrc` / `.zshrc` 中通过 `eval "$(rbenv init -)"` 加载

编辑器进程不一定继承完整的 shell 环境（它可能由桌面环境、dock、窗口管理器启动），所以 PATH 中没有 rbenv shims，`ruby` 命令指向系统 Ruby 而非项目 Ruby，`bundle exec` 自然找不到正确的 gem。

**验证这个假设的方法很简单：** 写一个 wrapper 脚本，在调用 language server 之前先初始化 rbenv 环境。如果能工作，就证明问题确实是环境变量缺失。

## 官方文档参考

Zed 的 LSP 配置文档明确支持自定义 binary path：

> **Zed — Configuring Languages — Language Servers**
> https://zed.dev/docs/configuring-zed#language-servers
>
> 在 `.zed/settings.json` 的 `lsp` 块中，可以通过 `binary.path` 指定 language server 的可执行文件路径。

Solargraph 的 stdio 模式文档：

> **Solargraph — Using Solargraph with Editors**
> https://solargraph.readthedocs.io/en/latest/
>
> Solargraph 通过 `solargraph stdio` 命令以 LSP stdio 模式运行，编辑器通过 stdin/stdout 与之通信。

RuboCop 的 LSP 模式（v1.53+）：

> **RuboCop — LSP Mode**
> https://docs.rubocop.org/rubocop/usage/lsp.html
>
> RuboCop 通过 `rubocop --lsp` 以 LSP stdio 模式运行。

## 具体解决方法

### 第一步：添加 gem

```ruby
# Gemfile
group :development do
  gem "solargraph", require: false
end
```

`require: false` 是因为 solargraph 只作为 language server 进程运行，不需要在 Rails 启动时加载。

```bash
bundle install
```

RuboCop 已经在 Gemfile 中了（`rubocop-rails-omakase` 依赖它），不需要额外添加。

### 第二步：生成 solargraph 配置

```bash
bundle exec solargraph config . > .solargraph.yml
```

关键配置项：
- **reporters**：`rubocop` 和 `require_not_found`，让 solargraph 报告 RuboCop 风格的诊断和未找到的 require
- **exclude**：排除 `spec/**/*`、`vendor/**/*` 等不需要分析的目录，提升性能
- **max_files**：设为 5000，避免大型项目被截断

### 第三步：创建 Wrapper 脚本 — 核心解决方案

创建 `bin/solargraph-wrapper`：

```bash
#!/usr/bin/env bash
export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"
eval "$(rbenv init -)"
exec bundle exec solargraph stdio
```

创建 `bin/rubocop-wrapper`：

```bash
#!/usr/bin/env bash
export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"
eval "$(rbenv init -)"
exec bundle exec rubocop --lsp
```

Wrapper 脚本做了什么：

| 步骤 | 命令 | 作用 |
|------|------|------|
| ① | `export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"` | 将 rbenv 及其 shims 加入 PATH 最前面 |
| ② | `eval "$(rbenv init -)"` | 初始化 rbenv 的 shell 集成，使 `ruby`、`gem`、`bundle` 等命令自动路由到项目 Ruby 版本 |
| ③ | `exec bundle exec solargraph stdio` | 在项目 bundle 上下文中启动 language server |

`exec` 是关键：Bash 进程被替换为 language server 进程，不残留中间 shell 进程。

赋予可执行权限：

```bash
chmod +x bin/solargraph-wrapper bin/rubocop-wrapper
```

### 第四步：配置 Zed

创建 `.zed/settings.json`：

```json
{
  "languages": {
    "Ruby": {
      "language_servers": [
        "solargraph",
        "rubocop",
        "!ruby-lsp",
        "..."
      ]
    }
  },
  "lsp": {
    "solargraph": {
      "binary": {
        "path": "/home/garielgao/fun/code/ruby/bear-api/bin/solargraph-wrapper"
      },
      "initialization_options": {
        "diagnostics": true,
        "formatting": true
      }
    },
    "rubocop": {
      "binary": {
        "path": "/home/garielgao/fun/code/ruby/bear-api/bin/rubocop-wrapper"
      }
    }
  }
}
```

配置解读：

- **`languages.Ruby.language_servers`**：指定 Ruby 文件使用哪些 language server
  - `"solargraph"` — 代码补全、跳转定义、类型推断
  - `"rubocop"` — 代码风格 lint、自动修复
  - `"!ruby-lsp"` — **显式禁用 ruby-lsp**，避免与 solargraph 冲突（前置 `!` 表示禁用）
  - `"..."` — 保留 Zed 内置的默认语言功能（如语法高亮、括号匹配）
- **`lsp.solargraph.binary.path`**：不调用系统 solargraph，而是用我们的 wrapper 脚本
- **`lsp.rubocop.binary.path`**：同样使用 wrapper 脚本

### 第五步：验证

重启 Zed，打开任一 `.rb` 文件，验证以下功能：

1. **代码补全**：输入 `User.` 后应出现方法列表（如 `find_by`、`create` 等）
2. **跳转定义**：按住 Ctrl/Cmd 点击方法名，能跳转到定义处
3. **RuboCop 诊断**：故意写违反代码风格的代码（如双空格缩进、缺少 frozen_string_literal），应出现黄色/红色波浪线
4. **悬停文档**：鼠标悬停在方法名上，能显示文档说明

最后的验证方法：查看 Zed 的 LSP 日志（`Ctrl+Shift+P` → `zed: open language server logs`），确认没有 `command not found` 或 `LoadError` 错误。

## 拓展：安装 solargraph 相关的 gem 以增强功能

为了让 solargraph 的功能更强大，可以添加以下 gem：

```ruby
group :development do
  gem "solargraph", require: false
  gem "solargraph-rails", require: false  # 为 Rails 项目提供更好的支持
end
```

然后运行 `bundle exec yard gems` 生成 yard 文档，Solargraph 可以借此提供更好的代码补全。

## 这个解决模式适用于哪些场景

任意 "编辑器中的 language server 不工作" 的问题都可以用同一思路排查：

| 语言/工具 | 版本管理器 | 问题根因 | 解决方案 |
|-----------|-----------|---------|---------|
| Ruby / Solargraph | rbenv | rbenv shims 不在 PATH | wrapper 初始化 rbenv |
| Ruby / RuboCop | rbenv | 同上 | wrapper 初始化 rbenv |
| Node / TypeScript | nvm | nvm 不在 PATH | wrapper 中 `source ~/.nvm/nvm.sh` |
| Python / Pyright | pyenv | pyenv shims 不在 PATH | wrapper 初始化 pyenv |
| Go / gopls | goenv | goenv 不在 PATH | wrapper 初始化 goenv |

**通用 Wrapper 模板：**

```bash
#!/usr/bin/env bash
# 初始化 <版本管理器>
export PATH="$HOME/.<version-manager>/bin:$HOME/.<version-manager>/shims:$PATH"
eval "$(<version-manager> init -)"
# 启动 language server
exec <actual-lsp-command>
```

## 总结

Zed（以及 VS Code、Neovim 等）的 LSP 客户端在启动 language server 进程时，不一定继承用户的完整 shell 环境。当项目使用 rbenv/nvm/pyenv 这类版本管理器时，language server 命令找不到正确的运行时，导致所有 LSP 功能失效。

解决方案不复杂：**用一个 wrapper 脚本在启动 language server 之前初始化好版本管理器的环境**，然后让编辑器的 LSP 配置指向这个 wrapper 而非直接调用原命令。

四个关键步骤：
1. 确保 gem/包已安装（`Gemfile` + `bundle install`）
2. 生成 language server 的配置文件（`.solargraph.yml`）
3. 编写初始化环境的 wrapper 脚本（`bin/solargraph-wrapper`）
4. 在编辑器配置中指向 wrapper 脚本（`.zed/settings.json`）

整个排查和解决过程验证了一个通用原则：**当"终端能跑但编辑器不能跑"时，先怀疑环境变量，然后验证，最后用 wrapper 桥接。**
