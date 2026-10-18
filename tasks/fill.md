# Synthetic specification: fill

Final specification for task fill. The per-job worst-case CPU execution bound is 7 milliseconds. The completion deadline is 10 milliseconds relative to each release. Consecutive releases are separated by at least 10 milliseconds.

Task fill is independent and fully preemptible, never self-suspends or blocks, and uses no shared locks.

These are synthetic declarations, not measured hardware guarantees.
