---
tags: [computer-science, dns, networking, ruby, deep-dive]
---
# Building a DNS Resolver from Scratch in Ruby: Deep Dive & Learning Notes

> **Reference Article**: Julia Evans — *[Making a DNS query in Ruby from scratch](https://jvns.ca/blog/2022/11/06/making-a-dns-query-in-ruby-from-scratch/)*
> **Core Objective**: Implement a fully functional DNS resolver in ~120 lines of pure Ruby using native UDP Sockets — without relying on any external DNS libraries.

---

## Table of Contents

- [1. Purpose & Overview](#1-purpose--overview)
- [2. DNS Protocol Primer: Binary Format](#2-dns-protocol-primer-binary-format)
  - [2.1 Query Message Structure](#21-query-message-structure)
  - [2.2 Response Message Structure](#22-response-message-structure)
- [3. Architectural Data Flow Diagrams](#3-architectural-data-flow-diagrams)
  - [Diagram A: Constructing the DNS Query](#diagram-a-constructing-the-dns-query)
  - [Diagram B: Cursor Jumping During Pointer Resolution](#diagram-b-cursor-jumping-during-pointer-resolution)
  - [Diagram C: Bitwise Assembly of a 14-Bit Pointer Offset](#diagram-c-bitwise-assembly-of-a-14-bit-pointer-offset)
- [4. Key Implementation & Code Breakdown](#4-key-implementation--code-breakdown)
  - [4.1 Query Construction](#41-query-construction)
  - [4.2 Domain Name Decoding & Compression Pointers](#42-domain-name-decoding--compression-pointers)
  - [4.3 Response Parsing: Header + Answer Records](#43-response-parsing-header--answer-records)
  - [4.4 Putting It All Together: UDP Send & Receive](#44-putting-it-all-together-udp-send--receive)
- [5. DNS Response 解析深度讲解](#5-dns-response-解析深度讲解)
  - [5.1 响应报文的完整二进制结构](#51-响应报文的完整二进制结构)
  - [5.2 压缩指针的工作原理](#52-压缩指针的工作原理)
  - [5.3 逐字段解析流程](#53-逐字段解析流程)
  - [5.4 为什么要这样设计？](#54-为什么要这样设计)
- [6. Mental Breakthroughs & Common Confusions](#6-mental-breakthroughs--common-confusions)
- [7. Conclusion & Takeaways](#7-conclusion--takeaways)

---

## 1. Purpose & Overview

At the network level, DNS primarily relies on the **UDP protocol**. The entire communication lifecycle breaks down into three fundamental stages:

| Stage | Function | Key Technique |
|-------|----------|---------------|
| **1. Construct Query** | Assemble a 12-byte header + encoded domain + question section | `Array#pack`, domain label encoding per RFC 1035 |
| **2. UDP Transport** | Send raw bytes to `8.8.8.8:53`, receive raw binary response | `UDPSocket`, raw byte I/O |
| **3. Parse Response** | Extract header fields, skip echoed questions, resolve compression pointers, decode IPv4 addresses | Bitwise ops (`&`, `<<`), `StringIO#pos` cursor control |

---

## 2. DNS Protocol Primer: Binary Format

Before diving into code, understanding the binary layout of DNS messages is essential. DNS messages have two distinct formats — query and response — which share the same header structure but differ in their body sections.

### 2.1 Query Message Structure

```
Byte Offset: 0                    12                (variable)     12+N
             ┌──────────────────────┬─────────────────┬──────────────┐
             │    Header (12 bytes) │ Question Section │ (no answers) │
             └──────────────────────┴─────────────────┴──────────────┘
```

**Header fields** (each 2 bytes / 16 bits, big-endian):

```
Offset  Field           Meaning
────────────────────────────────────────────
 0- 1   ID              Random 16-bit transaction ID (matches query ↔ response)
 2- 3   FLAGS           0x0100 = standard query, recursion desired
 4- 5   QDCOUNT         Number of questions (typically 1)
 6- 7   ANCOUNT         Number of answer records (0 in query)
 8- 9   NSCOUNT         Number of authority records (0 in query)
10-11   ARCOUNT         Number of additional records (0 in query)
```

**Question section** per question:

```
Offset  Field           Meaning
────────────────────────────────────────────
  0     QNAME           Variable-length encoded domain name, terminated by \x00
  N     QTYPE           2 bytes — record type (1 = A, 28 = AAAA, etc.)
 N+2    QCLASS          2 bytes — class (1 = IN / Internet)
```

### 2.2 Response Message Structure

```
Byte Offset: 0                    12                (variable)      (variable)
             ┌──────────────────────┬─────────────────┬──────────────┬──────────┐
             │    Header (12 bytes) │ Question Section │ Answer RRs   │ Addl RRs │
             └──────────────────────┴─────────────────┴──────────────┴──────────┘
```

Response differs from query in two ways:
- **Header flags** include response code (bit 15 = 1 means "this is a response")
- **Answer/Authority/Additional sections** contain resource records with the actual data

Each **Resource Record** in the Answer section:

```
Offset  Field           Meaning
────────────────────────────────────────────
  0     NAME            Domain name (may use compression pointer!)
  N     TYPE            2 bytes — same as QTYPE
 N+2    CLASS           2 bytes — same as QCLASS
 N+4    TTL             4 bytes — time-to-live in seconds (big-endian 32-bit)
 N+8    RDLENGTH        2 bytes — length of RDATA in bytes
 N+10   RDATA           RDLENGTH bytes — the actual data (e.g., 4 bytes for IPv4)
```

---

## 3. Architectural Data Flow Diagrams

### Diagram A: Constructing the DNS Query

(29 bytes total for `example.com`, Type A)

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Complete DNS Query Raw Bytes                      │
 └────────────────────────────────────────────────────────────────────────┘

 [ Phase 1: Fixed Header (12 Bytes) ]
  ID        Flags    Questions Answers  Auth     Add.
 ┌────────┬────────┬──────────┬────────┬────────┬────────┐
 │ 12  34 │ 01  00 │  00  01  │ 00  00 │ 00  00 │ 00  00 │
 └────────┴────────┴──────────┴────────┴────────┴────────┘
     ▲
     └── [rand(65535), 0x0100, 1, 0, 0, 0].pack('nnnnnn')

                          │
                          ▼ (+ String concatenation)

 [ Phase 2: Question Section (17 Bytes) ]
  Len  "example"           Len  "com"    End   Type     Class
 ┌───┬────────────────────┬───┬─────────┬───┬────────┬────────┐
 │07 │65 78 61 6d 70 6c 65 │03 │63 6f 6d │00 │ 00  01 │ 00  01 │
 └───┴────────────────────┴───┴─────────┴───┴────────┴────────┘
   │                         │            │      │        │
   └── "example".length      └── "com"    └── \0 └── Type └── Class
       becomes \x07             becomes \x03         [1, 1].pack('nn')
```

**Data pipeline** (`"example.com"`, Type A):
1. `encode_domain_name` outputs 13 bytes: `"\x07example\x03com\x00"`
2. `[1, 1].pack('nn')` produces 4 bytes: `"\x00\x01\x00\x01"`
3. Concatenation yields a 29-byte hex payload:
   `123401000001000000000000076578616d706c6503636f6d0000010001`

---

### Diagram B: Cursor Jumping During Pointer Resolution

When the parser encounters a **compression pointer** (e.g., `\xc0\x0c`), the `buf.pos` cursor stores its current position, teleports to the referenced offset, reads the domain name, then snaps back — all seamlessly.

```text
=== Cursor Jumping & Restoration Sequence (\xc0\x0c => offset 12) ===

 Byte Offset:
  0       12                                    27   28   29
 ┌───────┬─────────────────────────────────────┬────┬────┬─────────────────────┐
 │ Header│ \x07 e x a m p l e \x03 c o m \x00  │\xc0│\x0c│ Type | Class | IP...│
 └───────┴─────────────────────────────────────┴────┴────┴─────────────────────┘

1. Read \xc0\x0c at position 27-28.
   Calculate offset: ((0xc0 & 0x3f) << 8) | 0x0c = 12.
   Save return checkpoint: old_pos = 29.

2. Execute `buf.pos = 12` — Cursor teleports to byte 12!
   0       12
  ┌───────┬───────────────────
  │ Header│ \x07 e x a m p l e ...
          ▲
          └─ Cursor is now at byte 12

3. Read domain "example.com" recursively until \x00.
   Cursor advances to byte 27.

4. Execute `buf.pos = old_pos` — Cursor jumps back to byte 29!
                                                            29
                                                           ┌─────────────────────┐
                                                           │ Type | Class | IP...│
                                                           └─────────────────────┘
                                                            ▲
                                                            └─ Cursor restored!
```

---

### Diagram C: Bitwise Assembly of a 14-Bit Pointer Offset

Extracting a 14-bit integer spread across two bytes (example: `0xC3E8` → offset `1000`):

```text
 Raw Bytes: [ 0xC3 (11000011) ] [ 0xE8 (11101000) ]

 Step 1: Mask out the 2-bit compression flag (top `11`) from Byte 1:
         len & 0x3F  →  11000011 & 00111111  →  00000011  (decimal = 3)

 Step 2: Shift high bits left by 8 to make room for the lower byte:
         (00000011) << 8  →  00000011 00000000  (decimal = 768)

 Step 3: Add Byte 2 (lower 8 bits):
         00000011 00000000 + 11101000  →  00000011 11101000  (decimal = 1000!)
```

---

## 4. Key Implementation & Code Breakdown

### 4.1 Query Construction

```ruby
# === DNS Query Builder ===
# Builds a complete DNS query packet as a raw binary string.
# The packet consists of: [12-byte header] + [encoded domain] + [4-byte QTYPE+QCLASS]

def make_question_header(query_id)
  # Array#pack('nnnnnn') packs 6 unsigned 16-bit integers into 12 bytes,
  # each in Network Byte Order (big-endian).
  #
  # Layout:  ID(2) | FLAGS(2) | QDCOUNT(2) | ANCOUNT(2) | NSCOUNT(2) | ARCOUNT(2)
  # Values:  random | 0x0100   | 1          | 0          | 0          | 0
  #
  # 0x0100 = standard query (opcode=0) + recursion desired (RD=1)
  [query_id, 0x0100, 0x0001, 0x0000, 0x0000, 0x0000].pack('nnnnnn')
end

def encode_domain_name(domain)
  # RFC 1035 domain name encoding: each label is prefixed by its byte-length.
  # The entire name is terminated by a null byte (\x00).
  #
  # Example: "example.com"
  #   → split:   ["example", "com"]
  #   → map:     ["\x07example", "\x03com"]    # 7.chr = \x07, 3.chr = \x03
  #   → join:    "\x07example\x03com"
  #   → + "\0":  "\x07example\x03com\x00"      # null terminator
  #
  # Note: No .pack needed here. Ruby strings are already raw byte arrays.
  # Integer#chr converts an integer to its corresponding ASCII character byte.
  domain
    .split(".")
    .map { |label| label.length.chr + label }
    .join + "\0"
end

def make_dns_query(domain, type = 1)
  # Step 1: Generate random transaction ID so we can match response to query
  query_id = rand(65535)  # 0..65535 = 16-bit range

  # Step 2: Build 12-byte header
  header = make_question_header(query_id)

  # Step 3: Encode domain + append QTYPE(2 bytes) and QCLASS(2 bytes)
  #   [type, 1].pack('nn') → 4 bytes, e.g., type=1 (A record), class=1 (IN)
  question = encode_domain_name(domain) + [type, 1].pack('nn')

  # Step 4: Concatenate header + question into the final DNS query packet
  header + question
end
```

---

### 4.2 Domain Name Decoding & Compression Pointers

```ruby
# === DNS Domain Name Decoder ===
# Reads a domain name from a binary buffer (StringIO).
# Handles both standard labels AND compression pointers (RFC 1035 §4.1.4).
#
# A label byte's top 2 bits determine its meaning:
#   - 00xxxxxx: standard label, length = lower 6 bits, followed by that many bytes
#   - 11xxxxxx: compression pointer — next 14 bits are an offset into the packet
#   - 00000000: end of domain name (root label)
#   - 10xxxxxx, 01xxxxxx: reserved/unused in practice

def read_domain_name(buf)
  domain = []
  loop do
    # Read 1 byte → unpack as unsigned 8-bit integer (C = unsigned char)
    len = buf.read(1).unpack('C')[0]
    break if len == 0  # \x00 = null terminator = end of domain name

    # Check if top 2 bits are 0b11 (= 0xC0).
    # 0b11000000 & len isolates only those 2 bits for comparison.
    if len & 0b11000000 == 0b11000000
      # === Compression Pointer Detected ===
      # Read the second byte of the 2-byte pointer
      second_byte = buf.read(1).unpack('C')[0]

      # Extract the 14-bit offset:
      #   Step A: (len & 0x3f) — mask out the top 2 bits, keep lower 6
      #   Step B: << 8 — shift those 6 bits up to make room
      #   Step C: + second_byte — add the lower 8 bits
      offset = ((len & 0x3f) << 8) + second_byte

      # CURSOR SAVE → JUMP → READ → RESTORE pattern:
      old_pos = buf.pos       # Remember where we were (e.g., byte 29)
      buf.pos = offset        # Teleport to the referenced location (e.g., byte 12)
      domain << read_domain_name(buf)  # Read domain name from there (recursive)
      buf.pos = old_pos       # Jump back to resume parsing where we left off
      break                   # Compression pointer always ends this label sequence
    else
      # === Standard Label ===
      # len = number of bytes in this label (e.g., 7 for "example")
      # Read exactly len bytes for the label text
      domain << buf.read(len)
    end
  end
  domain.join('.')  # Rejoin labels with dots → "example.com"
end
```

---

### 4.3 Response Parsing: Header + Answer Records

```ruby
# === DNS Response Parser ===
# Parses the raw UDP response from the DNS server.
# A response contains: header → echoed questions → answer RRs → authority RRs → additional RRs
#
# We use StringIO as our buffer so we can track position (buf.pos) and
# seek to arbitrary offsets (required for compression pointer resolution).

require 'stringio'

class DNSResponse
  attr_reader :header, :questions, :answers

  def initialize(raw_bytes)
    @buf = StringIO.new(raw_bytes)

    # ── Parse Header (12 bytes) ──
    # Format: ID(2) | FLAGS(2) | QDCOUNT(2) | ANCOUNT(2) | NSCOUNT(2) | ARCOUNT(2)
    @header = {
      id:      @buf.read(2).unpack('n')[0],   # Transaction ID (matches query)
      flags:   @buf.read(2).unpack('n')[0],   # Flags + response code
      qdcount: @buf.read(2).unpack('n')[0],   # Number of question entries
      ancount: @buf.read(2).unpack('n')[0],   # Number of answer RRs
      nscount: @buf.read(2).unpack('n')[0],   # Number of authority RRs
      arcount: @buf.read(2).unpack('n')[0],   # Number of additional RRs
    }

    # ── Skip Echoed Question Section ──
    # The server echoes back our question(s). We read and discard them.
    @questions = []
    @header[:qdcount].times do
      qname  = read_domain_name(@buf)          # e.g., "example.com"
      qtype  = @buf.read(2).unpack('n')[0]      # e.g., 1 = A record
      qclass = @buf.read(2).unpack('n')[0]      # e.g., 1 = IN (Internet)
      @questions << { name: qname, type: qtype, class: qclass }
    end

    # ── Parse Answer Resource Records ──
    @answers = []
    @header[:ancount].times do
      @answers << DNSRecord.new(@buf)
    end

    # (Authority and Additional sections parsed similarly — omitted for brevity)
  end

  # Forward domain name decoding to the shared method
  def read_domain_name(buf)
    DNSResponse.read_domain_name(buf)
  end

  # Class-level domain name decoder (same logic as §4.2)
  def self.read_domain_name(buf)
    domain = []
    loop do
      len = buf.read(1).unpack('C')[0]
      break if len == 0

      if len & 0b11000000 == 0b11000000
        second_byte = buf.read(1).unpack('C')[0]
        offset = ((len & 0x3f) << 8) + second_byte
        old_pos = buf.pos
        buf.pos = offset
        domain << read_domain_name(buf)
        buf.pos = old_pos
        break
      else
        domain << buf.read(len)
      end
    end
    domain.join('.')
  end
end

# === DNS Resource Record ===
# Each answer/authority/additional record follows this binary layout:
#
#   Byte Offset  Field       Size        Description
#   ─────────────────────────────────────────────────
#   0            NAME        variable    Domain name (standard labels or compressed)
#   N            TYPE        2 bytes     Record type (1=A, 28=AAAA, 5=CNAME, etc.)
#   N+2          CLASS       2 bytes     Class (1=IN)
#   N+4          TTL         4 bytes     Time-to-live, seconds (big-endian uint32)
#   N+8          RDLENGTH    2 bytes     Length of RDATA in bytes
#   N+10         RDATA       RDLENGTH    The actual record data

class DNSRecord
  attr_reader :name, :type, :ttl, :rdata

  def initialize(buf)
    # Step 1: Read the owner name (may involve compression pointer resolution!)
    @name = read_domain_name(buf)

    # Step 2: Read 10 bytes of fixed fields
    #   unpack template 'nnNn':
    #     n = 2-byte unsigned short (big-endian) → TYPE
    #     n = 2-byte unsigned short (big-endian) → CLASS
    #     N = 4-byte unsigned long  (big-endian) → TTL
    #     n = 2-byte unsigned short (big-endian) → RDLENGTH
    @type, @_class, @ttl, rdlength = buf.read(10).unpack('nnNn')

    # Step 3: Read RDATA — interpretation depends on the record type
    @rdata = read_rdata(buf, rdlength)
  end

  private

  def read_rdata(buf, length)
    case @type
    when 1  # A Record: IPv4 address (4 bytes)
      # unpack('C*') → array of unsigned bytes → join with dots
      # e.g., [93, 184, 216, 34] → "93.184.216.34"
      buf.read(length).unpack('C*').join('.')
    when 28 # AAAA Record: IPv6 address (16 bytes)
      # Each group of 2 bytes → hex → join with colons
      buf.read(length).unpack('n*').map { |g| g.to_s(16) }.join(':')
    when 5  # CNAME Record: another domain name (may contain compression pointers)
      read_domain_name_in_rdata(buf)
    else
      # Unknown type: return raw bytes as string
      buf.read(length)
    end
  end

  # When RDATA contains a domain name (e.g., CNAME, NS, PTR),
  # use the same domain name reader — it handles compression pointers automatically.
  def read_domain_name_in_rdata(buf)
    DNSResponse.read_domain_name(buf)
  end

  def read_domain_name(buf)
    DNSResponse.read_domain_name(buf)
  end

  # Human-readable summary
  def to_s
    "#{@name}  #{@ttl}s  IN  TYPE#{@type}  #{@rdata}"
  end
end
```

---

### 4.4 Putting It All Together: UDP Send & Receive

```ruby
require 'socket'
require 'stringio'

# ── Step 1: Create UDP socket ──
# Socket::AF_INET  = IPv4 address family
# Socket::SOCK_DGRAM = UDP (datagram) socket type
sock = UDPSocket.new(Socket::AF_INET)

# ── Step 2: Build the DNS query packet ──
domain = "example.com"
query_packet = make_dns_query(domain, 1)  # type=1 → A record (IPv4)

# ── Step 3: Send query to Google's public DNS resolver ──
# 8.8.8.8:53 is Google Public DNS. Port 53 is the standard DNS port.
sock.send(query_packet, 0, "8.8.8.8", 53)

# ── Step 4: Receive the raw response ──
# DNS responses over UDP are typically ≤ 512 bytes (unless EDNS0 is used).
# We allocate a generous 4096-byte buffer to be safe.
raw_response, _addr = sock.recvfrom(4096)

# ── Step 5: Parse the response ──
response = DNSResponse.new(raw_response)

# ── Step 6: Display results ──
puts "Query ID:  #{response.header[:id]}"
puts "Flags:     #{response.header[:flags].to_s(16)}"
puts "Questions: #{response.header[:qdcount]}"
puts "Answers:   #{response.header[:ancount]}"
puts ""
response.answers.each { |rr| puts rr }

# ── Step 7: Clean up ──
sock.close
```

**Example Output:**
```
Query ID:  52341
Flags:     8180
Questions: 1
Answers:   1

example.com  3600s  IN  TYPE1  93.184.216.34
```

---

## 5. DNS Response 解析深度讲解

这是本文最核心的部分。DNS 响应的解析涉及三个关键难点：二进制字段定界、压缩指针跳转，以及不同记录类型的 RDATA 解码。

### 5.1 响应报文的完整二进制结构

DNS 服务器返回的原始字节流，按顺序包含以下几个区域：

```
┌──────────────────────────────────────────────────────────────────┐
│                    DNS Response Binary Layout                    │
├──────────┬──────────┬──────────┬───────────┬────────────────────┤
│  HEADER  │ QUESTION │  ANSWER  │ AUTHORITY │    ADDITIONAL      │
│ 12 bytes │ (echoed) │  RRs     │   RRs     │       RRs          │
├──────────┼──────────┼──────────┼───────────┼────────────────────┤
│ 固定长度  │ 可变长度  │ 可变长度   │  可变长度   │      可变长度        │
│ 包含各段  │ 服务器原样 │ 真正的查询  │ 权威DNS    │ 额外的A/AAAA记录     │
│ 记录数量   │ 返回问题  │ 结果       │ 服务器信息   │ (glue records)     │
└──────────┴──────────┴──────────┴───────────┴────────────────────┘
```

**Header 的 12 字节详解：**

```
Byte:  0    1    2    3    4    5    6    7    8    9   10   11
     ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
     │   ID    │   FLAGS   │ QDCOUNT  │ ANCOUNT  │ NSCOUNT  │ ARCOUNT  │
     └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘
          │         │         │         │         │         │
          │         │         │         │         │         └─ 附加记录数
          │         │         │         │         └─ 权威记录数
          │         │         │         └─ 答案记录数 (我们最关心的)
          │         │         └─ 问题数 (通常=1)
          │         └─ 标志位 (QR=1表示响应, RCODE=0表示成功)
          └─ 事务ID (与查询匹配)
```

**Flags 字段逐位解析（16 bits）：**

```
Bit:  15   14   13   12   11   10    9    8    7    6    5    4    3    2    1    0
     ┌───┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
     │QR │OPCODE│  AA │  TC │  RD │  RA │  Z  │  AD │  CD │      RCODE              │
     └───┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
      1   4bit  1    1    1    1    3bit  1     1      4bit

关键位：
  QR(bit15)=1  → "这是响应报文，不是查询"
  RCODE(bits3-0)=0 → "查询成功，没有错误"
  RCODE(bits3-0)=3 → NXDOMAIN（域名不存在）
```

### 5.2 压缩指针的工作原理

**为什么要压缩？** 一个 DNS 响应中，同一域名可能出现多次（Question 段、Answer 段的 NAME 字段、CNAME 的 RDATA 等）。为节省宝贵的 512 字节 UDP 限制，RFC 1035 设计了压缩指针机制。

**工作原理：**

```
当解析器在读取域名时遇到一个字节，其最高两位 = 0b11（即值 ≥ 0xC0），
这不是标签长度，而是一个 2 字节的压缩指针：

  Byte N:   1 1 X X X X X X    ← 高2位=11 是压缩标志，低6位是偏移量的高6位
  Byte N+1: Y Y Y Y Y Y Y Y    ← 偏移量的低8位

  实际偏移量 = (XXXXXX << 8) + YYYYYYYY
             = (Byte_N & 0x3F) << 8 | Byte_N+1
```

**具体例子 — 解析 `\xc0\x0c`：**

```
原始字节：0xC0 = 11000000, 0x0C = 00001100

Step 1: 识别压缩指针
  0xC0 & 0b11000000 = 0b11000000 ✓ → 这是一个压缩指针！

Step 2: 提取偏移量
  (0xC0 & 0x3F) = (11000000 & 00111111) = 00000000 = 0
  (0 << 8) | 0x0C = 0 + 12 = 12

Step 3: 跳转到偏移量 12 处继续读取域名
```

**关键代码逻辑（`read_domain_name` 中的压缩指针处理）：**

```ruby
if len & 0b11000000 == 0b11000000
  # 1. 读到第二个字节，拼出 14-bit 偏移量
  second_byte = buf.read(1).unpack('C')[0]
  offset = ((len & 0x3f) << 8) + second_byte

  # 2. 保存当前位置（书签）
  old_pos = buf.pos

  # 3. 跳转到压缩指针指向的位置，递归读域名
  buf.pos = offset
  domain << read_domain_name(buf)

  # 4. 恢复位置，继续解析后续字段（TYPE, CLASS, TTL, RDATA...）
  buf.pos = old_pos
  break
end
```

**为什么用递归？** 因为压缩指针可能形成链：域名片段 → 跳转到偏移A → 读到另一个压缩指针 → 跳转到偏移B → 读到标准标签 → 返回。递归天然处理这种多层跳转。

### 5.3 逐字段解析流程

以一个真实的 A 记录响应为例，逐步追踪 `DNSRecord.new(buf)` 的解析过程：

```
假设 buf 当前位置指向 Answer 段的第一个 RR，原始字节如下：

  \x07example\x03com\x00     ← NAME: "example.com" (标准编码，13字节)
  \x00\x01                   ← TYPE: 1 (A记录)
  \x00\x01                   ← CLASS: 1 (IN)
  \x00\x00\x0E\x10           ← TTL: 3600秒 (0x00000E10)
  \x00\x04                   ← RDLENGTH: 4
  \x5D\xB8\xD8\x22           ← RDATA: 93.184.216.34
```

**解析步骤：**

```text
① buf.read_domain_name → "example.com"
   逐字节读取：\x07 → 读7字节"example" → \x03 → 读3字节"com" → \x00 → 结束
   buf.pos 前进 13 字节

② buf.read(10).unpack('nnNn')
   读10字节 → [0x0001, 0x0001, 0x00000E10, 0x0004]
   对应：type=1, class=1, ttl=3600, rdlength=4
   buf.pos 前进 10 字节

③ read_rdata(buf, 4)
   type==1 → IPv4:
   buf.read(4).unpack('C*') → [93, 184, 216, 34]
   join('.') → "93.184.216.34"
   buf.pos 前进 4 字节
```

**如果 NAME 字段使用了压缩指针：**

```text
  \xc0\x0c                   ← NAME: 压缩指针，指向偏移量12
  \x00\x01                   ← TYPE: 1
  ...

① 读到 \xc0 → 检测到压缩指针
② 读下一字节 \x0c → offset = 12
③ old_pos = 当前buf.pos (假设为35)
④ buf.pos = 12 → 跳转到 Header 后的域名位置
⑤ 递归读域名 → "example.com"
⑥ buf.pos = 35 → 恢复，继续读 TYPE、CLASS、TTL、RDATA
```

### 5.4 为什么要这样设计？

| 设计决策 | 原因 |
|----------|------|
| **UDP 而非 TCP** | DNS 查询短小（通常 < 100 字节），UDP 无连接开销，速度更快。TCP 仅在响应超过 512 字节或 zone transfer 时使用 |
| **压缩指针** | 1987 年的网络带宽极其有限，512 字节 UDP 限制下，重复域名浪费宝贵空间 |
| **Big-Endian 网络字节序** | 历史惯例。所有 IETF 协议标准（RFC 1700+）统一使用 big-endian，避免不同 CPU 架构间的字节序混乱 |
| **域名标签编码而非纯文本** | 用长度前缀（length-prefixed）而非点号分隔，消除特殊字符转义需求，解析更快 |
| **StringIO 而非字节数组** | Ruby 的 StringIO 提供 `pos` 和 `pos=` 方法，天然支持"读到哪里记哪里"，非常适合这种需要随机跳转的二进制解析场景 |

---

## 6. Mental Breakthroughs & Common Confusions

### Q1: What does `.pack('nnnnnn')` actually do, and why `'n'`?

Ruby integers are high-level objects (arbitrary precision). `.pack` converts them into **raw network-order byte streams**.

- `'n'` = **16-bit unsigned integer, Network Byte Order (Big-Endian)**
- Six `'n'`s pack 6 integers into exactly 12 raw bytes.
- Contrast with `'v'` (little-endian), `'N'` (32-bit big-endian), `'C'` (8-bit unsigned char).

### Q2: Why wasn't `.pack` called inside `encode_domain_name`?

In Ruby, ASCII strings are already stored in memory as **raw byte arrays**. `7.chr` creates a single byte with value `0x07`. String concatenation directly produces raw network-compatible bytes — no intermediate encoding step needed.

### Q3: How are characters like `"example"` converted into hex `65 78 61...`?

There is **no conversion**. In computer memory, the character `'e'` is stored as binary `01100101` (`0x65`). The hex display is purely a human-friendly visualization produced by tools like Wireshark or `xxd`. When Ruby writes a string to a UDP socket, it sends the raw bytes as-is.

### Q4: Why is bit-shifting (`<< 8`) necessary for pointer offsets?

The 14-bit offset spans two bytes. The top 6 bits represent values in multiples of 256 ($2^8$). Left-shifting by 8 moves them into their correct binary column before adding the lower 8 bits. Without `<< 8`, the two byte values would simply add in the units column, producing garbage.

### Q5: What if the response is larger than 512 bytes?

Standard DNS over UDP has a 512-byte limit. If the response exceeds this, the server sets the **TC (Truncated)** flag in the header. The client should then retry the query over **TCP** on port 53. EDNS0 (Extension Mechanisms for DNS) allows larger UDP responses via the `OPT` pseudo-record (up to 4096 bytes typically).

---

## 7. Conclusion & Takeaways

1. **Working Below the Abstraction Layer**: Modern languages hide binary data well. Moving down to socket programming requires shifting from thinking in "human text" to navigating "raw byte sequences and bit masks."

2. **Network Protocols as Binary Puzzles**: Standards like DNS are simply strict specs defining byte lengths, bit flags, and offsets. Armed with bitwise operations (`&`, `<<`) and buffer cursor tracking (`buf.pos`), parsing any low-level network protocol becomes an approachable, structured task.

3. **Compression Pointers Are Elegant**: The 14-bit offset pointer is a clever space-saving design from 1987 that still works perfectly today. Understanding it requires only basic bitwise arithmetic — mask, shift, add.

4. **Ruby Is Surprisingly Good at Binary Parsing**: `Array#pack`/`String#unpack` + `StringIO` give us all the tools needed for protocol-level programming without reaching for C extensions.
