import { BrowserRouter, Routes, Route } from "react-router-dom";
import LearnOS from "./components/LearnOS";
import FlashcardsPage from "./components/FlashcardsPage";
import DeckViewer from "./components/DeckViewer";
import MCQPage from "./components/MCQPage";
import MCQViewer from "./components/MCQViewer";
import NotesPage from "./components/NotesPage";
import NotesViewer from "./components/NotesViewer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LearnOS />} />
        <Route path="/flashcards" element={<FlashcardsPage />} />
        <Route path="/deck/:deckId" element={<DeckViewer />} />
        <Route path="/mcq" element={<MCQPage />} />
        <Route path="/mcq/:deckId" element={<MCQViewer />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/note/:noteId" element={<NotesViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
