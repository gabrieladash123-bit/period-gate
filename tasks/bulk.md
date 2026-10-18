# Synthetic specification: bulk

Final specification for task bulk. The per-job worst-case CPU execution bound is 2 milliseconds. The completion deadline is 10 milliseconds relative to each release. Consecutive releases are separated by at least 10 milliseconds.

Task bulk is independent and fully preemptible, never self-suspends or blocks, and uses no shared locks.

These are synthetic declarations, not measured hardware guarantees.
