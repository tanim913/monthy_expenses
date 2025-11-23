# PocketTrack — Simple Monthly Expense Tracker

A lightweight, privacy-first monthly expense tracker built with **vanilla JavaScript + localStorage**. Drop the included `index.html` into any static host (or open locally) to quickly log daily remaining balances and let the app compute per-entry spending, monthly totals and per-day averages.

---

## Features

- Single-file app (no build step) — just `index.html`.
- Stores data locally in `localStorage` (key: `pockettrack_entries_v1`).
- Group entries by month and show:
  - Start / current balances
  - Total spent and average spent per day
  - Per-entry spent since previous snapshot
- Edit or delete individual snapshots.
- Export full timeline as CSV (includes cumulative average spent).
- Demo data loader to preview behavior.

---

## Quick start

1. **Download** or clone the repository and open `index.html` in your browser.
2. Pick a **Date** and enter your current remaining amount (BDT by default) and click **Add / Update**.
3. The first entry in each month is treated as the month's starting balance. Subsequent snapshots compute spent/gain relative to the previous snapshot.
4. Use **Export CSV** to download a CSV of all snapshots, or **Load demo** to append sample entries.

---

## Storage & data model

Data is stored in `localStorage` under the key:

```
STORAGE_KEY = 'pockettrack_entries_v1'
```

Each entry has the model:

```json
{
  "id": "<uid>",
  "date": "YYYY-MM-DD",
  "balance": 1234.56,
  "note": ""
}
```

You can change the key or migrate data by editing the `STORAGE_KEY` constant in the script.

---

## CSV export

The CSV includes columns: `date`, `balance`, `spent_since_prev`, `cumulative_avg_spent`.
- First snapshot has empty `spent_since_prev`.
- `spent_since_prev` is computed as positive decreases in balance; gains are treated as `0` (but reflected in UI as gains).

---

## Important functions (for maintainers)

- `groupByMonth(entries)` — groups entries into month buckets and sorts them.
- `computeMonthStats(entriesSortedAsc)` — computes start/end balances, total spent/gain, per-entry deltas, days covered and average per day.
- `exportCsvFile()` — builds and triggers download of the CSV file.

---

## Customization ideas

- Change currency symbol: edit the UI strings that prepend `৳` (Bangladeshi Taka).
- Add a `note` input to store reasons for large spends.
- Replace `localStorage` with a backend (Firebase / Supabase) for sync across devices.
- Add date-range filters or charts (Charting libs are outside `index.html`'s single-file scope).

---

## Deployment

This app is a static HTML file — ideal for GitHub Pages. To publish:

1. Create a repo and push the `index.html` (and this `README.md`).
2. Enable GitHub Pages from `main` branch (or `gh-pages` branch) in repository settings.

---

## Troubleshooting

- If nothing shows: open DevTools → Console and check for JSON parse errors (old or corrupted `localStorage` data). Clearing the app via **Clear** will remove stored entries.
- Date formatting uses the browser locale when rendering friendly dates; underlying storage is `YYYY-MM-DD`.

---

## Contributing

PRs are welcome for bug fixes, accessibility improvements, and optional features (CSV column additions, charts, sync). Keep changes small and single-file-friendly unless introducing a build step.

---

## License

MIT — feel free to reuse and adapt.


