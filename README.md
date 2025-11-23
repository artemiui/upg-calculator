# UPG Calculator

<img width="1049" height="513" alt="image" src="https://github.com/user-attachments/assets/a71180f5-bece-4bfd-bab8-7e14ffe10e08" />


A lightweight, distributable grade calculator. Create subjects, add components with adjustable weights, input multiple task grades, and customize percent-to-grade conversion (1.0–5.0) per subject. Everything is editable and auto-saves to your browser.

## Some Features
- Subjects with rename and delete
- Components per subject with adjustable weights
- Multiple entries per component (score and max) with preserved history
- Subject percent computed via normalized weights
- Per-subject conversion thresholds (percent → grade 1.0–5.0)
- Auto-save to localStorage
- Export/Import JSON for backup and sharing

## Usage
Open `index.html` in a browser, or serve the folder:

- Python: `python -m http.server 8000`
- Node (serve): `npx serve .`

Then open `http://localhost:8000/`.

## Data Model  [EXPORTING/IMPORTING]
- Subject: `{ id, name, components: Component[], conversion: Threshold[] }`
- Component: `{ id, name, weight, entries: Entry[] }`
- Entry: `{ id, label, score, max }`
- Threshold: `{ id, percentFrom, grade }`

## Notes
- Weights normalize by their total, so total doesn’t have to be exactly 100.
- Conversion thresholds apply in descending order; first match wins.
- Reset restores a sample subject and default thresholds.
