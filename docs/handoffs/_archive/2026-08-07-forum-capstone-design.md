---
created: 2026-08-07T08:00:00Z
branch: mike
trigger: manual
restored: true
topic: forum-capstone-design
---

# Handoff: Forum Capstone Design — Beyond-CRUD Skill Building

## Goal
Design a project-based roadmap to break out of CRUD-level programming. User chose: one ambitious capstone project — a discussion forum built with Rails 8 + Hotwire + PostgreSQL, deployed on a VPS. Each feature module targets a specific beyond-CRUD skill.

## Current State
- Design doc written and committed: `docs/superpowers/specs/2026-08-07-forum-capstone-design.md`
- All 8 phases scoped with skill targets and learning resources
- Architecture decisions made: monolith, PostgreSQL full-text search, Action Cable real-time, Solid Queue jobs
- Data model designed with key decisions (denormalized counters, polymorphic reactions, tsvector search)
- User approved the design
- **Next step:** transition to writing-plans for Phase 1 implementation

## Key Decisions
- **Stack: Rails 8 + Hotwire + PostgreSQL** — user's existing Ruby knowledge, fastest path to shipping
- **One capstone, not progressive tiers or micro-projects** — deep mastery through real complexity
- **Start SQLite, migrate to PostgreSQL when search features needed** — reduces Phase 1 friction, teaches migration path
- **Forum (not blog/course platform/dev tool)** — hits most beyond-CRUD dimensions: real-time, search, file processing, authorization, performance
- **8 sequential phases, each 2 weeks** — ship v1 first (auth + topic CRUD + deploy), then iterate
- **VPS deploy via Kamal** — learn Linux admin, containers, zero-downtime deploy

## Modified Files
- `docs/superpowers/specs/2026-08-07-forum-capstone-design.md` (new, committed as 5cf76d0)

## Failed Approaches
None — design phase only.

## Files to Read
- `docs/superpowers/specs/2026-08-07-forum-capstone-design.md` — the full design doc
- `start.md` — learning philosophy and 4-layer framework
- `Gariel-Brain/RoadMap/Computer-Science-Roadmap.md` — existing CS roadmap for context on what's already planned

## Next Steps
1. User reviews design doc in Zed, confirms no changes needed
2. Invoke `superpowers-ruby:writing-plans` to create implementation plan for Phase 1 (Scaffold & Deploy)
3. Execute Phase 1: `rails new`, auth, topic/post CRUD, Kamal deploy to VPS

## Open Questions
- VPS provider? (Hetzner or DigitalOcean — user hasn't specified)
- Domain name for the forum?
- Any existing Rails 8 project to reference, or greenfield?
restored_at: 2026-08-07T02:25:26Z
