# What Happens When You Update Your DNS?

* source:  [Julia Evans's article on updating DNS records](https://jvns.ca/blog/how-updating-dns-works/):

## 1. Authoritative vs. Recursive DNS Servers

* **Authoritative DNS Servers (Nameservers):** Hold the actual database mapping domains to IP addresses.
* **Recursive DNS Servers (e.g., `8.8.8.8`):** Do not store domain ownership data natively. They resolve domain queries by asking authoritative servers and caching the results.

---

## 2. How Recursive Resolution Works (From Scratch)

When a recursive DNS server resolves a domain with an empty cache:

1. **Root Server:** Queries hardcoded root IP addresses to find the Top-Level Domain (TLD) nameservers (e.g., `.com`).
2. **TLD Server:** Queries the `.com` nameservers to locate the authoritative nameservers for the specific domain.
3. **Authoritative Server:** Queries the domain’s authoritative nameserver to get the final IP address (A record).

```
[ Client ]
    │
    ▼
[ Recursive DNS (e.g., 8.8.8.8) ]
    │
    ├─── Step 1: Query Root Server ( . ) ───► [ Root Server ]
    │                                              │
    │    ◄─── Returns .com Nameserver IP ──────────┘
    │
    ├─── Step 2: Query TLD Server ( .com ) ──► [ TLD Server ]
    │                                              │
    │    ◄─── Returns Domain's Nameserver IP ──────┘
    │
    └─── Step 3: Query Authoritative Server ─► [ Authoritative Server ]
                                                   │
         ◄─── Returns Final A Record (IP Address) ─┘

```

---

## 3. Updating an A Record (Same Nameservers)

* **Propagation Speed:** Updates take effect quickly—often within minutes—once the existing cache expires.
* **TTL (Time to Live):** Dictates how long recursive servers are allowed to cache a record.
* **Cache Inconsistency:** During propagation, users may see different results because recursive servers (or load-balanced backends) clear their caches at different times.
* **Non-Compliant Caches:** Some ISP DNS servers or application-level caches (like the JVM) ignore TTLs and cache IP addresses longer than requested.

```
[ Update A Record at Authoritative Server ]
                   │
                   ▼
       Does a cached record exist?
          ├─── NO  ──► New IP active immediately
          └─── YES ──► Old IP served until TTL expires

```

---

## 4. Changing Nameservers Entirely

* **Longer Delays:** Changing domain nameservers can take up to **48 hours** to fully propagate.
* **Registry Update:** The registrar must notify the TLD nameservers (e.g., `.com`) of the new nameservers.
* **Higher TTLs:** Parent TLD NS records carry significantly longer TTLs (e.g., 48 hours / 172,800 seconds) compared to standard A records.

```
[ User Updates Nameservers at Registrar ]
                   │
                   ▼
[ Registrar Notifies TLD Nameserver (e.g., .com) ]
                   │
                   ▼
  [ NS Record Updated (TTL = 24 to 48 Hours) ]
                   │
                   ▼
[ Recursive DNS Caches Refresh Gradually Over 48h ]

```

---

## Key Takeaways

* Changing **A records** on existing nameservers is fast (depends on A record TTL).
* Changing **Nameservers** is slow (depends on TLD NS record TTL, up to 48 hours).
* Client-side software and non-compliant ISPs can introduce extra caching delays beyond specified TTLs.
