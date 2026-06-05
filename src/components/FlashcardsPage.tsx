import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db, makeId, now, type Deck, type Folder as DBFolder } from "../lib/db";
import { tryParseJSON } from "../lib/jsonHelper";
import FolderRow from "./FolderRow";
import { saveBackup, exportFlashcards } from "../lib/backup";
import { FiClipboard, FiDownload, FiTrash2, FiBookOpen, FiArrowLeft, FiChevronDown, FiChevronRight, FiFolderPlus, FiUpload, FiX } from "react-icons/fi";

const EXAMPLE_PROMPT = `Based on our conversation above, create 10-15 high-quality flashcards for revision.
Use this EXACT JSON format — no extra text, no markdown wrapper, just valid JSON:

{
  "deckName": "Topic Name Here",
  "cards": [
    {
      "front": "Question text (supports Markdown: **bold**, \`inline code\`, $$x^2$$)",
      "back": "Answer text. Use \`\`\`python\\ncode here\\n\`\`\` for code blocks, $$...$$ for display math, and $...$ for inline math."
    }
  ]
}

Guidelines for cards:
- front: A specific, answerable question or prompt (8-20 words)
- back: A thorough answer — include key formulas as $$...$$, code snippets as \`\`\`lang blocks, and conceptual explanations
- Use language identifiers for code: python, cpp, java, typescript, sql, etc.
- Balance theory, implementation, and edge cases across the deck

CRITICAL — valid JSON (follow the example above exactly):
- ALL newlines must be written as \\n, never actual line breaks
- ALL LaTeX backslashes must be doubled: \\\\frac not \\frac, \\\\log not \\log, \\\\times not \\times
- Code blocks must use TRIPLE backticks: \\\`\\\`\\\`python NOT single \\\`
- Output ONLY the JSON — no preamble, no commentary`;

const EXAMPLE_JSON = `{
  "deckName": "Graph Algorithms — Matrix BFS",
  "cards": [
    {
      "front": "**Rotting Oranges**: Given a grid where 0 = empty, 1 = fresh, 2 = rotten — find minimum minutes for all fresh oranges to rot.",
      "back": "## Matrix BFS / Multi-source BFS\\n\\n**Intuition**: Start BFS from ALL rotten oranges simultaneously.\\n\\n**Complexity**: $$O(m \\\\times n)$$\\n\\n\`\`\`python\\nfrom collections import deque\\nq = deque()\\n# enqueue all rotten oranges\\n\`\`\`"
    }
  ]
}`;

const EXAMPLE_MINIMAL = `{
  "deckName": "Two Sum",
  "cards": [{"front": "Given array \`nums\` and target, return indices of two numbers summing to target.", "back": "## Hash Map\\n\\n$$O(n)$$\\n\\n\`\`\`python\\ndef twoSum(nums, target):\\n    seen = {}\\n    for i, v in enumerate(nums):\\n        comp = target - v\\n        if comp in seen:\\n            return [seen[comp], i]\\n        seen[v] = i\\n\`\`\`"}]
}`;

function FlashcardsPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<DBFolder[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decksLoading, setDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState("");
  const [copied, setCopied] = useState<"prompt" | "json" | "minimal" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [exportMsg, setExportMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setDecksError("");
    try {
      const [deckData, folderData] = await Promise.all([
        db.decks.orderBy("created_at").reverse().toArray(),
        db.folders.where("item_type").equals("flashcards").sortBy("position"),
      ]);
      setDecks(deckData);
      setFolders(folderData);
    } catch (e) {
      setDecksError("Failed: " + (e as Error).message);
    }
    setDecksLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyToClipboard = async (text: string, kind: "prompt" | "json" | "minimal") => {
    await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 2000);
  };

  const handleImport = async () => {
    setError("");
    if (!jsonInput.trim()) { setError("Paste JSON first."); return; }
    const result = tryParseJSON(jsonInput);
    if (!result.success) { setError("Invalid JSON: " + result.error); return; }
    const parsed = result.data as { deckName?: string; cards?: { front: string; back: string }[] };
    if (!parsed.deckName || !Array.isArray(parsed.cards) || parsed.cards.length === 0) { setError("JSON must have 'deckName' (string) and 'cards' (non-empty array)."); return; }
    setLoading(true);
    try {
      const ts = now();
      const deckId = makeId();
      await db.decks.add({ id: deckId, name: parsed.deckName, folder_id: null, created_at: ts, updated_at: ts });
      const cards = parsed.cards.map((c, i) => ({
        id: makeId(),
        deck_id: deckId,
        front: c.front,
        back: c.back,
        position: i,
        created_at: ts,
      }));
      await db.cards.bulkAdd(cards);
      saveBackup(jsonInput, "flashcards", parsed.deckName);
      setJsonInput(""); setImportOpen(false); fetchData();
    } catch (e) {
      setError("Failed: " + (e as Error).message);
    }
    setLoading(false);
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); await db.decks.delete(id); await db.cards.where("deck_id").equals(id).delete(); setDecks((p) => p.filter((d) => d.id !== id)); };
  const startRename = (d: Deck, e: React.MouseEvent) => { e.stopPropagation(); setRenaming(d.id); setRenameValue(d.name); };
  const commitRename = async (id: string) => {
    if (renameValue.trim()) { await db.decks.update(id, { name: renameValue.trim(), updated_at: now() }); setDecks((p) => p.map((d) => (d.id === id ? { ...d, name: renameValue.trim() } : d))); }
    setRenaming(null);
  };
  const moveToFolder = async (deckId: string, folderId: string | null) => {
    await db.decks.update(deckId, { folder_id: folderId, updated_at: now() });
    setDecks((p) => p.map((d) => (d.id === deckId ? { ...d, folder_id: folderId } : d)));
  };
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const pos = folders.length;
    const id = makeId();
    const folder: DBFolder = { id, name, item_type: "flashcards", position: pos, created_at: now() };
    await db.folders.add(folder);
    setFolders((p) => [...p, folder]);
    setNewFolderName("");
    setNewFolderOpen(false);
  };
  const renameFolder = async (id: string, name: string) => {
    await db.folders.update(id, { name });
    setFolders((p) => p.map((f) => (f.id === id ? { ...f, name } : f)));
  };
  const deleteFolder = async (id: string) => {
    await db.folders.delete(id);
    setFolders((p) => p.filter((f) => f.id !== id));
    setDecks((p) => p.map((d) => (d.folder_id === id ? { ...d, folder_id: null } : d)));
    await db.decks.where("folder_id").equals(id).modify({ folder_id: null });
  };
  const removeFromFolder = async (deckId: string) => { await moveToFolder(deckId, null); };

  const handleAddToFolder = (folderId: string, itemName: string): boolean => {
    const item = decks.find((d) => d.name.toLowerCase() === itemName.toLowerCase() || d.name.toLowerCase().includes(itemName.toLowerCase()));
    if (item && !item.folder_id) {
      moveToFolder(item.id, folderId);
      return true;
    }
    return false;
  };

  const handleExport = async () => {
    setExportMsg("");
    setExporting(true);
    try {
      const result = await exportFlashcards();
      setExportMsg(`Exported ${result.count} deck(s) to ${result.path}`);
    } catch (e) {
      setExportMsg("Export failed: " + (e as Error).message);
    }
    setExporting(false);
  };

  const uncategorized = decks.filter((d) => !d.folder_id);

  const renderDeckCard = (deck: Deck, idx: number, inFolder = false) => (
    <div key={deck.id} className="deck-card"
      onClick={() => navigate(`/deck/${deck.id}`)}
      style={{ animationDelay: `${idx * 0.03}s` }}>
      <div className="deck-card-content">
        <div className="deck-card-icon"><FiBookOpen /></div>
        {renaming === deck.id ? (
          <input className="deck-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => commitRename(deck.id)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(deck.id); if (e.key === "Escape") setRenaming(null); }} onClick={(e) => e.stopPropagation()} autoFocus />
        ) : (
          <h3 className="deck-card-name" onClick={(e) => startRename(deck, e)} title="Click to rename">{deck.name}</h3>
        )}
      </div>
      {inFolder && (
        <button className="folder-item-remove" onClick={(e) => { e.stopPropagation(); removeFromFolder(deck.id); }} title="Remove from folder">
          <FiX size={14} />
        </button>
      )}
      <button className="btn-danger deck-delete-btn" onClick={(e) => deleteDeck(deck.id, e)} title="Delete"><FiTrash2 /></button>
    </div>
  );

  return (
    <div className="flashcards-page">
      <div className="flashcards-topbar">
        <button className="btn-ghost" onClick={() => navigate("/")}><FiArrowLeft /> LearnOS</button>
        <h1 className="flashcards-heading">Flashcards</h1>
        <div style={{ width: 100 }} />
      </div>

      <section className="flashcards-decks-section">
        <div className="section-head">
          <h2>Your Decks</h2>
          <div className="section-head-actions">
            {exportMsg && <span className="export-msg">{exportMsg}</span>}
            <button className="btn-ghost" onClick={handleExport} disabled={exporting} title="Export all flashcards as JSON">
              <FiUpload /> {exporting ? "Exporting..." : "Export All"}
            </button>
            <p className={`section-desc ${decksError ? "section-desc-error" : ""}`}>
              {decksError ? decksError : decksLoading ? "Loading..." : `${decks.length} deck${decks.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className="deck-grid" style={{ marginBottom: uncategorized.length > 0 ? "1rem" : 0 }}>
          {uncategorized.map((deck, idx) => renderDeckCard(deck, idx))}
        </div>

        {folders.map((folder) => {
          const items = decks.filter((d) => d.folder_id === folder.id);
          return (
            <FolderRow
              key={folder.id}
              folder={folder}
              itemCount={items.length}
              defaultOpen={items.length > 0}
              onRename={renameFolder}
              onDelete={deleteFolder}
              onAddItem={handleAddToFolder}
            >
              <div className="deck-grid deck-grid-compact">
                {items.map((deck, idx) => renderDeckCard(deck, idx, true))}
                {items.length === 0 && <p className="folder-empty-hint">No decks yet &mdash; click + to add</p>}
              </div>
            </FolderRow>
          );
        })}

        <div className="folder-actions">
          {newFolderOpen ? (
            <div className="folder-create-row">
              <input className="folder-create-input" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setNewFolderOpen(false); setNewFolderName(""); } }} placeholder="Folder name..." autoFocus />
              <button className="btn-ghost" onClick={createFolder} style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Create</button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setNewFolderOpen(true)}><FiFolderPlus /> New Folder</button>
          )}
        </div>
      </section>

      <section className="flashcards-import-section">
        <button className="flashcards-import-toggle" onClick={() => setImportOpen(!importOpen)}>
          {importOpen ? <FiChevronDown /> : <FiChevronRight />} <span>{importOpen ? "Close Import" : "Import New Deck"}</span>
        </button>
        {importOpen && (
          <div className="flashcards-import-body">
            <textarea className="import-textarea" value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setError(""); }} placeholder='{"deckName": "...", "cards": [...]}' rows={8} />
            {error && <p className="error-text">{error}</p>}
            <div className="flashcards-import-actions">
              <button className="btn-primary" onClick={handleImport} disabled={loading}><FiDownload /> {loading ? "Creating..." : "Create Deck"}</button>
            </div>
          </div>
        )}
      </section>

      <details className="flashcards-prompt-details">
        <summary className="example-summary"><span>LLM Prompt &amp; example JSON (for reference)</span></summary>
        <div className="prompt-card" style={{ marginTop: "0.75rem" }}>
          <div className="prompt-content"><pre className="prompt-pre">{EXAMPLE_PROMPT}</pre></div>
          <button className="btn-primary" onClick={() => copyToClipboard(EXAMPLE_PROMPT, "prompt")} style={{ margin: "0.5rem 1rem 0.75rem" }}><FiClipboard /> {copied === "prompt" ? "Copied!" : "Copy Prompt"}</button>
        </div>
        <div className="example-jsons" style={{ marginTop: "0.75rem" }}>
          <div className="example-block"><div className="example-label"><span>Example: Graph Algorithms</span><button className="btn-ghost" onClick={() => copyToClipboard(EXAMPLE_JSON, "json")} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}>{copied === "json" ? "Copied!" : "Copy"}</button></div><pre className="prompt-pre">{EXAMPLE_JSON}</pre></div>
          <div className="example-block"><div className="example-label"><span>Example: Minimal (Two Sum)</span><button className="btn-ghost" onClick={() => copyToClipboard(EXAMPLE_MINIMAL, "minimal")} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}>{copied === "minimal" ? "Copied!" : "Copy"}</button></div><pre className="prompt-pre">{EXAMPLE_MINIMAL}</pre></div>
        </div>
      </details>
    </div>
  );
}

export default FlashcardsPage;
