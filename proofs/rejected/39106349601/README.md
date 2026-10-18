# Rejected initial proof run

The [initial workflow](https://github.com/gabrieladash123-bit/period-gate/actions/runs/39106349601) deployed the original source and verified three reservation activations. Its fourth activation, for the specification lacking a worst-case execution bound, failed with `[LLM_ERROR] Invalid interpretation schema` and finalized as **MAJORITY_DISAGREE / ERROR**. It is not a successful source interpretation or part of the later canonical proof set.

The receipt does not expose the model's raw JSON, so no specific malformed field is asserted. The response-format prompt was subsequently changed to give two complete literal JSON shapes, including null fields and an array-shaped uncertainty anchor. Strict schema validation, exact semantic comparison and full-source auditing remain required. Schema failures still force disagreement.

These files retain the original deployment, source hash, successful partial states and actual rejected receipt. `rejection-verification.json` records a fresh source-identity, vote and state check: the failed interpretation leaves the prior ledger unchanged at revision 2 with only pulse and bulk active. Disposable CI owner keys were not exported, so this partial instance is retained as failed-run evidence rather than resumed or claimed as the completed deployment.
