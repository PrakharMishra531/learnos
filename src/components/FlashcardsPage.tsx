import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, type Deck } from "../lib/supabase";
import { FiClipboard, FiDownload, FiTrash2, FiBookOpen, FiArrowLeft, FiChevronDown, FiChevronRight } from "react-icons/fi";

const EXAMPLE_PROMPT = `Based on our conversation above, create 10-15 high-quality flashcards for revision.
Use this EXACT JSON format — no extra text, no markdown wrapper, just valid JSON:

{
  "deckName": "Topic Name Here",
  "cards": [
    {
      "front": "Question text (supports Markdown: **bold**, \`inline code\`, $$x^2$$)",
      "back": "Answer text. Use \\\`\\\`\\\`python\\ncode here\\n\\\`\\\`\\\` for code blocks, $$...$$ for display math, and $...$ for inline math."
    }
  ]
}

Guidelines for cards:
- front: A specific, answerable question or prompt (8-20 words)
- back: A thorough answer — include key formulas as $$...$$, code snippets as \\\`\\\`\\\`lang blocks, and conceptual explanations
- Use language identifiers for code: python, cpp, java, typescript, sql, etc.
- Balance theory, implementation, and edge cases across the deck
- Output ONLY the JSON — no preamble, no commentary`;

const EXAMPLE_JSON = `{
  "deckName": "Graph Algorithms — Matrix BFS",
  "cards": [
    {
      "front": "**Rotting Oranges**: Given a grid where 0 = empty, 1 = fresh, 2 = rotten — find the minimum minutes for all fresh oranges to rot. Each minute, rotten oranges spread to 4-directional adjacent fresh oranges. Return -1 if some orange never rots.",
      "back": "## Matrix BFS / Multi-source BFS\\n\\n**Intuition**: Start BFS from ALL initially rotten oranges simultaneously. Track time at each level.\\n\\n**Complexity**:\\n$$O(m \\\\times n)$$ time and space\\n\\n**Key pattern**: Enqueue \\\`(row, col, time)\\\` — time increments by 1 each BFS level.\\n\\n\\\`\\\`\\\`python\\nfrom collections import deque\\n\\nclass Solution:\\n    def orangesRotting(self, grid: List[List[int]]) -> int:\\n        rows, cols = len(grid), len(grid[0])\\n        q = deque()\\n        fresh = 0\\n\\n        for r in range(rows):\\n            for c in range(cols):\\n                if grid[r][c] == 2:\\n                    q.append((r, c, 0))\\n                elif grid[r][c] == 1:\\n                    fresh += 1\\n\\n        max_time = 0\\n        directions = [(1,0),(-1,0),(0,1),(0,-1)]\\n\\n        while q:\\n            r, c, t = q.popleft()\\n            max_time = max(max_time, t)\\n            for dr, dc in directions:\\n                nr, nc = r + dr, c + dc\\n                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:\\n                    grid[nr][nc] = 2\\n                    fresh -= 1\\n                    q.append((nr, nc, t + 1))\\n\\n        return max_time if fresh == 0 else -1\\n\\\`\\\`\\\`\\n\\n**Edge case**: If no fresh oranges at start, return 0 immediately."
    },
    {
      "front": "What is the time complexity of BFS on a graph with $V$ vertices and $E$ edges?",
      "back": "$$O(V + E)$$\\n\\nEach vertex is enqueued at most once, and each edge is examined at most twice (once from each endpoint)."
    },
    {
      "front": "Given a binary tree, write a function to return its **level order traversal** as a list of lists.",
      "back": "## BFS on Trees\\n\\nUse a queue, process level by level by tracking queue size before processing each level:\\n\\n\\\`\\\`\\\`python\\ndef levelOrder(root: TreeNode) -> List[List[int]]:\\n    if not root:\\n        return []\\n    result = []\\n    q = deque([root])\\n    while q:\\n        level = []\\n        for _ in range(len(q)):\\n            node = q.popleft()\\n            level.append(node.val)\\n            if node.left:\\n                q.append(node.left)\\n            if node.right:\\n                q.append(node.right)\\n        result.append(level)\\n    return result\\n\\\`\\\`\\\`"
    }
  ]
}`;

const EXAMPLE_MINIMAL = `{
  "deckName": "Two Sum",
  "cards": [
    {
      "front": "Given an array of integers \\\`nums\\\` and target \\\`target\\\`, return indices of two numbers that sum to target. Assume exactly one solution.",
      "back": "## Hash Map Approach\\n\\n**Optimal**: Single-pass hash map, $$O(n)$$ time.\\n\\n\\\`\\\`\\\`python\\ndef twoSum(nums, target):\\n    seen = {}\\n    for i, v in enumerate(nums):\\n        comp = target - v\\n        if comp in seen:\\n            return [seen[comp], i]\\n        seen[v] = i\\n\\\`\\\`\\\`"
    }
  ]
}`;

function FlashcardsPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decksLoading, setDecksLoading] = useState(true);
  const [decksError, setDecksError] = useState("");
  const [copied, setCopied] = useState<"prompt" | "json" | "minimal" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const supabaseReady = isSupabaseConfigured();

  const fetchDecks = useCallback(async () => {
    if (!supabaseReady) {
      setDecksError("Supabase not configured. Copy .env.local.example to .env.local and restart the dev server.");
      setDecksLoading(false);
      return;
    }
    setDecksError("");
    setDecksLoading(true);
    const { data, error: err } = await supabase
      .from("decks")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setDecksError("Failed to load decks: " + err.message);
    } else if (data) {
      setDecks(data);
    }
    setDecksLoading(false);
  }, [supabaseReady]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const copyToClipboard = async (text: string, kind: "prompt" | "json" | "minimal") => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleImport = async () => {
    setError("");
    if (!jsonInput.trim()) {
      setError("Paste JSON content first.");
      return;
    }
    let parsed: { deckName?: string; cards?: { front: string; back: string }[] };
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setError("Invalid JSON. Make sure it's valid JSON with no trailing commas or extra text.");
      return;
    }
    if (!parsed.deckName || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      setError("JSON must have 'deckName' (string) and 'cards' (non-empty array).");
      return;
    }

    setLoading(true);
    const { data: deckData, error: deckErr } = await supabase
      .from("decks")
      .insert({ name: parsed.deckName })
      .select()
      .single();

    if (deckErr || !deckData) {
      setError("Failed to create deck: " + (deckErr?.message || "unknown"));
      setLoading(false);
      return;
    }

    const cards = parsed.cards.map((c, i) => ({
      deck_id: deckData.id,
      front: c.front,
      back: c.back,
      position: i,
    }));

    const { error: cardsErr } = await supabase.from("cards").insert(cards);
    if (cardsErr) {
      setError("Failed to save cards: " + cardsErr.message);
    } else {
      setJsonInput("");
      setImportOpen(false);
      fetchDecks();
    }
    setLoading(false);
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("decks").delete().eq("id", id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  const startRename = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenaming(deck.id);
    setRenameValue(deck.name);
  };

  const commitRename = async (id: string) => {
    const name = renameValue.trim();
    if (name) {
      await supabase.from("decks").update({ name }).eq("id", id);
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
        <h1 className="flashcards-heading">Flashcards</h1>
        <div style={{ width: 100 }} />
      </div>

      <section className="flashcards-decks-section">
        <div className="section-head">
          <h2>Your Decks</h2>
          <p className={`section-desc ${decksError ? "section-desc-error" : ""}`}>
            {decksError
              ? decksError
              : decksLoading
                ? "Loading..."
                : decks.length === 0
                  ? "No decks yet. Import one below."
                  : `${decks.length} deck${decks.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="deck-grid">
          {decks.map((deck, i) => (
            <div
              key={deck.id}
              className="deck-card"
              onClick={() => navigate(`/deck/${deck.id}`)}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="deck-card-content">
                <div className="deck-card-icon">
                  <FiBookOpen />
                </div>
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
                  <h3
                    className="deck-card-name"
                    onClick={(e) => startRename(deck, e)}
                    title="Click to rename"
                  >
                    {deck.name}
                  </h3>
                )}
              </div>
              <button
                className="btn-danger deck-delete-btn"
                onClick={(e) => deleteDeck(deck.id, e)}
                title="Delete deck"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="flashcards-import-section">
        <button
          className="flashcards-import-toggle"
          onClick={() => setImportOpen(!importOpen)}
        >
          {importOpen ? <FiChevronDown /> : <FiChevronRight />}
          <span>{importOpen ? "Close Import" : "Import New Deck"}</span>
        </button>

        {importOpen && (
          <div className="flashcards-import-body">
            <textarea
              className="import-textarea"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError("");
              }}
              placeholder='{"deckName": "...", "cards": [{"front": "...", "back": "..."}]}'
              rows={8}
            />

            {error && <p className="error-text">{error}</p>}

            <div className="flashcards-import-actions">
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={loading}
              >
                <FiDownload />
                {loading ? "Creating..." : "Create Deck"}
              </button>
            </div>
          </div>
        )}
      </section>

      <details className="flashcards-prompt-details">
        <summary className="example-summary">
          <span>LLM Prompt &amp; example JSON (for reference)</span>
        </summary>
        <div className="prompt-card" style={{ marginTop: "0.75rem" }}>
          <div className="prompt-content">
            <pre className="prompt-pre">{EXAMPLE_PROMPT}</pre>
          </div>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(EXAMPLE_PROMPT, "prompt")}
            style={{ margin: "0.5rem 1rem 0.75rem" }}
          >
            <FiClipboard />
            {copied === "prompt" ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="example-jsons" style={{ marginTop: "0.75rem" }}>
          <div className="example-block">
            <div className="example-label">
              <span>Example: Graph Algorithms (with code &amp; math)</span>
              <button
                className="btn-ghost"
                onClick={() => copyToClipboard(EXAMPLE_JSON, "json")}
                style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}
              >
                {copied === "json" ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="prompt-pre">{EXAMPLE_JSON}</pre>
          </div>
          <div className="example-block">
            <div className="example-label">
              <span>Example: Minimal (Two Sum)</span>
              <button
                className="btn-ghost"
                onClick={() => copyToClipboard(EXAMPLE_MINIMAL, "minimal")}
                style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}
              >
                {copied === "minimal" ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="prompt-pre">{EXAMPLE_MINIMAL}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}

export default FlashcardsPage;
