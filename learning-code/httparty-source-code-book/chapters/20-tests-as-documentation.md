---
title: "Chapter 20 — Tests as Executable Documentation"
type: code-reading-chapter
status: draft
parent: ../README.md
source_version: v0.24.2
tags: [ruby, rspec, testing, httparty, source-code-reading]
---

# Chapter 20 — Tests as Executable Documentation

> **Goal:** Use specs to identify intended contracts, edge cases, and design seams.

## Why tests belong in source reading

Implementation answers “what does this version do?” Specs add:

```text
maintainer-selected behavior
+ regression cases
+ boundary examples
+ observable contracts
```

A test is evidence, not infallible specification. It can encode accidents or
miss behavior, so compare tests, source, docs, and protocol rules.

## Source-spec map

| Production area | Matching specs | Questions revealed |
|---|---|---|
| `request.rb` | `request_spec.rb` | URI, redirects, auth, response branches |
| `request/body.rb` | `request/body_spec.rb` | multipart bytes, filenames, binary data |
| streaming multipart | matching streaming spec | chunking, size, rewind, memory |
| `connection_adapter.rb` | adapter and SSL specs | precedence and TLS configuration |
| `parser.rb` | `parser_spec.rb` | formats, empty bodies, BOM, errors |
| `response.rb` | `response_spec.rb` | delegation, predicates, laziness, headers |
| small policy objects | same-named specs | focused unit contracts |

## Reading loop

```mermaid
flowchart LR
    Q[Choose behavior question] --> S[Search specs]
    S --> P[Predict result]
    P --> R[Run focused example]
    R --> I[Read implementation path]
    I --> M[Mutate input/expectation]
    M --> N[Write learning note]
```

Useful commands:

```bash
rg 'redirect|setup_raw_request|parsed_response' spec/httparty
bundle exec rspec spec/httparty/request_spec.rb
bundle exec rspec spec/httparty/request_spec.rb:LINE
bundle exec rake
```

## Test doubles reveal seams

The specs frequently replace the connection/response instead of using the live
internet. This exposes architectural seams:

```text
Request → connection adapter → object responding to request
Parser  → callable body/format contract
Response → fabricated Net::HTTPResponse + parser lambda
```

If a component is easy to fake at a boundary, that boundary is likely part of
the design.

## Read test names as a catalog

Do not start by reading every setup line. Extract `describe`, `context`, and `it`
descriptions to build a behavior index, select one question, then read only the
relevant setup and assertions.

## Trade-offs

| Test style | Strength | Limitation |
|---|---|---|
| Focused unit spec | Precise and fast | Can mock away integration bugs |
| WebMock request spec | Verifies HTTP-shaped interaction | Not a real socket/TLS stack |
| End-to-end server test | Exercises integration | Slower and harder to make deterministic |
| Private-method spec | Pinpoints algorithm | Couples test to implementation |

Use a testing pyramid across these levels rather than expecting one style to
prove everything.

## Experiments

Choose one surprising spec—for example lazy parsing on a 500. Predict, run it,
temporarily make parsing eager, observe failure, and restore the source. Then
explain which user contract the test protects.

## Mental sandbox

1. What can a mocked connection never prove?
2. Why do regression tests often reveal design history?
3. When is testing a private method justified during source study?
4. How do you distinguish intentional contract from incidental assertion?

## Build It

Give each `MiniParty` milestone unit tests and add one local integration server
test for the full request/response path. Never depend on a public internet API
for the core suite.

## Teach-back

> Read tests as an executable behavior index: use them to discover contracts,
> then verify that their doubles and assertions actually cover the boundary you care about.

## Primary source

- [HTTParty specs](https://github.com/jnunemaker/httparty/tree/v0.24.2/spec/httparty)
- [Request specs](https://github.com/jnunemaker/httparty/blob/v0.24.2/spec/httparty/request_spec.rb)
- [Response specs](https://github.com/jnunemaker/httparty/blob/v0.24.2/spec/httparty/response_spec.rb)

