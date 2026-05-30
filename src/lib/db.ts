import Dexie, { type Table } from "dexie";

export interface Deck {
  id: string;
  name: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  position: number;
  created_at: string;
}

export interface MCQDeck {
  id: string;
  name: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MCQQuestion {
  id: string;
  deck_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  position: number;
  created_at: string;
}

export interface Note {
  id: string;
  topic: string;
  content: string;
  folder_id: string | null;
  annotations: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  item_type: "flashcards" | "mcq" | "notes";
  position: number;
  created_at: string;
}

class LearnOSDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  mcq_decks!: Table<MCQDeck, string>;
  mcq_questions!: Table<MCQQuestion, string>;
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;

  constructor() {
    super("LearnOS");
    this.version(1).stores({
      decks: "id, folder_id, created_at",
      cards: "id, deck_id, position",
      mcq_decks: "id, folder_id, created_at",
      mcq_questions: "id, deck_id, position",
      notes: "id, folder_id, created_at",
      folders: "id, item_type, position",
    });
  }
}

export const db = new LearnOSDB();

export function makeId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
