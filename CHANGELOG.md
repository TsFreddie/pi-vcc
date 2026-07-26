# Changelog

All notable changes to `@sting8k/pi-vcc` are documented in this file.

## [0.5.0]

### Changes

- **`overrideDefaultCompaction` now defaults to `true`** — fresh installs let pi-vcc handle `/compact` and auto-threshold/overflow compaction, not just `/pi-vcc`. Existing config files keep their stored value; set `false` to restore pi core's LLM-based compaction for those paths.

### Fixes

- **File activity: case-insensitive tool matching** — `FILE_READ_TOOLS`/`FILE_WRITE_TOOLS`/`FILE_CREATE_TOOLS` were exact-match sets, so Pi's lowercase `read` tool never registered and `[Files And Changes]` emitted no `Read:` line at all (0 of 179 audited sessions produced one). Matching is now case-insensitive, mirroring the `/i` tool regexes in `core/rank.ts`.
- **File activity: recognise modern edit tools** — `quick_edit`, `target_edit` and `apply_patch` are ranked as edits in `src/core/rank.ts` but were missing from `FILE_WRITE_TOOLS`, so files changed through them never appeared under `Modified:`.
- **File activity: use hook-provided file ops** — `buildSections` never received `CompileInput.fileOps`, so the hook's authoritative read/modified sets were dropped before the summary was built. `extractFiles` already accepted the argument; it is now wired through.
- **Recall search: guard against regex backtracking** — a query such as `(a+)+$` made `searchEntries` spend ~0.5s per entry, freezing a 400-entry session for ~3.5 minutes. Patterns with an unbounded quantifier applied to a group that already contains one are now matched literally, and a 3s wall-clock budget aborts any search that still runs away (normal searches take ~10ms). Same corpus and query: 3.5 min → 0.7ms.
- **Recall search: don't lose results to mode detection** — `looksLikeRegex` treats any query containing `?`, `.`, `(`, `|` etc. as a single regex, so ordinary prose ("why did we drop the cache?") was matched verbatim and returned nothing. Measured across 584 real recall calls: the regex path returned zero results 47.5% of the time (median 1 hit) versus 1.1% for term search (median 98 hits), and 25.9% of queries were routed there. An empty regex result now falls through to term search instead of being returned as-is.
- **Recall tool: describe it as recall, not search** — the tool description led with "Search session history" and advertised regex, so the model filed it under keyword search and wrote regex-style queries (8.8% of 510 real queries contained `|`) instead of reaching for it when context was missing. Description, prompt snippet and parameter docs now say what it is for, prefer plain keywords, explain `scope` without internal jargon, and state plainly that only the current session is searchable. No behaviour change.

Audit on 790 real sessions: weighted recall 63.6% → 74.5% (median 68.2% → 79.3%), weighted fact density 6.00 → 7.08, summary size +6% (4183 → 4433 chars).

## [0.4.0]

### Features

- **Ranked compaction brief** — replace the fixed 120-line summary cap with signal-density-based block selection under a size-relative token budget (floor/ceiling/per-block clamp). On 794 real sessions: size parity with the old cap, recall +2.4pp, gh-recall +7pp, higher fact density.
- **Size-relative brief budget** — `maxBriefChars` now scales with transcript length between a floor (~1100 tok) and ceiling (~2000 tok) at ~15 tok/block, so large sessions are no longer starved of high-value long-tail blocks while small sessions stay tight.
- **Heredoc previews in brief** — multi-line bash (set -euo pipefail + real work) and interpreter heredocs (python3/node/ssh/sqlite3/...) now render a one-line body preview instead of a content-free opener. File-writer heredocs (cat/tee/dd) stay opener-only.
- **Hardened heredoc parsing** — tighten opener regex to reject shift ops (`8<<20`) and numeric heredocs; only treat as heredoc when a closing terminator exists downstream. Misparse rate ≤0.17% across ~105k bash blocks, fail-safe.
- **Trivial-bash penalty** — scaffolding-only bash blocks (set -e, cd, ls, echo) no longer compete with real edits for the brief budget. Failed commands (nonzero exit) are exempt since the failure is itself a state fact.
- **Segment-closing assistant boost** — assistant turns that close a segment (next renderable block is user or EOF) get a +14 score boost and 120+120 head/tail truncation instead of the old head-only budget.
- **Smart keep-tail** — when `smartKeepTail` is enabled (default true), pi-vcc estimates the keep:1 tail token count and, if ≤5k, grows keep to the largest N whose tail stays ≤25k. Explicit `keep:N` from the user is always respected.
- **Auto-continue after compaction** — continue the agent after a successful threshold compaction or overflow compaction, deferred until idle so it doesn't interrupt in-flight tool calls.
- **Token calibration from context usage** — calibrate chars/token from the real `tokensBefore` reported by the harness instead of a hardcoded heuristic, so estimates adapt to each session's content mix.

### Fixes

- **Token estimate: count all token-bearing parts** — `estimateMessageContentChars` now counts `thinking`, `toolCall.arguments` (not just `.input`), and `image` (4800 chars). Previously these were missed, deflating calibrated chars/token (mean 2.35→2.50) and over-estimating tail tokens. Fixes smart-keep engagement and brief budget sizing.
- **Brief budget: charge preserve-recent blocks** — the newest `preserveRecentBlocks` are now charged against `maxBriefChars` instead of being added unconditionally. On the largest real session (~27.9k blocks) the ranked brief was 31% larger than baseline with zero recall gain; `maxBriefChars` is now a true ceiling.
- **Notify format tightened** — compaction notify now shows `kept N/M turns, ~Xk tok (summarized Y)` instead of verbose source-entry counts and mechanism wording. Anomalies (compact-all fallback) collapse to `kept 0/N` with no extra clause.
- **Notify retained with follow-up** — compact metrics notify is no longer swallowed when a pi-vcc follow-up prompt is queued.
- **Brief: preserve message line breaks** — assistant text line breaks are no longer collapsed in the brief render.
- **Exclude tool_result from selection** — `tool_result` blocks no longer consume brief selection budget since they render to nothing.
- **gh pr poll penalty/dedup** — `gh pr view/checks <num>` polling commands get -10 penalty and are deduplicated by PR number; `gh pr merge/create/comment` are not penalized.
- **Continuation timing** — threshold continuation deferred until idle; overflow compaction continuation fixed.
- **Misc** — greptile review nits addressed; smart-keep tests aligned with compact-all boundary.

### Documentation

- Add runnable benchmark template (`benchmarks/benchmark.ts`) with fact model, category weights, and paired recall scoring vs 0.3.18 baseline.
- Add benchmarks writeup (`benchmarks/README.md`) documenting the scoring model, size-relative budget params, and results on a public HF session dataset plus held-out local sessions.
- Restructure usage and recall sections in README; add config field documentation.