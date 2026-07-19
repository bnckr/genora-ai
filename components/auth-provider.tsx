"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.push("/login");
        }

        if (event === "TOKEN_REFRESHED") {
          console.log("Sessão renovada");
        }

        // Sessão expirada
        if (event === "SIGNED_OUT" || !session) {
          // opcional: mostrar toast
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return <>{children}</>;
}