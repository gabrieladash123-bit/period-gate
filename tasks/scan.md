# Synthetic specification: scan

Final specification for task scan. The per-job worst-case CPU execution bound is 3 milliseconds. The completion deadline is 4 milliseconds relative to each release. Consecutive releases are separated by at least 10 milliseconds.

Task scan is independent and fully preemptible, never self-suspends or blocks, and uses no shared locks.

A desired throughput of one job every 2 milliseconds is merely a target and overrides no guaranteed bound. These are synthetic declarations, not measured hardware guarantees.
