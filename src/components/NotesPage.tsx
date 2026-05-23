import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { FiClipboard, FiDownload, FiTrash2, FiFileText, FiArrowLeft, FiChevronDown, FiChevronRight } from "react-icons/fi";

interface NoteListItem {
  id: string;
  topic: string;
  created_at: string;
}

const NOTES_PROMPT = `Based on our entire conversation above, create a well-structured set of study notes covering everything we discussed. These notes should be readable independently — someone should be able to understand the topic just from these notes.

Use this EXACT JSON format — no extra text, no markdown wrapper, just valid JSON:

{
  "topic": "Concise Topic Name",
  "content": "# Topic Title\\n\\n## Section 1\\n\\nClear explanation with **key terms** highlighted. Use > blockquotes for important takeaways.\\n\\n## Section 2\\n\\nInclude code where relevant:\\n\\n\`\`\`python\\ndef example():\\n    pass\\n\`\`\`\\n\\nKey formula: $$O(n \\\\log n)$$\\n\\n### Subsection\\n\\nDeeper details..."
}

Guidelines:
- topic: A short, specific title (4-8 words) summarizing what the notes cover
- content: Full markdown — use headings (##, ###), bold for key terms, > blockquotes for critical takeaways, \`inline code\` and \`\`\`lang blocks for code, $$...$$ for math
- Depth: Enough that reading these notes 2 weeks later fully refreshes the topic
- Structure: Logical flow from fundamentals → details → edge cases → key insights
- Highlight the 3-5 most important points with > blockquotes or **bold**
- Output ONLY the JSON — no preamble, no commentary`;

const NOTES_EXAMPLE = `{
  "topic": "BFS & Matrix Traversal Patterns",
  "content": "# Breadth-First Search & Matrix Traversal\\n\\n## Core Algorithm\\n\\nBFS explores a graph level by level using a **queue**. Starting from a source node, it visits all neighbors before moving to the next level.\\n\\n> **Key insight**: BFS on an unweighted graph guarantees the shortest path in terms of number of edges.\\n\\n### Time & Space Complexity\\n\\n$$O(V + E)$$ with adjacency list\\n\\nEach vertex is enqueued at most once; each edge examined twice (once from each endpoint).\\n\\n\\\`\\\`\\\`python\\nfrom collections import deque\\n\\ndef bfs(graph, start):\\n    visited = set()\\n    q = deque([start])\\n    visited.add(start)\\n    while q:\\n        node = q.popleft()\\n        for neighbor in graph[node]:\\n            if neighbor not in visited:\\n                visited.add(neighbor)\\n                q.append(neighbor)\\n\\\`\\\`\\\`\\n\\n## Multi-Source BFS\\n\\nProblems like **Rotting Oranges** or **Walls and Gates** require starting BFS from **multiple sources simultaneously**.\\n\\n> **Pattern**: Initialize the queue with ALL starting nodes at time 0. Process level by level — all nodes at distance d are processed before any at distance d+1.\\n\\n### Rotting Oranges Pattern\\n\\n1. Enqueue all rotten oranges with time = 0\\n2. Count fresh oranges\\n3. For each BFS level, spread rot to adjacent fresh cells, decrement fresh count\\n4. Return max time reached, or -1 if fresh count > 0\\n\\n\\\`\\\`\\\`python\\ndef orangesRotting(grid):\\n    rows, cols = len(grid), len(grid[0])\\n    q = deque()\\n    fresh = 0\\n    for r in range(rows):\\n        for c in range(cols):\\n            if grid[r][c] == 2:\\n                q.append((r, c, 0))\\n            elif grid[r][c] == 1:\\n                fresh += 1\\n    if fresh == 0: return 0\\n    max_time = 0\\n    dirs = [(1,0),(-1,0),(0,1),(0,-1)]\\n    while q:\\n        r, c, t = q.popleft()\\n        max_time = max(max_time, t)\\n        for dr, dc in dirs:\\n            nr, nc = r + dr, c + dc\\n            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:\\n                grid[nr][nc] = 2\\n                fresh -= 1\\n                q.append((nr, nc, t + 1))\\n    return max_time if fresh == 0 else -1\\n\\\`\\\`\\\`\\n\\n## BFS vs DFS — When to Use Each\\n\\n| Property | BFS | DFS |\\n|---:|:---|:---|\\n| Data structure | Queue | Stack (or recursion) |\\n| Shortest path (unweighted) | Yes | No |\\n| Memory (wide graphs) | High | Low |\\n| Cycle detection | Works | Works |\\n| Topological sort | No | Yes |\\n| Connected components | Yes | Yes |\\n\\n> **Choose BFS** when you need shortest path or level-order processing. **Choose DFS** for exhaustive exploration, backtracking, or topological ordering.\\n\\n## Common Pitfalls\\n\\n- Forgetting to mark nodes as visited **before** enqueuing (causes duplicates)\\n- Not counting fresh oranges before BFS (missing the O(1) termination check)\\n- Using a list instead of deque for the queue (O(n) pop vs O(1) popleft)"
}`;

function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [copied, setCopied] = useState<"prompt" | "example" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const supabaseReady = isSupabaseConfigured();

  const fetchNotes = useCallback(async () => {
    if (!supabaseReady) { setNotesError("Supabase not configured."); setNotesLoading(false); return; }
    setNotesError("");
    setNotesLoading(true);
    const { data, error: err } = await supabase.from("notes").select("id,topic,created_at").order("created_at", { ascending: false });
    if (err) setNotesError("Failed to load: " + err.message);
    else if (data) setNotes(data);
    setNotesLoading(false);
  }, [supabaseReady]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const copyText = async (text: string, kind: "prompt" | "example") => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleImport = async () => {
    setError("");
    if (!jsonInput.trim()) { setError("Paste JSON content first."); return; }
    let parsed: { topic?: string; content?: string };
    try { parsed = JSON.parse(jsonInput); } catch { setError("Invalid JSON."); return; }
    if (!parsed.topic || !parsed.content) { setError("JSON must have 'topic' and 'content'."); return; }

    setLoading(true);
    const { error: err } = await supabase.from("notes").insert({ topic: parsed.topic, content: parsed.content });
    if (err) setError("Failed to save: " + err.message);
    else { setJsonInput(""); setImportOpen(false); fetchNotes(); }
    setLoading(false);
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const startRename = (note: NoteListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenaming(note.id);
    setRenameValue(note.topic);
  };

  const commitRename = async (id: string) => {
    const topic = renameValue.trim();
    if (topic) {
      await supabase.from("notes").update({ topic }).eq("id", id);
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, topic } : n)));
    }
    setRenaming(null);
  };

  return (
    <div className="flashcards-page">
      <div className="flashcards-topbar">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          <FiArrowLeft /> LearnOS
        </button>
        <h1 className="flashcards-heading">Notes</h1>
        <div style={{ width: 100 }} />
      </div>

      <section className="flashcards-decks-section">
        <div className="section-head">
          <h2>Your Notes</h2>
          <p className={`section-desc ${notesError ? "section-desc-error" : ""}`}>
            {notesError ? notesError : notesLoading ? "Loading..." : notes.length === 0 ? "No notes yet. Import one below." : `${notes.length} note${notes.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="deck-grid">
          {notes.map((note, i) => (
            <div key={note.id} className="deck-card"
              onClick={() => navigate(`/note/${note.id}`)}
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="deck-card-content">
                <div className="deck-card-icon"><FiFileText /></div>
                {renaming === note.id ? (
                  <input className="deck-rename-input" value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(note.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(note.id); if (e.key === "Escape") setRenaming(null); }}
                    onClick={(e) => e.stopPropagation()} autoFocus />
                ) : (
                  <h3 className="deck-card-name" onClick={(e) => startRename(note, e)} title="Click to rename">
                    {note.topic}
                  </h3>
                )}
              </div>
              <button className="btn-danger deck-delete-btn" onClick={(e) => deleteNote(note.id, e)} title="Delete"><FiTrash2 /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="flashcards-import-section">
        <button className="flashcards-import-toggle" onClick={() => setImportOpen(!importOpen)}>
          {importOpen ? <FiChevronDown /> : <FiChevronRight />}
          <span>{importOpen ? "Close Import" : "Import New Note"}</span>
        </button>
        {importOpen && (
          <div className="flashcards-import-body">
            <textarea className="import-textarea" value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setError(""); }}
              placeholder='{"topic": "Topic Name", "content": "# Title\\n\\nNotes content in markdown..."}'
              rows={8} />
            {error && <p className="error-text">{error}</p>}
            <div className="flashcards-import-actions">
              <button className="btn-primary" onClick={handleImport} disabled={loading}>
                <FiDownload /> {loading ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        )}
      </section>

      <details className="flashcards-prompt-details">
        <summary className="example-summary"><span>LLM Prompt &amp; example note JSON (for reference)</span></summary>
        <div className="prompt-card" style={{ marginTop: "0.75rem" }}>
          <div className="prompt-content"><pre className="prompt-pre">{NOTES_PROMPT}</pre></div>
          <button className="btn-primary" onClick={() => copyText(NOTES_PROMPT, "prompt")} style={{ margin: "0.5rem 1rem 0.75rem" }}>
            <FiClipboard /> {copied === "prompt" ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="example-jsons" style={{ marginTop: "0.75rem" }}>
          <div className="example-block">
            <div className="example-label">
              <span>Example: BFS & Matrix Traversal Notes</span>
              <button className="btn-ghost" onClick={() => copyText(NOTES_EXAMPLE, "example")} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}>
                {copied === "example" ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="prompt-pre">{NOTES_EXAMPLE}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}

export default NotesPage;
