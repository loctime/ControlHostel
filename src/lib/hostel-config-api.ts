"use client";

export async function postHostelWrite(body: Record<string, unknown>): Promise<{ ok: true; id?: string }> {
  const res = await fetch("/api/hostels/write", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string; ok?: boolean; id?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Error del servidor (${res.status})`);
  }
  return { ok: true, id: typeof json.id === "string" ? json.id : undefined };
}
