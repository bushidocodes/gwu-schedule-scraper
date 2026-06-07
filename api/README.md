# gwu-schedule-api

Express REST API that wraps the [gwu-schedule-scraper](https://github.com/bushidocodes/gwu-schedule-scraper) to serve George Washington University course section data as JSON.

## Prerequisites

- **Node.js 22+** (uses `--experimental-strip-types` to run TypeScript directly)
- **GWU network access** — the scraper fetches from `my.gwu.edu`, which may require a GWU VPN or on-campus connection

## Quick Start

```bash
cd api
npm install
npm run dev
```

The server starts on `http://localhost:3000` and watches for file changes in dev mode.

To run without watching:

```bash
npm start
```

To run the test suite:

```bash
npm test
```

## Endpoints

### `GET /terms`

Returns a list of supported academic terms, most recent first.  The window
covers the previous year through two years ahead and updates automatically
with the calendar — no code changes needed each year.

```bash
curl http://localhost:3000/terms
```

```json
{
  "terms": [
    { "id": "202803", "label": "Fall 2028" },
    { "id": "202802", "label": "Summer 2028" },
    { "id": "202801", "label": "Spring 2028" },
    { "id": "202703", "label": "Fall 2027" },
    ...
  ]
}
```

Term ID format: `YYYYSS` where `SS` is `01` (Spring), `02` (Summer), or `03` (Fall).

### `GET /departments`

Returns the list of supported SEAS department codes.

```bash
curl http://localhost:3000/departments
```

```json
{
  "departments": ["BME", "CE", "CSCI", "ECE", "EMSE", "MAE"]
}
```

### `GET /terms/:termId/sections`

Returns all sections for a given term across all supported SEAS departments (BME, CE, CSCI, ECE, EMSE, MAE). Departments are fetched in parallel and deduplicated by CRN.

```bash
curl http://localhost:3000/terms/202601/sections
```

### `GET /terms/:termId/sections?dept=CSCI`

Returns sections for a specific department only.

```bash
curl "http://localhost:3000/terms/202601/sections?dept=CSCI"
```

Supported department codes: `BME`, `CE`, `CSCI`, `ECE`, `EMSE`, `MAE`

#### Response format

```json
{
  "sections": [
    {
      "crn": 12345,
      "department": "CSCI",
      "courseID": 1010,
      "section": "10",
      "name": "Introduction to Programming",
      "credit": "3",
      "instructors": ["Smith, John"],
      "schedule": [
        {
          "location": "Tompkins 411",
          "day": "M",
          "startTime": "02:20PM",
          "endTime": "03:35PM"
        },
        {
          "location": "Tompkins 411",
          "day": "W",
          "startTime": "02:20PM",
          "endTime": "03:35PM"
        }
      ],
      "startDate": "01/13/2025",
      "endDate": "05/02/2025"
    }
  ]
}
```

Note: `instructors` is always an array (wraps the scraper's single `instructor` string). Times are empty strings `""` when not available. Schedule entries are expanded per day (one entry per day letter).

#### Error responses

| Status | Meaning |
|--------|---------|
| `400`  | Invalid `termId` format or unknown `dept` code |
| `404`  | Route does not exist |
| `502`  | GWU upstream fetch failed (network error, site down, etc.) |

## Cache

Scraped results are cached to `../cache/` (a `cache/` directory at the repo root, next to `api/`). This directory is git-ignored.

- **TTL**: 1 hour by default
- **Key**: `{termId}-{dept}.json` (e.g. `202601-CSCI.json`)
- **Override TTL**: set the `CACHE_TTL_MS` environment variable (milliseconds)

```bash
# Cache for 30 minutes
CACHE_TTL_MS=1800000 npm run dev

# Disable cache effectively (1ms TTL)
CACHE_TTL_MS=1 npm run dev
```

## Deployment

The API is stateless except for the file cache. It works well on platforms like [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io).

Set these environment variables in your hosting platform:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on (must be 1–65535) |
| `CACHE_TTL_MS` | `3600000` | Cache time-to-live in milliseconds (must be a positive integer) |

**Important**: The scraper fetches data from `my.gwu.edu`. If deploying outside the GWU network, you may need to route traffic through a GWU VPN or proxy, or the scrape will fail with a 502 error.

## Project structure

```
gwu-schedule-scraper/
  src/
    scraper.ts    # fetchSchedule() — HTTP fetch from my.gwu.edu
    parser.ts     # parseCourses() — Cheerio HTML parser
    types.ts      # Course, Schedule interfaces
    utils.ts      # Shared helpers (toErrorMessage)
  api/
    server.ts     # Express server (this package's entry point)
    terms.ts      # Term list and validation
    cache.ts      # File-based cache (createCache factory)
    package.json
    tsconfig.json
  cache/          # Auto-created at runtime; git-ignored
```
