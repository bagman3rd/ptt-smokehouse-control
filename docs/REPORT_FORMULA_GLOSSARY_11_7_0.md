# Report Formula Glossary — Build 11.7.0

| Metric | Formula |
|---|---|
| Forecast variance cooked lb | Actual service usage cooked lb minus approved forecast cooked lb |
| Forecast variance percent | Forecast variance divided by approved forecast cooked lb |
| Daily forecast accuracy | Maximum of zero and 100 minus absolute forecast variance percent |
| Weekly forecast accuracy | Maximum of zero and 100 minus WAPE |
| Production variance | Actual cooked production minus planned cooked production |
| Actual yield | Actual cooked production divided by actual raw input |
| Waste rate | Waste cooked lb divided by opening + production receipts + transfer-in |
| Ending inventory rate | Closing on-hand cooked lb divided by opening + production receipts + transfer-in |
| Expected closing | Opening + receipts + transfer-in - usage - waste - transfer-out + adjustments |
| Unexplained difference | Recorded closing minus expected closing |
| Plan adherence | Loads within both start and completion tolerances divided by completed non-cancelled loads |
| Smoker utilization | Occupied capacity-minutes divided by available capacity-minutes |
| Learning factor | Recency-weighted actual usage divided by recency-weighted forecast |

A zero denominator returns N/A rather than infinity, zero, or a fabricated percentage.
