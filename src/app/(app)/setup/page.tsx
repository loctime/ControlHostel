"use client";

import { useEffect } from "react";
import { CreateHostelOnboarding } from "@/components/CreateHostelOnboarding";
import { useAuth } from "@/context/AuthContext";
import { useHostel } from "@/context/HostelContext";

export default function SetupPage() {
  const { user, loading: authLoading } = useAuth();
  const { hostelId, loading: hostelLoading } = useHostel();

  useEffect(() => {
    if (authLoading || hostelLoading) return;
    if (!user) return;
    if (hostelId) {
      window.location.href = "/";
    }
  }, [authLoading, hostelId, hostelLoading, user]);

  return (
    <CreateHostelOnboarding
      heading="Setup inicial"
      description="Creá tu hostel para empezar a usar ControlHostel."
      centeredInViewport={false}
      onComplete={() => {
        window.location.href = "/";
      }}
    />
  );
}
