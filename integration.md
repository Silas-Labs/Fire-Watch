# FireWatch Integration Guide — feat/harmonize Branch

## Overview
This document describes how to integrate the harmonization/validation pipeline (Domain B — `feat/harmonize`) with Favor's data engineering pipeline (Domain A) and the web frontend (Domain C). It is intended for **Charles (Domain A)** and **Geremi (Domain C)**.

## Branch map
- `feat/harmonize` — Domain B work (all 11 commits: harmonize, validate, tests, entry points)
- `main` — base branch; contains Favor's data-engineering-pipeline scaffold
- `silas/scaffold` — initial branch setup; use as starting point

## Part 1 — What Charles (Domain A) needs to provide

### Contract 1: `cell_month_raw.parquet`
File path: `data/interim/cell_month_raw.parquet`

Must contain these columns (in the same order as `aggregate.py` produces):
| Column | Type | Description |
|---|---|---|
| `cell_id` | str | Stable southwest-corner cell ID (e.g. `"29.3_-11.8"`), two-decimal grid, southwest corner |
| `month` | int | Integer YYYYMM (e.g. `200011` for November 2000) |
| `modis_hotspots` | uint32 | Total MODIS hotspots in that cell-month |
| `modis_fire_days` | uint32 | Total MODIS fire-days in that cell-month |
| `viirs_hotspots` | uint32 | Total VIIRS hotspots in that cell-month (may have leading zeros / nulls for pre-2012) |
| `viirs_fire_days` | uint32 | Total VIIRS fire-days in that cell-month (may have leading zeros / nulls for pre-2012) |

This is produced by running the full Domain A pipeline:
```bash
cd /home/ksilas/Documents/Projects/Fire-Watch
# From repo root:
python pipeline/ingest.py        # (or equivalent: fetch FIRMS CSVs into data/raw/)
python pipeline/clean.py         # confidence filters, bbox clip, dedupe
python pipeline/grid.py --grid 0.25   # assign to 0.25° grid
python pipeline/aggregate.py     # → data/interim/cell_month_raw.parquet
```

### Contract 2: Raw detection per-year files (already in repo)
These are already tracked and real-ish:
- `web/public/data/detections/2000.json.gz` through `web/public/data/detections/2026.json.gz`
- Contain per-year raw detection counts (e.g. 2000: 683 MODIS)
- Used by the frontend for raw-toggle comparisons

No action needed from Charles on these — they are Domain A's existing deliverables.

## Part 2 — What Domain B produces (you, Silas)

Run these from repo root on `feat/harmonize`:

### Step 1 — Harmonize
```bash
python pipeline/harmonize.py
```
**Outputs:**
- `data/interim/cell_month.parquet` — same schema as `cell_month_raw.parquet` **+** new column `harmonized` (float64)
- `data/interim/calibration.json` — coefficients:
  ```json
  {
    "k_by_season": {"dry": 0.87, "wet": 1.02},
    "train_range": "2012-2018",
    "test_range": "2019-2025",
    "status": "fitted"
  }
  ```

### Step 2 — Validate
```bash
python pipeline/validate.py
```
**Outputs:**
- `data/interim/validation_metrics.json` — train/test metrics + scatter:
  ```json
  {
    "train": {"pearson": 0.82, "spearman": 0.79, "bias": -0.15, "mae": 1200, "annual_total_relative_error": 0.08},
    "test": {"pearson": 0.78, "spearman": 0.73, "bias": -0.21, "mae": 1450, "annual_total_relative_error": 0.12},
    "scatter_points": [[pred1, obs1], [pred2, obs2], ...]  // length = test cell-months
  }
  ```

### Step 3 — Export (Domain C will also run this, or you can)
```bash
python pipeline/export.py
```
**Outputs:**
- `web/public/data/firewatch.json.gz` — the compact web data file the frontend reads
- Meta internally sets `"harmonized_status": "calibrated"`, populates `k_by_season`, and fills validation numbers

## Part 3 — What the frontend (Domain C — Geremi) consumes

The frontend `firewatch.json.gz` has this high-level structure (produced by `export.py`'s `build_payload()`):

```json
{
  "meta": {
    "version": 1,
    "grid_deg": 0.25,
    "bbox": [29.3, -11.8, 40.5, -0.9],
    "months": ["2000-11", "2000-12", ..., "2026-06"],  // every first-of-month from DATA_START to DATA_END
    "filters": {
      "modis_min_conf": 30,
      "viirs_drop": ["l", "low"],
      "keep_fire_type": 0
    },
    "calibration": {
      "overlap": "2012-2026",
      "train": "2012-2018",
      "test": "2019-2025",
      "k_by_season": {"dry": 0.87, "wet": 1.02},
      "status": "calibrated"
    },
    "validation": {
      "pearson": 0.78,
      "spearman": 0.73,
      "bias": -0.21,
      "mae": 1450,
      "annual_total_relative_error": 0.12,
      "scatter": [[pred, obs], ...]  // same length as data entries
    },
    "harmonized_status": "calibrated",  // "placeholder" if harmonize not run
    "data_start": "2000-11",
    "data_end": "2026-06",
    "source": "harmonized",
    "harmonized_placeholder": "modis_hotspots"  // only if status == placeholder
  },
  "cells": [  // one entry per unique cell
    {"id": "29.3_-11.8", "lat": -11.8, "lon": 29.3}
  ],
  "data": {     // cell_id → list of [month_index, modis_hotspots, modis_fire_days, viirs_hotspots, viirs_fire_days, harmonized_value]
    "29.3_-11.8": [[0, 5, 3, 8, 6, 6.96], [1, 2, 1, 3, 2, 3.12], ...],
    "29.3_-11.9": [[...], ...],
    ...
  }
}
```

### Frontend consumption (what Geremi's App reads)

The `data/` map keyed by `cell_id` is the main feed. Each entry is a `[month, ...]` array indexed by `month_index` (0-based, chronologic). The frontend can:

- **Toggle sources**: raw MODIS, raw VIIRS, or harmonized (k-adjusted VIIRS)
- **Draw rectangle on map** → select cells inside → sum `data[cell_id]` per month → display calendar heatmap / line charts
- **Show KPIs**: current month vs median, busiest month/year (from the aggregated data)
- **Show validation**: the `validation` block in `meta` provides Pearson, Spearman, bias, MAE, annual-TRE + scatter data for the validation screen
- **Anomaly scoring**: optional — can compute z-scores per cell-month from the data

## Part 4 — Full data flow diagram

```
(raw FIRMS CSVs on Drive)
        │
        ▼
Domain A (Favor): ingest → clean → grid → aggregate
        │                                       │
        │                                       ▼
        │                            data/interim/cell_month_raw.parquet
        │                                       │
        │                                       ▼
        │                                 python pipeline/harmonize.py
        │                                       │
        │                                       ▼
        │                            data/interim/cell_month.parquet
        │                            + data/interim/calibration.json
        │                                       │
        │                                       ▼
        │                                 python pipeline/validate.py
        │                                       │
        │                                       ▼
        │                            data/interim/validation_metrics.json
        │                                       │
        │                                       ▼
        │                                 python pipeline/export.py
        │                                       │
        ▼                                       ▼
web/public/data/firewatch.json.gz   ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
   (the single file the frontend reads)
        │
        ▼
Domain C (Geremi): Vite/React app reads firewatch.json.gz
   → builds map, calendar, charts, KPIs, validation screen
   → toggles: raw MODIS / raw VIIRS / harmonized (k-adjusted)
```

## Part 5 — Running the full end-to-end (once Charles's data is ready)

From `feat/harmonize` branch, repo root:

```bash
# 1. Charles ensures cell_month_raw.parquet exists:
ls data/interim/cell_month_raw.parquet
#   → if missing, run the Domain A pipeline:
python pipeline/ingest.py
python pipeline/clean.py
python pipeline/grid.py --grid 0.25
python pipeline/aggregate.py   # produces cell_month_raw.parquet

# 2. Domain B: harmonize + validate + export
python pipeline/harmonize.py      # → cell_month.parquet + calibration.json
python pipeline/validate.py       # → validation_metrics.json
python pipeline/export.py         # → firewatch.json.gz (status: calibrated)

# 3. Verify the export
python -c "
import gzip, json
with gzip.open('web/public/data/firewatch.json.gz', 'rt') as f:
    d = json.load(f)
print('harmonized_status:', d['meta']['harmonized_status'])
print('k_by_season:', d['meta']['calibration']['k_by_season'])
print('validation pearson:', d['meta']['validation']['pearson'])
print('cells:', len(d['cells']))
print('data rows:', sum(len(rows) for rows in d['data'].values()))
"
```

## Part 6 — Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `FileNotFoundError: cell_month_raw.parquet not found` | Domain A pipeline not run, or wrong path | Run `python pipeline/aggregate.py` from repo root; ensure path is `data/interim/cell_month_raw.parquet` |
| `harmonized_status` stays `"placeholder"` | `harmonize.py` not run, or `cell_month.parquet` missing | Run `python pipeline/harmonize.py` |
| Validation metrics all zeros | `validate.py` ran but `cell_month.parquet` has no `harmonized` column | Ensure harmonize step completed first; check `cell_month.parquet` has `harmonized` column |
| Frontend shows no data for certain months | Month range mismatch between `cell_month.parquet` and expected | Check `data_start`/`data_end` in `config.py` (currently 2000-11 → 2026-06); ensure all months are present |
| `k_by_season` has zeros | `fit_seasonal_k` filtered out all rows (no VIRS data for those seasons) | Verify `cell_month_raw.parquet` has VIIRS data covering the study period; check VIIRS start date (2012) vs MODIS (2000) |

## Part 7 — Checklist for "integration complete"

- [ ] `data/interim/cell_month_raw.parquet` exists (Domain A, from Favor)
- [ ] `python pipeline/harmonize.py` runs successfully → `cell_month.parquet` has `harmonized` column
- [ ] `data/interim/calibration.json` has non-zero `k_by_season` values
- [ ] `python pipeline/validate.py` runs successfully → `validation_metrics.json` has real Pearson/Spearman values
- [ ] `python pipeline/export.py` runs successfully → `firewatch.json.gz` has `"harmonized_status": "calibrated"`
- [ ] Frontend (Geremi's dev server) can load `firewatch.json.gz` and display map + calendar
- [ ] Source toggle (raw MODIS / raw VIIRS / harmonized) works in the web app
- [ ] Validation screen shows Pearson, Spearman, bias, MAE, annual-TRE from `validation` block

## Contact / next steps
- **Charles (Domain A)**: produce `cell_month_raw.parquet`; coordinate on VIIRS/MODIS overlap period (2012+)
- **Silas (Domain B)**: this integration guide; finalize `calibration.json` format; decide 2012+ series (calibrated VIIRS vs observed MODIS)
- **Geremi (Domain C)**: consume `firewatch.json.gz`; implement source toggle + validation screen; report any schema mismatches
- **Peter (Domain D)**: KPI extraction from final data; anomaly-period lists; CSV/PNG exports for the submission