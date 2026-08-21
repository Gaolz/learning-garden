---
title: "Chapter 23 — Evaluate the Abstraction"
type: code-reading-chapter
status: draft
parent: ../README.md
tags: [ruby, http, architecture, trade-offs, httparty]
---

# Chapter 23 — Evaluate the Abstraction

> **Goal:** Decide when HTTParty’s convenience is worth its implicit behavior.

## What HTTParty buys

```text
Net::HTTP mechanisms
        +
configuration DSL
option normalization
URI/query/body policy
redirect/auth handling
response normalization
parser selection
facade delegation
        =
HTTParty client experience
```

The abstraction reduces repeated policy code, not the fundamental complexity of
HTTP. That complexity reappears at edge cases and production boundaries.

## Decision matrix

| Situation | HTTParty fit | Reason |
|---|---|---|
| Small JSON API wrapper | Strong | Concise defaults and parsed responses |
| Teaching raw HTTP mechanics | Weak initially | Hides connection/request boundaries |
| Large uploads/downloads | Conditional | Streaming behavior needs deliberate use/testing |
| Complex retry/circuit breaking | Conditional | Requires external policy or customization |
| High-throughput connection reuse | Investigate | Default adapter creates connections per call |
| Unusual transport stack | Conditional | Custom adapter can help, but compatibility burden moves to you |
| Tiny one-off standard-library script | Maybe unnecessary | Net::HTTP convenience may be enough |

## Abstraction leaks

An abstraction leaks when correct use requires knowledge below it. Examples:

- Net::HTTP request/response classes appear in public construction and results.
- TLS, proxies, and timeouts retain Net::HTTP semantics.
- HTTP redirect method rules affect request behavior.
- Parser errors expose JSON/XML libraries.
- Streaming requires understanding body chunks and connection lifetime.

Leaks are not automatically defects. HTTP clients cannot safely erase protocol
semantics that callers must sometimes control.

## Production checklist

| Area | Questions |
|---|---|
| Timeouts | Are open/read/write values explicit and realistic? |
| TLS | Is verification enabled? Are custom CAs managed safely? |
| Secrets | Are auth/cookies redacted and stripped cross-origin? |
| Status policy | Which codes return values, raise, or retry? |
| Retry | Are methods idempotent, bodies replayable, attempts bounded? |
| Redirects | Are method changes and destination trust acceptable? |
| Parsing | Are size, MIME mismatch, and malformed bodies handled? |
| Streaming | Who owns partial files and cleanup? |
| Logging | Can logs expose URLs, headers, bodies, or personal data? |
| Concurrency | Is class configuration immutable after boot? |
| Observability | Can latency be separated into attempts and status classes? |
| Connection use | Is the default connection lifecycle sufficient for load? |

## Cost model

```text
total client cost
= application code
+ library concepts
+ hidden behavior debugging
+ operational failure handling
+ upgrade compatibility
```

Fewer application lines do not necessarily mean lower total complexity.

## Anti-patterns

1. **No explicit timeouts** — remote slowness controls your resources.
2. **Rescue everything** — protocol, transport, and programming errors collapse.
3. **Blind retries** — side effects or load multiply.
4. **Disable TLS verification** — connectivity is purchased with lost identity.
5. **Assume every success is JSON** — metadata and body can disagree.
6. **Mutate client configuration during traffic** — requests become race-dependent.
7. **Treat response as a Hash only** — status and headers disappear from reasoning.

## Evaluation exercise

Choose one real API and score 1–5:

| Dimension | Weight | Score | Evidence |
|---|---:|---:|---|
| Development simplicity | 2 | | |
| HTTP feature fit | 3 | | |
| Failure-policy fit | 3 | | |
| Performance/connection fit | 2 | | |
| Observability | 2 | | |
| Team familiarity | 1 | | |

Compare HTTParty with direct Net::HTTP and any alternative already approved by
your project. The answer is contextual, not universal.

## Mental sandbox

1. Which HTTParty behaviors remain impossible to understand without HTTP?
2. When does a custom adapter reduce versus increase complexity?
3. What is the operational cost of response-facade convenience?
4. Which checklist failures would block production launch?

## Teach-back

> Evaluate an HTTP abstraction by total lifecycle cost—development, semantics,
> failures, security, performance, and operations—not by request-line brevity.

