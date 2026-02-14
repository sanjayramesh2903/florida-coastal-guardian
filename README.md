# TideTurner Florida

An interactive Congressional App Challenge-style web app for Florida coastal resilience.

## Data sources

- **Live alerts:** NOAA / National Weather Service API (`api.weather.gov/alerts/active?area=FL`)
- **Live marine conditions:** Open-Meteo Marine API (`marine-api.open-meteo.com`)
- **County baseline profile:** `data/florida_county_baseline.json` in this repository, compiled from public Florida county-level resilience indicators and used for educational scenario modeling.

## Deploy

GitHub Pages deployment is automated via `.github/workflows/deploy-pages.yml`.
