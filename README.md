# Sakay.ph GTFS Transit Dashboard

Created 2026-09-06. Scope per WBS (Tasks 1.1–6.2).

## Data provenance
- Source: https://github.com/sakayph/gtfs/archive/master.zip (downloaded 2026-09-06, 980 KB ZIP, 1.33 MB expanded)
- License: DOTC Developer License Agreement (LICENSE.md in feed root). Limited, revocable, non‑transferable. Use solely for mass‑transport rider assistance. Attribute: "Data provided by DOTC." Do not redistribute raw feed without DOTC permission.
- Audit: all 7 required files present (agency, routes, trips, stop_times, stops, calendar, feed_info; plus frequencies, shapes). File sizes verified.

## Pre‑processing gate
Task 1.2 (generate `public/data/gtfs.json`) is NOT executed until this file is explicitly approved for write.

## Safety notes
- Mapbox token → `.env.local` only (never committed).
- JSON target < 2 MB; lazy‑load if exceeded.
- PII audit required before deploy (GTFS stop names are public infrastructure).
- Vercel preview only; production promotion manual.
