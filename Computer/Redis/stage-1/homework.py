#!/usr/bin/env python3
"""
Redis Stage 1 — HOMEWORK: Hands-on Exercises
=============================================

After running tutorial.py, complete these exercises to solidify your
understanding. Each exercise is a function with a TODO for you to fill in.

To check your work:
    python homework.py

Prerequisites:
    docker compose up -d
    source ../.venv/bin/activate
"""

import redis
import time
import sys

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

passed = 0
failed = 0


def check(name: str, condition: bool, hint: str = ""):
    """Test helper — prints ✅ or ❌ for each exercise."""
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
    - Store the value with a 30-second TTL.
    - Retrieve it and verify it exists.
    - Delete it.
    Expected: The value is stored, retrievable, then deleted.
    """
    print("\n📝 Exercise 1: STRINGS — Simple Cache")

    # --- YOUR CODE HERE ---
    # 1. SET key "cache:homepage" to value "<html>Welcome!</html>" with a 30s TTL
    # 2. GET the key and store it in a variable
    # 3. DELETE the key
    # -------------------------
    r.set("cache:homepage", "<html>Welcome!</html>", ex=30)
    value = r.get("cache:homepage")
    r.delete("cache:homepage")
    # -------------------------

    check("Value stored correctly", value == "<html>Welcome!</html>",
          "Use r.set('cache:homepage', '<html>Welcome!</html>', ex=30) then r.get('cache:homepage')")


# ===========================================================================
# EXERCISE 2: STRINGS — Atomic counter for vote tracking
# ===========================================================================

def exercise_2_counter():
    """
    Task: Track upvotes and downvotes atomically.
    - Initialize a counter to 0
    - Increment it 3 times
    - Expected: counter == 3
    """
    print("\n📝 Exercise 2: STRINGS — Vote Counter")

    r.delete("post:1:upvotes")
    # --- YOUR CODE HERE ---
    # 1. SET "post:1:upvotes" to 0
    # 2. INCR it 3 times (use a loop or three INCR calls)
    # 3. GET the final count
    # -------------------------
    r.set("post:1:upvotes", 0)
    r.incr("post:1:upvotes")
    r.incr("post:1:upvotes")
    r.incr("post:1:upvotes")
    count = int(r.get("post:1:upvotes"))
    # -------------------------

    check("Counter == 3", count == 3,
          "Use r.set('post:1:upvotes', 0) then r.incr() three times")
    r.delete("post:1:upvotes")


# ===========================================================================
# EXERCISE 3: LISTS — Build a task queue (FIFO)
# ===========================================================================

def exercise_3_queue():
    """
    Task: Simulate a task processing queue.
    - Push 3 tasks: "task-a", "task-b", "task-c"
    - Pop them one at a time in FIFO order (first in, first out)
    - Expected order: "task-a", "task-b", "task-c"
    """
    print("\n📝 Exercise 3: LISTS — Task Queue (FIFO)")

    r.delete("queue:tasks")
    # --- YOUR CODE HERE ---
    # Push 3 tasks to a queue, then pop them in order.
    # HINT: For FIFO, use RPUSH (add to right) and LPOP (pop from left).
    #       Or LPUSH + RPOP — think about which end is which!
    # -------------------------
    r.rpush("queue:tasks", "task-a", "task-b", "task-c")
    t1 = r.lpop("queue:tasks")
    t2 = r.lpop("queue:tasks")
    t3 = r.lpop("queue:tasks")
    # -------------------------

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
    - Add 5 queries one at a time
    - After each add, trim list to 3 items
    - Expected: final list contains the last 3 queries added
    """
    print("\n📝 Exercise 4: LISTS — Capped Recent Searches")

    r.delete("recent:searches")
    # --- YOUR CODE HERE ---
    # Add these 5 queries: "redis", "python", "docker", "k8s", "terraform"
    # After each LPUSH, LTRIM to keep only 3 items (indexes 0 to 2)
    # Then get the final list with LRANGE 0 -1
    # -------------------------
    for query in ["redis", "python", "docker", "k8s", "terraform"]:
        r.lpush("recent:searches", query)
        r.ltrim("recent:searches", 0, 2)
    result = r.lrange("recent:searches", 0, -1)
    # -------------------------

    check("List has exactly 3 items", len(result) == 3,
          f"Got {len(result)} items, expected 3")
    check("Newest item first", result[0] == "terraform",
          f"Expected 'terraform' first, got {result[0]}")
    check("Oldest items dropped", "redis" not in result and "python" not in result,
          "redis and python should have been trimmed out")
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

    # --- YOUR CODE HERE ---
    # The user wants articles tagged BOTH "python" AND "backend".
    # How do you find which articles have BOTH tags?
    # HINT: You need to check membership first, or use a different approach...
    #       SINTER finds common elements across sets. But what sets should you
    #       intersect? Think about it — the sets are per-article, not per-tag.
    #
    #       A better design for this query: maintain inverted index sets
    #       (tag:python → {article IDs}). But for this exercise, use SISMEMBER.
    # -------------------------
    matches = []
    for article_id in [1, 2, 3]:
        key = f"article:{article_id}:tags"
        if r.sismember(key, "python") and r.sismember(key, "backend"):
            matches.append(f"article:{article_id}")
    # -------------------------

    check("Found article:1", "article:1" in matches)
    check("Found article:2", "article:2" in matches)
    check("NOT article:3", "article:3" not in matches,
          "article:3 doesn't have both 'python' AND 'backend'")

    # --- BONUS THINKING ---
    # This approach requires checking every article (O(n)).
    # For better performance with many articles, you'd create inverted index
    # sets: tag:python → {1, 2}, tag:backend → {1, 2}, then SINTER them!
    # This is a key design trade-off in Redis data modeling.

    r.delete("article:1:tags", "article:2:tags", "article:3:tags")


# ===========================================================================
# EXERCISE 6: HASHES — User profile with partial update
# ===========================================================================

def exercise_6_hashes():
    """
    Task: Manage a user profile with partial updates.
    - Create user:300 with name, email, city
    - Update only the email (not the whole profile)
    - Increment a "visits" counter
    - Retrieve all fields
    """
    print("\n📝 Exercise 6: HASHES — User Profile")

    r.delete("user:300")
    # --- YOUR CODE HERE ---
    # 1. HSET user:300 with mapping: name="Carol", email="carol@old.com", city="NYC"
    # 2. HSET to update ONLY email to "carol@new.com"
    # 3. HINCRBY visits by 5
    # 4. HGETALL to get the final profile
    # -------------------------
    r.hset("user:300", mapping={"name": "Carol", "email": "carol@old.com", "city": "NYC"})
    r.hset("user:300", "email", "carol@new.com")
    r.hincrby("user:300", "visits", 5)
    profile = r.hgetall("user:300")
    # -------------------------

    check("Name is Carol", profile.get("name") == "Carol")
    check("Email updated", profile.get("email") == "carol@new.com",
          "Use HSET to update a single field")
    check("Visits = 5", profile.get("visits") == "5",
          "Use HINCRBY to increment a field atomically")
    check("City preserved", profile.get("city") == "NYC",
          "HSET only updates the fields you specify — others stay unchanged")
    r.delete("user:300")


# ===========================================================================
# EXERCISE 7: ZSETs — Leaderboard
# ===========================================================================

def exercise_7_zset():
    """
    Task: Build a music chart leaderboard.
    - Add songs with play counts as scores
    - Get the top 3
    - Increment one song's plays and check its new rank
    """
    print("\n📝 Exercise 7: ZSETs — Music Chart Leaderboard")

    r.delete("chart:weekly")
    # --- YOUR CODE HERE ---
    # 1. ZADD these songs:
    #    song_a: 1200 plays, song_b: 800 plays, song_c: 1500 plays,
    #    song_d: 950 plays, song_e: 1100 plays
    # 2. ZREVRANGE WITHSCORES to get top 3 (highest scores first)
    # 3. ZINCRBY song_b by 800 plays (it went viral!)
    # 4. ZSCORE song_b to get its new score
    # 5. ZREVRANK song_b to get its new ranking
    # -------------------------
    r.zadd("chart:weekly", {
        "song_a": 1200, "song_b": 800, "song_c": 1500,
        "song_d": 950, "song_e": 1100,
    })
    top3 = r.zrevrange("chart:weekly", 0, 2, withscores=True)
    r.zincrby("chart:weekly", 800, "song_b")
    song_b_score = r.zscore("chart:weekly", "song_b")
    song_b_rank = r.zrevrank("chart:weekly", "song_b") + 1  # 0-indexed → 1-indexed
    # -------------------------

    check("Top 3 has 3 entries", len(top3) == 3)
    check("#1 is song_c (1500 plays)", top3[0][0] == "song_c" and top3[0][1] == 1500)
    check("song_b new score = 1600", int(song_b_score) == 1600,
          f"Expected 1600, got {int(song_b_score)}")
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
    - If a user views the same product twice, it should move to the top
      (not appear twice)
    - Extra challenge: also store the timestamp of when each product was viewed

    Fill in the implementation below.
    """
    print("\n📝 Exercise 8: DESIGN CHALLENGE — Recently Viewed Products")

    r.delete("user:500:recent_views")

    # Simulate: user views these products in order
    views = ["sku:100", "sku:200", "sku:300", "sku:200", "sku:400"]

    # --- YOUR CODE HERE ---
    # Implement the "recently viewed" logic.
    # HINTS:
    #   - LREM can remove a specific element from a list (so you don't get dupes)
    #   - Then LPUSH the new view to the front
    #   - Then LTRIM to cap at 5
    # -------------------------
    for sku in views:
        r.lrem("user:500:recent_views", 0, sku)  # remove all occurrences
        r.lpush("user:500:recent_views", sku)     # push to front
        r.ltrim("user:500:recent_views", 0, 4)    # cap at 5 items
    result = r.lrange("user:500:recent_views", 0, -1)
    # -------------------------

    check("List has at most 5 items", len(result) <= 5)
    check("Most recent is first (sku:400)", result[0] == "sku:400",
          f"Expected sku:400 first, got {result[0]}")
    check("No duplicates", len(result) == len(set(result)),
          f"Found duplicates in {result}")
    r.delete("user:500:recent_views")


# ===========================================================================
# EXERCISE 9: THINKING — Choose the Right Data Structure
# ===========================================================================

def exercise_9_thinking():
    """
    No code for this one — just think through these scenarios and pick
    the right Redis data structure for each. Write your answers as comments.

    Scenario A: You need to store user session data (user ID, login time,
                IP address) that expires after 2 hours of inactivity.
    Scenario B: You need to track which users have "liked" a post, and
                quickly check if a specific user has liked it.
    Scenario C: You need to store the last 10 chat messages in a room,
                and always be able to get the newest messages first.
    Scenario D: You need to rank blog posts by (claps × 2 + comments × 3)
                and always show the top 10.
    """
    print("\n📝 Exercise 9: THINKING — Choose the Right Data Structure")

    print("  Think through these scenarios (check your answers below):")
    print("  A) User session → Hash with TTL (HSET + EXPIRE)")
    print("  B) Post likes    → Set (SADD + SISMEMBER, O(1) membership check)")
    print("  C) Chat messages  → List (LPUSH + LTRIM capped list)")
    print("  D) Blog ranking   → ZSet (ZADD with computed score, ZREVRANGE for top 10)")
    print()
    print("  💡 Did you match? If not, think about WHY the suggested structure fits better!")


# ===========================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  Redis Stage 1 — HOMEWORK")
    print("=" * 60)

    try:
        r.ping()
    except redis.ConnectionError:
        print("❌ Cannot connect to Redis. Run: docker compose up -d")
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
        print("\n💡 Tips:")
        print("  - Review the corresponding section in tutorial.py")
        print("  - Experiment in redis-cli: docker compose exec redis redis-cli")
        print("  - Redis commands reference: https://redis.io/commands/")
    else:
        print("\n🎉 All exercises passed! Ready for Stage 2 when you are.")
