# Redis Stage 1 — Hands-On Guide

> **How to use this guide:** Open a terminal next to this file. For each section,
> read the explanation, then type the commands in `redis-cli`. Don't copy-paste —
> typing builds muscle memory.

## Setup

Start a redis-cli session:

```fish
docker compose -f /home/garielgao/fun/learning-garden/Computer/Redis/stage-1/docker-compose.yml exec redis redis-cli
```

You should see `127.0.0.1:6379>`. That's the Redis prompt. You're now talking
directly to Redis.

---

## 1. STRINGS — A Key Holding a Value

### Mental Model

Imagine Redis as a giant Python `dict`:

```python
redis = {}                          # Redis starts empty
redis["name"] = "Alice"             # SET name Alice
print(redis["name"])                # GET name → "Alice"
```

The difference: Redis lives **outside your program**, so multiple programs can
share the same data. And unlike a Python dict, Redis keys can have an expiration
time (TTL).

### Type It Yourself

```
SET name Alice
```

Redis replies: `OK`

What just happened? You created a key called `name` and put the value `"Alice"`
in it. Redis stores it in memory.

```
┌─────────────────────────────┐
│  Redis Memory               │
│                             │
│  "name"  ──→  "Alice"       │
│                             │
└─────────────────────────────┘
```

Now retrieve it:

```
GET name
```

Redis replies: `"Alice"`

Try getting a key that doesn't exist:

```
GET doesnotexist
```

Redis replies: `(nil)` — that's Redis for "nothing there."

### TTL — Keys That Auto-Delete

```
SET token abc123 EX 30
```

`EX 30` means "delete this key after 30 seconds."

```
TTL token
```

Redis replies: the number of seconds remaining. Try it a few times — the number
goes down.

```
TTL name
```

Redis replies: `-1` — meaning "no expiration, lives forever."

### Atomic Counter — INCR

Imagine two users loading a page at the exact same time. With a regular database:

```
User A reads count = 10
User B reads count = 10     ← both read the SAME value!
User A writes count = 11
User B writes count = 11    ← should be 12! Lost update.
```

Redis `INCR` is **atomic** — the read-increment-write happens as one
uninterruptible step. No update gets lost.

```
SET views 0
INCR views   → 1
INCR views   → 2
INCR views   → 3
GET views    → "3"
```

### SETNX — Only Set If Not Exists

```
SETNX lock:job1 worker-A   → 1 (success — nobody had it)
SETNX lock:job1 worker-B   → 0 (failed — it's already taken!)
```

This is the foundation of **distributed locks**: workers coordinate by trying
to `SETNX` the same key. Only one wins.

### MGET — Batch Read

Instead of 3 separate network round trips:

```
SET user:1:name Alice
SET user:1:role admin
SET user:1:age 30

MGET user:1:name user:1:role user:1:age user:1:nonexistent
→ 1) "Alice"
→ 2) "admin"
→ 3) "30"
→ 4) (nil)          ← nonexistent keys return nil, not an error
```

### Cleanup

```
DEL name token views lock:job1 user:1:name user:1:role user:1:age
```

---

## 2. LISTS — An Ordered Sequence

### Mental Model

Think of a pipe with two ends — left and right:

```
 LEFT (head)                           RIGHT (tail)
  ↓                                       ↓
  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
  │  A   │←─│  B   │←─│  C   │←─│  D   │
  └──────┘  └──────┘  └──────┘  └──────┘
```

- `LPUSH` = push onto the LEFT end
- `RPUSH` = push onto the RIGHT end
- `LPOP` = grab and remove from the LEFT end
- `RPOP` = grab and remove from the RIGHT end

Operations at either end are O(1) — instant, no matter how big the list.
Operations in the middle are O(n) — slower as the list grows.

### Stack Pattern (LIFO — Last In, First Out)

Push on the LEFT, pop from the LEFT:

```
LPUSH stack:undo "type hello"
LPUSH stack:undo "paste image"
LPUSH stack:undo "delete line"
```

After three pushes, the list looks like:

```
 LEFT                           RIGHT
  ↓                               ↓
  ┌─────────────┐ ┌─────────────┐ ┌────────────┐
  │ delete line │→│ paste image │→│ type hello │
  └─────────────┘ └─────────────┘ └────────────┘
```

Now pop (undo) the most recent action:

```
LPOP stack:undo   → "delete line"    (most recently pushed — last in, first out)
LPOP stack:undo   → "paste image"
LPOP stack:undo   → "type hello"
LPOP stack:undo   → (nil)            (empty)
```

### Queue Pattern (FIFO — First In, First Out)

Push on the RIGHT, pop from the LEFT:

```
RPUSH queue:emails "welcome"
RPUSH queue:emails "reset-password"
RPUSH queue:emails "weekly-digest"
```

```
 LEFT                                                      RIGHT
  ↓                                                          ↓
  ┌─────────┐  ┌───────────────┐  ┌──────────────┐
  │ welcome │→ │ reset-password│→ │ weekly-digest│
  └─────────┘  └───────────────┘  └──────────────┘
```

```
LPOP queue:emails   → "welcome"         (first in, first out)
LPOP queue:emails   → "reset-password"
LPOP queue:emails   → "weekly-digest"
```

**Key insight:** Same data structure, different usage pattern. The difference
between a stack and a queue is just which ends you push/pop from.

### Capped List — "Only Keep the 3 Newest"

```
LPUSH recent "post-1"
LTRIM recent 0 2           ← keep only indexes 0, 1, 2 (3 items total)

LPUSH recent "post-2"
LTRIM recent 0 2

LPUSH recent "post-3"
LTRIM recent 0 2

LPUSH recent "post-4"      ← pushes old items off the end
LTRIM recent 0 2

LRANGE recent 0 -1          ← see everything
→ "post-4", "post-3", "post-2"   ("post-1" was trimmed away)
```

`LTRIM` is the secret to bounded lists.

⚠️ **Pitfall:** `LRANGE 0 -1` on a million-item list transfers all of them.
Redis is single-threaded — it blocks everything else while doing it.

### Cleanup

```
DEL stack:undo queue:emails recent
```

---

## 3. SETS — Unordered, Unique Items

### Mental Model

A bag of unique marbles. No duplicates, no ordering. You can instantly check
"is X in the bag?", and you can do set math (intersection, union, difference)
across multiple bags.

### Basic Operations

```
SADD tags:post:1 redis python backend database
```

Redis replies: `4` — the number of items actually added.

```
SADD tags:post:1 redis python     ← try adding duplicates
```

Redis replies: `0` — nothing added, both were already there.

```
SMEMBERS tags:post:1              → "redis", "python", "backend", "database"
SISMEMBER tags:post:1 redis       → 1 (yes, it's there)
SISMEMBER tags:post:1 frontend    → 0 (no, it's not)
SCARD tags:post:1                 → 4 (count)
```

### Why "No Duplicates" Matters

```
SADD likes:post:42 user:5   → 1
SADD likes:post:42 user:5   → 0   ← just ignored
SADD likes:post:42 user:5   → 0
```

No matter how many times user:5 taps "like," they're only counted once.
And `SISMEMBER likes:post:42 user:5` is O(1) — instant regardless of
how many likes there are.

### Set Math — The Real Power

```
SADD friends:alice Bob Charlie Diana Frank
SADD friends:bob   Charlie Diana Eve   Grace
```

```
   Alice's friends          Bob's friends
   ┌──────────────┐        ┌──────────────┐
   │  Bob         │        │  Charlie     │
   │  Charlie     │        │  Diana       │
   │  Diana       │        │  Eve         │
   │  Frank       │        │  Grace       │
   └──────────────┘        └──────────────┘
```

**Mutual friends (intersection):**

```
SINTER friends:alice friends:bob   → "Charlie", "Diana"
```

**All friends combined (union):**

```
SUNION friends:alice friends:bob
→ "Bob", "Charlie", "Diana", "Frank", "Eve", "Grace"
```

**Alice's friends that Bob doesn't have (difference):**

```
SDIFF friends:alice friends:bob   → "Bob", "Frank"
```

All three operations happen **inside Redis** — no data transferred to your app,
no Python loops. Redis does the math and returns only the result.

⚠️ **Pitfall:** `SMEMBERS` on a million-member set blocks Redis. Use `SSCAN`
for large sets.

### Cleanup

```
DEL tags:post:1 friends:alice friends:bob likes:post:42
```

---

## 4. HASHES — A Mini-Dictionary Inside a Key

### Mental Model

A Redis Hash is like a Python dict nested inside another dict:

```python
redis = {
    "user:200": {              ← this key holds a Hash
        "name": "Bob",
        "email": "bob@x.com",
        "age": "28"
    }
}
```

Instead of storing each field as a separate key (`user:200:name`, `user:200:email`...),
you store them together in one Hash. This is **more memory-efficient** and lets
you update one field without touching the others.

### Basic Operations

```
HSET user:200 name Bob email bob@x.com age 28
```

Redis replies: `3` — 3 fields created.

```
HGET user:200 name              → "Bob"
HMGET user:200 name email       → "Bob", "bob@x.com"
HGETALL user:200                → name, Bob, email, bob@x.com, age, 28
HEXISTS user:200 plan           → 0 (no such field)
```

### Partial Update — Change One Field, Leave Others Alone

```
HSET user:200 email bob@new-company.com
```

Only the email changed. Name and age are untouched. You don't need to read the
entire object, modify it in Python, and write it back.

### Atomic Field Increment

```
HSET user:200 login_count 0
HINCRBY user:200 login_count 1   → 1
HINCRBY user:200 login_count 1   → 2
HINCRBY user:200 login_count 1   → 3
```

`HINCRBY` works even if the field doesn't exist yet — it starts from 0.

### Delete a Single Field

```
HDEL user:200 age
HGETALL user:200               ← age is gone, everything else remains
```

⚠️ **Pitfall:** `HGETALL` on a hash with thousands of fields blocks Redis.
Use `HSCAN` for large hashes.

### Cleanup

```
DEL user:200
```

---

## 5. SORTED SETS (ZSET) — Every Item Has a Score

### Mental Model

A Set where each member carries a numeric score. Redis automatically keeps
members **sorted by score**. Think: leaderboard that maintains itself.

```
  Score:  6400       7200       8800       9100       9500
           │          │          │          │          │
           ▼          ▼          ▼          ▼          ▼
        ┌─────┐   ┌─────┐   ┌──────┐   ┌──────┐   ┌───────┐
        │Dave │   │ Bob │   │Carol │   │ Eve  │   │Alice  │
        └─────┘   └─────┘   └──────┘   └──────┘   └───────┘
```

Members are unique (like a Set). Each has a score that determines position.

### Basic Operations

```
ZADD leaderboard 9500 player:alice 7200 player:bob 8800 player:carol 6400 player:dave 9100 player:eve
```

Redis replies: `5` — 5 members added.

```
ZSCORE leaderboard player:alice    → "9500"
ZCARD leaderboard                  → 5
```

### Top 3 Players

`ZREVRANGE` = highest scores first (REVerse order).

```
ZREVRANGE leaderboard 0 2 WITHSCORES
→ player:alice (9500), player:eve (9100), player:carol (8800)
```

A player's rank:

```
ZREVRANK leaderboard player:alice   → 0   (0-indexed = #1)
ZREVRANK leaderboard player:dave    → 4   (#5 — last place)
```

### Atomic Score Update — Dave Scores More Points

```
ZINCRBY leaderboard 500 player:dave
```

Dave goes from 6400 → 6900. Redis **automatically re-sorts** him. No manual
re-ordering needed.

```
ZSCORE leaderboard player:dave     → "6900"
ZREVRANK leaderboard player:dave   → check his new position
```

**This is why ZSet, not List.** With a List, you'd have to: find the element,
remove it, find the new position, insert it — multiple non-atomic steps. With
`ZINCRBY`, it's one atomic operation.

### Query by Score Range — "Who Has 7000–9000 Points?"

```
ZRANGEBYSCORE leaderboard 7000 9000 WITHSCORES
→ player:bob (7200), player:carol (8800)
```

### Real Use: Sliding-Window Rate Limiter

Limit each user to 5 requests per minute. Each request is stored with its
timestamp (in milliseconds) as the ZSet score:

```
ZADD ratelimit:user:123 1714000000001 req:1
ZADD ratelimit:user:123 1714000000101 req:2
ZADD ratelimit:user:123 1714000000201 req:3
ZADD ratelimit:user:123 1714000000301 req:4
ZADD ratelimit:user:123 1714000000401 req:5
```

To check: delete old entries, then count recent ones:

```
ZREMRANGEBYSCORE ratelimit:user:123 0 1713999940000   ← remove older than 60s
ZCOUNT ratelimit:user:123 1713999940000 9999999999999  ← count remaining
```

If the count ≥ 5, reject the request. This is a **sliding window** — always
accurate, unlike "reset at the top of the minute."

⚠️ **Pitfall:** `ZREVRANGE 0 -1` on a million-member ZSet streams everything.
Always limit the range.

### Cleanup

```
DEL leaderboard ratelimit:user:123
```

---

## Summary: Which Structure When?

| You want to... | Use | Because |
|----------------|-----|---------|
| Cache a value with expiration | **String** | Simplest; TTL built in |
| Count things atomically | **String + INCR** | No race conditions |
| Queue tasks (FIFO) | **List** | RPUSH + LPOP is O(1) |
| Undo/redo stack (LIFO) | **List** | LPUSH + LPOP is O(1) |
| Track unique items, check membership | **Set** | SISMEMBER is O(1) |
| Find common elements between groups | **Set** | SINTER, SUNION do it server-side |
| Store an object with named fields | **Hash** | Memory-efficient, partial updates |
| Leaderboard / ranking | **ZSet** | Auto-sorted, ZINCRBY for updates |
| Rate limiting by time window | **ZSet** | Score = timestamp, range queries |
| Like button (user can't double-like) | **Set** | Duplicates auto-ignored |

---

## How to Actually Learn This

1. **Read one section of this guide** (e.g., Strings)
2. **Type every command in redis-cli** — don't copy-paste
3. **Ask "what if?" and try it** — what if I INCR a string? What if I LPOP
   from a Set? What if I ZADD the same member twice?
4. **Close the guide** and see if you can do each operation from memory
5. **Repeat** for the next data structure
6. **Do one exercise** from `my-homework.py` each day
7. **When all 22 tests pass**, you're ready for Stage 2

The Python scripts (`tutorial.py`, `homework.py`) are just wrappers. The real
learning happens in `redis-cli`. Every command in this guide is something you
should type with your own fingers.
