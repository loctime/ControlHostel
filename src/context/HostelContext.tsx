"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import type { Usuario } from "@/lib/usuario";
import { usuarioRef } from "@/lib/usuario";

export type HostelContextValue = {
  hostelId: string | null;
  loading: boolean;
};

const HostelContext = createContext<HostelContextValue | null>(null);

export function HostelProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    const unsub = onSnapshot(
      usuarioRef(user.uid),
      (snap) => {
        if (!snap.exists()) {
          setHostelId(null);
          setLoading(false);
          return;
        }
        const data = snap.data() as Usuario;
        setHostelId(data.hostelId || null);
        setLoading(false);
      },
      () => {
        // Si hay error, degradamos a "sin hostel" para forzar setup (o al menos no romper UI)
        setHostelId(null);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [authLoading, user]);

  const value = useMemo(() => ({ hostelId, loading }), [hostelId, loading]);
  return <HostelContext.Provider value={value}>{children}</HostelContext.Provider>;
}

export function useHostel() {
  const ctx = useContext(HostelContext);
  if (!ctx) throw new Error("useHostel debe usarse dentro de HostelProvider");
  return ctx;
}

