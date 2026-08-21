# Corpus Release-Risk Audit

Generated: 2026-08-21T06:19:31.861Z

This is a release-gate summary for the current `v0.1.2` source candidate. The full generated audit remains a local build artifact; this committed summary keeps the README's release status and unresolved review scope visible on GitHub.

## Scope

- Manifest records: 1,924
- Unique PDF bodies: 1,846
- Flagged documents: 245
- High-risk documents: 226
- Medium-risk documents: 19
- Approved publication decisions: 245
- Unresolved human decisions: 0

The scanner checks public-source PDF structure, byte size, SHA-256, managed storage path, source host, and heuristic indicators such as sealing language, protective-order language, account or routing numbers, and identity-document numbers. A heuristic finding is not a legal conclusion and automated screening is not page-by-page legal review.

## Review Resolution

The final five findings received an explicit publisher decision of `approved_public`. Their screening indicators remain recorded for provenance and future review:

| Case | Document | Screening indicator | Decision |
| --- | ---: | --- | --- |
| `bkd-22-05032` | 205 | Explicit sealed or restricted-document language | `approved_public` |
| `bkd-22-05032` | 206 | Explicit sealed or restricted-document language | `approved_public` |
| `ca2-26-563-dx` | 50 | Explicit sealed or restricted-document language | `approved_public` |
| `sdny-23-cr-118` | 859 | Possible account or routing numbers | `approved_public` |
| `sdny-23-cv-2200` | 68 | Sealing/restricted language and possible passport or license number | `approved_public` |

The complete reviewer identity, date, public-source posture, legal-basis statement, rationale, retained screening indicators, and content hashes are recorded in [`corpus-review-decisions.json`](corpus-review-decisions.json). The decisions authorize inclusion in this release; they do not convert the automated indicators into legal conclusions.
