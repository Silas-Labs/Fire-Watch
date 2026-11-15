# Calendar & Insights Input Boundary Specification (Domain D)

This document specifies the input contracts, schemas, units, and boundary conditions for Domain D (`web/src/calendar/`, `charts/`, `kpis/`, `anomalies/`, `export/`).

## 1. Monthly Series Input Schema

Each monthly observation entry in `monthlySeries` conforms to:

```typescript
interface MonthlyObservation {
  month: string;           // "YYYY-MM" (e.g., "2015-08")
  modis_hotspots: number | null; // Filtered MODIS hotspot count (0-100 conf >= 30)
  modis_fire_days: number | null; // Distinct days with >= 1 MODIS detection
  viirs_hotspots: number | null; // Filtered VIIRS hotspot count (low conf dropped)
  viirs_fire_days: number | null; // Distinct days with >= 1 VIIRS detection
  harmonized: number | null;     // MODIS-equivalent hotspot count
}
```

## 2. Sensor Sources & Units

| Source Key | Display Label | Measurement Units | Description |
|---|---|---|---|
| `harmonized` | Harmonized | `hotspots (MODIS-equivalent)` | Calibrated continuity series: observed MODIS (<2012) and $k_{season} \times \text{VIIRS fire-days}$ ($\ge 2012$). Can have fractional values. |
| `modis` | Raw MODIS | `hotspots` | Detections from Terra & Aqua satellites (2000-present). |
| `viirs` | Raw VIIRS | `hotspots` | Detections from Suomi NPP 375m sensor (2012-present). |

## 3. Boundary Rules & Edge Cases

1. **Unavailable vs. True Zero:**
   - `null` / `undefined`: Represents **unavailable data** (e.g., VIIRS before 2012, missing data periods). Displayed with a neutral missing pattern, tooltip reads `"No data"`.
   - `0`: Represents a **true zero** (satellite was active and observing, but zero hotspots were detected). Displayed with the baseline color ramp color, tooltip reads `"0 hotspots"`.
2. **Inclusive Date Ranges:**
   - All range filtering is inclusive: `[startMonth, endMonth]`. For example `["2010-01", "2012-12"]` includes both January 2010 and December 2012.
   - Arbitrary dates from 2000 onwards are supported; calendar years are never hardcoded.
3. **Full History Preservation:**
   - To compute accurate historical medians for KPIs and anomaly scoring (System Design §4.7), the **entire historical series** for the selected area must be retained. Filtering by date range only restricts the visual window, not the baseline calculation.

## 4. Integration Handoffs

- **Domain C (Web App Core / Geremi):**
  - Provides `selectedMonthlySeries`: Summed monthly totals over all cells inside the AOI bounding box.
  - Provides `dateRange: [startMonth, endMonth]` and `source: 'harmonized' | 'modis' | 'viirs'`.
  - Provides `selectedCellRows` for the aggregate CSV export.
- **Domain B (Science / Silas):**
  - Harmonization calibration coefficients ($k_{dry}, k_{wet}$) and validation metrics for the info cards.
- **Domain A (Data Engineering / Favor):**
  - Publishes the harmonized `web/public/data/firewatch.json.gz` payload consumed by the web app.
