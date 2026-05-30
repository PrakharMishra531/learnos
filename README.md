<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)">
    <img src="https://readme-typing-svg.demolab.com?font=Playfair+Display&weight=700&size=46&duration=3000&pause=1000&color=C9A96E&center=true&vCenter=true&width=600&lines=LearnOS" alt="LearnOS" />
  </picture>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-18-blue?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/vite-6.x-purple?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/tauri-native-%2324C8DB?style=flat-square&logo=tauri" />
  <img src="https://img.shields.io/badge/dexie-indexeddb-%23fd9f2f?style=flat-square&logo=indexeddb" />
  <img src="https://img.shields.io/badge/framer-motion?style=flat-square&logo=framer&color=0055ff" />
  <img src="https://img.shields.io/badge/KaTeX-math-%234d908e?style=flat-square" />
  <img src="https://img.shields.io/badge/theme-dark_academic-%23c9a96e?style=flat-square" />
</p>

<br />
<h5>LearnOS - my personal learning system</h5>
I learn so much through conversations with LLMs. One thread stays dedicated to the topic, another handles doubts, so the main context stays clean and focused.

Once a session wraps up, learnOS steps in. It provides the prompt (you copy-paste that), the chat used for learning already has the context, and generates really relevant material. The output is structured JSON — rendered as MCQs, flashcards, or short notes, ready to review as needed.

Learning and review, in one loop.

![screenshot-homepage](ss1.png)

Usage - Just copy the provided prompt, paste in the llm chat used for learning, copy the response json and paste it in learnOS and the generate material, rendered aesthetically - persistent.

---

## Install (Windows)

Download the latest `.exe` installer from the **[Releases page](../../releases)**. Double-click, done — nothing to configure, no database to set up.

The app is a native Tauri binary (~9 MB). Your data lives entirely on your machine in the browser's IndexedDB — no cloud, no accounts, no latency.

---

## Dev Quick Start

```bash
# 1. Clone and install
git clone https://github.com/PrakharMishra531/learnos.git && cd learnos
npm install

# 2. Run in the browser (Vite dev server)
npm run dev        # → http://localhost:5173

# 3. Or run as a native desktop window (Tauri)
npm run tauri:dev  # → opens a native window with hot reload
```

---

## Stack

- **React 18** + **TypeScript** — SPA with typed safety
- **Vite** — dev server, HMR, and production bundling
- **Tauri v2** — native desktop shell (~9 MB, uses OS WebView2, no Chromium bloat)
- **Dexie.js** + **IndexedDB** — all data stored locally in the browser, zero config
- **Framer Motion** — declarative animations (card flips, reveals)
- **KaTeX** — server-free LaTeX math rendering
- **highlight.js** — syntax highlighting for code blocks
- **react-router-dom** — client-side routing

---

## Project Structure

```
src/
├── main.tsx              Entry point
├── App.tsx               Router (/, /flashcards, /mcq, /notes, ...)
├── index.css             All styles (1750 lines, single file)
├── lib/
│   ├── db.ts             Dexie.js IndexedDB layer (decks, cards, mcq, notes, folders)
│   ├── markdown.ts       Markdown renderer (react-markdown + KaTeX + hljs)
│   └── jsonHelper.ts     JSON sanitizer (state machine)
└── components/
    ├── LearnOS.tsx        Landing page with nav cards
    ├── FlashcardsPage.tsx Flashcard import + deck list + folders
    ├── DeckViewer.tsx     Card-by-card viewer with flip + nav
    ├── MCQPage.tsx        MCQ import + quiz list + folders
    ├── MCQViewer.tsx      Question-by-question quiz viewer
    ├── NotesPage.tsx      Notes import + note list + folders
    ├── NotesViewer.tsx    Full note reader with download
    ├── Flashcard.tsx      Card flip animation component
    ├── FolderRow.tsx      Reusable folder accordion with DnD
    └── MarkdownView.tsx   Markdown/Math/Code renderer
src-tauri/
├── tauri.conf.json       Tauri config (window, bundle, CSP)
├── Cargo.toml            Rust dependencies
├── src/
│   ├── main.rs           Native entry point
│   └── lib.rs            Tauri runtime setup
├── capabilities/         Permissions manifest
└── icons/                App icons
```

---

- Harness used - opencode + deepseek v4 pro (43M tokens exhausted - 0.6$)
