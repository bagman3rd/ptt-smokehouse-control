# Build 6.0.0 — Cook-Window-Aware Smoker Scheduling

Build 6.0.0 turns the smoker Cook Window setting into an operating rule.

- Overnight brisket and pork loads use only Overnight-only, All day / flexible, or Backup / overflow smokers.
- Same-day ribs and chicken use only Same-day-only, All day / flexible, or Backup / overflow smokers.
- Not currently active smokers are excluded even if their Active checkbox remains selected.
- Dedicated-window smokers are prioritized before flexible smokers.
- Backup / overflow smokers are reserved until primary eligible capacity is exhausted.
- Loads larger than one smoker are automatically split across eligible smokers.
- Capacity warnings compare the planned load with total eligible capacity and state the exact shortfall.
- Today, Smoker Schedule, and printed cook plans show the allocation breakdown.
