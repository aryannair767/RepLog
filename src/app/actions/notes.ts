"use server";
// ============================================================
// src/app/actions/notes.ts
//
// Server Actions for the Notes feature.
// Notes are permanently saved to Supabase — they will never
// be lost as long as the database exists.
//
// HOW TO MODIFY:
// - Add tags? Add a `tags String[]` field to the Note model
//   in schema.prisma and include it in the create/update data.
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";

export interface NoteData {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ── getNotes ──────────────────────────────────────────────────
// Returns all notes for the current user, pinned first,
// then by most recently updated.
export async function getNotes(): Promise<NoteData[]> {
  const userId = await getAuthUserId();
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: [
      { isPinned: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    isPinned: n.isPinned,
    color: n.color,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));
}

// ── createNote ────────────────────────────────────────────────
// Creates a new blank note and returns its ID.
export async function createNote(): Promise<string> {
  const userId = await getAuthUserId();
  const note = await prisma.note.create({
    data: {
      userId,
      title: "",
      content: "",
    },
  });
  revalidatePath("/");
  return note.id;
}

// ── updateNote ────────────────────────────────────────────────
// Updates a note's title and/or content. Debounce this on the client.
export async function updateNote(
  noteId: string,
  data: { title?: string; content?: string; color?: string }
): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.note.updateMany({
    where: { id: noteId, userId },
    data,
  });
  // No revalidatePath — debounced saves shouldn't trigger re-renders
}

// ── toggleNotePin ─────────────────────────────────────────────
// Pins or unpins a note.
export async function toggleNotePin(
  noteId: string,
  isPinned: boolean
): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.note.updateMany({
    where: { id: noteId, userId },
    data: { isPinned },
  });
  revalidatePath("/");
}

// ── deleteNote ────────────────────────────────────────────────
// Permanently deletes a note.
export async function deleteNote(noteId: string): Promise<void> {
  const userId = await getAuthUserId();
  await prisma.note.deleteMany({
    where: { id: noteId, userId },
  });
  revalidatePath("/");
}
