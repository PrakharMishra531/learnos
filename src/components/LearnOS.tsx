import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { FiLayers, FiGrid, FiFileText } from "react-icons/fi";

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
    </div>
  );
}

export default LearnOS;
