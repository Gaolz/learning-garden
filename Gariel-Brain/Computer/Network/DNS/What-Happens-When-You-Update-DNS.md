---
tags: [computer-science, dns, networking, tutorial]
source_url: "https://jvns.ca/blog/how-updating-dns-works/"
---
# What Happens When You Update Your DNS?

*Source: [Julia Evans's article on updating DNS records](https://jvns.ca/blog/how-updating-dns-works/)*

---

## Catalogue

1. [Two Kinds of DNS Servers](#1-two-kinds-of-dns-servers)
2. [How DNS Resolution Works (Cold Cache)](#2-how-dns-resolution-works-cold-cache)
3. [Updating an A Record](#3-updating-an-a-record)
4. [Changing Nameservers](#4-changing-nameservers)
5. [Key Takeaways](#key-takeaways)

---

## 1. Two Kinds of DNS Servers

- **Authoritative Nameservers** — own the real domain→IP data.
- **Recursive Resolvers** (e.g. `8.8.8.8`) — don't own data. They ask authoritative servers and cache answers.

---

## 2. How DNS Resolution Works (Cold Cache)

When a recursive resolver has nothing cached, it walks down 3 levels:

| Step | Who It Asks | What It Gets Back |
|------|-------------|-------------------|
| 1 | Root Server | `.com` nameserver IP |
| 2 | TLD Server (`.com`) | Domain's authoritative nameserver IP |
| 3 | Authoritative Server | Final A record (IP address) |

```
[ Client ]
    │
    ▼
[ Recursive Resolver (e.g. 8.8.8.8) ]
    │
    ├── 1. Ask Root ────► get .com NS ──────► [ Root Server ]
    │
    ├── 2. Ask .com ────► get domain NS ────► [ TLD Server ]
    │
    └── 3. Ask Domain ─► get IP ────────────► [ Authoritative Server ]
```

---

## 3. Updating an A Record

Changing where `blog.example.com` points — but keeping the same nameservers.

- **Fast.** Takes effect once cached TTL expires (often minutes).
- **TTL** = how long a recursive resolver may cache the record.
- **Inconsistency** = different resolvers clear cache at different times → some users see old IP, some see new IP.
- **Rogue caches** — some ISPs or app-level caches (JVM) ignore TTL and hold IPs longer.

```
Update A Record
    │
    ├── Nothing cached? ──► new IP active right away
    │
    └── Cache exists?  ──► old IP served until TTL runs out
```

---

## 4. Changing Nameservers

Switching your entire nameserver provider (e.g. from Namecheap to Cloudflare).

- **Slow.** Can take up to **48 hours**.
- Registrar tells TLD (`.com`) about the new nameservers.
- TLD-level NS records have much longer TTLs (~48 hours / 172,800 seconds) vs. normal A records.

```
User changes NS at registrar
         │
         ▼
Registrar notifies TLD (.com)
         │
         ▼
NS record updated (TTL: 24–48 hours)
         │
         ▼
All resolvers gradually pick up new NS over ~48h
```

---

## Key Takeaways

| Change Type | Speed | What Controls It |
|-------------|-------|------------------|
| A record (same NS) | Fast (minutes) | A record TTL |
| Nameservers | Slow (up to 48h) | TLD NS record TTL |

- Rogue ISPs and client-side caches can add extra delays beyond TTL.
