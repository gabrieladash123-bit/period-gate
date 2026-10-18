# Synthetic specification: odd

Final specification for task odd. The per-job worst-case CPU execution bound is 1 millisecond. The completion deadline is 7 milliseconds relative to each release. Consecutive releases are separated by at least 7 milliseconds.

Task odd is independent and fully preemptible, never self-suspends or blocks, and uses no shared locks.

The seven-millisecond release interval is intentional and must not be rounded or changed to fit an admission policy. These are synthetic declarations, not measured hardware guarantees.
