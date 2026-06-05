import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { FiLayers, FiGrid, FiFileText, FiUpload } from "react-icons/fi";
import { useState } from "react";
import { exportAll } from "../lib/backup";

const easeOut = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const titleChars = "LearnOS".split("");

function LearnOS() {
  const navigate = useNavigate();
  const [exportMsg, setExportMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExportAll = async () => {
    setExportMsg("");
    setExporting(true);
    try {
      const result = await exportAll();
      setExportMsg(`Exported ${result.count} item(s) to ${result.path}`);
    } catch (e) {
      setExportMsg("Export failed: " + (e as Error).message);
    }
    setExporting(false);
  };

  return (
    <div className="learnos">
      <div className="learnos-hero">
        <motion.div
          className="learnos-title-row"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
          }}
        >
          {titleChars.map((ch, i) => (
            <motion.span
              key={i}
              className="learnos-char"
              variants={{
                hidden: { opacity: 0, y: 40, rotateX: -90 },
                show: {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          className="learnos-ornament"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.p
          className="learnos-tagline"
          variants={item}
          initial="hidden"
          animate="show"
        >
          Your personal learning system. Flashcards, quizzes, mastery.
        </motion.p>
      </div>

      <motion.div
        className="learnos-cards"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.button
          className="learnos-nav-card"
          variants={item}
          whileHover={{ y: -4, boxShadow: "0 8px 40px rgba(201, 169, 110, 0.15)" }}
          whileTap={{ y: 0 }}
          onClick={() => navigate("/flashcards")}
        >
          <div className="learnos-nav-icon">
            <FiLayers size={28} />
          </div>
          <h2 className="learnos-nav-title">Flashcards</h2>
          <p className="learnos-nav-desc">
            Paste JSON from any LLM. Review with markdown, code blocks, and math.
          </p>
          <span className="learnos-nav-arrow">&rarr;</span>
        </motion.button>

        <motion.button
          className="learnos-nav-card"
          variants={item}
          whileHover={{ y: -4, boxShadow: "0 8px 40px rgba(201, 169, 110, 0.15)" }}
          whileTap={{ y: 0 }}
          onClick={() => navigate("/mcq")}
        >
          <div className="learnos-nav-icon">
            <FiGrid size={28} />
          </div>
          <h2 className="learnos-nav-title">MCQ Practice</h2>
          <p className="learnos-nav-desc">
            Generate multiple-choice questions from your notes. Test your understanding.
          </p>
          <span className="learnos-nav-arrow">&rarr;</span>
        </motion.button>

        <motion.button
          className="learnos-nav-card"
          variants={item}
          whileHover={{ y: -4, boxShadow: "0 8px 40px rgba(201, 169, 110, 0.15)" }}
          whileTap={{ y: 0 }}
          onClick={() => navigate("/notes")}
        >
          <div className="learnos-nav-icon">
            <FiFileText size={28} />
          </div>
          <h2 className="learnos-nav-title">Notes</h2>
          <p className="learnos-nav-desc">
            Structured study notes generated from your sessions. Key insights highlighted.
          </p>
          <span className="learnos-nav-arrow">&rarr;</span>
        </motion.button>
      </motion.div>

      <motion.p
        className="learnos-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        Learn deliberately. Think deeply. Build knowledge that lasts.
      </motion.p>

      <motion.div
        className="learnos-export"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
      >
        <button
          className="btn-primary"
          onClick={handleExportAll}
          disabled={exporting}
          title="Export all flashcards, MCQs, and notes as JSON files"
        >
          <FiUpload /> {exporting ? "Exporting..." : "Export All Data"}
        </button>
        {exportMsg && <p className="learnos-export-msg">{exportMsg}</p>}
      </motion.div>
    </div>
  );
}

export default LearnOS;
