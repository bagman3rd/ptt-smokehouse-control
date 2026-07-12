# Build 5.9.3 — Smoker Setup Controls and Chicken Capacity

- Renamed the user-facing “Smoker name” field to “Smoker Brand.”
- Added a controlled Location dropdown: Outdoor; Indoors under hood; In the wall; Outdoors in smoke house.
- Added a controlled Cook window dropdown: Overnight only; Same-day only; All day / flexible; Backup / overflow only; Not currently active.
- Added server-side allow-list validation for both dropdowns.
- Applied the project capacity rule that one whole chicken equals one 2.5-pound double breast and occupies equal smoker space. Manufacturer whole-chicken counts now preload one-for-one as chicken-breast capacity.
