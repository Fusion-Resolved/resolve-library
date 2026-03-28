# Resolve Library

A personal DaVinci Resolve effect library — browse, search, and learn from every effect you've built.

## What's in this repo

```
resolve-library/
├── index.html      ← The main browsable library
├── add.html        ← The form for logging a new effect
└── README.md       ← This file
```

---

## Getting started (20 minutes, free)

### Step 1 — Create a GitHub account
Go to [github.com](https://github.com) and sign up for a free account if you don't have one.

### Step 2 — Create a new repository
1. Click the **+** button in the top right → **New repository**
2. Name it: `resolve-library` (or anything you like)
3. Set it to **Public** (required for free GitHub Pages hosting)
4. Click **Create repository**

### Step 3 — Upload the files
1. On your new repository page, click **uploading an existing file**
2. Drag and drop `index.html` and `add.html` into the upload area
3. Scroll down and click **Commit changes**

### Step 4 — Enable GitHub Pages (turns it into a live website)
1. Go to your repository **Settings** (tab at the top)
2. In the left sidebar, click **Pages**
3. Under "Branch", select **main** and click **Save**
4. Wait about 60 seconds, then refresh the page
5. You'll see a green banner: *"Your site is live at https://yourusername.github.io/resolve-library"*

That's it. Your library is now a live website.

---

## How to use it day-to-day

**Adding a new effect:**
1. Go to your site and click **+ Add effect**
2. Fill in what you know (only the name is required)
3. Hit **Save to library** — it appears instantly

**The node tree code:**
- In DaVinci Resolve, right-click on an empty area of your node tree → **Copy**
- Paste directly into the "Node tree text code" field
- Anyone viewing the effect can copy it and paste it back into Resolve to recreate it instantly

**Showcase video:**
- Record a short clip (5–30 seconds) of the effect in action
- Upload it to YouTube (unlisted is fine) or Vimeo
- Paste the URL into the "YouTube or Vimeo URL" field
- It will embed automatically on the effect page

---

## Sharing

Your library URL is: `https://yourusername.github.io/resolve-library`

Share this with anyone — they can browse every effect, watch the showcase videos, read the explanations, and copy the node tree code directly into Resolve.

---

## When you build the app

All your data is stored as structured JSON in the browser. When a developer builds the full app:

1. The field structure here becomes the database schema — no redesign needed
2. The data can be exported from the browser and migrated to a proper database
3. Every field name is already app-ready (name, cat, difficulty, nodeCode, steps, etc.)

---

## Effect fields reference

| Field | What it's for |
|---|---|
| `name` | Effect name — shown on the card |
| `cat` | Category: fusion-effect, colour-grade, 3d-object, transition, title-text, motion-graphic |
| `version` | DaVinci Resolve version used |
| `difficulty` | beginner / intermediate / advanced |
| `date` | Date logged |
| `desc` | Short description shown on the browse card |
| `videoUrl` | YouTube or Vimeo URL — auto-embeds |
| `explanation` | Full lesson body — how and why it works |
| `steps` | Step-by-step process (one per line) |
| `nodeCode` | The raw node tree text — paste back into Resolve |
| `nodes` | List of nodes/tools used |
| `renderWeight` | Light / Medium / Heavy |
| `selfContained` | Whether it needs media input |
| `dependencies` | LUTs, plugins, external assets |
| `lightingSetup` | For 3D effects |
| `materialSettings` | For 3D effects |
| `expressions` | Any Lua scripts or expressions used |
| `adjustments` | For colour grades |
| `lut` | LUT used |
| `qualifier` | Qualifier/mask details |
| `mistakes` | Common mistakes to avoid |
| `variations` | Ways to adapt or extend the effect |
| `notes` | Reuse tips, export settings, gotchas |
| `related` | Names of related effects |
| `tags` | Comma-separated tags for search |
