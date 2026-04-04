"use client";

import { useCallback, useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { Bloqueo, Cama, Espacio, Hostel, Planta, Reserva } from "@/lib/db";
import { useHostel } from "@/context/HostelContext";
import { userFacingFirestoreError } from "@/lib/firestore-ui";

export type SnapshotPlantaNode = { id: string; data: Planta };
export type SnapshotEspacioNode = { id: string; data: Espacio };
export type SnapshotCamaNode = { id: string; data: Cama & { activo?: boolean } };
export type SnapshotReservaNode = { id: string; data: Reserva };
export type SnapshotBloqueoNode = { id: string; data: Bloqueo };

export type HostelSnapshot = {
  hostelId: string;
  hostel: Hostel | null;
  plantas: SnapshotPlantaNode[];
  espaciosByPlanta: Record<string, SnapshotEspacioNode[]>;
  camasByEspacio: Record<string, SnapshotCamaNode[]>;
  reservas: SnapshotReservaNode[];
  bloqueos: SnapshotBloqueoNode[];
};

type ApiJson = {
  error?: string;
  hostelId?: string;
  hostel?: Hostel | null;
  plantas?: SnapshotPlantaNode[];
  espaciosByPlanta?: Record<string, SnapshotEspacioNode[]>;
  camasByEspacio?: Record<string, SnapshotCamaNode[]>;
  reservas?: Array<{
    id: string;
    data: Record<string, unknown> & { checkinMillis: number; checkoutMillis: number };
  }>;
  bloqueos?: Array<{
    id: string;
    data: Record<string, unknown> & { desdeMillis: number; hastaMillis: number };
  }>;
};

/** Último snapshot por sesión: evita pantalla en blanco al cambiar de ruta y deduplica fetches. */
let memoryCache: HostelSnapshot | null = null;
let inflightSnapshot: Promise<HostelSnapshot> | null = null;

export function readHostelSnapshotCache(hostelId: string | null | undefined): HostelSnapshot | null {
  if (!hostelId || !memoryCache || memoryCache.hostelId !== hostelId) return null;
  return memoryCache;
}

function putHostelSnapshotCache(data: HostelSnapshot) {
  memoryCache = data;
}

function parseSnapshotJson(json: ApiJson): HostelSnapshot {
  if (
    !json.hostelId ||
    !json.plantas ||
    !json.espaciosByPlanta ||
    !json.camasByEspacio ||
    !json.reservas ||
    !json.bloqueos
  ) {
    throw new Error("Respuesta del servidor incompleta");
  }

  const reservas: SnapshotReservaNode[] = json.reservas.map((r) => {
    const { checkinMillis, checkoutMillis, ...rest } = r.data;
    return {
      id: r.id,
      data: {
        ...rest,
        checkin: Timestamp.fromMillis(Number(checkinMillis)),
        checkout: Timestamp.fromMillis(Number(checkoutMillis)),
      } as Reserva,
    };
  });

  const bloqueos: SnapshotBloqueoNode[] = json.bloqueos.map((b) => {
    const { desdeMillis, hastaMillis, ...rest } = b.data;
    return {
      id: b.id,
      data: {
        ...rest,
        desde: Timestamp.fromMillis(Number(desdeMillis)),
        hasta: Timestamp.fromMillis(Number(hastaMillis)),
      } as Bloqueo,
    };
  });

  return {
    hostelId: json.hostelId,
    hostel: json.hostel ?? null,
    plantas: json.plantas,
    espaciosByPlanta: json.espaciosByPlanta,
    camasByEspacio: json.camasByEspacio,
    reservas,
    bloqueos,
  };
}

export function fetchHostelSnapshot(): Promise<HostelSnapshot> {
  if (inflightSnapshot) return inflightSnapshot;

  inflightSnapshot = (async () => {
    const res = await fetch("/api/hostels/snapshot", { credentials: "same-origin" });
    const json = (await res.json()) as ApiJson;

    if (!res.ok) {
      throw new Error(json.error ?? `Error del servidor (${res.status})`);
    }

    const out = parseSnapshotJson(json);
    putHostelSnapshotCache(out);
    return out;
  })().finally(() => {
    inflightSnapshot = null;
  });

  return inflightSnapshot;
}

export type UseHostelSnapshotOptions = {
  /** `false` = solo carga inicial, al volver a la pestaña y `reload()` manual */
  pollMs?: number | false;
};

export function useHostelSnapshot(options?: UseHostelSnapshotOptions) {
  const pollMs = options?.pollMs === false ? false : (options?.pollMs ?? 5000);
  const { hostelId, loading: hostelContextLoading } = useHostel();

  const [snapshot, setSnapshot] = useState<HostelSnapshot | null>(() =>
    hostelId ? readHostelSnapshotCache(hostelId) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [awaitingFirstFetch, setAwaitingFirstFetch] = useState(
    () => Boolean(hostelId && !readHostelSnapshotCache(hostelId)),
  );

  const reload = useCallback(async () => {
    if (!hostelId) return;
    try {
      const d = await fetchHostelSnapshot();
      setSnapshot(d);
      setError(null);
    } catch (e) {
      setError(userFacingFirestoreError(e, "Datos del hostel"));
    }
  }, [hostelId]);

  useEffect(() => {
    if (hostelContextLoading) return;

    if (!hostelId) {
      setSnapshot(null);
      setError(null);
      setAwaitingFirstFetch(false);
      return;
    }

    const cached = readHostelSnapshotCache(hostelId);
    setSnapshot(cached);
    setAwaitingFirstFetch(!cached);

    let cancelled = false;

    async function tick() {
      try {
        const d = await fetchHostelSnapshot();
        if (cancelled) return;
        setSnapshot(d);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          console.error("[hostel-snapshot]", e);
          setError(userFacingFirestoreError(e, "Datos del hostel"));
        }
      } finally {
        if (!cancelled) setAwaitingFirstFetch(false);
      }
    }

    void tick();

    const intervalId =
      pollMs === false ? null : window.setInterval(() => void tick(), pollMs);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hostelId, hostelContextLoading, pollMs]);

  return {
    hostelId,
    hostelContextLoading,
    hostel: snapshot?.hostel ?? null,
    plantas: snapshot?.plantas ?? [],
    espaciosByPlanta: snapshot?.espaciosByPlanta ?? {},
    camasByEspacio: snapshot?.camasByEspacio ?? {},
    reservas: snapshot?.reservas ?? [],
    bloqueos: snapshot?.bloqueos ?? [],
    loadError: error,
    /** Sin datos aún (ni caché) o contexto hostel cargando */
    loading: hostelContextLoading || (awaitingFirstFetch && !snapshot),
    reload,
  };
}
