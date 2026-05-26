# gwu-schedule-scraper

Scrapes George Washington University's course scheduling system and outputs structured JSON.

## Requirements

- Node.js 22+

## Install

```sh
npm install
```

## Usage

```sh
npm start -- --term <termId> --subject <subjId> [--campus <campId>] [--output <file>]
```

| Flag | Short | Required | Default | Description |
|------|-------|----------|---------|-------------|
| `--term` | `-t` | yes | — | Term ID (see below) |
| `--subject` | `-s` | yes | — | Subject code (e.g. `CSCI`, `MATH`) |
| `--campus` | `-c` | no | `1` | Campus ID |
| `--output` | `-o` | no | stdout | Write JSON to a file instead of stdout |

Output goes to **stdout** by default, making it easy to pipe to other tools.

## Examples

```sh
# print to terminal
npm start -- --term 202503 --subject CSCI

# pipe to jq
npm start -- --term 202503 --subject CSCI | jq '.[] | .name'

# write to a file
npm start -- --term 202503 --subject CSCI --output courses.json

# short flags
npm start -- -t 202503 -s MATH -o math.json
```

## Term IDs

George Washington University term IDs follow the format `YYYYSS`:

| Suffix | Semester |
|--------|----------|
| `01` | Spring |
| `02` | Summer |
| `03` | Fall |

Examples: `202601` = Spring 2026, `202503` = Fall 2025, `202502` = Summer 2025.

## Output format

Each element in the JSON array represents one course section:

```json
{
  "crn": 31182,
  "department": "CSCI",
  "courseID": 1011,
  "section": "10",
  "name": "Introduction to Programming with Java",
  "credit": "3.00",
  "instructor": "Vidrine, C",
  "schedule": [
    {
      "location": "SEH 1300",
      "day": "T",
      "startTime": "06:10PM",
      "endTime": "08:40PM"
    }
  ],
  "startDate": "08/25/25",
  "endDate": "12/08/25"
}
```

Multi-day courses produce one `schedule` entry per day. Courses with no scheduled meeting time have an empty `schedule` array.

## Development

```sh
npm run typecheck
npm test
```
