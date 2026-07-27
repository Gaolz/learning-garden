#!/usr/bin/env python3
"""
Redis Stage 1 — MY HOMEWORK (blank template)
=============================================

Complete each exercise by writing code where you see "# TODO: implement this".
Run as you go to check your work:
    ../.venv/bin/python my-homework.py

Stuck? Read the hints below each TODO — they nudge you without giving the answer.
Still stuck? Open tutorial.py and find the matching section.
"""

import redis
import sys

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

passed = 0
failed = 0


def check(name: str, condition: bool, hint: str = ""):
    global passed, failed
    if condition:
        print(f"  ✅ {name}")
        passed += 1
    else:
        print(f"  ❌ {name} — FAILED. {hint}")
        failed += 1


# ===========================================================================
# EXERCISE 1: STRINGS — Build a simple cache with TTL
# ===========================================================================

def exercise_1_strings():
    """
    Task: Implement a simple cache.
    - Store the value "<html>Welcome!</html>" with a 30-second TTL.
    - Retrieve it and verify it exists.
    - Delete it.
    Expected: The value is stored, retrievable, then deleted.
    """
    print("\n📝 Exercise 1: STRINGS — Simple Cache")

    # TODO: implement this
    # HINT: r.set(key, value, ex=seconds) → r.get(key) → r.delete(key)
    value = None

    check("Value stored correctly", value == "<html>Welcome!</html>",
          "Use r.set('cache:homepage', '<html>Welcome!</html>', ex=30) then r.get('cache:homepage')")


# ===========================================================================
# EXERCISE 2: STRINGS — Atomic counter for vote tracking
# ===========================================================================

def exercise_2_counter():
    """
    Task: Track upvotes atomically.
    - Initialize a counter to 0
    - Increment it 3 times
    - Expected: counter == 3
    """
    print("\n📝 Exercise 2: STRINGS — Vote Counter")

    r.delete("post:1:upvotes")

    # TODO: implement this
    # HINT: r.set("post:1:upvotes", 0) then r.incr("post:1:upvotes") three times
    #       (or use a for loop). r.get() returns a string — use int() to convert.
    count = 0

    check("Counter == 3", count == 3,
          "Use r.set('post:1:upvotes', 0) then r.incr() three times")
    r.delete("post:1:upvotes")


# ===========================================================================
# EXERCISE 3: LISTS — Build a task queue (FIFO)
# ===========================================================================

def exercise_3_queue():
    """
    Task: Simulate a task processing queue — first in, first out.
    - Push 3 tasks: "task-a", "task-b", "task-c"
    - Pop them one at a time in FIFO order
    - Expected order: "task-a", "task-b", "task-c"
    """
    print("\n📝 Exercise 3: LISTS — Task Queue (FIFO)")

    r.delete("queue:tasks")

    # TODO: implement this
    # HINT: FIFO = add to one end, remove from the other.
    #       RPUSH adds to the RIGHT (tail). LPOP removes from the LEFT (head).
    #       So: RPUSH to enqueue, LPOP to dequeue.
    t1 = None
    t2 = None
    t3 = None

    check("First task is task-a",  t1 == "task-a")
    check("Second task is task-b", t2 == "task-b")
    check("Third task is task-c",  t3 == "task-c",
          "FIFO: use RPUSH to add items, then LPOP to remove them")
    r.delete("queue:tasks")


# ===========================================================================
# EXERCISE 4: LISTS — Capped "recent items" list
# ===========================================================================

def exercise_4_capped_list():
    """
    Task: Keep only the 3 most recent search queries.
    - Add these 5 queries one at a time: "redis", "python", "docker", "k8s", "terraform"
    - After each add, trim the list so it never holds more than 3 items
    - Expected: final list contains ["terraform", "k8s", "docker"] (newest first)
    """
    print("\n📝 Exercise 4: LISTS — Capped Recent Searches")

    r.delete("recent:searches")

    # TODO: implement this
    # HINT: Loop over the list of queries. For each one:
    #       1. r.lpush("recent:searches", query)  — push to front
    #       2. r.ltrim("recent:searches", 0, 2)   — keep only indexes 0,1,2 (3 items)
    #       Then use r.lrange("recent:searches", 0, -1) to get the final list.
    result = []

    check("List has exactly 3 items", len(result) == 3,
          f"Got {len(result)} items, expected 3")
    check("Newest item first", len(result) > 0 and result[0] == "terraform",
          f"Expected 'terraform' first, got {result[0] if result else 'nothing'}")
    check("Oldest items dropped", "redis" not in result and "python" not in result,
          "redis and python should have been trimmed out — only the last 3 remain")
    r.delete("recent:searches")


# ===========================================================================
# EXERCISE 5: SETS — Tag system with intersection
# ===========================================================================

def exercise_5_sets():
    """
    Task: Find articles that match ALL user-selected tags.
    - Article 1 has tags: python, redis, backend
    - Article 2 has tags: python, django, backend
    - Article 3 has tags: redis, database, caching
    - User searches for: python AND backend → should return {article:1, article:2}
    """
    print("\n📝 Exercise 5: SETS — Tag Intersection Search")

    r.delete("article:1:tags", "article:2:tags", "article:3:tags")
    r.sadd("article:1:tags", "python", "redis", "backend")
    r.sadd("article:2:tags", "python", "django", "backend")
    r.sadd("article:3:tags", "redis", "database", "caching")

    # TODO: implement this
    # HINT: Loop over article IDs 1, 2, 3. For each, check if BOTH "python"
    #       AND "backend" are members of its tag set.
    #       Use r.sismember(key, member) — returns True/False.
    #       If both are True, add f"article:{id}" to the matches list.
    matches = []

    check("Found article:1", "article:1" in matches)
    check("Found article:2", "article:2" in matches)
    check("NOT article:3", "article:3" not in matches,
          "article:3 doesn't have both 'python' AND 'backend'")

    # --- BONUS THINKING ---
    # This approach checks every article one by one (O(n)).
    # For millions of articles, you'd invert the index:
    #   tag:python → {article:1, article:2}
    #   tag:backend → {article:1, article:2}
    #   SINTER tag:python tag:backend → {article:1, article:2} in one call!
    # This trade-off (storage vs. query speed) is central to Redis data modeling.

    r.delete("article:1:tags", "article:2:tags", "article:3:tags")


# ===========================================================================
# EXERCISE 6: HASHES — User profile with partial update
# ===========================================================================

def exercise_6_hashes():
    """
    Task: Manage a user profile with partial updates.
    - Create user:300 with name="Carol", email="carol@old.com", city="NYC"
    - Update ONLY the email to "carol@new.com"
    - Increment a "visits" counter by 5
    - Retrieve all fields
    """
    print("\n📝 Exercise 6: HASHES — User Profile")

    r.delete("user:300")

    # TODO: implement this
    # HINT:
    #   1. r.hset("user:300", mapping={"name": "Carol", ...})  — create
    #   2. r.hset("user:300", "email", "carol@new.com")        — update one field
    #   3. r.hincrby("user:300", "visits", 5)                  — atomic increment
    #      (HINCRBY creates the field if it doesn't exist, starting from 0)
    #   4. r.hgetall("user:300")                               — get everything
    profile = {}

    check("Name is Carol", profile.get("name") == "Carol")
    check("Email updated", profile.get("email") == "carol@new.com",
          "Use HSET to update a single field")
    check("Visits = 5", profile.get("visits") == "5",
          "Use HINCRBY to increment a field atomically")
    check("City preserved", profile.get("city") == "NYC",
          "HSET only updates the fields you specify — others stay unchanged")
    r.delete("user:300")


# ===========================================================================
# EXERCISE 7: ZSETs — Music chart leaderboard
# ===========================================================================

def exercise_7_zset():
    """
    Task: Build a music chart leaderboard.
    - Add 5 songs with play counts as scores
    - Get the top 3 (highest scores first)
    - song_b goes viral (+800 plays) — update its score and check its new rank
    """
    print("\n📝 Exercise 7: ZSETs — Music Chart Leaderboard")

    r.delete("chart:weekly")

    # TODO: implement this
    # HINT:
    #   1. r.zadd("chart:weekly", {"song_a": 1200, "song_b": 800, ...})
    #   2. r.zrevrange("chart:weekly", 0, 2, withscores=True) → top 3
    #      (ZREVRANGE = highest first; ZRANGE = lowest first)
    #   3. r.zincrby("chart:weekly", 800, "song_b") → add 800 to song_b's score
    #   4. r.zscore("chart:weekly", "song_b") → get song_b's new score
    #   5. r.zrevrank("chart:weekly", "song_b") → 0-indexed rank, add 1 for human rank
    top3 = []
    song_b_score = 0
    song_b_rank = 0

    check("Top 3 has 3 entries", len(top3) == 3)
    check("#1 is song_c (1500 plays)", len(top3) > 0 and top3[0][0] == "song_c" and top3[0][1] == 1500)
    check("song_b new score = 1600", int(song_b_score) == 1600,
          f"Expected 1600, got {int(song_b_score) if song_b_score else 0}")
    check("song_b is now #1", song_b_rank == 1,
          f"After +800 plays, song_b has 1600 pts and should be rank #1, got rank #{song_b_rank}")
    r.delete("chart:weekly")


# ===========================================================================
# EXERCISE 8: DESIGN CHALLENGE — "Recently Viewed Products"
# ===========================================================================

def exercise_8_design():
    """
    Task: Design a "Recently Viewed Products" feature.
    Requirements:
    - Store the last 5 products a user viewed
    - Most recent first
    - If a user views the same product twice, it should MOVE TO THE TOP
      (not appear twice!)
    - The test simulates these views in order:
      sku:100, sku:200, sku:300, sku:200 (again!), sku:400
    """
    print("\n📝 Exercise 8: DESIGN CHALLENGE — Recently Viewed Products")

    r.delete("user:500:recent_views")

    views = ["sku:100", "sku:200", "sku:300", "sku:200", "sku:400"]

    # TODO: implement this
    # HINT: For EACH sku in views:
    #   1. r.lrem(list, 0, sku)  — remove ALL existing occurrences of this sku
    #      (the 0 means "all occurrences", not "0 items")
    #   2. r.lpush(list, sku)    — push it to the front (most recent)
    #   3. r.ltrim(list, 0, 4)   — cap at 5 items (indexes 0 through 4)
    #   Then r.lrange to get the final list.
    result = []

    check("List has at most 5 items", len(result) <= 5)
    check("Most recent is first (sku:400)", len(result) > 0 and result[0] == "sku:400",
          f"Expected sku:400 first, got {result[0] if result else 'nothing'}")
    check("No duplicates", len(result) == len(set(result)),
          f"Found duplicates in {result}")
    r.delete("user:500:recent_views")


# ===========================================================================
# EXERCISE 9: THINKING — Choose the Right Data Structure
# ===========================================================================

def exercise_9_thinking():
    """
    No code for this one. For each scenario below, decide which Redis data
    structure fits best and WHY. Write your answers, then compare with the
    suggested answers printed after.
    """
    print("\n📝 Exercise 9: THINKING — Choose the Right Data Structure")
    print()
    print("  For each scenario, pick ONE data structure and explain why:")
    print()
    print("  A) Store user session data (user ID, login time, IP address)")
    print("     that expires after 2 hours of inactivity.")
    print("     Your answer: ___")
    print()
    print("  B) Track which users 'liked' a post. Need fast check:")
    print("     'has user X liked post Y?'")
    print("     Your answer: ___")
    print()
    print("  C) Store the last 10 chat messages in a room, newest first.")
    print("     Your answer: ___")
    print()
    print("  D) Rank blog posts by (claps×2 + comments×3), show top 10.")
    print("     Your answer: ___")
    print()
    print("  ── Write your answers above, then scroll down ──")
    print()
    print("  Suggested answers:")
    print("  A) Hash + TTL  — HSET for structured fields, EXPIRE for auto-cleanup")
    print("  B) Set         — SADD/SISMEMBER is O(1), perfect for membership checks")
    print("  C) List        — LPUSH + LTRIM gives a natural capped newest-first list")
    print("  D) ZSet        — ZADD with computed score, ZREVRANGE for ranked top 10")
    print()
    print("  💡 Did you match? For any you got wrong, ask: what made the")
    print("     suggested structure a BETTER fit than your choice?")


# ===========================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  Redis Stage 1 — MY HOMEWORK")
    print("=" * 60)

    try:
        r.ping()
    except redis.ConnectionError:
        print("❌ Cannot connect to Redis.")
        print("   Run: docker compose -f Computer/Redis/stage-1/docker-compose.yml up -d")
        sys.exit(1)

    exercise_1_strings()
    exercise_2_counter()
    exercise_3_queue()
    exercise_4_capped_list()
    exercise_5_sets()
    exercise_6_hashes()
    exercise_7_zset()
    exercise_8_design()
    exercise_9_thinking()

    print()
    print("=" * 60)
    print(f"  Results: {passed} passed, {failed} failed out of {passed + failed} tests")
    print("=" * 60)

    if failed > 0:
        print("\n💡 Stuck?")
        print("  - Read the hints above each exercise")
        print("  - Check the matching section in tutorial.py")
        print("  - Experiment in redis-cli first:")
        print("    docker compose -f Computer/Redis/stage-1/docker-compose.yml exec redis redis-cli")
        print("  - Redis commands reference: https://redis.io/commands/")
    else:
        print("\n🎉 All exercises passed! Ready for Stage 2 when you are.")
