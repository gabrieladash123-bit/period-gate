# Sparse unresolved-response rejection

The [second workflow](https://github.com/gabrieladash123-bit/period-gate/actions/runs/39108555395) deployed the explicit-template version and tested the missing-bound specification first. That activation finalized as **MAJORITY_DISAGREE / ERROR**. Its diagnostic identifies a list-shaped anchors field and exactly two received keys, `anchors` and `status`, with status `UNRESOLVED`. The three null numeric keys were omitted. The receipt does not identify which provider-side processing produced that omission.

`rejection-verification.json` independently checks the actual public receipt, original source identity and fresh empty state. The failed attempt applies no reservation, interpretation or history entry.

The subsequent parser restores missing numeric fields to null only for an explicit UNRESOLVED result. It infers no execution bound and cannot allocate capacity from that result. BOUNDED fields remain mandatory; non-null unresolved parameters and extra keys remain invalid. Independent validator classification and source-anchor auditing remain required. Regression tests cover the received sparse shape, equivalent complete/sparse unresolved responses, missing actionable bounds and rejected non-null/extra fields.
