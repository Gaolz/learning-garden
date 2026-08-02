---
tags: [computer-science, dns, networking, cheatsheet]
source_url: ""
---
# How DNS Works: Cheatsheet

> **TL;DR**: DNS commands, flow diagram, and mental models at a glance — dig examples, resolution chain diagram, and the DNS-as-a-library analogy.

---

## Common Commands

```bash
# Query A record
dig example.com A

# Query NS records
dig example.com NS

# Query with specific DNS server
dig @8.8.8.8 example.com A

# Reverse DNS lookup
dig -x 8.8.8.8

# Force domain-IP binding for HTTPS request
curl --resolve example.com:443:93.184.216.34 https://example.com -I

# View SSL certificate info
openssl s_client -connect 93.184.216.34:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -text | grep "Subject:"
```

---

## DNS Process Flow

![DNS Process](./image/dns_process.png)

---

## DNS as a Library

![DNS as Library](./image/dns_as_library.jpg)
