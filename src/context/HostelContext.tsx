"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import type { Usuario } from "@/lib/usuario";
import { usuarioRef } from "@/lib/usuario";

export type HostelContextValue = {
  hostelId: string | null;
  loading: boolean;
  /** Relee `usuarios/{uid}` (tras crear hostel por API, etc.). */
  refreshUsuario: () => Promise<void>;
};

const HostelContext = createContext<HostelContextValue | null>(null);

function hostelIdFromUsuarioData(data: Usuario | undefined): string | null {
  const raw = data?.hostelId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function HostelProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUsuario = useCallback(async () => {
    if (!user) {
      setHostelId(null);
      return;
    }
    try {
      const snap = await getDoc(usuarioRef(user.uid));
      if (!snap.exists()) {
        setHostelId(null);
        return;
      }
      setHostelId(hostelIdFromUsuarioData(snap.data() as Usuario));
    } catch {
      setHostelId(null);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setHostelId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    let initialReadDone = false;
    const uid = user.uid;

    async function tick() {
      try {
        const snap = await getDoc(usuarioRef(uid));
        if (cancelled) return;
        if (!snap.exists()) {
          setHostelId(null);
        } else {
          setHostelId(hostelIdFromUsuarioData(snap.data() as Usuario));
        }
      } catch {
        if (!cancelled) setHostelId(null);
      } finally {
        if (!cancelled && !initialReadDone) {
          initialReadDone = true;
          setLoading(false);
        }
      }
    }

    void tick();
    const interval = window.setInterval(() => void tick(), 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authLoading, user]);

  const value = useMemo(
    () => ({ hostelId, loading, refreshUsuario }),
    [hostelId, loading, refreshUsuario],
  );
  return <HostelContext.Provider value={value}>{children}</HostelContext.Provider>;
}

export function useHostel() {
  const ctx = useContext(HostelContext);
  if (!ctx) throw new Error("useHostel debe usarse dentro de HostelProvider");
  return ctx;
}

