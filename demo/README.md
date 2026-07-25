# P4 demo kit

These are clean, printed test fixtures for the Contest It demo. They are
deliberately marked **DEMO / NOT AN OFFICIAL SUMMONS** and contain no personal
information.

## Test set

| Fixture | Charge code to cache | Description | Why it is useful |
|---|---|---|---|
| `ticket-01-dirty-sidewalk.svg` | `A.C. 16-118 2 A` | Dirty sidewalk / area | Very high-volume DSNY code |
| `ticket-02-handbill.svg` | `10.119.` | Illegal posting of a handbill or notice | High-volume code with many recorded outcomes |
| `ticket-03-receptacles.svg` | `A.C. 16-120 C` | Storage of receptacles | High-volume DSNY code with varied outcomes |

P2 should precompute all three exact code strings above. They were selected
from the official NYC OATH Hearings Division Case Status dataset (`jz4z-kudi`)
on July 25, 2026. Before the demo, confirm the backend’s charge normalization
accepts the punctuation and spaces exactly as printed.

## Run-of-show

1. Open the deployed app in current desktop Chrome.
2. Keep manual code `A.C. 16-118 2 A` in the clipboard as the fallback.
3. Upload `ticket-01-dirty-sidewalk.png` and wait for the full result.
4. Scroll through total cases, dismissal rate, average penalty, and the defense
   draft. Confirm the source badge says live or cached truthfully.
5. On a second run, tap the mic and say: “A C sixteen dash one eighteen, two A.”
6. If voice hesitates once, switch immediately to the visible text field.

## Required pre-submit capture

- Record one clean 60–90 second run at 1440p or higher.
- Capture one full-resolution PNG of the verdict card.
- Put final files in this directory as `demo-run.mp4` and
  `verdict-card.png`.
- Run all three fixtures once after the production deploy.

Do not commit a recording that exposes browser bookmarks, API keys,
notifications, or personal account details.
