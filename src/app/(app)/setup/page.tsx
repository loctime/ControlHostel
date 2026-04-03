"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreateHostelOnboarding } from "@/components/CreateHostelOnboarding";
import { useAuth } from "@/context/AuthContext";
import { useHostel } from "@/context/HostelContext";

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hostelId, loading: hostelLoading } = useHostel();

  useEffect(() => {
    if (authLoading || hostelLoading) return;
    if (!user) return;
    if (hostelId) {
      router.push("/");
      router.refresh();
    }
  }, [authLoading, hostelId, hostelLoading, router, user]);

  return (
    <CreateHostelOnboarding
      heading="Setup inicial"
      description="Creá tu hostel para empezar a usar ControlHostel."
      centeredInViewport={false}
      onComplete={() => {
        router.push("/");
        router.refresh();
      }}
    />
  );
}
