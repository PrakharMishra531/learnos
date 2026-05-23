import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import MarkdownView from "./MarkdownView";
import { FiChevronLeft, FiDownload } from "react-icons/fi";

interface Note {
  id: string;
  topic: string;
  content: string;
  created_at: string;
}

function NotesViewer() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId) return;
    supabase.from("notes").select("*").eq("id", noteId).single().then(({ data }) => {
      if (data) setNote(data);
      setLoading(false);
    });
  }, [noteId]);

  const downloadNote = () => {
    if (!note) return;
    const blob = new Blob([`# ${note.topic}\n\n${note.content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.topic.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="note-viewer"><div className="container" style={{ textAlign: "center", paddingTop: "6rem" }}><p>Loading...</p></div></div>;
  if (!note) return <div className="note-viewer"><div className="container" style={{ textAlign: "center", paddingTop: "6rem" }}><p>Not found.</p><button className="btn-ghost" onClick={() => navigate("/notes")} style={{ marginTop: "1rem" }}><FiChevronLeft /> Back</button></div></div>;

  return (
    <div className="note-viewer">
      <div className="note-viewer-top">
        <button className="btn-ghost" onClick={() => navigate("/notes")}><FiChevronLeft /> Notes</button>
        <button className="btn-ghost" onClick={downloadNote} title="Download as .md"><FiDownload /> Download</button>
      </div>

      <article className="note-article">
        <h1 className="note-topic">{note.topic}</h1>
        <div className="note-body"><MarkdownView content={note.content} /></div>
      </article>
    </div>
  );
}

export default NotesViewer;
