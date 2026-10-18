# PeriodGate proofs

**Network:** public gasless GenLayer StudioNet, chain **61999**. This is a StudioNet proof instance, not a Bradbury or mainnet deployment.

**Contract:** `0xb3BB25567B23258197c9b3b57428AaFBaf59a659`.

[Deployment transaction](https://explorer-studio.genlayer.com/tx/0xc149542955b8d2b4bdf9f929126a551b3148fbc0074c3fbbe1cddcd6ffc1b0fb) · [successful CLI workflow](https://github.com/gabrieladash123-bit/period-gate/actions/runs/39109606648) · [passing CI](https://github.com/gabrieladash123-bit/period-gate/actions/runs/39109605744).

The canonical proof set contains **14 FINALIZED / MAJORITY_AGREE receipts**: 11 successful executions and three deliberately rejected operations. Strict majority counts include idle votes in the denominator. The missing-bound transaction has 3 agree, 1 disagree and 1 idle; its raw dissent is retained. Idle votes are never presented as agreements.

## Actual cases

The six immutable specifications are synthetic. Leader and validators acquire full bytes and independently interpret execution bounds, relative deadlines, minimum release separations and model assumptions. Every quoted anchor and exact normalized tuple remains in the saved onchain state.

| Case | Actual result | Transaction |
|---|---|---|
| Missing worst-case bound | An observed mean cannot establish C; UNRESOLVED, null parameters, no reservation | [receipt](https://explorer-studio.genlayer.com/tx/0xe5b0ed21f7d3dd910c0bc3f79473953d49a6ce1dfa4499c67fe0ce25bb5cdeef) |
| Mixed-second units and decoy mean | pulse becomes C=3, D=4, T=10 ms; admitted, occupied demand 18/60 ms | [receipt](https://explorer-studio.genlayer.com/tx/0xc8cc4356351a6b97b67a316ba016198d82eede8159581f62f0e9424c75451050) |
| Short-deadline overload | pulse + scan have 60% utilization but need 6 ms by t=4 ms; scan stays WAITING | [receipt](https://explorer-studio.genlayer.com/tx/0x049560e873c8570fe66af207415d1f57829085f76a4344103cf5289acde19ec8) |
| Compatible reservation | bulk C=2, D=T=10 ms is admitted; occupied demand becomes 30/60 ms | [receipt](https://explorer-studio.genlayer.com/tx/0x144c4bb85ab22648b4e64b1c3ad7dbc9f302bff71d8d519abdcdfc75c7b4fa38) |
| Unsupported period | odd is correctly interpreted as C=1, D=T=7 ms; 7 does not divide 60, so UNSUPPORTED | [receipt](https://explorer-studio.genlayer.com/tx/0x1597269d275b7e7d2a3fe41a4f75409fbe6cdd9253092f1c02647a0273659c78) |
| Wrong owner | Release fails with ERROR; ledger unchanged | [receipt](https://explorer-studio.genlayer.com/tx/0x00183eb7405bcd0dea7efee5482e27b9f3ba61952ce326e4faa6805193890c5c) |
| Owner release | pulse leaves the plan; demand falls to 12/60 ms | [receipt](https://explorer-studio.genlayer.com/tx/0xf69782facb126605fc2c37f3e0e6d67ea7698cbbebca03342e06db7b4dfa5f24) |
| Cached retry | scan reuses its consensus interpretation and now fits; demand 30/60 ms | [receipt](https://explorer-studio.genlayer.com/tx/0x32a2ef0dab4119dc5c17f37d7c4c274ccb766c25c38d5151fc964324c436a85d) |
| Stale configuration | Wrong expected revision fails with ERROR; ledger unchanged | [receipt](https://explorer-studio.genlayer.com/tx/0xf55a1d640383001415f02bba30667249702c81353fa1e731384d8bd9bafae1a5) |
| Cached overload retry | Re-adding pulse would need 6 ms by t=4; it remains WAITING | [receipt](https://explorer-studio.genlayer.com/tx/0x6198ca914ad6855891bff9d957f9a5543c1388075650a5f10966be5215a2b7e5) |
| Second release | bulk leaves; scan alone occupies 18/60 ms | [receipt](https://explorer-studio.genlayer.com/tx/0x0def8ce63bf26f5ca383e42f8f316a6fb74b03295c270b3dec8769e7ad00d340) |
| Duplicate active reservation | Re-activating scan fails with ERROR; ledger unchanged | [receipt](https://explorer-studio.genlayer.com/tx/0x3983ecebe5df46f2060351bf670af6c4469a136157b2d4dec134df1fa8e75f46) |
| Exact capacity | fill C=7, D=T=10 ms joins scan; all 60 horizons pass, occupied demand is exactly 60/60 ms | [receipt](https://explorer-studio.genlayer.com/tx/0xdf9e845c668a56609c8b63734ba87673025111e7fccc0acf11139503addd5b60) |

Capacity refusals, UNRESOLVED and UNSUPPORTED are successful contract evaluations. The three ERROR receipts concern owner, stale-revision and duplicate-active guards. None is described as successful execution.

## Reproduce and inspect

- [Deployment metadata](deployment.json): source identity, actual owner wallets, immutable task/source/hash catalog.
- [All transaction hashes](transactions.json): 14 unique transactions; matching `*-receipt.json` files retain sanitized consensus details, raw votes and execution results.
- [Complete trace](trace.json): each actual call, signer, expected revision and before/after snapshot.
- [Final state](final-state.json): active indices `[1,5]` (scan and fill), revision 6, eight activation attempts, ten history entries, full source interpretations and all 60 demand values.
- [Fresh verification](verification.json): actual calldata, signer/target, receipt/source identities, exact quote anchors, independent release-count demand replay and current onchain-state equality.
- [Hosted verification](cloud-verification.json): the workflow's original fresh RPC/source/state check retained separately.
- [43 hosted direct tests](cloud-direct-tests.xml) and [local tests](local-direct-tests.xml): explicit validator replay, strict/sparse unresolved handling, malformed or changed sources, owner/revision guards, activation-budget isolation and releases after exhaustion.
- [Independent arithmetic oracle](../scripts/demand.cjs): job releases are enumerated rather than copying the contract's floor expression. Tests cover all 16 supported fixture subsets over ten hyperperiods and 500 seeded EDF/cross-language cases.

Contract source SHA-256: `4231bd672ada9865d4e71dffd83d56c57154b52c2b76abba2bdc7c021bc2070a`.

Specification revision: `b13a856794fd92893f7fdfa25bc8c10e14f8d12f`. Synthetic declarations demonstrate source interpretation and mathematical admission, not measured WCET or execution. A configuration applies from an empty backlog/quiescent boundary; this contract performs no transient carry-in analysis or runtime dispatch. Proof owners are disposable encrypted CI accounts. Deploy a fresh catalog with your own owner addresses for operational planning.

Set `GENLAYER_CLI_PATH` to GenLayer CLI 0.39.2's `dist/index.js`. Run `node scripts/verify-proofs.cjs --offline` for saved-artifact replay. For fresh public reads, set `PERIOD_ACCOUNT` to a locally available account and omit `--offline`. The verifier sends only read requests and compares all receipts, actual constructor/method arguments, deployed code and current final state. Model input hashes establish byte identity, not publisher honesty.

## Preserved failed runs

Two earlier source versions rejected sparse UNRESOLVED model responses. They are retained separately, with fresh checks confirming no state changes from their failed activations: [initial schema rejection](rejected/39106349601/README.md) and [diagnosed omitted-null fields](rejected/39108555395/README.md). Their MAJORITY_DISAGREE receipts and partial deployments are excluded from the canonical 14-receipt success set. The final parser restores only null fields for non-actionable UNRESOLVED results; actionable fields and independent full-source validation remain mandatory.
