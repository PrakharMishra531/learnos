# LearnOS Design System — Dark Academic

A production-grade design system for creating polished, literary-feeling learning interfaces. Inspired by old libraries, leather-bound books, and the quiet atmosphere of a midnight study.

---

## Philosophy

**Dark Academic** — warm gold accents against deep navy darkness, serif typography, film-grain texture, and generous negative space. Every surface feels substantial. The goal is _scholarly luxury_ — not sterile minimalism, not playful neumorphism. Interfaces should feel like well-made paper.

---

## Color Palette

```
Root background        #0b0e14    — deepest navy, almost black
Surface                #12151c    — card/elevated surfaces
Card foreground        #181a22    — interactive cards, inputs
Card rear              #1c1e27    — flipped card back
Input background       #10131a    — textareas, form fields
Hover overlay          #1e212b    — hover states on dark surfaces
Code block             #0d0f15    — monospace containers
Accent glow bg         rgba(201, 169, 110, 0.06)  — subtle warm tint

Text primary           #e4ddd2    — body copy (warm ivory, never pure white)
Text secondary         #9a9588    — labels, descriptions, muted content
Text heading           #f0ebe0    — h1-h5, titles (brighter than body)
Text muted             #6b6560    — placeholders, hints, captions

Accent                 #c9a96e    — gold (buttons, links, active states)
Accent hover           #d4b87a    — brighter gold for hover
Accent dim             #8a7550    — subdued gold for borders, icons
Accent glow            rgba(201, 169, 110, 0.25)  — glows and shadows

Border                 #252830    — default container borders
Border light           #2e3139    — slightly lighter variant

Red (error/wrong)      #c94b4b
Green (success)        #5b8c5a
```

**Key rule**: Never use pure white (`#ffffff`) or pure black (`#000000`). All neutrals have a warm undertone. The ivory text (`#e4ddd2`) is the single most important color — it softens contrast without sacrificing readability.

---

## Typography

### Font Stack

```css
--font-display: "Playfair Display", "Georgia", serif;
--font-body:    "Lora", "Georgia", serif;
--font-mono:    "JetBrains Mono", "Fira Code", monospace;
```

### Usage

| Element        | Font              | Weight  | Style    | Notes                         |
|---------------|-------------------|---------|----------|-------------------------------|
| Headings h1-h5 | Playfair Display  | 600     | normal   | `-0.01em` letter-spacing      |
| Body/p/li      | Lora              | 400     | normal   | `line-height: 1.7`            |
| Labels/accents | Playfair Display  | 600     | normal   | UPPERCASE, `0.12-0.15em` tracking |
| Code blocks    | JetBrains Mono    | 400     | normal   | `0.82-0.88em` font-size       |
| Buttons        | Lora              | 500     | normal   |                              |
| Italic accents | Playfair Display  | 700     | italic   | Hero titles, page headings    |

### Scale

```
h1:  2.5rem / line-height 1.2
h2:  1.75rem / line-height 1.3
h3:  1.25rem / line-height 1.4
body: 1rem / line-height 1.7
small/caption: 0.82rem
```

---

## Texture & Atmosphere

### Film Grain Overlay

A fixed pseudo-element on `body::before` renders an SVG fractal noise filter at `opacity: 0.025`. This creates a subtle paper/analog texture across the entire viewport without hurting performance.

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...feTurbulence baseFrequency='0.9'...");
  opacity: 0.025;
  pointer-events: none;
  z-index: 1;
}
```

### Radial Glow Accents

Cards and faces use `::before` pseudo-elements with radial gradients from `var(--bg-accent-glow)` to transparent. Placement varies: top-left on card fronts, bottom-right on card backs, center on nav cards. This creates directional depth without visible light sources.

---

## Components

### Cards

```css
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--radius);       /* 12px */
box-shadow: var(--shadow-card);     /* 0 8px 32px rgba(0,0,0,0.5) */
```

On hover: border shifts to `--accent-dim`, background to `--bg-hover`, `translateY(-2px)`, soft shadow.

### Buttons (3 tiers)

```
.btn-primary:  accent bg, dark text, glow ring on hover
.btn-ghost:    transparent bg, border, mutes color, lifts border on hover
.btn-danger:   transparent, red text, red bg on hover
```

All buttons: `border-radius: 8px`, `transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)`. Focus-visible gets a 2px gold outline with 2px offset.

### Textareas

```css
font-family: var(--font-mono);
background: var(--bg-input);
border: 1px solid var(--border);
border-radius: 8px;
```

Focus: border becomes `--accent-dim`.

### Deck Cards (Grid Items)

Grid: `repeat(auto-fill, minmax(260px, 1fr))` with `1rem` gap. Each card has a `fadeInUp` entry animation (12px → 0, 0.5s). Delete button hidden until card hover.

---

## Animations

### Principles

- **Never CSS `backface-visibility`** — Chrome ignores it on elements with `overflow: auto/scroll`. Use Framer Motion `AnimatePresence` to render only one face at a time.
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for UI transitions. `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring-like entrances.
- **Duration**: 0.3s for hover/state changes, 0.4-0.5s for mount/unmount.

### Keyframes

```
fadeInUp:  0% { opacity: 0; transform: translateY(12px) } → 100% { opacity: 1; translate: 0 }
```

Used for deck cards, import panels, explanations, and completion screens.

### Framer Motion

Used for: flashcard flip (AnimatePresence with fade/slide variants), nav card hover glow, MCQ explanation reveal. Always pair with `exit` variants so unmounts animate out.

---

## Transitions & Easing

```css
--transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring: 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```

Apply `--transition-smooth` to: hover states, border-color changes, opacity fades, transform lifts. Apply `--transition-spring` sparingly to entrance animations.

---

## Shadows

```css
--shadow-soft:  0 2px 16px rgba(0, 0, 0, 0.3);   /* subtle lift */
--shadow-card:  0 8px 32px rgba(0, 0, 0, 0.5);   /* depth for cards */
--shadow-glow:  0 0 40px var(--accent-glow);      /* accent aura */
```

Only use shadows for elevation. Don't add shadows to text or inline elements.

---

## Spacing & Layout

```
Page container:    max-width 900px, padding: 2rem 1.5rem 4rem
Card padding:      1.25rem
Section gaps:      2-3rem between major sections
Component margins: 0.75-1.25rem between related elements
Grid gap:          1rem
Radius:            12px (cards), 8px (buttons, inputs, code blocks)
```

### Responsive Breakpoint

`@media (max-width: 640px)`: Grid collapses to single column, font sizes scale down via `clamp()`, padding reduces to `1.25rem`.

---

## Scrollbar Styling

```css
::-webkit-scrollbar           width: 6px
::-webkit-scrollbar-track     background: --bg-surface
::-webkit-scrollbar-thumb     background: --border-light, radius 3px
::-webkit-scrollbar-thumb:hover  background: --text-muted
```

---

## Selection

```css
::selection {
  background: var(--accent-dim);   /* gold */
  color: var(--bg-root);           /* dark text on gold */
}
```

---

## Code Blocks (highlight.js)

Theme: `github-dark` overridden with `--bg-code` background and `--text-secondary` text. Inline code gets `--accent-dim` color, `padding: 0.15em 0.4em`, `border-radius: 4px`.

---

## KaTeX Math

Default font size: `1.05em`. Math-normal text colored to match `--text-primary`. Display math has `overflow-x: auto` for long equations. Both inline (`$...$`) and display (`$$...$$`) work.

---

## Markdown Content Styles

Used in flashcards, notes, and MCQ explanations:

- **Blockquote**: 3px `--accent-dim` left border, `padding-left 1rem`, italic, `--text-secondary` color. In notes: gold accent border with subtle `--bg-accent-glow` background.
- **Tables**: Full width, collapsed borders, `--bg-hover` header cells.
- **Code**: Inline `code` in `--bg-code` background, pre blocks have `1rem` padding and `overflow-x: auto`.
- **Links**: `--accent` color, hover `--accent-hover`.
- **Strong/Bold**: `--text-heading` color (brighter than body).
- **Lists**: `padding-left: 1.25rem`, `margin-bottom: 0.2-0.3em` per item.

---

## Do's and Don'ts

### Do

- Use warm ivory (`--text-primary`) for all body text — never white
- Double LaTeX backslashes in JSON strings
- Use `AnimatePresence` for mount/unmount, not CSS `backface-visibility`
- Prefer `var(--accent-dim)` for borders and icons, `var(--accent)` for active text
- Add the film grain overlay to `body::before`
- Use Playfair Display italic (700) for hero/landing titles

### Don't

- Use pure white or black anywhere
- Apply `overflow: auto` to elements with 3D transforms (Chrome bug)
- Use box shadows on text
- Skip the noise texture — it's the soul of the aesthetic
- Use sans-serif fonts (everything must feel literary)
- Add decorative elements that don't serve the "old library" atmosphere
