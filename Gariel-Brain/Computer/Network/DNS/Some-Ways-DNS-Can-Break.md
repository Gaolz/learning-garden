---
tags: [computer-science, dns, networking, troubleshooting]
source_url: "https://jvns.ca/blog/2022/01/15/some-ways-dns-can-break/"
---
# Some Ways DNS Can Break

> **TL;DR**: 15 real-world DNS failure modes — from caching and TTL bugs to Kubernetes ndots and Alpine Linux TCP issues.

*Source: [Julia Evans — Some Ways DNS Can Break](https://jvns.ca/blog/2022/01/15/some-ways-dns-can-break/)*

---

## Q&A

### **Q1: 为什么我的网络请求会突然变慢？**

> **A:** 可能是你的 DNS 解析器（如路由器或本地 DNS 服务）负载过高、存在内存泄漏或处理效率低下，导致每次请求都在解析阶段消耗了额外的时间。

---

### **Q2: 为什么有些网络请求会频繁超时（比如卡住 2 秒甚至 30 秒）？**

> **A:** 这通常是因为 DNS 查询请求直接超时了。例如在 Kubernetes 环境中，如果 DNS 配置不当，服务在发起网络请求时需要等待 DNS 查询超时后才能重试或报错。

---

### **Q3: 什么是 `ndots:5`？它为什么会导致访问外部域名时非常缓慢？**

> **A:** 在 Kubernetes 环境中，`/etc/resolv.conf` 默认配置了 `ndots:5`。这会导致系统在解析外部域名（如 `google.com`）时，先将其当成内部域名，依次拼接 4 个本地子域进行查询（如 `google.com.svc.cluster.local`）。每次查询都要等待失败后，才会去解析真实的 `google.com`。

---

### **Q4: 为什么排查 DNS 问题时，很难确定系统到底在使用哪个解析器？**

> **A:** 因为不同的操作系统和软件有不同的解析逻辑。例如 Linux 多数应用依赖 `/etc/resolv.conf`，但浏览器可能会绕过它改用 DNS-over-HTTPS (DoH)；macOS 的解析逻辑更加复杂，导致定位真实使用的解析器非常困难。

---

### **Q5: 为什么已存在的域名解析时却会报错说“域名不存在”（`NXDOMAIN`）？**

> **A:** 这是因为某些 DNS 服务器存在 Bug。当一个域名只有 IPv6 (AAAA) 记录而没有 IPv4 (A) 记录时，如果应用查询 A 记录，DNS 服务器应该返回成功但无数据的状态（`NOERROR`），却误返回了“域名不存在”（`NXDOMAIN`）。像 Nginx 收到 `NXDOMAIN` 后就会直接放弃后续的 AAAA 查询。

---

### **Q6: 为什么我刚配置好新的 DNS 记录，访问时却依然提示不存在？**

> **A:** 这是触发了**负向缓存（Negative Caching）**。如果你在 DNS 记录尚未配置完成前就访问了该域名，系统或 DNS 解析器会把“域名不存在”这个**失败结果**给缓存起来（缓存时长取决于域名 SOA 记录中的 TTL），导致即使后续记录生效了，本地依然无法访问。

---

### **Q7: 为什么更新了后端服务器 IP 后，Nginx 依然在请求旧的 IP 地址？**

> **A:** 因为 Nginx 默认会在启动（或 Reload）时解析一次域名，并**永久缓存**该 IP 地址。如果目标 IP 地址发生变更，Nginx 不会自动刷新 DNS，必须手动重启或重新加载配置。

---

### **Q8: 为什么 Java 应用运行一段时间后突然连接不上更新后的数据库或服务？**

> **A:** Java JVM 默认的 DNS 缓存策略可能会将域名解析结果**永久缓存**（除非重启 JVM）。当后端服务的 IP 发生变化时，运行中的 Java 应用依然会尝试连接旧 IP。

---

### **Q9: 为什么用 `dig` 命令行测试域名正常，但应用程序访问时却报错？**

> **A:** 很可能是你的 `/etc/hosts` 文件里写死了旧的 IP 映射，而你忘记删除了。调试工具（如 `dig`）通常会直接向 DNS 服务器发起查询，从而**绕过** `/etc/hosts` 文件；但应用程序（如浏览器、Curl）则优先读取 `/etc/hosts`。

---

### **Q10: 为什么我发送的邮件对方收不到，或者总是被判定为垃圾邮件？**

> **A:** 邮件系统极度依赖 DNS 记录来进行身份验证和路由。如果域名的 MX 记录、SPF 记录或 DKIM 记录配置错误或缺失，接收方邮件服务器就会拒收或将其标记为垃圾邮件。

---

### **Q11: 带有 Emoji 或非英文字符的国际化域名（IDN）为什么无法正常访问？**

> **A:** 国际化域名（如 `💩.la`）在 DNS 解析时会被转码为 Punycode 格式（如 `xn--ls8h.la`）。虽然有统一的标准，但很多软件在处理这种转换或解析时存在编码 Bug。

---

### **Q12: 为什么普通的 DNS 查询正常，但部分大型 DNS 响应会诡异地失败？**

> **A:** 当 DNS 响应报文太大时，需要从 UDP 协议切到 TCP 协议（端口 53）。如果网络中的防火墙仅放行了 UDP 53 端口而拦截了 TCP 53 端口，就会导致大包 DNS 查询失败。

---

### **Q13: 为什么 Alpine Linux（Docker 镜像）在处理大型 DNS 响应时会报错？**

> **A:** Alpine Linux 使用的是 `musl` libc 基础库，而 `musl` 的 `getaddrinfo` 实现**不支持 TCP DNS**。当 DNS 响应体超过标准的 512 字节（UDP）时，服务器会截断响应并要求客户端改用 TCP 重试，由于 `musl` 不支持重试，查询就会直接失败。

---

### **Q14: 为什么配置了 DNS 轮询负载均衡（Round Robin），流量却全倾斜到了某一台服务器上？**

> **A:** 许多 C 语言程序或库在升级时，将底层 DNS 查询函数从 `gethostbyname` 切换到了 `getaddrinfo`。但 `getaddrinfo` 默认会自动对返回的 IP 地址列表进行排序，这破坏了 DNS 服务器返回的随机轮询顺序。

---

### **Q15: 为什么两个同时启动的容器在互相调用时会报 DNS 错误且无法恢复？**

> **A:** 两个服务/容器同时启动并立即尝试解析对方时，Kubernetes 的 DNS 记录可能尚未同步更新完成。这会导致首次解析失败，而这个**失败结果被系统缓存**了下来，导致后续调用一直持续失败（竞态条件）。
