"use client";

import { useQuery } from "@tanstack/react-query";
import type { BookClaim } from "@/server/arkiv/read";

export type Book = { claims: BookClaim[]; writer: string | null; explorer: string; source: string };

async function fetchBook(): Promise<Book> {
  const res = await fetch("/api/book");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Could not read the book");
  return body;
}

/// Open claims, read from Arkiv through /api/book.
export function useBook() {
  return useQuery({ queryKey: ["book"], queryFn: fetchBook, refetchInterval: 10_000 });
}
