"use server";

import { postSuggestion } from "@/lib/api";

export type SuggestResult = { ok: true; word: string } | { ok: false };

const clean = (value: FormDataEntryValue | null, max: number): string | null => {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  return text || null;
};

/** Handle de Instagram: acepta «@handle» o una URL de instagram.com; null si no es válido. */
function instagramHandle(raw: string | null): string | null {
  if (!raw) return null;
  const fromUrl = /instagram\.com\/([^/?#]+)/i.exec(raw)?.[1];
  const handle = (fromUrl ?? raw).replace(/^@/, "");
  return /^[a-z0-9._]{1,30}$/i.test(handle) ? handle : null;
}

/** 07-sugiere: valida, normaliza (nombre en mayúsculas, instagram sin «@») y envía al backend. */
export async function suggestBrand(form: FormData): Promise<SuggestResult> {
  const name = clean(form.get("name"), 32)?.toLocaleUpperCase("es") ?? null;
  const rawInstagram = clean(form.get("instagram"), 200);
  const instagram = instagramHandle(rawInstagram);
  if (rawInstagram && !instagram && !name) return { ok: false };
  if (!name && !instagram) return { ok: false };
  // Honeypot: se descarta sin delatarse (misma respuesta que un envío correcto).
  if (clean(form.get("hp_extra"), 200)) {
    return { ok: true, word: (name ?? instagram ?? "").toLocaleUpperCase("es") };
  }
  try {
    await postSuggestion({ name, instagram });
    return { ok: true, word: (name ?? instagram ?? "").toLocaleUpperCase("es") };
  } catch {
    return { ok: false };
  }
}
