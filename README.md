# School Football Competition Planner

A lightweight static website for planning and running a school football competition with **two separate tournaments**:

- **Boys** (boys teams only)
- **Girls** (girls teams only)

Each school has one boys team and one girls team. The app generates round-robin fixtures, lets you enter/clear scores, and calculates live standings.

## Features

- Competition switcher tabs for **Boys** and **Girls**
- Single round-robin schedule generation per competition
- Match score entry with validation and clear-score action
- Live standings table with sorting:
  1. Points (desc)
  2. Goal Difference (desc)
  3. Goals For (desc)
  4. Team name (asc)
- Admin/settings panel to:
  - edit schools list (one per line)
  - apply school changes
  - regenerate schedule
- Confirmation warning before actions that may reset scores
- Local persistence with `localStorage` (scores/settings survive refresh)
- Responsive, mobile-friendly UI

## Default schools

1. Pegasus
2. Kúlan
3. Dimma
4. Jemen
5. Fönix
6. Ekkó
7. Igló
8. Þeba
9. Kjarninn

## Run locally

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy on GitHub Pages

1. Push this project to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**.
5. Save and wait for GitHub Pages to publish.

## Edit schools and regenerate schedule

1. Open the **Admin / Settings** panel.
2. Update schools in the textarea (one school per line).
3. Click **Apply changes** to save the new list and regenerate tournaments.
4. Or click **Regenerate schedule** to rebuild fixtures for the current schools.
5. Confirm the warning prompt when asked (these actions may reset scores).
