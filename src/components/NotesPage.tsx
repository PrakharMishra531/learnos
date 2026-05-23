import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { tryParseJSON } from "../lib/jsonHelper";
import FolderRow, { type Folder } from "./FolderRow";
import { FiClipboard, FiDownload, FiTrash2, FiFileText, FiArrowLeft, FiChevronDown, FiChevronRight, FiFolderPlus } from "react-icons/fi";

interface NoteItem { id: string; topic: string; folder_id: string | null; created_at: string; }

const NOTES_PROMPT = `Based on our entire conversation above, create a well-structured set of study notes covering everything we discussed. These notes should be readable independently — someone should understand the topic just from these notes.

Use this EXACT JSON format — no extra text, no markdown wrapper, just valid JSON:

{
  "topic": "Concise Topic Name",
  "content": "# Topic Title\\n\\n## Section 1\\n\\nClear explanation with **key terms**. Use > blockquotes for takeaways.\\n\\n## Section 2\\n\\nCode: \`\`\`python\\ndef example():\\n    pass\\n\`\`\`\\n\\nFormula: $$O(n \\\\log n)$$"
}

Guidelines:
- topic: Short specific title (4-8 words)
- content: Full markdown — headings (##, ###), bold, > blockquotes, triple-backtick code blocks \`\`\`lang, LaTeX math $$...$$
- Depth: Enough that reading these notes 2 weeks later fully refreshes the topic
- Structure: Logical flow from fundamentals → details → edge cases → key insights
- Highlight the 3-5 most important points with > blockquotes or **bold**

CRITICAL — valid JSON (follow the example above exactly):
- ALL newlines inside string values must be written as \\n (two characters: backslash + n), never actual Enter/Return
- ALL LaTeX backslashes must be written as double-backslash: \\\\frac not \\frac, \\\\text not \\text, \\\\sum not \\sum
- Code blocks must use TRIPLE backticks: \\\`\\\`\\\`python NOT single \\\`
- See the example JSON above for the exact format

Output ONLY the JSON — no preamble, no commentary`;

const NOTES_EXAMPLE = `{"topic": "BFS & Matrix Traversal Patterns","content": "# BFS & Matrix Traversal\\n\\n## Core\\n\\nBFS explores level by level using a **queue**.\\n\\n> **Key insight**: BFS on an unweighted graph guarantees the shortest path in edges.\\n\\n$$O(V + E)$$\\n\\n\`\`\`python\\nfrom collections import deque\\ndef bfs(graph, start):\\n    visited = set()\\n    q = deque([start])\\n    while q:\\n        node = q.popleft()\\n        for n in graph[node]:\\n            if n not in visited:\\n                visited.add(n)\\n                q.append(n)\\n\`\`\`\\n\\n## Multi-Source BFS\\n\\n> **Pattern**: Initialize queue with ALL starting nodes at time 0. Process level by level."}`;

function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [copied, setCopied] = useState<"prompt" | "example" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const supabaseReady = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    if (!supabaseReady) { setNotesError("Supabase not configured."); setNotesLoading(false); return; }
    setNotesError("");
    const [noteRes, folderRes] = await Promise.all([
      supabase.from("notes").select("id,topic,folder_id,created_at").order("created_at", { ascending: false }),
      supabase.from("folders").select("*").eq("item_type", "notes").order("position"),
    ]);
    if (noteRes.error) setNotesError("Failed: " + noteRes.error.message);
    else if (noteRes.data) setNotes(noteRes.data);
    if (folderRes.data) setFolders(folderRes.data);
    setNotesLoading(false);
  }, [supabaseReady]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const copyText = async (text: string, kind: "prompt" | "example") => { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 2000); };

  const handleImport = async () => {
    setError(""); if (!jsonInput.trim()) { setError("Paste JSON first."); return; }
    const result = tryParseJSON(jsonInput);
    if (!result.success) { setError("Invalid JSON: " + result.error); return; }
    const parsed = result.data as { topic?: string; content?: string };
    if (!parsed.topic || !parsed.content) { setError("Need topic + content."); return; }
    setLoading(true);
    const { error: err } = await supabase.from("notes").insert({ topic: parsed.topic, content: parsed.content });
    if (err) setError("Failed: " + err.message); else { setJsonInput(""); setImportOpen(false); fetchData(); }
    setLoading(false);
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); await supabase.from("notes").delete().eq("id", id); setNotes((p) => p.filter((n) => n.id !== id)); };
  const startRename = (n: NoteItem, e: React.MouseEvent) => { e.stopPropagation(); setRenaming(n.id); setRenameValue(n.topic); };
  const commitRename = async (id: string) => { if (renameValue.trim()) { await supabase.from("notes").update({ topic: renameValue.trim() }).eq("id", id); setNotes((p) => p.map((n) => (n.id === id ? { ...n, topic: renameValue.trim() } : n))); } setRenaming(null); };
  const moveToFolder = async (nid: string, fid: string | null) => { await supabase.from("notes").update({ folder_id: fid }).eq("id", nid); setNotes((p) => p.map((n) => (n.id === nid ? { ...n, folder_id: fid } : n))); };
  const createFolder = async () => { const n = newFolderName.trim(); if (!n) return; const { data } = await supabase.from("folders").insert({ name: n, item_type: "notes", position: folders.length }).select().single(); if (data) { setFolders((p) => [...p, data]); setNewFolderName(""); setNewFolderOpen(false); } };
  const renameFolder = async (id: string, name: string) => { await supabase.from("folders").update({ name }).eq("id", id); setFolders((p) => p.map((f) => (f.id === id ? { ...f, name } : f))); };
  const deleteFolder = async (id: string) => { await supabase.from("folders").delete().eq("id", id); setFolders((p) => p.filter((f) => f.id !== id)); setNotes((p) => p.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n))); };
  const removeFromFolder = async (nid: string) => { await moveToFolder(nid, null); };
  const uncategorized = notes.filter((n) => !n.folder_id);

  const renderCard = (n: NoteItem) => (
    <div key={n.id} className="deck-card" draggable onDragStart={(e) => { e.dataTransfer.setData("noteId", n.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={() => navigate(`/note/${n.id}`)}>
      <div className="deck-card-content">
        <div className="deck-card-icon"><FiFileText /></div>
        {renaming === n.id ? (
          <input className="deck-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => commitRename(n.id)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(n.id); if (e.key === "Escape") setRenaming(null); }} onClick={(e) => e.stopPropagation()} autoFocus />
        ) : (
          <h3 className="deck-card-name" onClick={(e) => startRename(n, e)} title="Click to rename">{n.topic}</h3>
        )}
      </div>
      <button className="btn-danger deck-delete-btn" onClick={(e) => deleteNote(n.id, e)} title="Delete"><FiTrash2 /></button>
    </div>
  );

  return (
    <div className="flashcards-page">
      <div className="flashcards-topbar">
        <button className="btn-ghost" onClick={() => navigate("/")}><FiArrowLeft /> LearnOS</button>
        <h1 className="flashcards-heading">Notes</h1>
        <div style={{ width: 100 }} />
      </div>
      <section className="flashcards-decks-section"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("noteId"); if (id) removeFromFolder(id); }}>
        <div className="section-head">
          <h2>Your Notes</h2>
          <p className={`section-desc ${notesError ? "section-desc-error" : ""}`}>{notesError ? notesError : notesLoading ? "Loading..." : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}</p>
        </div>
        <div className="deck-grid" style={{ marginBottom: uncategorized.length > 0 ? "1rem" : 0 }}>
          {uncategorized.map((n) => renderCard(n))}
        </div>
        {folders.map((f) => {
          const items = notes.filter((n) => n.folder_id === f.id);
          return (
            <FolderRow key={f.id} folder={f} itemCount={items.length} defaultOpen={items.length > 0}
              onRename={renameFolder} onDelete={deleteFolder}
              onDropItem={(fid, dt) => { const nid = dt.getData("noteId"); if (nid) moveToFolder(nid, fid); }}>
              <div className="deck-grid deck-grid-compact">
                {items.map((n) => renderCard(n))}
                {items.length === 0 && <p className="folder-empty-hint">Drop notes here</p>}
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
        <button className="flashcards-import-toggle" onClick={() => setImportOpen(!importOpen)}>{importOpen ? <FiChevronDown /> : <FiChevronRight />} <span>{importOpen ? "Close Import" : "Import New Note"}</span></button>
        {importOpen && (
          <div className="flashcards-import-body">
            <textarea className="import-textarea" value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setError(""); }} placeholder='{"topic": "...", "content": "# Title\\n\\nNotes..."}' rows={8} />
            {error && <p className="error-text">{error}</p>}
            <div className="flashcards-import-actions"><button className="btn-primary" onClick={handleImport} disabled={loading}><FiDownload /> {loading ? "Saving..." : "Save Note"}</button></div>
          </div>
        )}
      </section>
      <details className="flashcards-prompt-details">
        <summary className="example-summary"><span>LLM Prompt &amp; example note JSON (for reference)</span></summary>
        <div className="prompt-card" style={{ marginTop: "0.75rem" }}>
          <div className="prompt-content"><pre className="prompt-pre">{NOTES_PROMPT}</pre></div>
          <button className="btn-primary" onClick={() => copyText(NOTES_PROMPT, "prompt")} style={{ margin: "0.5rem 1rem 0.75rem" }}><FiClipboard /> {copied === "prompt" ? "Copied!" : "Copy Prompt"}</button>
        </div>
        <div className="example-jsons" style={{ marginTop: "0.75rem" }}>
          <div className="example-block"><div className="example-label"><span>Example: BFS & Matrix Traversal Notes</span><button className="btn-ghost" onClick={() => copyText(NOTES_EXAMPLE, "example")} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}>{copied === "example" ? "Copied!" : "Copy"}</button></div><pre className="prompt-pre">{NOTES_EXAMPLE}</pre></div>
        </div>
      </details>
    </div>
  );
}

export default NotesPage;
