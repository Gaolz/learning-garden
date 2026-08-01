---
tags: [computer-science, dns, networking, qa]
---
# DNS Q&A: A Cartoon Conversation

*Source: [Julia Evans's article on DNS questions](https://questions.wizardzines.com/dns.html)

```
┌──────────────────────────────────────────────────────────┐
│                        CAST                              │
│                                                          │
│   🎓  Learner    — curious, asks the right questions     │
│   🧙  Gao        — wise DNS wizard, explains things      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Catalogue

| Section | Topic |
|---------|-------|
| [1. Basics](#1-basics) | What DNS does, `dig`, reverse lookup |
| [2. Record Types](#2-record-types) | A, AAAA, MX, NS, PTR, SOA |
| [3. Caching & TTL](#3-caching--ttl) | Why updates aren't instant |
| [4. The Resolution Chain](#4-the-resolution-chain) | Root → TLD → Authoritative |
| [5. Transport](#5-transport) | UDP vs TCP |

---

## 1. Basics

> 🎓 **Learner:** What's the most common thing we use DNS for?

> 🧙 **Gao:** Turning names into numbers.
>
> `google.com` → `19.3.2.15`
>
> Humans remember names. Machines need IPs. DNS is the phonebook.

---

> 🎓 **Learner:** What command-line tool can I use to make DNS queries?

> 🧙 **Gao:** `dig` or `host`.
>
> ```bash
> dig google.com    # gives you the IP
> ```

---

> 🎓 **Learner:** Can I go backwards — IP → hostname?

> 🧙 **Gao:** Yes. Reverse DNS lookup:
>
> ```bash
> dig -x 172.217.13.174
> ```

---

> 🎓 **Learner:** Does reverse DNS always work?

> 🧙 **Gao:** Nope. It needs a `PTR` record (like `174.13.217.172.in-addr.arpa`). No PTR → no hostname back.

---

## 2. Record Types

> 🎓 **Learner:** Do DNS servers only store IP addresses?

> 🧙 **Gao:** No, DNS stores many things. Each type has its own record:

```text
┌────────┬──────────────────────────────────┐
│ Record │ Purpose                          │
├────────┼──────────────────────────────────┤
│   A    │ IPv4 address                     │
│  AAAA  │ IPv6 address                     │
│   NS   │ Name server pointer              │
│   MX   │ Mail server address              │
│  PTR   │ Reverse lookup (IP → name)       │
│  SOA   │ Domain admin / zone metadata     │
└────────┴──────────────────────────────────┘
```

---

> 🎓 **Learner:** Can one hostname have many IP addresses?

> 🧙 **Gao:** Yes! Multiple `A` records → multiple IPs. Classic load balancing trick.

---

> 🎓 **Learner:** Are IPv4 and IPv6 stored in the same record type?

> 🧙 **Gao:** No. IPv4 = `A`, IPv6 = `AAAA`. Different records, same idea.

---

> 🎓 **Learner:** When I email `someone@gmail.com`, is DNS involved?

> 🧙 **Gao:** Yes! Your mail client asks DNS for Gmail's `MX` record. That's how it finds the mail server.

---

## 3. Caching & TTL

> 🎓 **Learner:** I updated my A record — does everyone see it instantly?

> 🧙 **Gao:** Nope. DNS is built on caching. Until caches expire, users keep seeing the old IP.

```
You change A record
        │
        ▼
  ┌─────────────────────────┐
  │  Old IP still in cache? │
  │  → Users see old IP     │
  │  Cache expired?         │
  │  → Users see new IP     │
  └─────────────────────────┘
```

---

> 🎓 **Learner:** What controls how long something stays cached?

> 🧙 **Gao:** **TTL** = Time To Live. Set by the record owner.
>
> - Short TTL (e.g. 60s) → changes propagate fast.
> - Long TTL (e.g. 86400s) → less DNS traffic, but slow to update.

---

> 🎓 **Learner:** Do all clients respect TTL?

> 🧙 **Gao:** No. Some ISPs and apps (looking at you, JVM) ignore TTL and cache for their own fixed duration. Rude, but real.

---

## 4. The Resolution Chain

> 🎓 **Learner:** What's `8.8.8.8`?

> 🧙 **Gao:** Google's public DNS resolver. Anyone can use it. Like a free DNS hotline.

---

> 🎓 **Learner:** When I ask `8.8.8.8` for `reddit.com`'s IP — where does it actually get the answer?

> 🧙 **Gao:** From Reddit's authoritative nameserver — the "source of truth" for `reddit.com`.

---

> 🎓 **Learner:** Is Reddit's nameserver also a DNS server?

> 🧙 **Gao:** Yes, but there are two roles:

```text
┌─────────────────────────┬────────────────────────────────────┐
│ Authoritative Server    │ Owns the real data for a domain.   │
│                         │ "I am the source of truth."        │
├─────────────────────────┼────────────────────────────────────┤
│ Recursive Resolver      │ Doesn't own anything. Asks others, │
│ (e.g. 8.8.8.8)          │ caches answers, returns to you.    │
└─────────────────────────┴────────────────────────────────────┘
```

---

> 🎓 **Learner:** How does `8.8.8.8` find Reddit's nameserver in the first place?

> 🧙 **Gao:** It walks down the hierarchy:

```text
   🏔️  ROOT SERVER
   │   "Go ask .com, I know where it lives."
   │
   ▼
   📂  TLD SERVER (.com)
   │   "Go ask Reddit's nameserver, here's its IP."
   │
   ▼
   🏠  AUTHORITATIVE SERVER (reddit.com)
       "Here's the A record. 151.101.1.140"
```

---

> 🎓 **Learner:** How does `8.8.8.8` find the `.com` TLD server?

> 🧙 **Gao:** It asks a **root server**. 13 root server clusters exist (`a.root-servers.net` through `m.root-servers.net`).

---

> 🎓 **Learner:** And how does `8.8.8.8` know the root server IPs?

> 🧙 **Gao:** **Hardcoded.** Every recursive resolver ships with the root server list baked in. That's the starting point of all DNS.

---

> 🎓 **Learner:** Must I use `8.8.8.8`? Can I talk to Reddit's nameserver directly?

> 🧙 **Gao:** You can! Use `dig @nameserver reddit.com` to query any server directly. Or pick another public resolver like Cloudflare's `1.1.1.1`.

---

## 5. Transport

> 🎓 **Learner:** Does DNS use TCP or UDP?

> 🧙 **Gao:** Both.

```text
┌─────┬──────────────────────────────────────────┐
│ UDP │ Default. Fast, lightweight, one packet.  │
├─────┼──────────────────────────────────────────┤
│ TCP │ Large responses (>512 bytes)             │
│     │ Zone transfers between servers           │
│     │ DNS over HTTPS (DoH) / DNS over TLS (DoT)│
└─────┴──────────────────────────────────────────┘
```

---

```text
╔══════════════════════════════════════════════════════════╗
║  🧙  Gao's DNS Cheat Sheet                              ║
╠══════════════════════════════════════════════════════════╣
║                                                         ║
║  dig example.com              → A record lookup         ║
║  dig -x 1.2.3.4               → Reverse lookup          ║
║  dig example.com MX           → Mail server lookup      ║
║  dig @1.1.1.1 example.com     → Use specific resolver   ║
║                                                         ║
║  Resolution:  Root → TLD → Authoritative                ║
║  Cache key:   Lower TTL = faster propagation            ║
║  A vs AAAA:   IPv4 vs IPv6                              ║
║                                                         ║
╚══════════════════════════════════════════════════════════╝
```
