"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Download,
  Wand2,
  Image as ImageIcon,
  AlertCircle,
  ChevronDown,
  Globe,
  Check,
  FolderOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "2:3";
type Model = "krea-2-medium" | "krea-2-large";

type GeneratedImage = {
  id: string;
  url: string;
  published?: boolean;
};

type Project = {
  id: string;
  name: string;
};

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "2:3", label: "2:3" },
];

const MODELS: { value: Model; label: string; credits: number }[] = [
  { value: "krea-2-medium", label: "Krea 2 Medium", credits: 1 },
  { value: "krea-2-large", label: "Krea 2 Large", credits: 3 },
];

const PROMPT_SUGGESTIONS = [
  "Retrato cinematográfico de uma mulher sob neon roxo",
  "Paisagem futurista com cidades flutuantes",
  "Logo minimalista com símbolo de infinito",
  "Personagem de anime em estilo Ghibli",
];

export default function StudioPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [model, setModel] = useState<Model>("krea-2-medium");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const selectedModel = MODELS.find((m) => m.value === model)!;

  useEffect(() => {
    const remixPrompt = searchParams.get("prompt");
    if (remixPrompt) setPrompt(remixPrompt);

    loadProjects();
  }, [searchParams]);

  async function loadProjects() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    setProjects(data || []);
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Digite um prompt para gerar a imagem");
      return;
    }

    setLoading(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          aspectRatio,
          projectId: projectId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error === "insufficient_credits"
            ? "Créditos insuficientes. Faça upgrade do seu plano."
            : data.error || data.detail || "Erro ao gerar imagem",
        );
        return;
      }

      const generated: GeneratedImage[] =
        data.assets
          ?.map((a: any) => ({
            id: a.id,
            url: a.cdn_url,
            published: a.is_public || false,
          }))
          .filter((a: GeneratedImage) => a.url) || [];

      if (generated.length === 0) {
        setError("Nenhuma imagem foi gerada. Tente novamente.");
        return;
      }

      setImages(generated);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (imageUrl: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`;

    const res = await fetch(proxyUrl);
    const blob = await res.blob();

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `genora-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  async function handlePublish(assetId: string) {
    setPublishingId(assetId);

    const { error } = await supabase
      .from("assets")
      .update({ is_public: true })
      .eq("id", assetId);

    setPublishingId(null);

    if (error) {
      setError("Erro ao publicar no Explore");
      return;
    }

    setImages((prev) =>
      prev.map((img) =>
        img.id === assetId ? { ...img, published: true } : img,
      ),
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">Studio</h1>
        <p className="text-white/40 text-sm">
          Crie imagens incríveis com um único prompt
        </p>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/5">
          <Tab
            active
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            label="Imagem"
          />
          <Tab label="Em breve" disabled />
        </div>

        <div className="p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a imagem que você quer criar..."
            rows={4}
            className="w-full bg-transparent text-white placeholder:text-white/30 outline-none resize-none text-[15px] leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleGenerate();
              }
            }}
          />

          <div className="flex flex-wrap gap-2 mt-3">
            {PROMPT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="px-3 py-1.5 rounded-full text-xs text-white/50 bg-white/5 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-white/5 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Projeto */}
            <div className="relative">
              <FolderOpen className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="appearance-none pl-8 pr-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none cursor-pointer hover:border-white/20 transition-all"
              >
                <option value="" className="bg-[#0D0622]">
                  Sem projeto
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0D0622]">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Modelo */}
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as Model)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none cursor-pointer hover:border-white/20 transition-all"
              >
                {MODELS.map((m) => (
                  <option
                    key={m.value}
                    value={m.value}
                    className="bg-[#0D0622]"
                  >
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Aspect ratios */}
            <div className="hidden sm:flex items-center gap-1">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    aspectRatio === ar.value
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-white/40 hover:text-white/60 border border-transparent"
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all shadow-lg shadow-violet-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Gerar
                <span className="text-white/60 font-normal">
                  · {selectedModel.credits} cr
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* RESULTADOS */}
      <div className="mt-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-violet-500/20 border-t-cyan-400 animate-spin" />
              <Sparkles className="w-5 h-5 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-5 text-white/40 text-sm">Criando com Krea...</p>
          </div>
        )}

        {!loading && images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10">
            <ImageIcon className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-white/30 text-sm">
              Suas criações aparecerão aqui
            </p>
            <p className="text-white/20 text-xs mt-1">
              Dica: use Ctrl+Enter para gerar
            </p>
          </div>
        )}

        {!loading && images.length > 0 && (
          <div
            className={`grid gap-4 ${
              images.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-lg"
            }`}
          >
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-2xl overflow-hidden border border-white/10"
              >
                <img src={img.url} alt="Gerada" className="w-full h-auto" />

                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDownload(img.url)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm backdrop-blur-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>

                  {img.published ? (
                    <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500/20 text-sm text-cyan-300 backdrop-blur-sm">
                      <Check className="w-4 h-4" />
                      Publicado
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePublish(img.id)}
                      disabled={publishingId === img.id}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-sm text-cyan-300 backdrop-blur-sm transition-all disabled:opacity-50"
                    >
                      {publishingId === img.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      Publicar no Explore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({
  label,
  icon,
  active = false,
  disabled = false,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-all ${
        active
          ? "text-white border-b-2 border-cyan-400"
          : disabled
            ? "text-white/20 cursor-not-allowed"
            : "text-white/40 hover:text-white/60"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
