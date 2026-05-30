import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, type MCQQuestion } from "../lib/db";
import MarkdownView from "./MarkdownView";
import { FiArrowLeft, FiArrowRight, FiCheck, FiX, FiChevronLeft } from "react-icons/fi";

const optionLabels = ["A", "B", "C", "D"];

function MCQViewer() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [deckName, setDeckName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMap, setSelectedMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deckId) return;
    const fetchDeck = async () => {
      const deckData = await db.mcq_decks.get(deckId);
      if (deckData) setDeckName(deckData.name);
      const qData = await db.mcq_questions.where("deck_id").equals(deckId).sortBy("position");
      setQuestions(qData);
      setLoading(false);
    };
    fetchDeck();
  }, [deckId]);

  const selectAnswer = useCallback((questionIdx: number, optionIdx: number) => {
    if (selectedMap[questionIdx] !== undefined) return;
    setSelectedMap((prev) => ({ ...prev, [questionIdx]: optionIdx }));
  }, [selectedMap]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIndex(idx);
  }, [questions.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentIndex < questions.length - 1) goTo(currentIndex + 1);
      else if (e.key === "ArrowLeft" && currentIndex > 0) goTo(currentIndex - 1);
      else if (["1", "2", "3", "4"].includes(e.key) && selectedMap[currentIndex] === undefined) {
        selectAnswer(currentIndex, parseInt(e.key) - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, questions.length, selectedMap, goTo, selectAnswer]);

  if (loading) {
    return <div className="mcq-viewer"><div className="container" style={{ textAlign: "center", paddingTop: "6rem" }}><p>Loading...</p></div></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="mcq-viewer">
        <div className="container" style={{ textAlign: "center", paddingTop: "6rem" }}>
          <p>This deck has no questions.</p>
          <button className="btn-ghost" onClick={() => navigate("/mcq")} style={{ marginTop: "1rem" }}><FiChevronLeft /> Back</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const hasAnswered = selectedMap[currentIndex] !== undefined;
  const selectedIdx = selectedMap[currentIndex];
  const isCorrect = selectedIdx === q.correct_index;
  const totalAnswered = Object.keys(selectedMap).length;
  const allAnswered = totalAnswered === questions.length;

  return (
    <div className="mcq-viewer">
      <div className="deck-viewer-top">
        <button className="btn-ghost back-btn" onClick={() => navigate("/mcq")}>
          <FiChevronLeft /> Back
        </button>
        <div className="deck-viewer-meta">
          <h2 className="deck-viewer-title">{deckName}</h2>
          <p className="deck-viewer-count">{currentIndex + 1} / {questions.length} &middot; {totalAnswered} answered</p>
        </div>
        <div className="deck-viewer-actions" />
      </div>

      <div className="deck-viewer-progress-track">
        <div className="deck-viewer-progress-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="mcq-viewer-body">
        <div className="mcq-question-card">
          <div className="mcq-question-label">Question {currentIndex + 1}</div>
          <div className="mcq-question-text">
            <MarkdownView content={q.question} />
          </div>

          <div className="mcq-options-grid">
            {q.options.map((opt, oi) => {
              let cls = "mcq-option";
              if (hasAnswered) {
                if (oi === q.correct_index) cls += " mcq-option-correct";
                else if (oi === selectedIdx && !isCorrect) cls += " mcq-option-wrong";
                else cls += " mcq-option-dimmed";
              } else {
                cls += " mcq-option-idle";
              }
              return (
                <button
                  key={oi}
                  className={cls}
                  onClick={() => selectAnswer(currentIndex, oi)}
                  disabled={hasAnswered}
                >
                  <span className="mcq-option-letter">{optionLabels[oi]}</span>
                  <span className="mcq-option-text">
                    <MarkdownView content={opt} />
                  </span>
                  {hasAnswered && oi === q.correct_index && <FiCheck className="mcq-option-icon mcq-icon-correct" />}
                  {hasAnswered && oi === selectedIdx && !isCorrect && <FiX className="mcq-option-icon mcq-icon-wrong" />}
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <div className={`mcq-explanation ${isCorrect ? "mcq-explanation-correct" : "mcq-explanation-wrong"}`}>
              <div className="mcq-explanation-header">
                {isCorrect ? (
                  <><FiCheck size={18} /> Correct!</>
                ) : (
                  <><FiX size={18} /> Incorrect — the answer is {optionLabels[q.correct_index]}</>
                )}
              </div>
              {q.explanation && (
                <div className="mcq-explanation-body">
                  <MarkdownView content={q.explanation} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="deck-viewer-controls">
        <button className="btn-ghost nav-btn" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
          <FiArrowLeft /> Previous
        </button>
        <div className="deck-viewer-dots">
          {questions.map((_, i) => (
            <button key={i}
              className={`dot mcq-dot ${i === currentIndex ? "active" : ""} ${selectedMap[i] !== undefined ? "seen" : ""} ${selectedMap[i] === questions[i]?.correct_index ? "mcq-dot-correct" : selectedMap[i] !== undefined ? "mcq-dot-wrong" : ""}`}
              onClick={() => goTo(i)}
              title={`Q${i + 1}`}
            />
          ))}
        </div>
        <button className="btn-ghost nav-btn" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === questions.length - 1}>
          Next <FiArrowRight />
        </button>
      </div>

      {allAnswered && (
        <div className="deck-complete">
          <div className="deck-complete-card">
            <FiCheck size={28} />
            <h3>All Questions Answered</h3>
            <p>
              {totalAnswered} / {questions.length} questions attempted.
              {" "}
              {Object.entries(selectedMap).filter(([i, s]) => s === questions[parseInt(i)]?.correct_index).length} correct.
            </p>
            <div className="deck-complete-actions">
              <button className="btn-ghost" onClick={() => { setSelectedMap({}); goTo(0); }}>
                Retry All
              </button>
              <button className="btn-primary" onClick={() => navigate("/mcq")}>
                Back to MCQs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MCQViewer;
