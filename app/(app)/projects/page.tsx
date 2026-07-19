"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Archive,
  ArchiveRestore,
  X,
  Download,
  FolderInput,
  ChevronLeft,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type Asset = {
  id: string;
  cdn_url: string;
  created_at: string;
  generation_id: string;
  project_id?: string | null;
};

export default function ProjectsPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [archived, setArchived] = useState<Project[]>([]);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [projectAssets, setProjectAssets] = useState<Asset[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<Asset | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [activeRes, archivedRes, assetsRes] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", true)
        .order("updated_at", { ascending: false }),
      supabase
        .from("assets")
        .select("id, cdn_url, created_at, generation_id")
        .eq("user_id", user.id)
        .eq("type", "image")
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    setProjects(activeRes.data || []);
    setArchived(archivedRes.data || []);
    setRecentAssets(assetsRes.data || []);
    setLoading(false);
  }

  async function handlePublishAsset(assetId: string) {
    const { error } = await supabase
      .from("assets")
      .update({ is_public: true })
      .eq("id", assetId);

    if (error) {
      alert("Erro ao publicar no Explore");
      return;
    }

    alert("Publicado no Explore!");
  }

  async function loadProjectAssets(projectId: string) {
    // Busca generations do projeto e depois os assets
    const { data: generations } = await supabase
      .from("generations")
      .select("id")
      .eq("project_id", projectId);

    if (!generations?.length) {
      setProjectAssets([]);
      return;
    }

    const genIds = generations.map((g) => g.id);
    const { data: assets } = await supabase
      .from("assets")
      .select("id, cdn_url, created_at, generation_id")
      .in("generation_id", genIds)
      .eq("type", "image")
      .order("created_at", { ascending: false });

    setProjectAssets(assets || []);
  }

  async function handleDeleteAsset(assetId: string) {
    if (!confirm("Excluir esta imagem? Essa ação não pode ser desfeita."))
      return;

    const { error } = await supabase.from("assets").delete().eq("id", assetId);

    if (!error) {
      setRecentAssets((prev) => prev.filter((a) => a.id !== assetId));
      setProjectAssets((prev) => prev.filter((a) => a.id !== assetId));
    }
  }

  async function openProject(project: Project) {
    setSelectedProject(project);
    await loadProjectAssets(project.id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Nome do projeto é obrigatório");
      return;
    }
    setCreating(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDesc.trim() || null,
      })
      .select()
      .single();

    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setProjects((prev) => [data, ...prev]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  }

  async function handleArchive(projectId: string) {
    const { error } = await supabase
      .from("projects")
      .update({ is_archived: true })
      .eq("id", projectId);

    if (!error) {
      const project = projects.find((p) => p.id === projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (project)
        setArchived((prev) => [{ ...project, is_archived: true }, ...prev]);
      if (selectedProject?.id === projectId) setSelectedProject(null);
    }
  }

  async function handleUnarchive(projectId: string) {
    const { error } = await supabase
      .from("projects")
      .update({ is_archived: false })
      .eq("id", projectId);

    if (!error) {
      const project = archived.find((p) => p.id === projectId);
      setArchived((prev) => prev.filter((p) => p.id !== projectId));
      if (project)
        setProjects((prev) => [{ ...project, is_archived: false }, ...prev]);
    }
  }

  async function handleDelete(projectId: string) {
    if (!confirm("Tem certeza que deseja excluir este projeto?")) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);
    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setArchived((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) setSelectedProject(null);
    }
  }

  async function handleAssignToProject(asset: Asset, projectId: string) {
    // Atualiza a generation com o project_id
    const { error } = await supabase
      .from("generations")
      .update({ project_id: projectId })
      .eq("id", asset.generation_id);

    if (!error) {
      setShowAssign(null);
      // Atualiza thumbnail do projeto se não tiver
      const project = projects.find((p) => p.id === projectId);
      if (project && !project.thumbnail_url) {
        await supabase
          .from("projects")
          .update({ thumbnail_url: asset.cdn_url })
          .eq("id", projectId);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, thumbnail_url: asset.cdn_url } : p,
          ),
        );
      }
      if (selectedProject?.id === projectId) {
        await loadProjectAssets(projectId);
      }
    }
  }

  async function handleDownload(url: string, filename?: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || `genora-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback: abre em nova aba
      window.open(url, "_blank");
    }
  }

  // ===== VIEW: Projeto aberto =====
  if (selectedProject) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <button
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar aos projetos
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold mb-1">
              {selectedProject.name}
            </h1>
            {selectedProject.description && (
              <p className="text-white/40 text-sm">
                {selectedProject.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleArchive(selectedProject.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all"
            >
              <Archive className="w-4 h-4" />
              Arquivar
            </button>
          </div>
        </div>

        {projectAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10">
            <ImageIcon className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-white/40 text-sm mb-1">
              Nenhuma imagem neste projeto
            </p>
            <p className="text-white/25 text-xs mb-4">
              Gere imagens no Studio e adicione a este projeto
            </p>
            <Link
              href="/studio"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Ir para o Studio →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {projectAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDownload={() => handleDownload(asset.cdn_url)}
                onAssign={() => setShowAssign(asset)}
                onDelete={() => handleDeleteAsset(asset.id)}
                onPublish={() => handlePublishAsset(asset.id)}
              />
            ))}
          </div>
        )}

        {showAssign && (
          <AssignModal
            projects={projects}
            onAssign={(projectId) =>
              handleAssignToProject(showAssign, projectId)
            }
            onClose={() => setShowAssign(null)}
          />
        )}
      </div>
    );
  }

  // ===== VIEW: Lista de projetos =====
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Projetos</h1>
          <p className="text-white/40 text-sm">
            Organize suas criações em projetos
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4" />
          Novo projeto
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0D0622] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-semibold">
                Novo projeto
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Campanha de lançamento"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Descrição (opcional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Sobre o que é este projeto..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-white/10 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Criar projeto"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : (
        <>
          {/* Active projects */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/10 mb-10">
              <FolderOpen className="w-8 h-8 text-white/15 mb-3" />
              <p className="text-white/40 text-sm mb-1">Nenhum projeto ainda</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
              >
                Criar primeiro projeto →
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all overflow-hidden cursor-pointer"
                  onClick={() => openProject(project)}
                >
                  <div className="aspect-[16/10] bg-white/5 flex items-center justify-center relative">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FolderOpen className="w-8 h-8 text-white/15" />
                    )}
                    <div
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleArchive(project.id)}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white/70"
                        title="Arquivar"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 backdrop-blur-sm text-white/70"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-white/40 line-clamp-2 mt-0.5">
                        {project.description}
                      </p>
                    )}
                    <p className="text-[11px] text-white/25 mt-2">
                      {new Date(project.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Archived section */}
          {archived.length > 0 && (
            <div className="mb-10">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 mb-4 transition-colors"
              >
                <Archive className="w-4 h-4" />
                Arquivados ({archived.length})
              </button>
              {showArchived && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archived.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden opacity-60 hover:opacity-100 transition-all"
                    >
                      <div className="aspect-[16/10] bg-white/5 flex items-center justify-center">
                        {project.thumbnail_url ? (
                          <img
                            src={project.thumbnail_url}
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FolderOpen className="w-8 h-8 text-white/10" />
                        )}
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm">
                            {project.name}
                          </h3>
                          <p className="text-[11px] text-white/25">Arquivado</p>
                        </div>
                        <button
                          onClick={() => handleUnarchive(project.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Restaurar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent assets */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                Criações recentes
              </h2>
              <span className="text-xs text-white/30">
                {recentAssets.length} imagens
              </span>
            </div>

            {recentAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/10">
                <ImageIcon className="w-7 h-7 text-white/15 mb-3" />
                <p className="text-white/30 text-sm">
                  Nenhuma imagem gerada ainda
                </p>
                <Link
                  href="/studio"
                  className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Ir para o Studio →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {recentAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onDownload={() => handleDownload(asset.cdn_url)}
                    onAssign={() => setShowAssign(asset)}
                    onDelete={() => handleDeleteAsset(asset.id)}
                    onPublish={() => handlePublishAsset(asset.id)}
                    showAssign
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showAssign && (
        <AssignModal
          projects={projects}
          onAssign={(projectId) => handleAssignToProject(showAssign, projectId)}
          onClose={() => setShowAssign(null)}
        />
      )}
    </div>
  );
}

/* ===== Subcomponents ===== */

function AssetCard({
  asset,
  onDownload,
  onAssign,
  onDelete,
  onPublish,
  showAssign = false,
}: {
  asset: Asset;
  onDownload: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onPublish: () => void;
  showAssign?: boolean;
}) {
  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
      <img src={asset.cdn_url} alt="" className="w-full h-full object-cover" />

      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 flex-wrap p-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs backdrop-blur-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onPublish();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-xs text-cyan-300 backdrop-blur-sm transition-all"
          title="Publicar no Explore"
        >
          <Globe className="w-3.5 h-3.5" />
        </button>

        {showAssign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs backdrop-blur-sm transition-all"
            title="Adicionar a projeto"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-xs text-red-300 backdrop-blur-sm transition-all"
          title="Excluir imagem"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AssignModal({
  projects,
  onAssign,
  onClose,
}: {
  projects: Project[];
  onAssign: (projectId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0D0622] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Adicionar a projeto</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">
            Crie um projeto primeiro
          </p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onAssign(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left transition-all"
              >
                <FolderOpen className="w-4 h-4 text-white/40 shrink-0" />
                <span className="text-sm truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
