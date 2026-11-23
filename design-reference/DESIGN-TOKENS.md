# Design tokens

These are the values in `backend/public/css/app.css` (`:root`) and where each one came from.
They were measured from the reference JPEGs with a small PIL script kept outside the repo.

## Method

- **Flat colours** are the per-channel **median** of a rectangle inside a flat region. The
  interquartile range (IQR) of every flat region was 0–2, which confirms the region is flat
  apart from JPEG noise.
- **Text and line colours** are the median of the brightest 3% of pixels in the glyph or line
  area (the anti-aliased core). Coloured dots and lines use the most saturated 5% instead.
- **Borders** are single-pixel lines, so they were read from 1-px profiles across each edge
  and the peak pixel is used. The references are scaled down (see below), which blends
  1-px lines slightly into the background. The peak is therefore a slight under-estimate,
  but the relative order of the three border levels is reliable.
- **Scale.** `untitled-login.jpg` is 1040 px wide for a 1440 px page, a factor of 0.722.
  This was checked against the input width: 260 px in the image is 360 px in CSS.
  `untitled-dashboard.jpg` uses a factor of 0.703, from the sidebar being 208 px in the image
  against a 296 px sidebar. The same factor also gives a 40 px icon box and 40 px nav rows.
  Sizes below are converted to CSS px and snapped to the 4 px grid.

Coordinates are `x0,y0–x1,y1` in the source image.

## Colours

| Token | Value | Source |
|-------|-------|--------|
| `--bg-primary` | `#0a0a0a` | dashboard, sidebar 60,320–230,380; main 450,232–700,246; card interior 680,155–780,165; table row 450,640–600,650 (all identical) |
| `--bg-active` | `#171718` | dashboard, active "12 months" segment 752,258–757,274 |
| `--bg-hover` | `#121213` | derived: midway between `--bg-primary` and `--bg-active` (no hover state in references) |
| `--bg-login` | `#0d0e12` | login, left panel 30,30–90,80 and input interior 250,280–350,298 |
| `--bg-preview` | `#232531` | login, right preview panel 470,30–520,80 |
| `--border-primary` | `#333333` | dashboard, peak of sidebar search edge (#333333), stat icon box (#323232), segmented edge (#363636), secondary button (#30322f) |
| `--border-secondary` | `#272727` | dashboard, sidebar right edge and table row divider (both #272727) |
| `--border-card` | `#1f1f1f` | dashboard, stat card left and top edges (#1f1f1f / #202020) |
| `--border-login` | `#2e2f33` | login, input left and top edges (#2e2f33 / #292a2e), secondary button (#2a2833) |
| `--border-brand` / `--brand-300` | `#ab9dca` | median of selected-card border peaks (#b09dd5, #ab9ec9) and chart line core (#a89bca) |
| `--brand-600` | `#7f56da` | login, "Sign in" button fill 110,424–200,446 (IQR 0) |
| `--brand-700` | `color-mix(--brand-600 85%, black)` | derived hover (no hover state in references) |
| `--text-primary` | `#fefefe` | median of the "Log in" title (#feffff), "My dashboard" (#fafdff) and stat value (#fefefe) |
| `--text-secondary` | `#cecfd3` | login, "Email" label; dashboard nav "Home" (#ced4dc), secondary button text (#d1d2d6) |
| `--text-tertiary` | `#a1a1a3` | dashboard, stat label "Page views" (#a1a1a3), table header (#a3a0a2) |
| `--text-quaternary` | `#86878b` | login, subtitle "Welcome back!…" |
| `--text-placeholder` | `#7b7c80` | login, "Enter your email" placeholder |
| `--text-axis` | `#5e5d5d` | dashboard, chart axis "Jan" |
| `--success-500` | `#17b962` | dashboard, "Online" dot and "Paid" badge dot (#1fba5e) |
| `--success-text` | `#3ebe82` | dashboard, delta badge arrow |
| `--sev-low` | `#2dcc70` | `examples/bugnova.jpg`, "Low" bar |
| `--sev-medium` | `#17a2b7` | `examples/bugnova.jpg`, "Medium" bar |
| `--sev-high` | `#f39c11` | `examples/bugnova.jpg`, "High" bar |
| `--sev-critical` | `#e84c3d` | `examples/bugnova.jpg`, "Critical" bar |

The style-authority images contain no warning or error colours, so severity colours come from
the bug-tracker example. Severity badges are tinted pills: `color-mix` of the severity colour
at 12% for the fill and 45% for the border. Status badges use the reference's neutral bordered
badge with a coloured dot: Open is brand, In Progress is high, Resolved is success and Closed
is quaternary. That keeps the two badge kinds visually distinct.

## Sizes

| Token / component | Value | Source |
|-------------------|-------|--------|
| `--sidebar-w` | 296px | dashboard sidebar 208 px ÷ 0.703 |
| `--control-h-lg` (inputs, login buttons) | 44px | login input 31 px and button 32 px ÷ 0.722 = 43–44 |
| `--control-h` (search, nav row, icon box) | 40px | dashboard search 27 px ÷ 0.703 = 38; nav pitch 28.5 px ÷ 0.703 = 40.5; icon box 29 px ÷ 0.703 = 41 |
| `--control-h-sm` (segmented, small buttons) | 36px | dashboard segmented 26 px and "Visit store" 26 px ÷ 0.703 = 37 |
| stat card min-height | 112px | dashboard stat card 79 px ÷ 0.703 |
| stat card gap | 24px | dashboard gap between cards 16 px ÷ 0.703 = 23 |
| content padding | 32px | dashboard sidebar edge to content 25 px ÷ 0.703 = 35 |
| table row / header | 72px / 44px | dashboard row pitch 54 px ÷ 0.703 = 77 (avatar rows); header 28 px ÷ 0.703 = 40 |
| login form width | 360px | login input 260 px ÷ 0.722 |
| login split | 640px form / rest preview | login left panel 462 px ÷ 0.722 |

## Radii

Corners were read where the top edge line starts. They are approximate at this image scale,
so each is snapped to the nearest step:

| Token | Value | Used for | Source |
|-------|-------|----------|--------|
| `--radius-xl` | 12px | cards, user card, modal | stat card corner ≈ 6 px ÷ 0.703 ≈ 9–12 |
| `--radius-md` | 8px | inputs, buttons, segmented, dropdown | visibly smaller than cards in both images |
| `--radius-sm` | 6px | badges, nav items | "Paid" and delta badges |
| `--radius-xs` | 4px | checkbox, key hint | `⌘K` hint |
| `--radius-full` | — | avatars, chips, severity pills | — |

## Type

The font is **Inter**, matching the references' letterforms, and is loaded from Google Fonts in
`app.css`. Sizes are derived from glyph heights ÷ scale:

| Token | Size / line height | Example |
|-------|--------------------|---------|
| `--display-sm` | 30 / 38 | stat value ("$8,746.22" ≈ 24 px tall incl. `$` ÷ 0.703); login "Log in" |
| `--display-xs` | 24 / 32 | page title ("My dashboard" 17 px incl. descender ÷ 0.703) |
| `--text-lg` | 18 / 28 | card and modal titles |
| `--text-md` | 16 / 24 | nav items, inputs, login body |
| `--text-sm` | 14 / 20 | table cells (12 px incl. descender ÷ 0.703 = 17 → 14 px font), buttons, labels |
| `--text-xs` | 12 / 18 | table header, badges, axis |

Weights: 600 for titles, nav, buttons and values; 500 for labels and badges; 400 for body.

## Shadows

The references are flat dark surfaces with no visible elevation except overlays, so the
shadows are dark-tuned:

- `--shadow-xs` for controls.
- `--shadow-lg` for dropdowns.
- `--shadow-xl` for modals and the slide-over.
