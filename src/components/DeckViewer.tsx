import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, type Card } from "../lib/supabase";
import Flashcard from "./Flashcard";
import { FiArrowLeft, FiArrowRight, FiShuffle, FiGrid, FiChevronLeft } from "react-icons/fi";

function DeckViewer() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [cards, setCards] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deckId) return;
    const fetchDeck = async () => {
      const { data: deckData } = await supabase
        .from("decks")
        .select("name")
        .eq("id", deckId)
        .single();

      if (deckData) setDeckName(deckData.name);

      const { data: cardsData } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("position", { ascending: true });

      if (cardsData) setCards(cardsData);
      setLoading(false);
    };
    fetchDeck();
  }, [deckId]);

  const shuffleCards = useCallback(() => {
    setCards((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled((s) => !s);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= cards.length) return;
      setCurrentIndex(index);
      setIsFlipped(false);
    },
    [cards.length]
  );

  const nextCard = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      goTo(currentIndex + 1);
    }
  }, [currentIndex, cards.length, goTo]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }, [currentIndex, goTo]);

  const flipCard = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextCard();
      else if (e.key === "ArrowLeft") prevCard();
      else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        flipCard();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextCard, prevCard, flipCard]);

  if (loading) {
    return (
      <div className="deck-viewer">
        <div className="container" style={{ textAlign: "center", paddingTop: "6rem" }}>
          <p className="section-desc">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="deck-viewer">
        <div className="container" style={{ textAlign: "center", paddingTop: "6rem" }}>
          <p className="section-desc">This deck has no cards.</p>
          <button className="btn-ghost" onClick={() => navigate("/flashcards")} style={{ marginTop: "1rem" }}>
            <FiChevronLeft /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="deck-viewer">
      <div className="deck-viewer-top">
        <button className="btn-ghost back-btn" onClick={() => navigate("/flashcards")}>
          <FiChevronLeft /> Back
        </button>
        <div className="deck-viewer-meta">
          <h2 className="deck-viewer-title">{deckName}</h2>
          <p className="deck-viewer-count">
            {currentIndex + 1} / {cards.length}
          </p>
        </div>
        <div className="deck-viewer-actions">
          <button
            className={`btn-ghost ${isShuffled ? "shuffled" : ""}`}
            onClick={shuffleCards}
            title="Shuffle"
          >
            <FiShuffle />
          </button>
        </div>
      </div>

      <div className="deck-viewer-progress-track">
        <div
          className="deck-viewer-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="deck-viewer-card-area">
        <Flashcard
          key={currentCard.id}
          front={currentCard.front}
          back={currentCard.back}
          isFlipped={isFlipped}
          onFlip={flipCard}
        />
      </div>

      <div className="deck-viewer-controls">
        <button
          className="btn-ghost nav-btn"
          onClick={prevCard}
          disabled={currentIndex === 0}
        >
          <FiArrowLeft /> Previous
        </button>

        <div className="deck-viewer-dots">
          {cards.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === currentIndex ? "active" : ""} ${i < currentIndex ? "seen" : ""}`}
              onClick={() => goTo(i)}
              title={`Card ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="btn-ghost nav-btn"
          onClick={nextCard}
          disabled={currentIndex === cards.length - 1}
        >
          Next <FiArrowRight />
        </button>
      </div>

      {currentIndex === cards.length - 1 && isFlipped && (
        <div className="deck-complete">
          <div className="deck-complete-card">
            <FiGrid size={28} />
            <h3>Deck Complete</h3>
            <p>You've reviewed all {cards.length} cards.</p>
            <div className="deck-complete-actions">
              <button className="btn-ghost" onClick={shuffleCards}>
                <FiShuffle /> Shuffle &amp; Review Again
              </button>
              <button className="btn-primary" onClick={() => navigate("/flashcards")}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckViewer;
