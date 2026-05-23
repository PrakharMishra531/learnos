import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, type Deck } from "../lib/supabase";
import { tryParseJSON } from "../lib/jsonHelper";
import FolderRow, { type Folder } from "./FolderRow";
import { FiClipboard, FiDownload, FiTrash2, FiBookOpen, FiArrowLeft, FiChevronDown, FiChevronRight, FiFolderPlus } from "react-icons/fi";

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
  const [folders, setFolders] = useState<Folder[]>([]);
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

  const supabaseReady = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    if (!supabaseReady) { setDecksError("Supabase not configured."); setDecksLoading(false); return; }
    setDecksError("");
    const [deckRes, folderRes] = await Promise.all([
      supabase.from("decks").select("*").order("created_at", { ascending: false }),
      supabase.from("folders").select("*").eq("item_type", "flashcards").order("position"),
    ]);
    if (deckRes.error) setDecksError("Failed: " + deckRes.error.message);
    else if (deckRes.data) setDecks(deckRes.data);
    if (folderRes.data) setFolders(folderRes.data);
    setDecksLoading(false);
  }, [supabaseReady]);

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
    const { data: deckData, error: deckErr } = await supabase.from("decks").insert({ name: parsed.deckName }).select().single();
    if (deckErr || !deckData) { setError("Failed: " + (deckErr?.message || "unknown")); setLoading(false); return; }
    const cards = parsed.cards.map((c, i) => ({ deck_id: deckData.id, front: c.front, back: c.back, position: i }));
    const { error: cardsErr } = await supabase.from("cards").insert(cards);
    if (cardsErr) setError("Failed: " + cardsErr.message);
    else { setJsonInput(""); setImportOpen(false); fetchData(); }
    setLoading(false);
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); await supabase.from("decks").delete().eq("id", id); setDecks((p) => p.filter((d) => d.id !== id)); };
  const startRename = (d: Deck, e: React.MouseEvent) => { e.stopPropagation(); setRenaming(d.id); setRenameValue(d.name); };
  const commitRename = async (id: string) => {
    if (renameValue.trim()) { await supabase.from("decks").update({ name: renameValue.trim() }).eq("id", id); setDecks((p) => p.map((d) => (d.id === id ? { ...d, name: renameValue.trim() } : d))); }
    setRenaming(null);
  };
  const moveToFolder = async (deckId: string, folderId: string | null) => {
    await supabase.from("decks").update({ folder_id: folderId }).eq("id", deckId);
    setDecks((p) => p.map((d) => (d.id === deckId ? { ...d, folder_id: folderId } : d)));
  };
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const pos = folders.length;
    const { data } = await supabase.from("folders").insert({ name, item_type: "flashcards", position: pos }).select().single();
    if (data) { setFolders((p) => [...p, data]); setNewFolderName(""); setNewFolderOpen(false); }
  };
  const renameFolder = async (id: string, name: string) => {
    await supabase.from("folders").update({ name }).eq("id", id);
    setFolders((p) => p.map((f) => (f.id === id ? { ...f, name } : f)));
  };
  const deleteFolder = async (id: string) => { await supabase.from("folders").delete().eq("id", id); setFolders((p) => p.filter((f) => f.id !== id)); setDecks((p) => p.map((d) => (d.folder_id === id ? { ...d, folder_id: null } : d))); };
  const removeFromFolder = async (deckId: string) => { await moveToFolder(deckId, null); };

  const uncategorized = decks.filter((d) => !d.folder_id);

  const renderDeckCard = (deck: Deck, idx: number) => (
    <div key={deck.id} className="deck-card"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("deckId", deck.id); e.dataTransfer.setData("fromFolder", deck.folder_id || ""); e.dataTransfer.effectAllowed = "move"; }}
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

      <section className="flashcards-decks-section"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("deckId"); if (id) removeFromFolder(id); }}>
        <div className="section-head">
          <h2>Your Decks</h2>
          <p className={`section-desc ${decksError ? "section-desc-error" : ""}`}>
            {decksError ? decksError : decksLoading ? "Loading..." : `${decks.length} deck${decks.length !== 1 ? "s" : ""}`}
          </p>
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
              onDropItem={(folderId, dt) => { const did = dt.getData("deckId"); if (did) moveToFolder(did, folderId); }}
            >
              <div className="deck-grid deck-grid-compact">
                {items.map((deck) => (
                  <div key={deck.id} className="deck-card"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("deckId", deck.id); e.dataTransfer.setData("fromFolder", deck.folder_id || ""); e.dataTransfer.effectAllowed = "move"; e.stopPropagation(); }}
                    onClick={() => navigate(`/deck/${deck.id}`)}>
                    <div className="deck-card-content">
                      <div className="deck-card-icon"><FiBookOpen /></div>
                      <h3 className="deck-card-name">{deck.name}</h3>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="folder-empty-hint">Drop decks here</p>}
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
