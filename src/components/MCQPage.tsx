import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db, makeId, now, type MCQDeck, type Folder as DBFolder } from "../lib/db";
import { tryParseJSON } from "../lib/jsonHelper";
import FolderRow from "./FolderRow";
import { FiClipboard, FiDownload, FiTrash2, FiGrid, FiArrowLeft, FiChevronDown, FiChevronRight, FiFolderPlus } from "react-icons/fi";

const MCQ_PROMPT = `Based on our conversation above, create 15-20 high-quality conceptual MCQs that deepen understanding and fill knowledge gaps. These are for LEARNING, not just testing — each question should teach something.

Use this EXACT JSON format — no extra text, no markdown wrapper, just valid JSON:

{
  "deckName": "Topic Name Here",
  "questions": [
    {
      "question": "Question text (supports Markdown: **bold**, \`code\`, $$x^2$$)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2,
      "explanation": "Why option C is correct and why the others are wrong. Reference the concepts involved."
    }
  ]
}

Guidelines:
- correctIndex is 0-based (0 = A, 1 = B, 2 = C, 3 = D)
- question: A clear, focused question that tests conceptual understanding, not memorization
- options: All 4 must be plausible — distractors should target common misconceptions. Use inline $...$ for math in options
- explanation: 2-4 sentences on WHY the correct answer is right AND what misconception each distractor corresponds to
- Cover edge cases, conceptual pitfalls, and non-obvious insights — not just definitions

CRITICAL — valid JSON (follow the example above exactly):
- ALL newlines must be written as \\n, never actual line breaks
- ALL LaTeX backslashes must be doubled: \\\\frac not \\frac, \\\\log not \\log
- Output ONLY the JSON — no preamble, no commentary`;

const MCQ_EXAMPLE = `{
  "deckName": "Graph Algorithms — Depth & Breadth",
  "questions": [
    {
      "question": "You run BFS on an undirected graph starting from vertex A. After processing, the distance array shows \`dist[B] = 6\`. What does this **not** guarantee?",
      "options": ["There is a path from A to B", "The shortest path from A to B has exactly 6 edges", "B was discovered in the 6th level of BFS", "There are at most 6 edges between A and B"],
      "correctIndex": 3,
      "explanation": "BFS on an unweighted graph guarantees the shortest path — so dist[B] = 6 means the shortest path has EXACTLY 6 edges (B), not just 'at most'. This is a common confusion: BFS doesn't give an upper bound, it gives the exact minimum."
    }
  ]
}`;

function MCQPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<MCQDeck[]>([]);
  const [folders, setFolders] = useState<DBFolder[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decksLoading, setDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState("");
  const [copied, setCopied] = useState<"prompt" | "example" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fetchData = useCallback(async () => {
    setDecksError("");
    try {
      const [deckData, folderData] = await Promise.all([
        db.mcq_decks.orderBy("created_at").reverse().toArray(),
        db.folders.where("item_type").equals("mcq").sortBy("position"),
      ]);
      setDecks(deckData);
      setFolders(folderData);
    } catch (e) {
      setDecksError("Failed: " + (e as Error).message);
    }
    setDecksLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const copyText = async (text: string, kind: "prompt" | "example") => { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 2000); };

  const handleImport = async () => {
    setError(""); if (!jsonInput.trim()) { setError("Paste JSON first."); return; }
    const result = tryParseJSON(jsonInput);
    if (!result.success) { setError("Invalid JSON: " + result.error); return; }
    const parsed = result.data as { deckName?: string; questions?: { question: string; options: string[]; correctIndex: number; explanation: string }[] };
    if (!parsed.deckName || !Array.isArray(parsed.questions) || parsed.questions.length === 0) { setError("Need deckName + questions array."); return; }
    for (const q of parsed.questions) { if (!Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) { setError("Each question needs 4 options and correctIndex (0-3)."); return; } }
    setLoading(true);
    try {
      const ts = now();
      const deckId = makeId();
      await db.mcq_decks.add({ id: deckId, name: parsed.deckName, folder_id: null, created_at: ts, updated_at: ts });
      const qs = parsed.questions.map((q, i) => ({
        id: makeId(),
        deck_id: deckId,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation || "",
        position: i,
        created_at: ts,
      }));
      await db.mcq_questions.bulkAdd(qs);
      setJsonInput(""); setImportOpen(false); fetchData();
    } catch (e) {
      setError("Failed: " + (e as Error).message);
    }
    setLoading(false);
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); await db.mcq_decks.delete(id); await db.mcq_questions.where("deck_id").equals(id).delete(); setDecks((p) => p.filter((d) => d.id !== id)); };
  const startRename = (d: MCQDeck, e: React.MouseEvent) => { e.stopPropagation(); setRenaming(d.id); setRenameValue(d.name); };
  const commitRename = async (id: string) => { if (renameValue.trim()) { await db.mcq_decks.update(id, { name: renameValue.trim(), updated_at: now() }); setDecks((p) => p.map((d) => (d.id === id ? { ...d, name: renameValue.trim() } : d))); } setRenaming(null); };
  const moveToFolder = async (did: string, fid: string | null) => { await db.mcq_decks.update(did, { folder_id: fid, updated_at: now() }); setDecks((p) => p.map((d) => (d.id === did ? { ...d, folder_id: fid } : d))); };
  const createFolder = async () => { const n = newFolderName.trim(); if (!n) return; const id = makeId();     const folder: DBFolder = { id, name: n, item_type: "mcq", position: folders.length, created_at: now() }; await db.folders.add(folder); setFolders((p) => [...p, folder]); setNewFolderName(""); setNewFolderOpen(false); };
  const renameFolder = async (id: string, name: string) => { await db.folders.update(id, { name }); setFolders((p) => p.map((f) => (f.id === id ? { ...f, name } : f))); };
  const deleteFolder = async (id: string) => { await db.folders.delete(id); setFolders((p) => p.filter((f) => f.id !== id)); setDecks((p) => p.map((d) => (d.folder_id === id ? { ...d, folder_id: null } : d))); await db.mcq_decks.where("folder_id").equals(id).modify({ folder_id: null }); };
  const removeFromFolder = async (did: string) => { await moveToFolder(did, null); };
  const uncategorized = decks.filter((d) => !d.folder_id);

  const renderCard = (d: MCQDeck) => (
    <div key={d.id} className="deck-card" draggable onDragStart={(e) => { e.dataTransfer.setData("mcqId", d.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={() => navigate(`/mcq/${d.id}`)}>
      <div className="deck-card-content">
        <div className="deck-card-icon"><FiGrid /></div>
        {renaming === d.id ? (
          <input className="deck-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => commitRename(d.id)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(d.id); if (e.key === "Escape") setRenaming(null); }} onClick={(e) => e.stopPropagation()} autoFocus />
        ) : (
          <h3 className="deck-card-name" onClick={(e) => startRename(d, e)} title="Click to rename">{d.name}</h3>
        )}
      </div>
      <button className="btn-danger deck-delete-btn" onClick={(e) => deleteDeck(d.id, e)} title="Delete"><FiTrash2 /></button>
    </div>
  );

  return (
    <div className="flashcards-page">
      <div className="flashcards-topbar">
        <button className="btn-ghost" onClick={() => navigate("/")}><FiArrowLeft /> LearnOS</button>
        <h1 className="flashcards-heading">MCQ Practice</h1>
        <div style={{ width: 100 }} />
      </div>
      <section className="flashcards-decks-section"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("mcqId"); if (id) removeFromFolder(id); }}>
        <div className="section-head">
          <h2>Your MCQ Decks</h2>
          <p className={`section-desc ${decksError ? "section-desc-error" : ""}`}>{decksError ? decksError : decksLoading ? "Loading..." : `${decks.length} deck${decks.length !== 1 ? "s" : ""}`}</p>
        </div>
        <div className="deck-grid" style={{ marginBottom: uncategorized.length > 0 ? "1rem" : 0 }}>
          {uncategorized.map((d) => renderCard(d))}
        </div>
        {folders.map((f) => {
          const items = decks.filter((d) => d.folder_id === f.id);
          return (
            <FolderRow key={f.id} folder={f} itemCount={items.length} defaultOpen={items.length > 0}
              onRename={renameFolder} onDelete={deleteFolder}
              onDropItem={(fid, dt) => { const mid = dt.getData("mcqId"); if (mid) moveToFolder(mid, fid); }}>
              <div className="deck-grid deck-grid-compact">
                {items.map((d) => renderCard(d))}
                {items.length === 0 && <p className="folder-empty-hint">Drop MCQ decks here</p>}
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
        <button className="flashcards-import-toggle" onClick={() => setImportOpen(!importOpen)}>{importOpen ? <FiChevronDown /> : <FiChevronRight />} <span>{importOpen ? "Close Import" : "Import New MCQ Deck"}</span></button>
        {importOpen && (
          <div className="flashcards-import-body">
            <textarea className="import-textarea" value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setError(""); }} placeholder='{"deckName": "...", "questions": [...]}' rows={8} />
            {error && <p className="error-text">{error}</p>}
            <div className="flashcards-import-actions"><button className="btn-primary" onClick={handleImport} disabled={loading}><FiDownload /> {loading ? "Creating..." : "Create Deck"}</button></div>
          </div>
        )}
      </section>
      <details className="flashcards-prompt-details">
        <summary className="example-summary"><span>LLM Prompt &amp; example MCQ JSON (for reference)</span></summary>
        <div className="prompt-card" style={{ marginTop: "0.75rem" }}>
          <div className="prompt-content"><pre className="prompt-pre">{MCQ_PROMPT}</pre></div>
          <button className="btn-primary" onClick={() => copyText(MCQ_PROMPT, "prompt")} style={{ margin: "0.5rem 1rem 0.75rem" }}><FiClipboard /> {copied === "prompt" ? "Copied!" : "Copy Prompt"}</button>
        </div>
        <div className="example-jsons" style={{ marginTop: "0.75rem" }}>
          <div className="example-block"><div className="example-label"><span>Example: Graph Algorithms MCQs</span><button className="btn-ghost" onClick={() => copyText(MCQ_EXAMPLE, "example")} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}>{copied === "example" ? "Copied!" : "Copy"}</button></div><pre className="prompt-pre">{MCQ_EXAMPLE}</pre></div>
        </div>
      </details>
    </div>
  );
}

export default MCQPage;
