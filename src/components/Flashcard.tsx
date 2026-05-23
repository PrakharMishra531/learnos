import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownView from "./MarkdownView";

interface FlashcardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
}

function Flashcard({ front, back, isFlipped, onFlip }: FlashcardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [cardHeight, setCardHeight] = useState(340);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h1 = measureMarkdown(front);
    const h2 = measureMarkdown(back);
    const max = Math.max(h1, h2, 340);
    const capped = Math.min(max, window.innerHeight * 0.7);
    setCardHeight(Math.round(Math.max(capped, 340)));
  }, [front, back]);

  const handleFlip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    onFlip();
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="flashcard-wrapper" ref={wrapperRef} onClick={handleFlip}>
      <div className="flashcard-stage" style={{ height: cardHeight }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={isFlipped ? "back" : "front"}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            className={`flashcard-face-card ${isFlipped ? "face-back" : "face-front"}`}
            style={{ height: cardHeight }}
          >
            <div className="flashcard-scroll">
              <div className="flashcard-label">
                {isFlipped ? "A" : "Q"}
              </div>
              <div className="flashcard-content">
                <MarkdownView content={isFlipped ? back : front} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function measureMarkdown(md: string): number {
  let lines = 0;
  let maxLineLen = 0;
  for (const line of md.split("\n")) {
    lines++;
    let len = 0;
    for (const ch of line) {
      if (ch === "\t") len += 24;
      else len += 1;
    }
    if (len > maxLineLen) maxLineLen = len;
  }
  const lineHeight = 24;
  const padding = 100;
  const labelHeight = 40;

  const wrapLines = Math.max(1, Math.ceil(maxLineLen / 64));
  const total = padding + labelHeight + (lines + (wrapLines - 1) * lines) * lineHeight;
  return Math.max(total, 340);
}

export default Flashcard;
