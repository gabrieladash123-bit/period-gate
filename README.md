# PeriodGate

**GenLayer admission control for recurring processor reservations.**

PeriodGate interprets source specifications, then maintains a feasible configuration of independent sporadic tasks. Every admission must satisfy an exact 60-point processor-demand envelope. An owner release frees capacity; waiting tasks can retry their cached consensus interpretation after the configuration changes.

Leader and validators independently fetch full commit-pinned specifications and check raw SHA-256 hashes. They independently identify worst-case CPU execution bounds, release-relative deadlines, minimum release separations and preemptible/independent execution assumptions. Exact normalized parameters and status must agree. Validators additionally audit each source quotation against the complete document. An average cannot become a worst-case bound, and a throughput target cannot become a release guarantee.

## Finite proof over recurring demand

Supported C,D,T parameters use integer milliseconds, satisfy `1 <= C <= D <= T`, and T divides 60. At every horizon t=1..60 the planner checks total demand `sum(max(0,floor((t-D)/T)+1)*C) <= t`. Under this fixed period grid, the envelope repeats with a utilization increment; the check extends to all future horizons in the stated mathematical model. A failure stores its earliest violating horizon and each task's contribution. This catches deadline concentrations that a utilization-only check misses.

This is a **candidate configuration planner**, not a runtime dispatcher. Applying a revision requires an empty backlog/quiescent boundary. It does not prove physical WCET measurements, task independence, or real-world execution. See the [model, finite-horizon argument and limitations](docs/architecture.md).

## Repository

- [Contract](contracts/period_gate.py): pinned GenVM runner; fixed catalog, owner-scoped reservations, source compiler, exact demand envelope and bounded decision history.
- [Direct tests](tests/direct/test_period.py): validator replay, source changes, malformed outputs, owner/revision guards, release/retry, per-reservation budget isolation, exhaustive fixture subsets and 500 seeded EDF/cross-language cases.
- [Independent oracle](scripts/demand.cjs): enumerates job releases rather than copying the contract's floor formula.
- [Synthetic specifications](tasks/): mixed units, decoy averages/targets, a missing worst-case bound, an unsupported period and exact-capacity examples.
- [Proofs](proofs/README.md): finalized public receipts and fresh-state checks are published after the workflow succeeds.

## Verify

Python 3.13, Node.js 24 and GenLayer CLI 0.39.2:

```sh
pip install -r requirements-dev.txt
genvm-lint download --version v0.2.16
genvm-lint check contracts/period_gate.py --json
python -m pytest -q
node scripts/check-scenarios.cjs
```

The direct VM mocks source/model calls. Explicit validator replay tests consequential disagreement and source auditing; public multi-validator receipts are a separate proof layer.

## Use

Deploy with task names, matching commit-pinned `tasks/<name>.md` URLs, raw SHA-256 hashes and reservation-owner addresses. The catalog contains 2–6 distinct tasks and cannot be edited. Read `get_state()`, then an owner calls `activate(index, expected_revision)` or `release(index, expected_revision)`. Full source interpretations, active indices, the demand curve, capacity witnesses and operation history remain readable.

Each reservation has three activation attempts. Unknown/unsupported sources cannot activate. A capacity-rejected task waits for a changed configuration before retrying; subsequent activations reuse the immutable accepted source interpretation. Each owner can always release an active reservation, including after its activation budget is exhausted. Another reservation's attempts remain available. At most 36 history entries can exist.

The manual `proofs.yml` workflow uses two encrypted disposable accounts and the CLI on gasless StudioNet (chain 61999), with no repository secrets or exported private keys. It records transaction hashes immediately, refuses ambiguous resends, retains sanitized raw votes and validates fresh source/state. With `GENLAYER_CLI_PATH` set to the CLI's `dist/index.js`, use `node scripts/verify-proofs.cjs --offline` for saved-artifact replay. Omit `--offline` and select a local account via `PERIOD_ACCOUNT` for fresh public reads.

Generic MIT transport and test scaffolding are reused from DeltaBisect. The processor-demand reservation ledger, owner release/retry workflow, source-parameter validation and overload witnesses are implemented here. EDF demand analysis is established mathematics, not a claim of a new scheduling theorem.
