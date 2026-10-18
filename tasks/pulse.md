# Synthetic specification: pulse

Final specification for task pulse. The per-job worst-case CPU execution bound is 0.003 seconds. The completion deadline is 0.004 seconds relative to each release. Consecutive releases are separated by at least 0.010 seconds.

Task pulse is independent and fully preemptible, never self-suspends or blocks, and uses no shared locks.

An observed average of 0.001 seconds is not the worst-case execution bound. A different task called archive has a 0.060-second deadline; it is not pulse. These are synthetic declarations, not measured hardware guarantees.
