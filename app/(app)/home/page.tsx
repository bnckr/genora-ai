"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Download,
  Heart,
  Image as ImageIcon,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ExploreItem = {
  id: string;
  cdn_url: string;
  created_at: string;
  prompt?: string;
  width?: number;
  height?: number;
};

export default function HomePage() {
  const supabase = createClient();
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"community" | "mine">("community");

  useEffect(() => {
    loadFeed();
  }, [filter]);

  async function loadFeed() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (filter === "mine" && user) {
      // Minhas criações
      const { data: assets } = await supabase
        .from("assets")
        .select("id, cdn_url, created_at, generation_id, width, height")
        .eq("user_id", user.id)
        .eq("type", "image")
        .order("created_at", { ascending: false })
        .limit(48);

      if (assets?.length) {
        const genIds = assets.map((a) => a.generation_id);
        const { data: generations } = await supabase
          .from("generations")
          .select("id, prompt")
          .in("id", genIds);

        const promptMap = new Map(
          (generations || []).map((g) => [g.id, g.prompt])
        );

        setItems(
          assets.map((a) => ({
            ...a,
            prompt: promptMap.get(a.generation_id),
          }))
        );
      } else {
        setItems([]);
      }
    } else {
      // Comunidade (imagens públicas)
      const { data: assets } = await supabase
        .from("assets")
        .select("id, cdn_url, created_at, generation_id, width, height")
        .eq("is_public", true)
        .eq("type", "image")
        .order("created_at", { ascending: false })
        .limit(48);

      if (assets?.length) {
        const genIds = assets.map((a) => a.generation_id);
        const { data: generations } = await supabase
          .from("generations")
          .select("id, prompt")
          .in("id", genIds);

        const promptMap = new Map(
          (generations || []).map((g) => [g.id, g.prompt])
        );

        setItems(
          assets.map((a) => ({
            ...a,
            prompt: promptMap.get(a.generation_id),
          }))
        );
      } else {
        setItems([]);
      }
    }

    setLoading(false);
  }

  async function handleDownload(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `genora-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Explore</h1>
          <p className="text-white/40 text-sm">
            Inspire-se com as melhores criações da comunidade Genora
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("community")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              filter === "community"
                ? "bg-white/10 text-white font-medium"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Comunidade
          </button>
          <button
            onClick={() => setFilter("mine")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              filter === "mine"
                ? "bg-white/10 text-white font-medium"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Minhas criações
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 rounded-2xl border border-dashed border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            {filter === "mine" ? (
              <ImageIcon className="w-7 h-7 text-white/20" />
            ) : (
              <Sparkles className="w-7 h-7 text-white/20" />
            )}
          </div>
          <p className="text-white/40 text-sm mb-1">
            {filter === "mine"
              ? "Você ainda não gerou nenhuma imagem"
              : "Nenhuma criação pública ainda"}
          </p>
          <p className="text-white/25 text-xs mb-5">
            {filter === "mine"
              ? "Vá ao Studio e crie sua primeira imagem"
              : "As melhores imagens públicas aparecerão aqui"}
          </p>
          <Link
            href="/studio"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            Criar no Studio
          </Link>
        </div>
      ) : (
        /* Masonry-style grid */
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                src={item.cdn_url}
                alt={item.prompt || "Criação Genora"}
                className="w-full h-auto object-cover"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                {item.prompt && (
                  <p className="text-xs text-white/80 line-clamp-3 mb-3 leading-relaxed">
                    {item.prompt}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(item.cdn_url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs backdrop-blur-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <Link
                    href={`/studio?prompt=${encodeURIComponent(item.prompt || "")}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs backdrop-blur-sm transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Remix
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}