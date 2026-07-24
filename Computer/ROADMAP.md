# Computer Science Learning Roadmap

Status: `todo` | `doing` | `done`

---

## Foundational Layer

1. [ ] **Data Structures** `todo`
   - Arrays, Linked Lists, Stacks, Queues
   - Hash Tables
   - Trees (Binary Tree, BST, Trie, Heap)
   - Graphs (DFS, BFS, Topological Sort)

2. [ ] **Algorithm** `todo`
   - Sorting (Quick, Merge, Heap, Counting)
   - Searching (Binary Search, Two Pointers)
   - Recursion & Backtracking
   - Dynamic Programming
   - Greedy
   - Sliding Window

3. [ ] **Concurrency & Parallelism** `todo`
   - Processes vs Threads
   - Mutex, Semaphore, Lock
   - Async/Await & Event Loop
   - Actor Model, CSP

---

## Systems & Infrastructure

4. [ ] **DNS** `doing`
   - How DNS resolution works
   - Record types (A, CNAME, MX, TXT, NS)
   - Caching, TTL, propagation
   - DNSSEC, DNS over HTTPS

5. [ ] **Git** `todo`
   - Objects (blob, tree, commit, tag)
   - Branching, merging, rebasing
   - Staging area internals
   - Reflog, bisect, cherry-pick

6. [ ] **Nginx** `todo`
   - Reverse proxy & load balancing
   - Static file serving
   - SSL termination
   - Caching, rate limiting

7. [ ] **PostgreSQL / Database** `todo`
   - Indexing (B-Tree, Hash, GIN, GiST)
   - Query planning & EXPLAIN ANALYZE
   - Transactions & isolation levels
   - Normalization vs Denormalization
   - Connection pooling

8. [ ] **Redis** `todo`
   - Data structures (String, Hash, List, Set, Sorted Set, Stream)
   - Caching strategies (Cache-Aside, Write-Through)
   - Pub/Sub & Message Queues
   - Persistence (RDB, AOF)

---

## Languages & Frameworks

9. [ ] **Ruby** `todo`
   - Object model, mixins, blocks
   - Metaprogramming
   - Enumerable, fibers, refinements
   - Ractors for concurrency

10. [ ] **Rust** `todo`
    - Ownership, borrowing, lifetimes
    - Traits & generics
    - Error handling (Result, Option)
    - Async (tokio), unsafe Rust

11. [ ] **Rails** `doing`
    - MVC, routing, middleware stack
    - ActiveRecord (associations, scopes, migrations)
    - Hotwire (Turbo, Stimulus)
    - Background jobs (Solid Queue / Sidekiq)
    - Caching & performance

12. [ ] **React** `todo`
    - Component model & JSX
    - Hooks (useState, useEffect, useMemo, useCallback)
    - State management (Context, Reducer)
    - Rendering lifecycle & reconciliation
    - Server Components (Next.js)

---

## Specialized

13. [ ] **Machine Learning** `todo`
    - Supervised vs Unsupervised vs RL
    - Train/Val/Test split, bias-variance tradeoff
    - Neural networks basics
    - Embeddings & RAG
    - Practical: build a small model end-to-end

---

## Learning Rules

- **One topic at a time.** Finish foundational before jumping to frameworks.
- **Output-driven.** Each topic produces notes, code, or a mini-project.
- **Teach what you learn.** Write in English, explain the *why*.
- **4-Layer framework** (Why → Core → Trade-offs → Sandbox) for each topic.
