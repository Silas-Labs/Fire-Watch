# FireWatch

**Tanzania burning activity calendar: MODIS and VIIRS hotspots on one consistent scale.**

Built by **Team Tazama** for the NASA Space Apps Challenge 2026, challenge
*Harmonization of MODIS and VIIRS Hot Spots*.

> Status: scaffolded for the hackathon (November 14-15, 2026). The repository
> contains the project documentation, a Python/uv pipeline baseline, and a
> React/Vite web baseline. The pipeline steps and app modules are being filled
> in by their owners.

---

## The problem

Satellites have tracked active fire hotspots for more than two decades, but the
record is split across two sensor families whose data cannot be compared
directly:

| | MODIS (Terra, Aqua) | VIIRS (Suomi NPP and later) |
|---|---|---|
| Pixel size | about 1 km | about 375 m |
| Record starts | 2000 | 2012 |
| Status | approaching end of operational life | replacing MODIS |

VIIRS has finer pixels and detects smaller fires, so it reports many more
hotspots for the same burning. They also differ in sensitivity and overpass
schedule. Counting hotspots across both produces a fake jump in fire activity
when VIIRS begins, and leaves fire managers without one consistent history of
when and where burning has occurred.

## What FireWatch does

FireWatch harmonizes the two records into a single **burning activity
calendar** that a user can explore for any area of interest.

1. **Harmonize.** Both sensors are quality-filtered, placed on a common
   0.25 degree grid, converted to fire-days (cell-days with at least one
   detection), and calibrated against each other in the 2012-onward overlap.
   The output is a series in **MODIS-equivalent hotspot counts** from 2000 to
   today.
2. **Validate.** The calibration is tested on held-out years, and the
   agreement (correlation, bias, error) is shown to the user.
3. **Explore.** A web app lets the user draw an area on the map (or type
   coordinates), choose a date range, and see:
   - a year-by-month burning calendar on a colorblind-safe color ramp
   - raw MODIS, raw VIIRS and harmonized views side by side
   - the current month against the historical median
   - the busiest months and years
   - unusual periods flagged against the historical baseline
   - a CSV download of the harmonized table for the selection

**Study area:** Tanzania, 2000 to present (VIIRS from 2012).

**Intended users:** early warning and emergency responders, scientists, land
managers and firefighters.

## Important limitations

- A hotspot is a **thermal detection**, not a fire boundary or an exact fire
  location.
- No detection does not prove no fire. Clouds, smoke and overpass timing can
  hide a fire from the satellite. The index measures *detected* burning.
- MODIS and VIIRS observe at different times of day, so agreement is
  statistical, never perfect. Uncertainty is shown in the app.

## Repository layout

```
Fire-Watch/
  README.md
  docs/                    design, setup, plan, task split, scaffold
  pipeline/                Python: ingest, clean, grid, aggregate, harmonize, validate, export, detections
  web/                     React + Vite + Leaflet + ECharts static app
  data/                    Cached downloads and intermediates (git-ignored)
  .github/workflows/       GitHub Pages deployment
```

The full scaffold, including the files each owner still needs to create, is in
[docs/scaffold.md](docs/scaffold.md).

## Documentation

- [System design](docs/system-design.md)
- [Setup](docs/setup.md)
- [Development plan](docs/development-plan.md)
- [Task splitter](docs/task-splitter.md)
- [Scaffold](docs/scaffold.md)

## Deploying the web app

The app is a static Vite build; no environment variables are required.

### Vercel

1. Import this repository into Vercel.
2. Either set the project **Root Directory** to `web`, or keep it at the repository root.
   Both paths are configured: `web/vercel.json` covers a `web` root, and the root
   `vercel.json` covers the monorepo layout.
3. Framework preset: **Vite**.
4. Build command: `npm run build` (or `cd web && npm run build` from the root).
5. Output directory: `dist` (or `web/dist` from the root).

Node 22 is pinned in `.nvmrc` and `web/package.json`. The app reads
`web/public/data/firewatch.json.gz` at runtime, and Vercel serves it as a static
asset. `VITE_BASE` is only needed for GitHub Pages project sites; Vercel uses `/`.

## Data and attribution

Hotspot data come from NASA FIRMS (Fire Information for Resource Management
System), operated by NASA's Land, Atmosphere Near real-time Capability for EOS
(LANCE) and the Earth Science Data and Information System (ESDIS). Please
acknowledge NASA FIRMS in any use of this project.

The project dataset was downloaded from the NASA Earthdata FIRMS website and
is shared with the team here:
[FireWatch data folder](https://drive.google.com/drive/folders/1ZDiTWoJ7GzbCfh4eIuKrKSxR8LBmLLj7?usp=sharing).
The download is not committed to the repository; cached data stays under the
git-ignored `data/` directory.

## Team

Team Tazama (Swahili for "look" or "watch").

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Team Tazama.
