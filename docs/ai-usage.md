# How we used AI

ETHGlobal asks for this. Everything below was done at the event, from scratch.

| Area | Tool | What the tool did | What we did |
|---|---|---|---|
| Idea, scoring, sponsor fit | Claude Code | Researched redemption terms, NAV feeds, Arc and Arkiv docs; scored candidate ideas | Chose the idea, the three tracks and the cut order |
| `contracts/src`, `contracts/test`, `contracts/script` | Claude Code wrote the first draft; Arc Studio installed dependencies, ran the suite, ran its security scan and fixed findings | Wrote Solidity, tests, deploy script | Wrote the spec and interface, reviewed every contract, decided the pricing formula, caps, halts and the writedown mechanism |
| Arc Studio prompts | Claude Code drafted, we sent | See `docs/studio/` | Edited and approved each prompt |
| `web/` | Claude Code | Next.js app, API routes, Arkiv indexer, NAV pusher, Playwright tests | Design direction (Apple-style system, verdict-first screens), review, manual testing |
| `cre/nav-bridge` | Claude Code from the CRE docs | Workflow code and config | Ran the simulation, set the forwarder |
| `arkiv/*.md`, `docs/*.md`, README | Claude Code | Drafts | Edited for accuracy; the friction log entries are real snags we hit |

No code was copied from earlier projects. Private keys were never shown to any tool.
