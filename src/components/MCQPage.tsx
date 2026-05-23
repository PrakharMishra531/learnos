import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { FiClipboard, FiDownload, FiTrash2, FiGrid, FiArrowLeft, FiChevronDown, FiChevronRight } from "react-icons/fi";

interface MCQDeck {
  id: string;
  name: string;
  created_at: string;
}

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
- Output ONLY the JSON — no preamble, no commentary`;

const MCQ_EXAMPLE = `{
  "deckName": "Graph Algorithms — Depth & Breadth",
  "questions": [
    {
      "question": "You run BFS on an undirected graph starting from vertex A. After processing, the distance array shows \`dist[B] = 6\`. What does this **not** guarantee?",
      "options": [
        "There is a path from A to B",
        "The shortest path from A to B has exactly 6 edges",
        "B was discovered in the 6th level of BFS",
        "There are at most 6 edges between A and B"
      ],
      "correctIndex": 3,
      "explanation": "BFS on an unweighted graph guarantees the shortest path — so dist[B] = 6 means the shortest path has EXACTLY 6 edges (B), not just 'at most'. This is a common confusion: BFS doesn't give an upper bound, it gives the exact minimum. Option A is trivially true if dist is finite. Option C is also true for BFS level order."
    },
    {
      "question": "A graph has $V$ vertices and $E$ edges. BFS using an adjacency list runs in $$O(V + E)$$. When would BFS run in $$O(V^2)$$ despite using an adjacency list?",
      "options": [
        "When the graph is a tree ($E = V - 1$)",
        "When the graph is dense ($E \\\\approx V^2$)",
        "When the graph has multiple connected components",
        "It never does — adjacency list BFS is always $O(V + E)$"
      ],
      "correctIndex": 1,
      "explanation": "When the graph is dense, $E \\\\approx V^2$, so $O(V + E) \\\\approx O(V^2)$. The complexity bound doesn't change — it's still $O(V+E)$ — but the actual runtime becomes quadratic because $E$ dominates. Options A and C don't increase complexity. Option D is technically true about the bound but misses that dense graphs make the bound $O(V^2)$ in practice."
    },
    {
      "question": "In DFS, a **back edge** connects a node to an ancestor in the DFS tree. What does the presence of a back edge indicate in a **directed** graph?",
      "options": [
        "The graph is bipartite",
        "The graph contains a cycle",
        "The graph is connected",
        "The DFS was implemented incorrectly"
      ],
      "correctIndex": 1,
      "explanation": "In a directed graph, a back edge always creates a cycle (node → descendant → ... → ancestor → node). This is the fundamental cycle detection property of DFS. In an undirected graph, 'back edges' exclude parent edges. Option A (bipartite) is unrelated to back edges. Option C (connected) is about reachability, not cycles."
    }
  ]
}`;

function MCQPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<MCQDeck[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decksLoading, setDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState("");
  const [copied, setCopied] = useState<"prompt" | "example" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const supabaseReady = isSupabaseConfigured();

  const fetchDecks = useCallback(async () => {
    if (!supabaseReady) {
      setDecksError("Supabase not configured.");
      setDecksLoading(false);
      return;
    }
    setDecksError("");
    setDecksLoading(true);
    const { data, error: err } = await supabase
      .from("mcq_decks")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setDecksError("Failed to load: " + err.message);
    } else if (data) {
      setDecks(data);
    }
    setDecksLoading(false);
  }, [supabaseReady]);

  useEffect(() => { fetchDecks(); }, [fetchDecks]);

  const copyText = async (text: string, kind: "prompt" | "example") => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleImport = async () => {
    setError("");
    if (!jsonInput.trim()) { setError("Paste JSON content first."); return; }
    let parsed: { deckName?: string; questions?: { question: string; options: string[]; correctIndex: number; explanation: string }[] };
    try { parsed = JSON.parse(jsonInput); } catch {
      setError("Invalid JSON."); return;
    }
    if (!parsed.deckName || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      setError("JSON must have 'deckName' and 'questions' array."); return;
    }
    for (const q of parsed.questions) {
      if (!Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) {
        setError("Each question needs 4 options and correctIndex (0-3)."); return;
      }
    }

    setLoading(true);
    const { data: deckData, error: deckErr } = await supabase
      .from("mcq_decks").insert({ name: parsed.deckName }).select().single();
    if (deckErr || !deckData) {
      setError("Failed to create deck: " + (deckErr?.message || "unknown"));
      setLoading(false); return;
    }

    const questions = parsed.questions.map((q, i) => ({
      deck_id: deckData.id,
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation || "",
      position: i,
    }));

    const { error: qErr } = await supabase.from("mcq_questions").insert(questions);
    if (qErr) { setError("Failed to save: " + qErr.message); } else {
      setJsonInput(""); setImportOpen(false); fetchDecks();
    }
    setLoading(false);
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("mcq_decks").delete().eq("id", id);
    setDecks((d) => d.filter((x) => x.id !== id));
  };

  const startRename = (deck: MCQDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenaming(deck.id);
    setRenameValue(deck.name);
  };

  const commitRename = async (id: string) => {
    const name = renameValue.trim();
    if (name) {
      await supabase.from("mcq_decks").update({ name }).eq("id", id);
      setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
    }
    setRenaming(null);
  };

  return (
    <div className="flashcards-page">
      <div className="flashcards-topbar">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          <FiArrowLeft /> LearnOS
        </button>
        <h1 className="flashcards-heading">MCQ Practice</h1>
        <div style={{ width: 100 }} />
      </div>

      <section className="flashcards-decks-section">
        <div className="section-head">
          <h2>Your MCQ Decks</h2>
          <p className={`section-desc ${decksError ? "section-desc-error" : ""}`}>
            {decksError ? decksError : decksLoading ? "Loading..." : decks.length === 0 ? "No MCQ decks yet. Import one below." : `${decks.length} deck${decks.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="deck-grid">
          {decks.map((deck, i) => (
            <div key={deck.id} className="deck-card"
              onClick={() => navigate(`/mcq/${deck.id}`)}
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="deck-card-content">
                <div className="deck-card-icon"><FiGrid /></div>
                {renaming === deck.id ? (
                  <input
                    className="deck-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(deck.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(deck.id);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <h3 className="deck-card-name" onClick={(e) => startRename(deck, e)} title="Click to rename">
                    {deck.name}
                  </h3>
                )}
              </div>
              <button className="btn-danger deck-delete-btn" onClick={(e) => deleteDeck(deck.id, e)} title="Delete"><FiTrash2 /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="flashcards-import-section">
        <button className="flashcards-import-toggle" onClick={() => setImportOpen(!importOpen)}>
          {importOpen ? <FiChevronDown /> : <FiChevronRight />}
          <span>{importOpen ? "Close Import" : "Import New MCQ Deck"}</span>
        </button>
        {importOpen && (
          <div className="flashcards-import-body">
            <textarea className="import-textarea" value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setError(""); }}
              placeholder='{"deckName": "...", "questions": [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..."}]}'
              rows={8} />
            {error && <p className="error-text">{error}</p>}
            <div className="flashcards-import-actions">
              <button className="btn-primary" onClick={handleImport} disabled={loading}>
                <FiDownload /> {loading ? "Creating..." : "Create Deck"}
              </button>
            </div>
          </div>
        )}
      </section>

      <details className="flashcards-prompt-details">
        <summary className="example-summary">
          <span>LLM Prompt &amp; example MCQ JSON (for reference)</span>
        </summary>
        <div className="prompt-card" style={{ marginTop: "0.75rem" }}>
          <div className="prompt-content"><pre className="prompt-pre">{MCQ_PROMPT}</pre></div>
          <button className="btn-primary" onClick={() => copyText(MCQ_PROMPT, "prompt")} style={{ margin: "0.5rem 1rem 0.75rem" }}>
            <FiClipboard /> {copied === "prompt" ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="example-jsons" style={{ marginTop: "0.75rem" }}>
          <div className="example-block">
            <div className="example-label">
              <span>Example: Graph Algorithms MCQs</span>
              <button className="btn-ghost" onClick={() => copyText(MCQ_EXAMPLE, "example")} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}>
                {copied === "example" ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="prompt-pre">{MCQ_EXAMPLE}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}

export default MCQPage;
