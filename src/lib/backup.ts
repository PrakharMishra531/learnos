import { invoke } from "@tauri-apps/api/core";
import { db } from "./db";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 200)
    || "untitled";
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function getAppDataDir(): Promise<string> {
  return invoke<string>("get_app_data_dir");
}

async function writeFile(path: string, content: string): Promise<void> {
  await invoke("write_text_file", { path, content });
}

export async function saveBackup(
  rawJson: string,
  type: "flashcards" | "mcq" | "notes",
  name: string
): Promise<string> {
  const base = await getAppDataDir();
  const dir = `${base}/backups/${type}`;
  const safeName = sanitizeFilename(name);
  const ts = timestamp();
  const path = `${dir}/${safeName}_${ts}.txt`;
  await writeFile(path, rawJson);
  return path;
}

export interface ExportResult {
  count: number;
  path: string;
}

export async function exportAll(): Promise<ExportResult> {
  const base = await getAppDataDir();
  const ts = timestamp();
  const root = `${base}/exports/LearnOS_Export_${ts}`;
  let count = 0;

  const decks = await db.decks.orderBy("created_at").toArray();
  const cards = await db.cards.toArray();
  const mcqDecks = await db.mcq_decks.orderBy("created_at").toArray();
  const mcqQuestions = await db.mcq_questions.toArray();
  const notes = await db.notes.orderBy("created_at").toArray();
  const folders = await db.folders.toArray();

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  for (const deck of decks) {
    const deckCards = cards
      .filter((c) => c.deck_id === deck.id)
      .sort((a, b) => a.position - b.position);
    const json = JSON.stringify(
      {
        deckName: deck.name,
        cards: deckCards.map((c) => ({ front: c.front, back: c.back })),
      },
      null,
      2
    );
    const folderName = deck.folder_id && folderMap.has(deck.folder_id)
      ? sanitizeFilename(folderMap.get(deck.folder_id)!)
      : "Uncategorized";
    const safeName = sanitizeFilename(deck.name);
    await writeFile(`${root}/flashcards/${folderName}/${safeName}.json`, json);
    count++;
  }

  for (const mdeck of mcqDecks) {
    const questions = mcqQuestions
      .filter((q) => q.deck_id === mdeck.id)
      .sort((a, b) => a.position - b.position);
    const json = JSON.stringify(
      {
        deckName: mdeck.name,
        questions: questions.map((q) => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
        })),
      },
      null,
      2
    );
    const folderName = mdeck.folder_id && folderMap.has(mdeck.folder_id)
      ? sanitizeFilename(folderMap.get(mdeck.folder_id)!)
      : "Uncategorized";
    const safeName = sanitizeFilename(mdeck.name);
    await writeFile(`${root}/mcq/${folderName}/${safeName}.json`, json);
    count++;
  }

  for (const note of notes) {
    const json = JSON.stringify(
      { topic: note.topic, content: note.content },
      null,
      2
    );
    const folderName = note.folder_id && folderMap.has(note.folder_id)
      ? sanitizeFilename(folderMap.get(note.folder_id)!)
      : "Uncategorized";
    const safeName = sanitizeFilename(note.topic);
    await writeFile(`${root}/notes/${folderName}/${safeName}.json`, json);
    count++;
  }

  return { count, path: root };
}

export async function exportFlashcards(): Promise<ExportResult> {
  const base = await getAppDataDir();
  const ts = timestamp();
  const root = `${base}/exports/Flashcards_Export_${ts}`;
  let count = 0;

  const decks = await db.decks.orderBy("created_at").toArray();
  const cards = await db.cards.toArray();
  const folders = await db.folders.where("item_type").equals("flashcards").toArray();
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  for (const deck of decks) {
    const deckCards = cards
      .filter((c) => c.deck_id === deck.id)
      .sort((a, b) => a.position - b.position);
    const json = JSON.stringify(
      {
        deckName: deck.name,
        cards: deckCards.map((c) => ({ front: c.front, back: c.back })),
      },
      null,
      2
    );
    const folderName = deck.folder_id && folderMap.has(deck.folder_id)
      ? sanitizeFilename(folderMap.get(deck.folder_id)!)
      : "Uncategorized";
    const safeName = sanitizeFilename(deck.name);
    await writeFile(`${root}/${folderName}/${safeName}.json`, json);
    count++;
  }

  return { count, path: root };
}

export async function exportMCQs(): Promise<ExportResult> {
  const base = await getAppDataDir();
  const ts = timestamp();
  const root = `${base}/exports/MCQs_Export_${ts}`;
  let count = 0;

  const mcqDecks = await db.mcq_decks.orderBy("created_at").toArray();
  const mcqQuestions = await db.mcq_questions.toArray();
  const folders = await db.folders.where("item_type").equals("mcq").toArray();
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  for (const mdeck of mcqDecks) {
    const questions = mcqQuestions
      .filter((q) => q.deck_id === mdeck.id)
      .sort((a, b) => a.position - b.position);
    const json = JSON.stringify(
      {
        deckName: mdeck.name,
        questions: questions.map((q) => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
        })),
      },
      null,
      2
    );
    const folderName = mdeck.folder_id && folderMap.has(mdeck.folder_id)
      ? sanitizeFilename(folderMap.get(mdeck.folder_id)!)
      : "Uncategorized";
    const safeName = sanitizeFilename(mdeck.name);
    await writeFile(`${root}/${folderName}/${safeName}.json`, json);
    count++;
  }

  return { count, path: root };
}

export async function exportNotes(): Promise<ExportResult> {
  const base = await getAppDataDir();
  const ts = timestamp();
  const root = `${base}/exports/Notes_Export_${ts}`;
  let count = 0;

  const notes = await db.notes.orderBy("created_at").toArray();
  const folders = await db.folders.where("item_type").equals("notes").toArray();
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  for (const note of notes) {
    const json = JSON.stringify(
      { topic: note.topic, content: note.content },
      null,
      2
    );
    const folderName = note.folder_id && folderMap.has(note.folder_id)
      ? sanitizeFilename(folderMap.get(note.folder_id)!)
      : "Uncategorized";
    const safeName = sanitizeFilename(note.topic);
    await writeFile(`${root}/${folderName}/${safeName}.json`, json);
    count++;
  }

  return { count, path: root };
}
