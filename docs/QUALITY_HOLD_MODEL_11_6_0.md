# Quality Hold Model — Build 11.6.0

## Opening a hold

An operations role may move available cooked product to held inventory.

The hold records:

- Product and quantity
- Reason
- P0–P3 severity
- Blocking flag
- Owner
- Open actor and timestamp

Opening a hold decreases available quantity and increases held quantity without changing total on hand.

## Release

Manager release decreases held quantity and restores available quantity. Total on hand remains unchanged.

## Discard

Manager discard decreases held and total on hand. A waste reason is retained.

## Close control

Any open blocking hold prevents inventory-day close. The original hold record remains after release or discard.
