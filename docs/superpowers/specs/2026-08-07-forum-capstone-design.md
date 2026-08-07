# Forum Capstone — Design Doc

> One ambitious project to go beyond CRUD. Build a discussion forum from scratch.

**Status:** Design | **Date:** 2026-08-07 | **Stack:** Rails 8 + Hotwire + PostgreSQL

---

## 1. Why This Project

CRUD work = forms over tables. Same patterns, zero growth. Real skill comes from:

- **Data modeling beyond `belongs_to`** — trees, polymorphic associations, denormalization, full-text indexes
- **Performance thinking** — N+1 elimination, counter caches, query plans, caching layers
- **Real-time architecture** — WebSocket lifecycle, broadcast patterns, optimistic UI
- **Operations** — deploy, monitor, debug in production, background job reliability

A forum forces all of these in one cohesive product. No artificial exercises. Every feature has real user value and real technical depth.

---

## 2. MVP Scope

**v1 ships with:** auth, topic CRUD, post replies, categories, deploy to VPS.

Everything after v1 gets added one module at a time, each targeting a specific beyond-CRUD skill.

| Module | Skill Target |
|--------|-------------|
| Rich editor + image upload | Active Storage direct upload, Turbo Streams preview, image variants |
| Threaded/nested replies | Recursive CTEs, N+1 elimination, tree data in SQL |
| Full-text search | PostgreSQL `tsvector`, GIN index, trigram similarity, ranking |
| Real-time updates | Turbo Streams + Action Cable broadcast |
| Notifications | Solid Queue jobs, mailers, notification aggregation |
| Reactions/likes | Polymorphic associations, optimistic UI |
| Moderation + role system | Pundit policies, flagging workflow, audit trail |
| User reputation/badges | Gamification engine, background analytics |

---

## 3. Architecture

### Monolith, Single Repo, Single Deploy

Complexity comes from inside the monolith, not from distributed systems. One Rails app. All state in PostgreSQL. Async via Solid Queue. Real-time via Solid Cable.

### Data Model (Core)

```
users
  id, email, username, password_digest, avatar, bio, admin:bool, moderator:bool

categories
  id, name, slug, description, position, parent_id (self-referential)

topics
  id, title, slug, category_id, user_id, sticky:bool, locked:bool
  replies_count, views_count (counter caches)
  first_post_id, last_post_id (denormalized)

posts
  id, topic_id, user_id, parent_id, body:text, post_number (sequential per topic)
  search_vector:tsvector (generated column + GIN index)

reactions
  id, user_id, reactable_type, reactable_id, emoji

notifications
  id, user_id, actor_id, notifiable_type, notifiable_id, action, read:bool

flags
  id, user_id, flaggable_type, flaggable_id, reason, status
```

### Key Design Decisions

- **Flat display with `parent_id` threading.** Posts have sequential `post_number` per topic. `parent_id` enables reply context without deep-nested UI. Optional threaded view via recursive CTE.
- **Denormalized counters.** `topics.replies_count`, `categories.topics_count` avoid COUNT queries on hot listing pages.
- **Polymorphic reactions + notifications.** Real Rails `belongs_to :reactable, polymorphic: true`. Learn the trade-offs firsthand.
- **PostgreSQL full-text search.** `tsvector` generated column on posts, GIN index. No external search service. Learn `ts_headline`, ranking, trigram for typo tolerance.

### Frontend

- **Turbo Drive** — navigation, form submission, no SPA needed
- **Turbo Frames** — lazy-loaded sidebar stats, similar topics
- **Turbo Streams + Action Cable** — live new replies on topic page, notification badge update
- **Stimulus controllers** — rich editor (Trix), image upload preview, infinite scroll, reaction toggle, search autocomplete

### Infrastructure

- One VPS (Hetzner/DigitalOcean), Kamal deploy with zero-downtime
- Start SQLite, migrate to PostgreSQL when search/CTE features needed
- Solid Queue for async jobs, Solid Cable for WebSockets
- Error tracking, uptime monitoring, basic performance dashboards

---

## 4. Project Phases

### Phase 1: Scaffold & Deploy (Week 1-2)

Ship to VPS on day one. Auth, basic topic/post CRUD, CI passing.

- Rails 8 app with defaults
- User auth (`has_secure_password` or `authentication-zero`)
- Topic + Post models, Markdown rendering
- Kamal deploy to VPS, custom domain, SSL
- GitHub CI: tests, Standard lint, Brakeman

**Ship milestone:** Real users could register and post. Everything after is iteration.

### Phase 2: Categories & Rich Content (Week 3-4)

- Self-referential category tree, slugs, navigation
- Post editor with Markdown preview (Stimulus)
- Active Storage direct upload, image variants
- Counter caches for performance

**Skill:** Complex forms, Stimulus, Active Storage, counter cache patterns.

### Phase 3: Full-Text Search (Week 5-6)

- PostgreSQL full-text search (`pg_search` or raw `tsvector`)
- GIN index, `ts_headline` for excerpts
- Search UI with debounced autocomplete (Stimulus)

**Skill:** SQL beyond WHERE. Tokenization, stemming, ranking, GIN internals.

### Phase 4: Real-Time Replies (Week 7-8)

- Action Cable channel per topic
- Turbo Streams broadcast on post create
- Optimistic UI — show reply immediately, confirm from server

**Skill:** WebSocket lifecycle, broadcast vs unicast, stream actions.

### Phase 5: Notifications (Week 9-10)

- Polymorphic notification model
- Solid Queue job on post create/reply/reaction
- In-app notification dropdown (Turbo Frame lazy load)
- Email digest via `solid_queue_recurring`

**Skill:** Background jobs, mailer design, retry/failure handling.

### Phase 6: Reactions & Rich Threading (Week 11-12)

- Polymorphic emoji reactions with optimistic UI
- `posts.parent_id` threading with flat/threaded display toggle
- Recursive CTE for full thread tree fetch

**Skill:** Polymorphism trade-offs, recursive SQL, optimistic UI.

### Phase 7: Moderation & Roles (Week 13-14)

- Pundit authorization (user/moderator/admin)
- Flag workflow: flag → review → resolve/dismiss
- Audit trail on moderation actions
- Admin dashboard: user list, flag queue, site stats

**Skill:** Authorization beyond boolean checks. Policy objects. Audit logging.

### Phase 8: Reputation & Polish (Week 15+)

- Reputation engine triggered by post/reaction/flag events
- Badge system with milestone triggers
- Performance: query optimization, fragment caching, Russian Doll caching
- Monitoring: error rates, response times, queue depths

**Skill:** Caching strategies, analytics pipelines, production ownership.

---

## 5. Learning Resources Per Phase

| Phase | Resources |
|-------|-----------|
| 1 | Rails Guides (Getting Started, ActiveRecord Basics), Kamal docs |
| 2 | Rails Guides (Active Storage, Action View Form Helpers), Stimulus Handbook |
| 3 | PostgreSQL docs (Full-Text Search chapter), pg_search README |
| 4 | Hotwire Handbook (Turbo Streams), Action Cable guides |
| 5 | Solid Queue README, Action Mailer guides |
| 6 | Rails Guides (Polymorphic Associations), PostgreSQL recursive CTE docs |
| 7 | Pundit README, Rolify wiki |
| 8 | Rails Guides (Caching), Scout/AppSignal/rails-perftest |

---

## 6. Success Criteria

- **Deployed and usable by real people** (even if just 5-10)
- **Every phase's code understood deeply** — can explain the *why* behind each decision
- **Written notes per phase** — 4-layer framework (Why → Core → Trade-offs → Sandbox)
- **Posts are publicly visible** — writing as you build (blog/devlog style, English)
- **Production incident at least once** — debug a real problem under real conditions

---

## 7. Anti-Goals

- Perfection. Ship ugly, iterate.
- Feature parity with Discourse. This is a learning project, not a competitor.
- Premature optimization. Measure first, cache second.
- Microservices. Stay monolith. Complexity is elsewhere.
