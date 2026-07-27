#!/usr/bin/env python3
"""
Redis Stage 1 — Core Data Structures: Interactive Tutorial
===========================================================

This script teaches Redis's five fundamental data structures through
hands-on examples. Run each section separately and experiment!

Prerequisites:
    docker compose up -d          # start Redis in Docker
    source ../.venv/bin/activate  # activate the venv with redis-py
    python tutorial.py            # run this script

Every section:
  1. Explains what the data structure IS (mental model)
  2. Shows basic CRUD operations
  3. Demonstrates a real-world use case
  4. Highlights common pitfalls
"""

import redis
import time
import json

# ---------------------------------------------------------------------------
# SETUP — connect to the Docker Redis
# ---------------------------------------------------------------------------

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def section(title: str) -> None:
    """Print a section header and flush any stale keys from the demo."""
    print()
    print("=" * 70)
    print(f"  {title}")
    print("=" * 70)

def check_connection():
    """Verify Redis is reachable before running demos."""
    try:
        pong = r.ping()
        print(f"✅ Connected to Redis — PING → {pong}")
        print(f"   Redis version: {r.info('server')['redis_version']}")
    except redis.ConnectionError:
        print("❌ Cannot connect to Redis. Run: docker compose up -d")
        exit(1)


# ===========================================================================
# 1. STRINGS — The Swiss Army Knife
# ===========================================================================
# Mental model: a single key maps to a single value (like a Python dict).
# But Redis strings are binary-safe and can hold up to 512 MB.
#
# Key operations:
#   SET key value [EX seconds]  — store with optional TTL
#   GET key                     — retrieve
#   INCR key / DECR key         — atomic increment/decrement (value must be an integer)
#   SETNX key value             — "SET if Not eXists" — the foundation of distributed locks
#   MGET k1 k2 ...              — batch read (avoids N round trips)
# ===========================================================================

def demo_strings():
    section("1. STRINGS — The Swiss Army Knife")

    # ---- Basic SET/GET ----
    r.set("user:100:name", "Alice")
    r.set("user:100:role", "admin")
    name = r.get("user:100:name")
    print(f"Basic GET: user:100:name = {name}")

    # ---- TTL (Time-To-Live) ----
    r.set("session:abc123", "logged_in", ex=10)  # expires in 10 seconds
    ttl = r.ttl("session:abc123")
    print(f"Session TTL: {ttl}s remaining")

    # ---- EXISTS & DEL ----
    print(f"session:abc123 exists? {r.exists('session:abc123')} → True (1)")

    # ---- Atomic Counter (INCR) ----
    # Why atomic? Imagine two users upvote at the same time.
    # Redis guarantees each INCR reads → adds 1 → writes without race conditions.
    r.set("article:42:views", 0)
    for _ in range(5):
        r.incr("article:42:views")  # simulate 5 page views
    print(f"Article 42 views after 5 INCRs: {r.get('article:42:views')}")

    # ---- SETNX — "SET if Not eXists" ----
    # This is the primitive behind distributed locks.
    acquired = r.setnx("lock:export-job", "worker-1")
    print(f"Lock acquired by worker-1? {acquired}")  # True
    acquired_again = r.setnx("lock:export-job", "worker-2")
    print(f"Lock acquired by worker-2? {acquired_again}")  # False — already taken!

    # ---- MGET — batch read ----
    # Instead of N round trips, do one.
    values = r.mget(["user:100:name", "user:100:role", "user:100:nonexistent"])
    print(f"MGET batch read: {values}")  # ['Alice', 'admin', None]

    # ---- Cleanup ----
    r.delete("user:100:name", "user:100:role", "article:42:views", "lock:export-job")


# ===========================================================================
# 2. LISTS — Ordered Sequences (Linked Lists)
# ===========================================================================
# Mental model: a doubly-linked list. Fast at the ends (O(1)), slow in the
# middle (O(n)). Think queue, stack, or timeline of recent items.
#
# Key operations:
#   LPUSH key val  / RPUSH key val   — push left/right
#   LPOP key       / RPOP key        — pop left/right
#   LRANGE key start stop            — slice (0 -1 = all)
#   LLEN key                         — length
#   LTRIM key start stop             — trim to range (caps the list)
#   BRPOP key timeout                — blocking pop (building block for task queues)
# ===========================================================================

def demo_lists():
    section("2. LISTS — Ordered Sequences")

    # ---- Stack pattern (LIFO): LPUSH + LPOP ----
    r.delete("stack:undo")
    r.lpush("stack:undo", "type 'hello'", "paste image", "delete line")
    print(f"Undo stack (top to bottom): {r.lrange('stack:undo', 0, -1)}")
    last_action = r.lpop("stack:undo")
    print(f"Undo action: {last_action}")
    print(f"Remaining:    {r.lrange('stack:undo', 0, -1)}")

    # ---- Queue pattern (FIFO): RPUSH + LPOP ----
    r.delete("queue:emails")
    r.rpush("queue:emails", "Welcome", "Reset password", "Weekly digest")
    print(f"Email queue: {r.lrange('queue:emails', 0, -1)}")
    next_email = r.lpop("queue:emails")
    print(f"Processing: {next_email}")
    print(f"Remaining:  {r.lrange('queue:emails', 0, -1)}")

    # ---- Capped list with LTRIM — "recent 3 items" ----
    r.delete("recent:posts")
    for post_id in range(1, 8):
        r.lpush("recent:posts", f"post:{post_id}")
        r.ltrim("recent:posts", 0, 2)  # keep only the 3 most recent
    print(f"Recent 3 posts (capped): {r.lrange('recent:posts', 0, -1)}")

    # ⚠️ PITFALL: LRANGE on a huge list is O(n). Never LRANGE a million-item
    #    list in production — it will block Redis's single thread!

    r.delete("stack:undo", "queue:emails", "recent:posts")


# ===========================================================================
# 3. SETS — Unordered, Unique Collections
# ===========================================================================
# Mental model: a bag of unique items. No duplicates, no ordering.
# The superpower is set operations: union, intersection, difference.
#
# Key operations:
#   SADD key member [...]  — add members
#   SMEMBERS key           — get all members (⚠️ O(n), don't use on huge sets)
#   SISMEMBER key member   — check membership (O(1))
#   SINTER k1 k2           — intersection (users who like BOTH)
#   SUNION k1 k2           — union (users who like EITHER)
#   SDIFF k1 k2            — difference (users who like A but NOT B)
#   SCARD key              — cardinality (count)
# ===========================================================================

def demo_sets():
    section("3. SETS — Unique Collections & Set Math")

    # ---- Basic membership ----
    r.delete("tags:article:1")
    r.sadd("tags:article:1", "redis", "database", "tutorial", "backend")
    print(f"Tags: {r.smembers('tags:article:1')}")
    print(f"Has 'redis' tag? {r.sismember('tags:article:1', 'redis')}")
    print(f"Has 'frontend' tag? {r.sismember('tags:article:1', 'frontend')}")
    print(f"Total tags: {r.scard('tags:article:1')}")

    # ---- Set operations — the real power ----
    r.delete("user:1:friends", "user:2:friends")
    r.sadd("user:1:friends", "Alice", "Bob", "Charlie", "Diana")
    r.sadd("user:2:friends", "Charlie", "Diana", "Eve", "Frank")

    # Mutual friends (intersection)
    mutual = r.sinter("user:1:friends", "user:2:friends")
    print(f"\nUser 1's friends: {r.smembers('user:1:friends')}")
    print(f"User 2's friends: {r.smembers('user:2:friends')}")
    print(f"Mutual friends (SINTER):   {mutual}")

    # All friends combined (union)
    all_friends = r.sunion("user:1:friends", "user:2:friends")
    print(f"All friends (SUNION):      {all_friends}")

    # Friends of user 1 that user 2 doesn't have (difference)
    only_user1 = r.sdiff("user:1:friends", "user:2:friends")
    print(f"Only user 1's (SDIFF):     {only_user1}")

    # ⚠️ PITFALL: SMEMBERS on a set with millions of members can block Redis.
    #    For large sets, use SSCAN for incremental iteration instead.

    r.delete("tags:article:1", "user:1:friends", "user:2:friends")


# ===========================================================================
# 4. HASHES — Objects / Dictionaries
# ===========================================================================
# Mental model: a Python dict inside Redis — key → {field: value, field: value}.
# Perfect for storing structured objects (users, products, configs).
# More memory-efficient than storing each field as a separate String key.
#
# Key operations:
#   HSET key field value [field value ...] — set fields
#   HGET key field                         — get one field
#   HMGET key field [field ...]            — get multiple fields
#   HGETALL key                            — get ALL fields (⚠️ O(n))
#   HINCRBY key field increment            — atomic increment of a field
#   HEXISTS key field                      — check field existence
#   HDEL key field [field ...]             — delete fields
# ===========================================================================

def demo_hashes():
    section("4. HASHES — Objects & Structured Data")

    # ---- Store a user profile as a Hash ----
    r.delete("user:200")
    r.hset("user:200", mapping={
        "name": "Bob",
        "email": "bob@example.com",
        "age": "28",
        "plan": "premium",
        "login_count": "0",
    })
    print(f"User 200 name: {r.hget('user:200', 'name')}")
    print(f"User 200 email + plan: {r.hmget('user:200', ['email', 'plan'])}")

    # ---- Atomic field increment ----
    r.hincrby("user:200", "login_count", 1)
    r.hincrby("user:200", "login_count", 1)
    print(f"Login count after 2 logins: {r.hget('user:200', 'login_count')}")

    # ---- Check field existence ----
    print(f"Has 'plan' field? {r.hexists('user:200', 'plan')}")
    print(f"Has 'credit_card' field? {r.hexists('user:200', 'credit_card')}")

    # ---- Partial update (only the fields you care about) ----
    r.hset("user:200", "plan", "enterprise")
    r.hset("user:200", "age", "29")
    print(f"Updated user 200: {r.hgetall('user:200')}")

    # ---- Compare: Hash vs separate String keys ----
    # This:
    #   HSET user:200 name Bob email bob@...
    # Is more memory-efficient than:
    #   SET user:200:name Bob
    #   SET user:200:email bob@...
    # Redis uses a compact encoding (listpack) for small hashes internally.

    # ⚠️ PITFALL: HGETALL on a hash with thousands of fields blocks Redis.
    #    For large hashes, use HSCAN for incremental iteration.

    r.delete("user:200")


# ===========================================================================
# 5. SORTED SETS (ZSETs) — Ranked, Scored Collections
# ===========================================================================
# Mental model: a set where each member has a "score" (a floating-point
# weight). Members are always sorted by score. Think leaderboard.
#
# Key operations:
#   ZADD key score member [score member ...] — add with score
#   ZRANGE key min max [WITHSCORES]          — by rank (index)
#   ZRANGEBYSCORE key min max [WITHSCORES]   — by score range
#   ZRANK key member                         — get rank (0-indexed, low→high)
#   ZREVRANK key member                      — get rank (high→low)
#   ZSCORE key member                        — get member's score
#   ZINCRBY key increment member             — atomic score increment
#   ZREM key member [member ...]             — remove members
#   ZCARD key                                — count
# ===========================================================================

def demo_zsets():
    section("5. SORTED SETS (ZSETs) — Leaderboards & Rankings")

    # ---- Game leaderboard ----
    r.delete("game:scores")
    r.zadd("game:scores", {
        "player_alice": 9500,
        "player_bob":   7200,
        "player_carol": 8800,
        "player_dave":  6400,
        "player_eve":   9100,
    })

    # Top 3 players (descending = highest scores first)
    top3 = r.zrevrange("game:scores", 0, 2, withscores=True)
    print("🏆 Top 3 leaderboard:")
    for rank, (player, score) in enumerate(top3, start=1):
        print(f"  #{rank} {player} — {int(score)} points")

    # Player rank
    alice_rank = r.zrevrank("game:scores", "player_alice") + 1  # 0-indexed → 1-indexed
    print(f"\nAlice is rank #{alice_rank}")

    # ---- Atomic score update ----
    r.zincrby("game:scores", 500, "player_dave")  # Dave scores 500 more
    dave_score = r.zscore("game:scores", "player_dave")
    dave_rank = r.zrevrank("game:scores", "player_dave") + 1
    print(f"Dave: {int(dave_score)} pts, now rank #{dave_rank}")

    # ---- Score-range query — "players with 7000–9000 points" ----
    mid_range = r.zrangebyscore("game:scores", 7000, 9000, withscores=True)
    print(f"\nPlayers with 7000–9000 points: {mid_range}")

    # ---- Real-world use case: Rate Limiting with ZSETs ----
    # Track API calls per user in a sliding window.
    user_id = "user:123"
    window_key = f"rate_limit:{user_id}"
    now_ms = int(time.time() * 1000)
    window_ms = 60_000  # 1 minute window

    r.delete(window_key)
    # Simulate: user makes 5 API calls
    for i in range(5):
        call_time = now_ms + i * 100  # spread over 0.5 seconds
        r.zadd(window_key, {f"req:{i}": call_time})

    # Count requests in the last 60 seconds
    cutoff = now_ms - window_ms
    r.zremrangebyscore(window_key, 0, cutoff)  # delete old entries
    recent_count = r.zcount(window_key, cutoff, now_ms + window_ms)
    print(f"\nRate limit check: {recent_count} requests in the last 60s window")

    # ⚠️ PITFALL: ZRANGE on a ZSET with millions of members is O(log(N) + M),
    #    where M = number returned. Returning 1000 items is fine; 1M is not.

    r.delete("game:scores", window_key)


# ===========================================================================
# BONUS: Key Expiration (TTL)
# ===========================================================================
# Every key in Redis can have a TTL, regardless of its data type.
# This is what makes Redis great as a cache.

def demo_expiration():
    section("BONUS — Key Expiration & TTL Patterns")

    # EX = expire in seconds, PX = expire in milliseconds
    r.set("cache:product:1", '{"name":"Widget","price":9.99}', ex=30)
    r.set("cache:product:2", '{"name":"Gadget","price":19.99}')

    # Check TTL
    print(f"cache:product:1 TTL = {r.ttl('cache:product:1')}s (will expire)")
    print(f"cache:product:2 TTL = {r.ttl('cache:product:2')}s (-1 = no expiry)")

    # Set TTL after creation
    r.expire("cache:product:2", 60)
    print(f"cache:product:2 TTL after EXPIRE = {r.ttl('cache:product:2')}s")

    # Remove TTL (make persistent)
    r.persist("cache:product:2")
    print(f"cache:product:2 TTL after PERSIST = {r.ttl('cache:product:2')}s (-1 = persistent)")

    r.delete("cache:product:1", "cache:product:2")


# ===========================================================================
# BONUS: Naming Conventions
# ===========================================================================
# Good key naming prevents chaos. A common convention:
#
#   namespace:entity:id:subfield
#
#   user:100:name          — user profile fields
#   session:<token>        — auth sessions
#   cache:products:42      — cached objects
#   rate_limit:api:user:99 — rate limiting
#   queue:emails           — queues
#   leaderboard:weekly     — leaderboards
#
# This lets you:
#   - Scan/delete by pattern (KEYS user:* — but use SCAN in production!)
#   - Partition data logically
#   - Understand what a key is for at a glance


# ===========================================================================
# MAIN — run all demos
# ===========================================================================

if __name__ == "__main__":
    check_connection()
    demo_strings()
    demo_lists()
    demo_sets()
    demo_hashes()
    demo_zsets()
    demo_expiration()

    print()
    print("=" * 70)
    print("  ✅ Stage 1 tutorial complete!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("  1. Read through the output above and understand each operation")
    print("  2. Run: python homework.py    (hands-on exercises)")
    print("  3. Open redis-cli and experiment: docker compose exec redis redis-cli")
    print()
    print("Key questions to ask yourself (4-layer framework):")
    print("  🤔 WHY:   When would I pick a ZSET over a LIST for rankings?")
    print("  🔧 HOW:   Why is INCR atomic, and why does that matter?")
    print("  ⚖️ TRADE: What happens if I LRANGE a million-item list?")
    print("  🧠 SANDBOX: Design a 'liked posts' feature — which data structure?")
