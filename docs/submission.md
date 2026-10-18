# Submission

**Category:** Builder → Intelligent Contracts

**Title:** PeriodGate: Consensus demand-bound reservation planner

**Notes / Description:**

PeriodGate is a standalone GenLayer planner for recurring workload reservations. Leader and validators independently fetch commit-pinned specs, verify hashes and identify worst-case execution bounds, relative deadlines and minimum release intervals. Exact normalized fields and full-source quote audits feed a 60-point demand check that extends to all future horizons under a fixed period grid. Overload refusals preserve the earliest failing horizon and per-task demands. Owner releases free capacity; waiting tasks retry cached interpretations after a revision change. StudioNet proofs show rejection at 60% utilization due to short deadlines, missing bounds, unsupported periods, owner/stale guards, release/retry and a tight 60/60 ms plan. All 14 receipts finalized with MAJORITY_AGREE, including three expected errors. The repo includes 43 direct tests and 500 seeded EDF/oracle checks. Synthetic specs demonstrate configuration planning from an empty backlog, not measured execution.

**Evidence:**

- [Repository](https://github.com/gabrieladash123-bit/period-gate)
- [GenLayer contract source](https://github.com/gabrieladash123-bit/period-gate/blob/main/contracts/period_gate.py)
- [Public GenLayer deployment](https://explorer-studio.genlayer.com/tx/0xc149542955b8d2b4bdf9f929126a551b3148fbc0074c3fbbe1cddcd6ffc1b0fb)
- [Complete onchain proofs](https://github.com/gabrieladash123-bit/period-gate/blob/main/proofs/README.md)
- [Successful CLI proof workflow](https://github.com/gabrieladash123-bit/period-gate/actions/runs/39109606648)

**StudioNet contract:** `0xb3BB25567B23258197c9b3b57428AaFBaf59a659` (chain 61999).
