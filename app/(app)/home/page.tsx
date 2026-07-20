"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Download,
  Wand2,
  Search,
  Heart,
  Image as ImageIcon,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ExploreItem = {
  id: string;
  cdn_url: string;
  created_at: string;
  prompt?: string;
  width?: number | null;
  height?: number | null;
  likes_count?: number;
  recent_likes?: number;
  generation_id?: string;
  is_featured?: boolean;
};

type Tab = "top" | "community" | "likes" | "mine";

export default function HomePage() {
  const supabase = createClient();
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("top");
  const [search, setSearch] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<ExploreItem | null>(null);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadFeed();
  }, [tab, ready]);

  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id ?? null);

    if (user) {
      const { data: likes } = await supabase
        .from("asset_likes")
        .select("asset_id")
        .eq("user_id", user.id);

      setLikedIds(new Set((likes || []).map((l) => l.asset_id)));
    }

    setReady(true);
  }

  async function loadFeed() {
    setLoading(true);

    try {
      if (tab === "mine") {
        if (!userId) {
          setItems([]);
          setLoading(false);
          return;
        }

        const { data: assets } = await supabase
          .from("assets")
          .select(
            "id, cdn_url, created_at, generation_id, width, height, likes_count"
          )
          .eq("user_id", userId)
          .eq("type", "image")
          .order("created_at", { ascending: false })
          .limit(60);

        setItems(await withPrompts(assets || []));
      } else if (tab === "likes") {
        if (!userId) {
          setItems([]);
          setLoading(false);
          return;
        }

        const { data: likes } = await supabase
          .from("asset_likes")
          .select("asset_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(60);

        const ids = (likes || []).map((l) => l.asset_id);
        if (!ids.length) {
          setItems([]);
          setLoading(false);
          return;
        }

        const { data: assets } = await supabase
          .from("assets")
          .select(
            "id, cdn_url, created_at, generation_id, width, height, likes_count"
          )
          .in("id", ids)
          .eq("type", "image");

        setItems(await withPrompts(assets || []));
      } else if (tab === "community") {
        const { data: assets, error } = await supabase.rpc(
          "community_assets",
          { limit_count: 60 },
        );

        if (error) {
          console.error("community_assets error:", error);

          // fallback: todas as públicas, sem limite de tempo
          const { data: fallback } = await supabase
            .from("assets")
            .select(
              "id, cdn_url, created_at, generation_id, width, height, likes_count",
            )
            .eq("is_public", true)
            .eq("type", "image")
            .order("created_at", { ascending: false })
            .limit(60);

          setItems(await withPrompts(fallback || []));
        } else {
          setItems(await withPrompts(assets || []));
        }
      } else {
        // TOP DAY
        const { data: assets, error } = await supabase.rpc("top_day_assets", {
          limit_count: 60,
        });

        if (error) {
          console.error("top_day_assets error:", error);

          // fallback: públicas das últimas 24h
          const since = new Date(
            Date.now() - 24 * 60 * 60 * 1000
          ).toISOString();

          const { data: fallback } = await supabase
            .from("assets")
            .select(
              "id, cdn_url, created_at, generation_id, width, height, likes_count"
            )
            .eq("is_public", true)
            .eq("type", "image")
            .gte("created_at", since)
            .order("likes_count", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(60);

          setItems(await withPrompts(fallback || []));
        } else {
          setItems(await withPrompts(assets || []));
        }
      }
    } catch (err) {
      console.error("loadFeed error:", err);
      setItems([]);
    }

    setLoading(false);
  }

  async function withPrompts(
    assets: {
      id: string;
      cdn_url: string;
      created_at: string;
      generation_id: string;
      width?: number | null;
      height?: number | null;
      likes_count?: number;
      recent_likes?: number;
      is_featured?: boolean;
    }[]
  ): Promise<ExploreItem[]> {
    if (!assets.length) return [];

    const genIds = [...new Set(assets.map((a) => a.generation_id))];
    const { data: generations } = await supabase
      .from("generations")
      .select("id, prompt")
      .in("id", genIds);

    const promptMap = new Map(
      (generations || []).map((g) => [g.id, g.prompt])
    );

    return assets.map((a) => ({
      ...a,
      prompt: promptMap.get(a.generation_id),
      likes_count: a.likes_count ?? 0,
      recent_likes: a.recent_likes ?? 0,
    }));
  }

  async function handleToggleLike(item: ExploreItem) {
    if (!userId || likeLoading) return;

    setLikeLoading(item.id);
    const isLiked = likedIds.has(item.id);
    const nextCount = isLiked
      ? Math.max(0, (item.likes_count || 1) - 1)
      : (item.likes_count || 0) + 1;

    if (isLiked) {
      const { error } = await supabase
        .from("asset_likes")
        .delete()
        .eq("user_id", userId)
        .eq("asset_id", item.id);

      if (!error) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        updateLikeCount(item.id, nextCount);
        await supabase
          .from("assets")
          .update({ likes_count: nextCount })
          .eq("id", item.id);
      }
    } else {
      const { error } = await supabase.from("asset_likes").insert({
        user_id: userId,
        asset_id: item.id,
      });

      if (!error) {
        setLikedIds((prev) => new Set(prev).add(item.id));
        updateLikeCount(item.id, nextCount);
        await supabase
          .from("assets")
          .update({ likes_count: nextCount })
          .eq("id", item.id);
      }
    }

    setLikeLoading(null);
  }

  function updateLikeCount(id: string, count: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, likes_count: count } : i))
    );
    setLightbox((prev) =>
      prev?.id === id ? { ...prev, likes_count: count } : prev
    );
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

  const filtered = search.trim()
    ? items.filter((i) =>
        i.prompt?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : items;

  return (
    <div className="min-h-full">
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0A0618]/90 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar criações ou estilos..."
              className="w-full pl-11 pr-28 py-3 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-all"
            />
            <Link
              href="/studio"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Criar
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <TabButton
                active={tab === "top"}
                onClick={() => setTab("top")}
                label="Top Day"
              />
              <TabButton
                active={tab === "community"}
                onClick={() => setTab("community")}
                label="Comunidade"
              />
              <TabButton
                active={tab === "likes"}
                onClick={() => setTab("likes")}
                label="Likes"
              />
              <TabButton
                active={tab === "mine"}
                onClick={() => setTab("mine")}
                label="Minhas"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 font-medium">
                Images
              </span>
              <span className="px-3 py-1.5 rounded-full text-white/30 cursor-not-allowed">
                Videos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              {tab === "mine" ? (
                <ImageIcon className="w-7 h-7 text-white/20" />
              ) : (
                <Sparkles className="w-7 h-7 text-white/20" />
              )}
            </div>
            <p className="text-white/40 text-sm mb-1">
              {search
                ? "Nenhum resultado para essa busca"
                : tab === "likes"
                ? "Você ainda não curtiu nenhuma imagem"
                : tab === "mine"
                ? "Você ainda não gerou nenhuma imagem"
                : tab === "community"
                ? "Ainda não há imagens públicas na comunidade"
                : "Nenhuma criação pública nas últimas 24h"}
            </p>
            <p className="text-white/25 text-xs mb-5">
              Publique imagens no Studio para aparecerem no Top Day e na Comunidade
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
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid group relative rounded-xl overflow-hidden bg-white/5 cursor-pointer"
                onClick={() => setLightbox(item)}
              >
                <img
                  src={item.cdn_url}
                  alt={item.prompt || "Criação Genora"}
                  className="w-full h-auto block"
                  loading="lazy"
                />

                {item.is_featured && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Destaque
                  </span>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  {item.prompt && (
                    <p className="text-[11px] text-white/85 line-clamp-3 mb-2.5 leading-relaxed">
                      {item.prompt}
                    </p>
                  )}

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleDownload(item.cdn_url)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] backdrop-blur-sm transition-all"
                    >
                      <Download className="w-3 h-3" />
                    </button>

                    <Link
                      href={`/studio?prompt=${encodeURIComponent(
                        item.prompt || ""
                      )}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] backdrop-blur-sm transition-all"
                    >
                      <Wand2 className="w-3 h-3" />
                      Remix
                    </Link>

                    <button
                      onClick={() => handleToggleLike(item)}
                      disabled={likeLoading === item.id}
                      className={`ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg backdrop-blur-sm transition-all ${
                        likedIds.has(item.id)
                          ? "bg-pink-500/30 text-pink-300"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          likedIds.has(item.id) ? "fill-current" : ""
                        }`}
                      />
                      {(item.likes_count || 0) > 0 && (
                        <span className="text-[10px]">{item.likes_count}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col lg:flex-row gap-0 rounded-2xl overflow-hidden border border-white/10 bg-[#0D0622]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 flex items-center justify-center bg-black/40 min-h-[300px]">
              <img
                src={lightbox.cdn_url}
                alt={lightbox.prompt || ""}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>

            <div className="w-full lg:w-80 shrink-0 p-5 flex flex-col border-t lg:border-t-0 lg:border-l border-white/10">
              <p className="text-xs text-white/40 mb-2">Prompt</p>
              <p className="text-sm text-white/80 leading-relaxed mb-6 flex-1">
                {lightbox.prompt || "Sem prompt disponível"}
              </p>

              {(lightbox.recent_likes || 0) > 0 && (
                <p className="text-xs text-cyan-400/80 mb-4">
                  {lightbox.recent_likes} like
                  {lightbox.recent_likes === 1 ? "" : "s"} nas últimas 24h
                </p>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDownload(lightbox.cdn_url)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>

                <Link
                  href={`/studio?prompt=${encodeURIComponent(
                    lightbox.prompt || ""
                  )}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-sm font-semibold transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                  Remix no Studio
                </Link>

                <button
                  onClick={() => handleToggleLike(lightbox)}
                  disabled={likeLoading === lightbox.id}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                    likedIds.has(lightbox.id)
                      ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      likedIds.has(lightbox.id) ? "fill-current" : ""
                    }`}
                  />
                  {likedIds.has(lightbox.id) ? "Curtido" : "Curtir"}
                  {(lightbox.likes_count || 0) > 0 && (
                    <span className="text-white/50">
                      · {lightbox.likes_count}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm transition-all ${
        active
          ? "bg-white/10 text-white font-medium"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}