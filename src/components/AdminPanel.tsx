import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Film, 
  Plus, 
  Trash2, 
  Edit3, 
  History, 
  Eye, 
  Save, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ListPlus,
  Play,
  ArrowRight,
  Clock,
  AlertCircle,
  X,
  Calendar,
  BarChart3,
  TrendingUp,
  Heart,
  MessageSquare,
  Users,
  Activity,
  Award,
  Video,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Novel, Episode, AuditLog, AccessType } from '../types';
import { 
  upsertNovel, 
  deleteNovel, 
  upsertEpisode, 
  deleteEpisode, 
  logAdminAction, 
  fetchAuditLogs,
  subscribeEpisodes
} from '../services/firestoreService';
import { 
  extractDriveFileId, 
  formatDriveVideoUrl, 
  formatDriveImageUrl,
  getSafeImageUrl,
  handleImageError,
  extractAllDriveLinks,
  isIframeHtml,
  isStreamtapeUrl,
  getStreamtapeExternalUrl,
  resolveStreamtapeVideo
} from '../services/driveService';

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, signIn, toggleAdminBypass } = useAuth();
  const { novels, refreshCatalog, showToast, openPlayer } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'novels' | 'episodes' | 'batch' | 'audit'>('stats');
  
  // Novel Form State (Creation)
  const [editingNovel, setEditingNovel] = useState<Partial<Novel>>({
    title: '',
    synopsis: '',
    coverUrl: '',
    status: 'airing',
    releaseYear: new Date().getFullYear(),
    genres: ['Drama', 'Romance'],
    tags: ['Estreno', 'Vertical'],
    order: 1,
    isNew: true,
  });
  const [novelCoverDriveInput, setNovelCoverDriveInput] = useState('');
  const [initialChapterVideoInput, setInitialChapterVideoInput] = useState('');
  const [initialChapterTitle, setInitialChapterTitle] = useState('Capítulo 1: El Comienzo');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isNovelSubmitting, setIsNovelSubmitting] = useState(false);

  // Dedicated Modal for Editing an existing Novel
  const [modalEditingNovel, setModalEditingNovel] = useState<Novel | null>(null);
  const [editNovelCoverInput, setEditNovelCoverInput] = useState('');
  const [isModalNovelSubmitting, setIsModalNovelSubmitting] = useState(false);
  const [modalNewCategoryInput, setModalNewCategoryInput] = useState('');

  // Episode Form State (Chapters)
  const [selectedNovelId, setSelectedNovelId] = useState<string>('');
  const [novelEpisodes, setNovelEpisodes] = useState<Episode[]>([]);
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [episodeTitle, setEpisodeTitle] = useState<string>('');
  const [episodeVideoDriveInput, setEpisodeVideoDriveInput] = useState('');
  const [episodeCoverDriveInput, setEpisodeCoverDriveInput] = useState('');
  const [episodeDurationSec, setEpisodeDurationSec] = useState<number>(90);
  const [isEpisodeSubmitting, setIsEpisodeSubmitting] = useState(false);

  // Edit Single Episode Modal State
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editEpisodeTitle, setEditEpisodeTitle] = useState('');
  const [editEpisodeNumber, setEditEpisodeNumber] = useState(1);
  const [editEpisodeVideoInput, setEditEpisodeVideoInput] = useState('');
  const [editEpisodeCoverInput, setEditEpisodeCoverInput] = useState('');
  const [editEpisodeDurationSec, setEditEpisodeDurationSec] = useState(90);
  const [isEditEpisodeSubmitting, setIsEditEpisodeSubmitting] = useState(false);

  // Multiple Batch Links Import State
  const [batchLinksText, setBatchLinksText] = useState('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Keep selectedNovelId in sync with novels list
  useEffect(() => {
    if (!selectedNovelId && novels.length > 0) {
      setSelectedNovelId(novels[0].id);
    }
  }, [novels, selectedNovelId]);

  // Real-time episode subscription when selectedNovelId changes
  useEffect(() => {
    if (!selectedNovelId) {
      setNovelEpisodes([]);
      setEpisodeNumber(1);
      setEpisodeTitle('Capítulo 1');
      return;
    }
    const unsubscribe = subscribeEpisodes(selectedNovelId, (eps) => {
      setNovelEpisodes(eps);
      const nextNum = eps.length + 1;
      setEpisodeNumber(nextNum);
      setEpisodeTitle(`Capítulo ${nextNum}`);
    });
    return () => unsubscribe();
  }, [selectedNovelId]);

  // Fetch audit logs when audit tab opens
  useEffect(() => {
    if (activeTab === 'audit' || activeTab === 'stats') {
      fetchAuditLogs().then(logs => setAuditLogs(logs));
    }
  }, [activeTab]);

  const selectedNovelObj = novels.find(n => n.id === selectedNovelId);

  // --- Real-time Novel Cover Handler ---
  const handleCoverInputChange = (value: string) => {
    setNovelCoverDriveInput(value);
    const converted = formatDriveImageUrl(value);
    setEditingNovel(prev => ({
      ...prev,
      coverUrl: converted,
      bannerUrl: prev?.bannerUrl || converted,
    }));
  };

  const pasteCoverFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleCoverInputChange(text);
        showToast('Enlace de imagen pegado');
      }
    } catch {
      showToast('Pega manualmente el enlace en el campo');
    }
  };

  // --- Real-time Episode Video Handler ---
  const handleEpisodeVideoInputChange = (value: string) => {
    setEpisodeVideoDriveInput(value);
  };

  const pasteEpisodeVideoFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleEpisodeVideoInputChange(text);
        showToast('Enlace o código de video pegado');
      }
    } catch {
      showToast('Pega manualmente en el campo');
    }
  };

  // Suggested Categories extracted dynamically from novel catalog + presets
  const allSuggestedCategories = useMemo(() => {
    const set = new Set<string>();
    novels.forEach(n => (n.genres || []).forEach(g => { if (g?.trim()) set.add(g.trim()); }));
    ['Romance', 'Drama', 'Venganza', 'Comedia', 'Billionaire', 'Misterio', 'Mafia', 'CEO', 'Fantasía', 'Suspenso'].forEach(s => set.add(s));
    return Array.from(set);
  }, [novels]);

  const handleAddCategory = () => {
    const val = newCategoryInput.trim();
    if (!val) return;
    const current = editingNovel?.genres || [];
    if (!current.includes(val)) {
      setEditingNovel(prev => ({ ...prev, genres: [...current, val] }));
      showToast(`Categoría "${val}" agregada`);
    }
    setNewCategoryInput('');
  };

  const toggleCategoryInNovel = (category: string) => {
    const current = editingNovel?.genres || [];
    if (current.includes(category)) {
      setEditingNovel(prev => ({ ...prev, genres: current.filter(c => c !== category) }));
    } else {
      setEditingNovel(prev => ({ ...prev, genres: [...current, category] }));
    }
  };

  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (!val) return;
    const current = editingNovel?.tags || [];
    if (!current.includes(val)) {
      setEditingNovel(prev => ({ ...prev, tags: [...current, val] }));
      showToast(`Etiqueta "${val}" agregada`);
    }
    setNewTagInput('');
  };

  // --- Save New Novel (Starts naturally at 0 views & 0 likes for real user engagement) ---
  const handleSaveNovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNovel?.title || !editingNovel?.synopsis || !editingNovel?.coverUrl) {
      showToast('Por favor completa el título, sinopsis y la portada de la novela');
      return;
    }

    try {
      setIsNovelSubmitting(true);
      const novelId = editingNovel.id || editingNovel.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 35) + '-' + Date.now().toString(36).slice(-4);
      const fullNovel: Novel = {
        id: novelId,
        title: editingNovel.title.trim(),
        synopsis: editingNovel.synopsis.trim(),
        coverUrl: editingNovel.coverUrl.trim(),
        bannerUrl: (editingNovel.bannerUrl || editingNovel.coverUrl).trim(),
        status: editingNovel.status || 'airing',
        releaseYear: editingNovel.releaseYear || new Date().getFullYear(),
        genres: editingNovel.genres && editingNovel.genres.length > 0 ? editingNovel.genres : ['Drama'],
        tags: editingNovel.tags && editingNovel.tags.length > 0 ? editingNovel.tags : ['Estreno'],
        episodeCount: initialChapterVideoInput.trim() ? 1 : 0,
        views: 0,
        likesCount: 0,
        rating: 5.0,
        isFeatured: !!editingNovel.isFeatured,
        isNew: !!editingNovel.isNew,
        isExclusive: !!editingNovel.isExclusive,
        order: novels.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await upsertNovel(fullNovel);
      await logAdminAction('UPSERT_NOVEL', `Novela creada: ${fullNovel.title}`, user?.uid || 'admin', user?.email || 'admin@novelastream');

      // If an initial chapter was provided, create it automatically!
      if (initialChapterVideoInput.trim()) {
        const epVideoUrl = formatDriveVideoUrl(initialChapterVideoInput);
        const epId = `ep-${novelId}-1`;
        const firstEp: Episode = {
          id: epId,
          novelId: fullNovel.id,
          episodeNumber: 1,
          title: initialChapterTitle.trim() || 'Capítulo 1: El Comienzo',
          description: `Primer capítulo de ${fullNovel.title}`,
          videoUrl: epVideoUrl,
          driveFileId: extractDriveFileId(initialChapterVideoInput) || undefined,
          thumbnail: fullNovel.coverUrl,
          durationSec: 90,
          accessType: 'free',
          isPublished: true,
          views: 0,
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await upsertEpisode(fullNovel.id, firstEp);
        await logAdminAction('UPSERT_EPISODE', `Capítulo 1 inicial para ${fullNovel.title}`, user?.uid || 'admin', user?.email || 'admin@novelastream');
      }

      await refreshCatalog();
      setSelectedNovelId(fullNovel.id);
      
      // Reset form
      setEditingNovel({
        title: '',
        synopsis: '',
        coverUrl: '',
        status: 'airing',
        releaseYear: new Date().getFullYear(),
        genres: ['Drama', 'Romance'],
        tags: ['Estreno', 'Vertical'],
        order: novels.length + 2,
        isNew: true,
      });
      setNovelCoverDriveInput('');
      setInitialChapterVideoInput('');
      
      showToast(`¡Novela "${fullNovel.title}" publicada en tiempo real!`);
      setActiveTab('episodes');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar novela');
    } finally {
      setIsNovelSubmitting(false);
    }
  };

  // --- Dedicated Modal: Save Edited Novel ---
  const handleSaveModalNovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditingNovel) return;

    try {
      setIsModalNovelSubmitting(true);
      const finalCover = editNovelCoverInput.trim() ? formatDriveImageUrl(editNovelCoverInput) : modalEditingNovel.coverUrl;
      const updated: Novel = {
        ...modalEditingNovel,
        coverUrl: finalCover,
        bannerUrl: modalEditingNovel.bannerUrl || finalCover,
        updatedAt: new Date().toISOString()
      };

      await upsertNovel(updated);
      await logAdminAction('EDIT_NOVEL', `Novela editada: ${updated.title}`, user?.uid || 'admin', user?.email || '');
      await refreshCatalog();
      setModalEditingNovel(null);
      showToast(`¡Novela "${updated.title}" actualizada con éxito!`);
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar la novela');
    } finally {
      setIsModalNovelSubmitting(false);
    }
  };

  // --- Delete Novel with confirmation ---
  const handleDeleteNovel = async (novelId: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente la novela "${title}" y todos sus capítulos asociados?`)) {
      return;
    }
    try {
      await deleteNovel(novelId);
      await logAdminAction('DELETE_NOVEL', `Eliminada novela: ${title}`, user?.uid || 'admin', user?.email || '');
      await refreshCatalog();
      if (selectedNovelId === novelId) {
        setSelectedNovelId('');
      }
      showToast(`Novela "${title}" eliminada de Firestore`);
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar la novela');
    }
  };

  // --- Save Episode ---
  const handleSaveEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNovelObj) {
      showToast('Por favor selecciona una novela');
      return;
    }
    if (!episodeTitle.trim() || !episodeVideoDriveInput.trim()) {
      showToast('Ingresa el título del capítulo y el código <iframe> o enlace del video');
      return;
    }

    try {
      setIsEpisodeSubmitting(true);
      const epVideoUrl = formatDriveVideoUrl(episodeVideoDriveInput);
      const driveId = extractDriveFileId(episodeVideoDriveInput);
      const epId = `ep-${selectedNovelId}-${Date.now().toString(36)}`;

      const customThumb = episodeCoverDriveInput.trim()
        ? formatDriveImageUrl(episodeCoverDriveInput)
        : (selectedNovelObj.coverUrl || '');

      const fullEpisode: Episode = {
        id: epId,
        novelId: selectedNovelId,
        episodeNumber: Number(episodeNumber),
        title: episodeTitle.trim(),
        description: `Capítulo ${episodeNumber} de ${selectedNovelObj.title}`,
        videoUrl: epVideoUrl,
        driveFileId: driveId || undefined,
        thumbnail: customThumb,
        durationSec: Number(episodeDurationSec) || 90,
        accessType: 'free',
        isPublished: true,
        views: 0,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await upsertEpisode(selectedNovelId, fullEpisode);
      await logAdminAction('UPSERT_EPISODE', `Capítulo ${fullEpisode.episodeNumber} agregado a ${selectedNovelObj.title}`, user?.uid || 'admin', user?.email || '');
      await refreshCatalog();

      // Reset episode inputs for next chapter
      setEpisodeVideoDriveInput('');
      setEpisodeCoverDriveInput('');
      const nextNum = Number(episodeNumber) + 1;
      setEpisodeNumber(nextNum);
      setEpisodeTitle(`Capítulo ${nextNum}`);

      showToast(`¡Capítulo ${fullEpisode.episodeNumber} publicado en tiempo real!`);
    } catch (err) {
      console.error(err);
      showToast('Error al agregar capítulo');
    } finally {
      setIsEpisodeSubmitting(false);
    }
  };

  // --- Start & Save Episode Edit ---
  const handleStartEditEpisode = (ep: Episode) => {
    setEditingEpisode(ep);
    setEditEpisodeTitle(ep.title);
    setEditEpisodeNumber(ep.episodeNumber);
    setEditEpisodeVideoInput(ep.videoUrl);
    setEditEpisodeCoverInput(ep.thumbnail || selectedNovelObj?.coverUrl || '');
    setEditEpisodeDurationSec(ep.durationSec || 90);
  };

  const handleSaveEditedEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisode || !selectedNovelId) return;

    try {
      setIsEditEpisodeSubmitting(true);
      const epVideoUrl = formatDriveVideoUrl(editEpisodeVideoInput);
      const driveId = extractDriveFileId(editEpisodeVideoInput);
      const finalThumb = editEpisodeCoverInput.trim()
        ? formatDriveImageUrl(editEpisodeCoverInput)
        : (selectedNovelObj?.coverUrl || '');

      const updatedEpisode: Episode = {
        ...editingEpisode,
        episodeNumber: Number(editEpisodeNumber),
        title: editEpisodeTitle.trim() || `Capítulo ${editEpisodeNumber}`,
        videoUrl: epVideoUrl,
        driveFileId: driveId || editingEpisode.driveFileId,
        thumbnail: finalThumb,
        durationSec: Number(editEpisodeDurationSec) || 90,
        updatedAt: new Date().toISOString(),
      };

      await upsertEpisode(selectedNovelId, updatedEpisode);
      await logAdminAction(
        'EDIT_EPISODE',
        `Capítulo ${updatedEpisode.episodeNumber} actualizado en ${selectedNovelObj?.title || ''}`,
        user?.uid || 'admin',
        user?.email || ''
      );
      await refreshCatalog();
      setEditingEpisode(null);
      showToast(`¡Capítulo ${updatedEpisode.episodeNumber} actualizado en tiempo real!`);
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar capítulo');
    } finally {
      setIsEditEpisodeSubmitting(false);
    }
  };

  const handleDeleteEpisode = async (episodeId: string, title: string) => {
    if (!window.confirm(`¿Eliminar capítulo "${title}"?`)) return;
    await deleteEpisode(selectedNovelId, episodeId);
    await logAdminAction('DELETE_EPISODE', `Eliminado: ${title}`, user?.uid || 'admin', user?.email || '');
    await refreshCatalog();
    showToast('Capítulo eliminado');
  };

  // --- Bulk Multiple Chapters Import via Iframes or URLs ---
  const handleBulkImportChapters = async () => {
    if (!selectedNovelObj) {
      showToast('Selecciona una novela primero');
      return;
    }

    const links = extractAllDriveLinks(batchLinksText);
    if (links.length === 0) {
      showToast('No se detectaron códigos <iframe> ni enlaces válidos en el texto');
      return;
    }

    try {
      setIsBatchSubmitting(true);
      let nextNumber = novelEpisodes.length + 1;

      for (let i = 0; i < links.length; i++) {
        const item = links[i];
        const epNumber = nextNumber + i;
        const epId = `ep-${selectedNovelId}-${Date.now().toString(36)}-${i}`;
        const newEp: Episode = {
          id: epId,
          novelId: selectedNovelId,
          episodeNumber: epNumber,
          title: `Capítulo ${epNumber}`,
          description: `Capítulo ${epNumber} de ${selectedNovelObj.title}`,
          videoUrl: item.url,
          driveFileId: item.id,
          thumbnail: selectedNovelObj.coverUrl,
          durationSec: 90,
          accessType: 'free',
          isPublished: true,
          views: 0,
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await upsertEpisode(selectedNovelId, newEp);
      }

      await logAdminAction(
        'BULK_IMPORT_EPISODES',
        `Importados ${links.length} capítulos masivos para ${selectedNovelObj.title}`,
        user?.uid || 'admin',
        user?.email || ''
      );

      await refreshCatalog();
      setBatchLinksText('');
      showToast(`¡${links.length} capítulos importados con éxito!`);
      setActiveTab('episodes');
    } catch (err) {
      console.error(err);
      showToast('Error al importar capítulos');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Real-time video preview for the current episode input
  const previewVideoUrl = episodeVideoDriveInput.trim() ? formatDriveVideoUrl(episodeVideoDriveInput) : '';

  // --- Executive Platform Statistics Calculated in Real-Time ---
  const totalPlatformViews = useMemo(() => {
    return novels.reduce((acc, n) => acc + (n.views || 0), 0);
  }, [novels]);

  const totalPlatformLikes = useMemo(() => {
    return novels.reduce((acc, n) => acc + (n.likesCount || 0), 0);
  }, [novels]);

  const totalChaptersCount = useMemo(() => {
    return novels.reduce((acc, n) => acc + (n.episodeCount || 0), 0);
  }, [novels]);

  const engagementRate = totalPlatformViews > 0 
    ? ((totalPlatformLikes / totalPlatformViews) * 100).toFixed(1) 
    : '0';

  const averageChaptersPerNovel = novels.length > 0 
    ? (totalChaptersCount / novels.length).toFixed(1) 
    : '0';

  const topRankedNovels = useMemo(() => {
    return [...novels].sort((a, b) => (b.views || 0) - (a.views || 0));
  }, [novels]);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    novels.forEach(n => {
      (n.genres || []).forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [novels]);

  // Authorization check
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-[#101935] border border-[#1E3A8A] rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-[#38BDF8] mx-auto flex items-center justify-center">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#F7F7FA]">Acceso al Panel Administrativo</h2>
        <p className="text-xs text-[#A7B0C0] leading-relaxed">
          Para administrar las novelas y cargar capítulos mediante códigos iframe o enlaces de video, activa el modo administrador directo o inicia sesión con tu cuenta.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => toggleAdminBypass(true)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:brightness-110 transition-all"
          >
            Activar Modo Administrador Directo
          </button>
          <button
            onClick={() => signIn()}
            className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
          >
            Iniciar sesión con cuenta de Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-28 text-[#F7F7FA]">
      
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Panel de Administración</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                En vivo
              </span>
            </div>
            <p className="text-xs text-[#A7B0C0] mt-0.5">
              Gestión centralizada de novelas, capítulos con iframes y métricas de audiencia en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setActiveTab('novels');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Novela
          </button>
          <button
            onClick={() => refreshCatalog()}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A7B0C0] hover:text-white text-xs font-semibold border border-white/10 transition-colors"
            title="Refrescar datos de Firestore"
          >
            Sincronizar
          </button>
        </div>
      </div>

      {/* Tab Navigation Menu (Clean, Executive, Fully Responsive) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-white/5 scrollbar-none text-xs">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'stats'
              ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
              : 'bg-[#101935] text-[#A7B0C0] hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. Estadísticas & Métricas</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {totalPlatformViews} vistas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('novels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'novels'
              ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
              : 'bg-[#101935] text-[#A7B0C0] hover:text-white hover:bg-white/5'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>2. Gestión de Novelas</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {novels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('episodes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'episodes'
              ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
              : 'bg-[#101935] text-[#A7B0C0] hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Capítulos & Episodios</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {novelEpisodes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'batch'
              ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
              : 'bg-[#101935] text-[#A7B0C0] hover:text-white hover:bg-white/5'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>4. Carga Masiva (Batch)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'audit'
              ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/25'
              : 'bg-[#101935] text-[#A7B0C0] hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>5. Registro de Actividad</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* --- TAB 1: EXECUTIVE ANALYTICS & STATS DASHBOARD --- */}
      {/* ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 shadow-lg">
              <div className="flex items-center justify-between text-[#38BDF8] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A7B0C0]">Vistas Totales</span>
                <Eye className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{totalPlatformViews.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3 h-3" /> Audiencia acumulada
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 shadow-lg">
              <div className="flex items-center justify-between text-[#FF5A5F] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A7B0C0]">Me Gusta Totales</span>
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{totalPlatformLikes.toLocaleString()}</div>
              <div className="text-[10px] text-[#FF5A5F] mt-1 font-semibold">
                ❤️ Reacciones de usuarios
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 shadow-lg">
              <div className="flex items-center justify-between text-[#C084FC] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A7B0C0]">Novelas Activas</span>
                <Film className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{novels.length}</div>
              <div className="text-[10px] text-[#A7B0C0] mt-1">
                Catálogo en Firestore
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 shadow-lg">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A7B0C0]">Capítulos Subidos</span>
                <Video className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{totalChaptersCount}</div>
              <div className="text-[10px] text-amber-400 mt-1">
                Videos disponibles
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 shadow-lg">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A7B0C0]">Engagement</span>
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{engagementRate}%</div>
              <div className="text-[10px] text-emerald-400 mt-1">
                Ratio likes / visitas
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 shadow-lg">
              <div className="flex items-center justify-between text-[#38BDF8] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A7B0C0]">Promedio Caps</span>
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{averageChaptersPerNovel}</div>
              <div className="text-[10px] text-[#A7B0C0] mt-1">
                Capítulos por serie
              </div>
            </div>
          </div>

          {/* Ranking of Top Performing Novels & Categories Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Ranked Novels (2 Cols) */}
            <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#101935] border border-[#1E3A8A]/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Ranking de Novelas Más Vistas y Populares
                  </h3>
                  <p className="text-xs text-[#A7B0C0]">
                    Desempeño y retención real según las interacciones de los espectadores.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#38BDF8]">
                  {novels.length} novelas analizadas
                </span>
              </div>

              {topRankedNovels.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#A7B0C0]">
                  No hay novelas registradas todavía. Crea una novela en la pestaña "Gestión de Novelas".
                </div>
              ) : (
                <div className="divide-y divide-white/5 space-y-2">
                  {topRankedNovels.slice(0, 8).map((novel, index) => {
                    const viewRatio = totalPlatformViews > 0 ? ((novel.views || 0) / totalPlatformViews) * 100 : 0;
                    return (
                      <div key={novel.id} className="pt-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Badge */}
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            index === 0 ? 'bg-amber-400 text-black font-black' :
                            index === 1 ? 'bg-slate-300 text-black font-black' :
                            index === 2 ? 'bg-amber-700 text-white font-black' :
                            'bg-white/5 text-[#A7B0C0]'
                          }`}>
                            #{index + 1}
                          </span>

                          <img
                            src={getSafeImageUrl(novel.coverUrl)}
                            alt={novel.title}
                            className="w-10 h-14 rounded-lg object-cover bg-black shrink-0 border border-white/10"
                            onError={(e) => handleImageError(e, novel.coverUrl)}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-white truncate text-xs sm:text-sm">{novel.title}</h4>
                              {novel.releaseYear && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-[#38BDF8] border border-blue-500/30">
                                  {novel.releaseYear}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#A7B0C0] mt-0.5">
                              <span>🎬 {novel.episodeCount || 0} caps</span>
                              <span>•</span>
                              <span className="text-[#38BDF8] font-semibold">👁️ {novel.views || 0} vistas</span>
                              <span>•</span>
                              <span className="text-[#FF5A5F] font-semibold">❤️ {novel.likesCount || 0} likes</span>
                            </div>
                            {/* Proportional View Bar */}
                            <div className="w-36 sm:w-48 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8] rounded-full"
                                style={{ width: `${Math.max(viewRatio, 5)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedNovelId(novel.id);
                              setActiveTab('episodes');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-[#38BDF8] font-bold text-xs transition-colors"
                            title="Gestionar capítulos"
                          >
                            Capítulos
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Breakdown & Quick Actions (1 Col) */}
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-[#101935] border border-[#1E3A8A]/60 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                  Distribución por Categorías
                </h3>
                <p className="text-xs text-[#A7B0C0]">
                  Porcentaje de producciones según sus categorías creadas.
                </p>

                {categoryDistribution.length === 0 ? (
                  <p className="text-xs text-[#A7B0C0]">No hay categorías asignadas todavía.</p>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {categoryDistribution.slice(0, 6).map(([cat, count]) => {
                      const pct = novels.length > 0 ? Math.round((count / novels.length) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white font-medium">{cat}</span>
                            <span className="text-[#38BDF8] font-bold">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Admin Actions Box */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#101935] to-[#162244] border border-[#1E3A8A]/70 shadow-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#38BDF8]">
                  Acciones Rápidas
                </h4>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => setActiveTab('novels')}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-white font-semibold transition-all"
                  >
                    <span>Crear Nueva Novela</span>
                    <ChevronRight className="w-4 h-4 text-[#38BDF8]" />
                  </button>
                  <button
                    onClick={() => setActiveTab('batch')}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-white font-semibold transition-all"
                  >
                    <span>Importar Lista Masiva de Capítulos</span>
                    <ChevronRight className="w-4 h-4 text-[#38BDF8]" />
                  </button>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-white font-semibold transition-all"
                  >
                    <span>Ver Registro de Cambios</span>
                    <ChevronRight className="w-4 h-4 text-[#38BDF8]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 2: GESTIÓN DE NOVELAS (CREAR, EDITAR, ELIMINAR) --- */}
      {/* ========================================================================= */}
      {activeTab === 'novels' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Create Novel Form */}
          <div className="p-6 rounded-3xl bg-[#101935] border border-[#1E3A8A]/60 shadow-xl space-y-5">
            <div className="border-b border-white/5 pb-4">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#38BDF8] border border-blue-500/30">
                Paso 1 del Catálogo
              </span>
              <h2 className="text-lg font-black text-white mt-2">Crear y Publicar Nueva Novela</h2>
              <p className="text-xs text-[#A7B0C0] mt-0.5">
                Ingresa los datos de la novela. Las vistas y me gusta comenzarán en 0 y se incrementarán de manera natural con los usuarios reales.
              </p>
            </div>

            <form onSubmit={handleSaveNovel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                    Título de la Novela *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. El Secreto del Magnate"
                    value={editingNovel?.title || ''}
                    onChange={(e) => setEditingNovel(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38BDF8] font-bold"
                  />
                </div>

                {/* Release Year */}
                <div>
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Año de Lanzamiento *
                  </label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={2035}
                    value={editingNovel?.releaseYear || new Date().getFullYear()}
                    onChange={(e) => setEditingNovel(prev => ({ ...prev, releaseYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                  Sinopsis / Argumento *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Escribe una breve y emocionante descripción de la novela vertical..."
                  value={editingNovel?.synopsis || ''}
                  onChange={(e) => setEditingNovel(prev => ({ ...prev, synopsis: e.target.value }))}
                  className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl p-3 text-xs text-white outline-none focus:border-[#38BDF8]"
                />
              </div>

              {/* Status and Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/50">
                <div>
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1">Estado de Emisión</label>
                  <select
                    value={editingNovel?.status || 'airing'}
                    onChange={(e) => setEditingNovel(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                  >
                    <option value="airing">En emisión (Nuevos episodios)</option>
                    <option value="completed">Completa (Todos los capítulos listos)</option>
                    <option value="upcoming">Próximamente</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 sm:col-span-2 pt-2 sm:pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={!!editingNovel?.isFeatured}
                      onChange={(e) => setEditingNovel(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span>Destacar en Portada Principal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={!!editingNovel?.isNew}
                      onChange={(e) => setEditingNovel(prev => ({ ...prev, isNew: e.target.checked }))}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span>Marcar como Estreno</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Categories Selection */}
              <div className="p-4 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-white block">
                      Categorías y Géneros de la Novela
                    </label>
                    <span className="text-[11px] text-[#A7B0C0]">
                      Selecciona las categorías existentes o añade nuevas categorías dinámicas.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nueva categoría..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      className="bg-[#101935] border border-[#1E3A8A] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38BDF8] w-36"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      + Añadir
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allSuggestedCategories.map((cat) => {
                    const isSelected = (editingNovel?.genres || []).includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoryInNovel(cat)}
                        className={`text-xs px-3 py-1 rounded-xl font-bold transition-all ${
                          isSelected
                            ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/30'
                            : 'bg-white/5 text-[#A7B0C0] hover:text-white border border-white/5'
                        }`}
                      >
                        {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cover Image Input with Live Preview */}
              <div className="p-4 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#38BDF8]" />
                      <span>Enlace o Link de la Portada (Imagen) *</span>
                    </label>
                    <p className="text-[11px] text-[#A7B0C0] mt-0.5">
                      Inserta un enlace web directo de imagen (https://...jpg, png, webp, etc.).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={pasteCoverFromClipboard}
                    className="text-xs text-amber-300 hover:text-amber-200 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                  >
                    Pegar del Portapapeles
                  </button>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Pega aquí el enlace de la imagen (ej: https://...jpg, png o enlace directo)"
                  value={novelCoverDriveInput || editingNovel?.coverUrl || ''}
                  onChange={(e) => handleCoverInputChange(e.target.value)}
                  className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                />

                {/* Live Real-time Image Preview */}
                {editingNovel?.coverUrl ? (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-16 h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-blue-500/40 shadow-lg">
                      <img
                        src={getSafeImageUrl(editingNovel.coverUrl)}
                        alt="Preview Portada"
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, novelCoverDriveInput || editingNovel.coverUrl || '')}
                      />
                    </div>
                    <div className="text-xs text-[#A7B0C0] space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Portada cargada
                        </span>
                        {isStreamtapeUrl(novelCoverDriveInput || editingNovel.coverUrl || '') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-[#38BDF8] border border-blue-500/30">
                            Streamtape CDN HD
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A7B0C0]/70 line-clamp-1 font-mono">
                        {editingNovel.coverUrl}
                      </p>
                      <p className="text-[10px] text-blue-400">
                        Esta imagen también se usará como portada automática para todos los capítulos de esta novela.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#A7B0C0]/60">
                    Al escribir o pegar el enlace de la imagen, la portada se mostrará aquí al instante para verificarla.
                  </p>
                )}
              </div>

              {/* Optional: Add Chapter 1 with Iframe or Video Link */}
              {!editingNovel?.id && (
                <div className="p-4 rounded-2xl bg-[#080D1A]/60 border border-[#8B5CF6]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#C084FC] flex items-center gap-1.5">
                      <Film className="w-4 h-4" />
                      Capítulo 1 Inicial (Opcional - código &lt;iframe&gt; de Streamtape o enlace)
                    </span>
                    {isIframeHtml(initialChapterVideoInput) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-[#C084FC] border border-purple-500/30">
                        Código &lt;iframe&gt; detectado
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Pega el código <iframe src=...></iframe> o enlace de video para el Cap 1"
                    value={initialChapterVideoInput}
                    onChange={(e) => setInitialChapterVideoInput(e.target.value)}
                    className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#8B5CF6]"
                  />

                  {initialChapterVideoInput.trim() && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 
                          {isIframeHtml(initialChapterVideoInput) ? 'Código <iframe> detectado' : 'Video configurado'}
                        </div>
                        {isStreamtapeUrl(initialChapterVideoInput) && (
                          <a
                            href={getStreamtapeExternalUrl(initialChapterVideoInput)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#38BDF8] hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-2.5 py-1 rounded-lg border border-blue-500/30 flex items-center gap-1 font-bold transition-all"
                            title="Probar reproducción en nueva pestaña"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Probar en nueva pestaña</span>
                          </a>
                        )}
                      </div>

                      {isStreamtapeUrl(initialChapterVideoInput) && (
                        <p className="text-[10px] text-[#A7B0C0] bg-blue-900/30 p-2 rounded-xl border border-blue-500/20">
                          ⚡ <strong>Streamtape:</strong> En la plataforma se extraerá el MP4 directo para reproducción vertical sin advertencias de seguridad del navegador.
                        </p>
                      )}

                      <div className="aspect-video max-h-44 rounded-xl overflow-hidden bg-black border border-white/10">
                        <iframe
                          src={formatDriveVideoUrl(initialChapterVideoInput)}
                          className="w-full h-full border-0"
                          title="Preview Cap 1"
                          allow="autoplay; fullscreen"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isNovelSubmitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isNovelSubmitting ? 'Guardando en Firestore...' : 'Guardar y Publicar Novela'}
                </button>
              </div>
            </form>
          </div>

          {/* Current Real Novels Catalog with Edit and Delete options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Catálogo de Novelas Publicadas</h3>
                <p className="text-xs text-[#A7B0C0]">
                  Administra las novelas en vivo. Puedes editarlas o eliminarlas en cualquier momento.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {novels.length} novelas en vivo
              </span>
            </div>

            {novels.length === 0 ? (
              <div className="py-16 text-center bg-[#101935] rounded-3xl border border-[#1E3A8A]/40 p-8 space-y-3">
                <Film className="w-12 h-12 text-[#38BDF8]/40 mx-auto" />
                <h4 className="text-sm font-bold text-white">No hay novelas todavía</h4>
                <p className="text-xs text-[#A7B0C0] max-w-md mx-auto">
                  Usa el formulario de arriba para cargar tu primera novela insertando su enlace de imagen y capítulos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {novels.map((n) => (
                  <div 
                    key={n.id}
                    className="p-4 rounded-2xl bg-[#101935] border border-[#1E3A8A]/50 hover:border-[#38BDF8]/50 flex flex-col justify-between transition-all group shadow-lg"
                  >
                    <div className="flex gap-3">
                      <img
                        src={getSafeImageUrl(n.coverUrl)}
                        alt={n.title}
                        className="w-20 h-28 rounded-xl object-cover shrink-0 bg-black border border-white/10"
                        onError={(e) => handleImageError(e, n.coverUrl)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-[#38BDF8]">
                            {n.status === 'airing' ? 'En emisión' : n.status === 'completed' ? 'Completa' : 'Próxima'}
                          </span>
                          {n.releaseYear && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-600/30 text-white border border-blue-500/30">
                              Año {n.releaseYear}
                            </span>
                          )}
                          {n.isFeatured && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              Destacada
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold truncate text-[#F7F7FA]">{n.title}</h4>
                        <p className="text-[11px] text-[#A7B0C0] line-clamp-2 mt-0.5">{n.synopsis}</p>
                        
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                          <span className="text-emerald-400 font-bold">
                            {n.episodeCount || 0} caps
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-[#38BDF8] font-bold">
                            👁️ {n.views || 0} vistas
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-[#FF5A5F] font-bold">
                            ❤️ {n.likesCount || 0} likes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedNovelId(n.id);
                          setActiveTab('episodes');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-[#38BDF8] text-xs font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Capítulos
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Edit Novel Button */}
                        <button
                          onClick={() => {
                            setModalEditingNovel(n);
                            setEditNovelCoverInput(n.coverUrl);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
                          title="Editar novela"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Editar</span>
                        </button>

                        {/* Delete Novel Button */}
                        <button
                          onClick={() => handleDeleteNovel(n.id, n.title)}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Eliminar novela"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 3: AGREGAR Y GESTIONAR CAPÍTULOS DE LA NOVELA --- */}
      {/* ========================================================================= */}
      {activeTab === 'episodes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Novel Selector */}
          <div className="p-5 rounded-3xl bg-[#101935] border border-[#1E3A8A]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Film className="w-6 h-6 text-[#38BDF8] shrink-0" />
              <div className="w-full md:w-auto">
                <label className="text-[11px] font-black text-[#38BDF8] uppercase tracking-wider block">
                  Elige la novela para agregar o editar capítulos:
                </label>
                {novels.length === 0 ? (
                  <span className="text-xs text-amber-300 font-semibold block mt-1">
                    No hay novelas. Crea una en la pestaña "Gestión de Novelas" primero.
                  </span>
                ) : (
                  <select
                    value={selectedNovelId}
                    onChange={(e) => setSelectedNovelId(e.target.value)}
                    className="w-full md:w-80 bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none cursor-pointer mt-1 focus:border-[#38BDF8]"
                  >
                    {novels.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({n.episodeCount || 0} capítulos)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {selectedNovelObj && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('batch')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-[#C084FC] text-xs font-bold transition-all"
                >
                  <ListPlus className="w-4 h-4" />
                  Cargar Varios Iframes a la Vez
                </button>
              </div>
            )}
          </div>

          {/* Add Chapter Form */}
          {selectedNovelObj ? (
            <div className="p-6 rounded-3xl bg-[#101935] border border-[#1E3A8A]/60 shadow-xl space-y-5">
              
              {/* Inherited Cover Banner */}
              <div className="p-4 rounded-2xl bg-[#080D1A] border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={getSafeImageUrl(selectedNovelObj.coverUrl)}
                    alt={selectedNovelObj.title}
                    className="w-12 h-16 rounded-xl object-cover bg-black shrink-0 border border-emerald-500/40 shadow-md"
                    onError={(e) => handleImageError(e, selectedNovelObj.coverUrl)}
                  />
                  <div>
                    <span className="text-[11px] uppercase font-bold text-emerald-400 block">
                      ✓ Portada heredada automáticamente
                    </span>
                    <h3 className="text-sm font-bold text-white">{selectedNovelObj.title}</h3>
                    <p className="text-[11px] text-[#A7B0C0] mt-0.5">
                      Este nuevo capítulo toma automáticamente la misma imagen de portada de la novela.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10">
                    {novelEpisodes.length} caps publicados
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEpisode} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#A7B0C0] block mb-1">Capítulo #</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={episodeNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setEpisodeNumber(val);
                        if (!episodeTitle || episodeTitle.startsWith('Capítulo ')) {
                          setEpisodeTitle(`Capítulo ${val}`);
                        }
                      }}
                      className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white font-bold text-center outline-none focus:border-[#38BDF8]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-xs font-bold text-[#A7B0C0] block mb-1">Título del Capítulo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Capítulo 1: El Comienzo"
                      value={episodeTitle}
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                    />
                  </div>
                </div>

                {/* Video input (Iframe or Video URL) */}
                <div className="p-4 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/60 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-[#38BDF8]" />
                        <span>Video del Capítulo (Código &lt;iframe&gt; de Streamtape o Enlace) *</span>
                      </label>
                      <p className="text-[11px] text-[#A7B0C0] mt-0.5">
                        Pega el código <strong>&lt;iframe src="..."&gt;&lt;/iframe&gt;</strong> o el enlace directo del video.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isIframeHtml(episodeVideoDriveInput) && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[#C084FC] border border-purple-500/30 text-[10px] font-bold">
                          Código &lt;iframe&gt;
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={pasteEpisodeVideoFromClipboard}
                        className="text-xs text-amber-300 hover:text-amber-200 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      >
                        Pegar del Portapapeles
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Pega aquí el código <iframe src=...></iframe> o enlace de video"
                    value={episodeVideoDriveInput}
                    onChange={(e) => handleEpisodeVideoInputChange(e.target.value)}
                    className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                  />

                  {/* Real-time Video Preview */}
                  {previewVideoUrl ? (
                    <div className="mt-3 p-3 rounded-2xl bg-[#101935] border border-[#1E3A8A] space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Video detectado:
                        </span>
                        {isStreamtapeUrl(episodeVideoDriveInput) && (
                          <a
                            href={getStreamtapeExternalUrl(episodeVideoDriveInput)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#38BDF8] hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-2.5 py-1 rounded-lg border border-blue-500/30 flex items-center gap-1 font-bold transition-all"
                            title="Probar en nueva pestaña"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Probar en nueva pestaña</span>
                          </a>
                        )}
                      </div>

                      {isStreamtapeUrl(episodeVideoDriveInput) && (
                        <p className="text-[10px] text-[#A7B0C0] bg-blue-900/30 p-2 rounded-xl border border-blue-500/20">
                          ⚡ <strong>Streamtape:</strong> En la plataforma se extraerá el MP4 directo para reproducción vertical sin advertencias de seguridad del navegador.
                        </p>
                      )}

                      <div className="aspect-[16/9] max-h-56 w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-lg">
                        <iframe
                          src={previewVideoUrl}
                          className="w-full h-full border-0"
                          title="Preview del video"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#A7B0C0]/60">
                      Al pegar el código &lt;iframe&gt; o link del video, se cargará la vista previa aquí para verificarlo.
                    </p>
                  )}
                </div>

                {/* Chapter Custom Thumbnail (Optional) */}
                <div className="p-4 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/60 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#38BDF8]" />
                        <span>Portada del Capítulo (Opcional - Imagen)</span>
                      </label>
                      <p className="text-[11px] text-[#A7B0C0] mt-0.5">
                        Por defecto hereda la portada de la novela. Puedes pegar otra imagen si deseas una portada distinta.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEpisodeCoverDriveInput(selectedNovelObj.coverUrl)}
                      className="text-[11px] text-[#38BDF8] hover:underline font-semibold"
                    >
                      Restablecer portada de novela
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder={`Por defecto hereda la portada de "${selectedNovelObj.title}". Pega un link de imagen si quieres otra`}
                    value={episodeCoverDriveInput}
                    onChange={(e) => setEpisodeCoverDriveInput(e.target.value)}
                    className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isEpisodeSubmitting || !episodeVideoDriveInput.trim()}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {isEpisodeSubmitting ? 'Guardando Capítulo...' : 'Publicar Capítulo en Tiempo Real'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#101935] rounded-3xl border border-[#1E3A8A]/50">
              <p className="text-xs text-[#A7B0C0]">Selecciona o crea una novela para agregar capítulos.</p>
            </div>
          )}

          {/* List of Published Chapters for Selected Novel */}
          {selectedNovelObj && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Capítulos cargados para "{selectedNovelObj.title}" ({novelEpisodes.length})
                </h3>
                <span className="text-xs text-[#A7B0C0]">Orden correlativo</span>
              </div>

              {novelEpisodes.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#A7B0C0] bg-[#101935] rounded-2xl border border-[#1E3A8A]/40 p-6">
                  No hay capítulos todavía para esta novela. Pega tu primer código &lt;iframe&gt; o enlace de video en el formulario de arriba.
                </div>
              ) : (
                <div className="space-y-2">
                  {novelEpisodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-3 rounded-2xl bg-[#101935] border border-[#1E3A8A]/50 flex items-center justify-between gap-3 hover:border-[#38BDF8]/40 transition-colors shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getSafeImageUrl(ep.thumbnail || selectedNovelObj.coverUrl)}
                          alt={ep.title}
                          className="w-10 h-14 rounded-xl object-cover bg-black border border-white/10 shrink-0"
                          onError={(e) => handleImageError(e, ep.thumbnail || selectedNovelObj.coverUrl)}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#38BDF8]">
                              Cap. {ep.episodeNumber}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate">{ep.title}</h4>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#A7B0C0]">
                            <span>👁️ {ep.views || 0} vistas</span>
                            <span>•</span>
                            <span className="text-[#FF5A5F]">❤️ {ep.likesCount || 0} likes</span>
                            <span>•</span>
                            <span>💬 {ep.commentsCount || 0} comentarios</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            const watchUrl = getStreamtapeExternalUrl(ep.videoUrl) || ep.videoUrl;
                            window.open(watchUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-[#38BDF8] text-xs font-bold transition-colors"
                          title="Abrir y probar en otra página (sin bloqueos)"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                          <span className="hidden sm:inline">Probar</span>
                        </button>

                        <button
                          onClick={() => handleStartEditEpisode(ep)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                          title="Editar capítulo"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          onClick={() => handleDeleteEpisode(ep.id, ep.title)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Eliminar capítulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 4: CARGA RÁPIDA MASIVA (IFRAMES O ENLACES) --- */}
      {/* ========================================================================= */}
      {activeTab === 'batch' && (
        <div className="max-w-2xl bg-[#101935] border border-[#1E3A8A]/60 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
            <ListPlus className="w-5 h-5 text-[#C084FC]" />
            <div>
              <h2 className="text-base font-bold text-white">Carga Rápida de Múltiples Capítulos</h2>
              <p className="text-xs text-[#A7B0C0]">
                Pega una lista de códigos &lt;iframe&gt; o enlaces de video (uno por línea) para importarlos correlativamente a la novela.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
              Novela destino:
            </label>
            {novels.length === 0 ? (
              <p className="text-xs text-amber-300">Crea primero una novela en la pestaña "Gestión de Novelas".</p>
            ) : (
              <select
                value={selectedNovelId}
                onChange={(e) => setSelectedNovelId(e.target.value)}
                className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none cursor-pointer"
              >
                {novels.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} (comenzará desde el capítulo {(n.episodeCount || 0) + 1})
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            rows={7}
            placeholder={`<iframe src="https://streamtape.com/e/1ABC..."></iframe>\nhttps://streamtape.com/e/2XYZ...\n<iframe src="https://streamtape.com/e/3DEF..."></iframe>`}
            value={batchLinksText}
            onChange={(e) => setBatchLinksText(e.target.value)}
            className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-2xl p-3.5 text-xs text-white font-mono outline-none focus:border-[#C084FC]"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-bold">
              {extractAllDriveLinks(batchLinksText).length} capítulos / videos detectados
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) setBatchLinksText(prev => prev ? `${prev}\n${text}` : text);
                } catch {
                  showToast('Pega manualmente en la caja de texto');
                }
              }}
              className="text-amber-300 hover:text-amber-200"
            >
              Pegar del portapapeles
            </button>
          </div>

          <button
            type="button"
            disabled={extractAllDriveLinks(batchLinksText).length === 0 || isBatchSubmitting}
            onClick={handleBulkImportChapters}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isBatchSubmitting ? 'Importando capítulos...' : `Importar ${extractAllDriveLinks(batchLinksText).length} Capítulos en Tiempo Real`}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 5: REGISTRO DE AUDITORÍA Y ACTIVIDAD --- */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 rounded-3xl bg-[#101935] border border-[#1E3A8A]/60 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <History className="w-4 h-4 text-[#38BDF8]" />
                  Registro de Auditoría de Cambios
                </h3>
                <p className="text-xs text-[#A7B0C0] mt-0.5">
                  Historial de cambios realizados en Firestore con fecha, autor y detalle.
                </p>
              </div>
              <span className="text-xs font-bold text-white/50">
                {auditLogs.length} eventos
              </span>
            </div>

            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#A7B0C0]">No hay registros de auditoría aún.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#F7F7FA]">{log.action}: </span>
                      <span className="text-[#A7B0C0]">{log.details}</span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-[11px] text-[#38BDF8] font-mono">{log.userEmail}</div>
                      <div className="text-[10px] text-[#A7B0C0]/60">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL: EDITAR NOVELA (COMPLETO) --- */}
      {/* ========================================================================= */}
      {modalEditingNovel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101935] border border-[#1E3A8A] rounded-3xl p-6 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Editar Novela: {modalEditingNovel.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEditingNovel(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalNovel} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                  Título de la Novela:
                </label>
                <input
                  type="text"
                  required
                  value={modalEditingNovel.title}
                  onChange={(e) => setModalEditingNovel(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                  className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                    Año de Lanzamiento:
                  </label>
                  <input
                    type="number"
                    required
                    value={modalEditingNovel.releaseYear || new Date().getFullYear()}
                    onChange={(e) => setModalEditingNovel(prev => prev ? ({ ...prev, releaseYear: parseInt(e.target.value) || new Date().getFullYear() }) : null)}
                    className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                    Estado:
                  </label>
                  <select
                    value={modalEditingNovel.status}
                    onChange={(e) => setModalEditingNovel(prev => prev ? ({ ...prev, status: e.target.value as any }) : null)}
                    className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-[#38BDF8]"
                  >
                    <option value="airing">En emisión</option>
                    <option value="completed">Completa</option>
                    <option value="upcoming">Próxima</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                  Sinopsis:
                </label>
                <textarea
                  rows={3}
                  required
                  value={modalEditingNovel.synopsis}
                  onChange={(e) => setModalEditingNovel(prev => prev ? ({ ...prev, synopsis: e.target.value }) : null)}
                  className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl p-3 text-xs text-white outline-none focus:border-[#38BDF8]"
                />
              </div>

              {/* Cover Image Input with Live Preview */}
              <div className="p-3.5 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/60 space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#38BDF8]" />
                  <span>Enlace de la Portada (Imagen):</span>
                </label>
                <input
                  type="text"
                  required
                  value={editNovelCoverInput}
                  onChange={(e) => setEditNovelCoverInput(e.target.value)}
                  className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                />

                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={getSafeImageUrl(editNovelCoverInput.trim() ? formatDriveImageUrl(editNovelCoverInput) : modalEditingNovel.coverUrl)}
                    alt="Portada previa"
                    className="w-12 h-16 rounded-xl object-cover bg-black border border-white/10 shrink-0"
                    onError={(e) => handleImageError(e, editNovelCoverInput || modalEditingNovel.coverUrl)}
                  />
                  <div className="text-[11px] text-[#A7B0C0]">
                    <span className="text-emerald-400 font-bold block">Vista previa de la portada</span>
                    <span>Se actualizará en Firestore en tiempo real para todos los usuarios.</span>
                  </div>
                </div>
              </div>

              {/* Categories in Edit Modal */}
              <div className="p-3.5 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/50 space-y-2">
                <label className="text-xs font-bold text-white block">
                  Categorías:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(modalEditingNovel.genres || []).map(g => (
                    <span key={g} className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600/20 text-[#38BDF8] border border-blue-500/30 flex items-center gap-1 font-bold">
                      {g}
                      <button
                        type="button"
                        onClick={() => setModalEditingNovel(prev => prev ? ({ ...prev, genres: (prev.genres || []).filter(item => item !== g) }) : null)}
                        className="hover:text-red-400 font-black ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Añadir categoría..."
                    value={modalNewCategoryInput}
                    onChange={(e) => setModalNewCategoryInput(e.target.value)}
                    className="bg-[#101935] border border-[#1E3A8A] rounded-xl px-3 py-1.5 text-xs text-white outline-none flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!modalNewCategoryInput.trim()) return;
                      const current = modalEditingNovel.genres || [];
                      if (!current.includes(modalNewCategoryInput.trim())) {
                        setModalEditingNovel(prev => prev ? ({ ...prev, genres: [...current, modalNewCategoryInput.trim()] }) : null);
                      }
                      setModalNewCategoryInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* Badges Toggle */}
              <div className="flex items-center gap-4 text-xs font-semibold text-white">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!modalEditingNovel.isFeatured}
                    onChange={(e) => setModalEditingNovel(prev => prev ? ({ ...prev, isFeatured: e.target.checked }) : null)}
                    className="accent-blue-500"
                  />
                  <span>Destacada</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!modalEditingNovel.isNew}
                    onChange={(e) => setModalEditingNovel(prev => prev ? ({ ...prev, isNew: e.target.checked }) : null)}
                    className="accent-blue-500"
                  />
                  <span>Estreno</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModalEditingNovel(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#A7B0C0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isModalNovelSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isModalNovelSubmitting ? 'Guardando...' : 'Guardar Cambios de la Novela'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- MODAL: EDITAR CAPÍTULO (COMPLETO) --- */}
      {/* ========================================================================= */}
      {editingEpisode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101935] border border-[#1E3A8A] rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Editar Capítulo #{editEpisodeNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEpisode(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedEpisode} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                    Capítulo #:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editEpisodeNumber}
                    onChange={(e) => setEditEpisodeNumber(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#A7B0C0] block mb-1">
                    Título del Capítulo:
                  </label>
                  <input
                    type="text"
                    required
                    value={editEpisodeTitle}
                    onChange={(e) => setEditEpisodeTitle(e.target.value)}
                    className="w-full bg-[#080D1A] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              {/* VIDEO (IFRAME CODE OR LINK) */}
              <div className="p-3.5 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Video (Código &lt;iframe&gt; o Enlace):</span>
                  </label>
                  {isIframeHtml(editEpisodeVideoInput) && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[#C084FC] border border-purple-500/30 text-[10px] font-bold">
                      &lt;iframe&gt;
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Pega el código <iframe src=...></iframe> o el enlace del video"
                  value={editEpisodeVideoInput}
                  onChange={(e) => setEditEpisodeVideoInput(e.target.value)}
                  className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                />

                {editEpisodeVideoInput.trim() && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Video listo
                      </span>
                      {isStreamtapeUrl(editEpisodeVideoInput) && (
                        <a
                          href={getStreamtapeExternalUrl(editEpisodeVideoInput)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#38BDF8] hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-2 py-0.5 rounded-lg border border-blue-500/30 flex items-center gap-1 font-bold transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> Probar en nueva pestaña
                        </a>
                      )}
                    </div>

                    <div className="aspect-video max-h-40 rounded-xl overflow-hidden bg-black border border-white/10">
                      <iframe
                        src={formatDriveVideoUrl(editEpisodeVideoInput)}
                        className="w-full h-full border-0"
                        title="Vista previa del video editado"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CHAPTER COVER */}
              <div className="p-3.5 rounded-2xl bg-[#080D1A] border border-[#1E3A8A]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Portada / Miniatura (Enlace de Imagen):</span>
                  </label>
                  {selectedNovelObj && (
                    <button
                      type="button"
                      onClick={() => setEditEpisodeCoverInput(selectedNovelObj.coverUrl)}
                      className="text-[11px] text-[#38BDF8] hover:underline font-semibold"
                    >
                      Usar portada de la novela
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Pega cualquier enlace web de imagen"
                  value={editEpisodeCoverInput}
                  onChange={(e) => setEditEpisodeCoverInput(e.target.value)}
                  className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                />

                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={getSafeImageUrl(editEpisodeCoverInput.trim() ? formatDriveImageUrl(editEpisodeCoverInput) : (selectedNovelObj?.coverUrl || ''))}
                    alt="Portada del capítulo"
                    className="w-12 h-16 rounded-xl object-cover bg-black border border-white/10 shrink-0"
                    onError={(e) => handleImageError(e, editEpisodeCoverInput || selectedNovelObj?.coverUrl || '')}
                  />
                  <div className="text-[11px] text-[#A7B0C0] leading-tight">
                    <span className="text-white font-semibold block">Vista previa de la portada</span>
                    <span>Se guardará en Firestore y se mostrará en el reproductor y en la lista de capítulos.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingEpisode(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#A7B0C0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditEpisodeSubmitting || !editEpisodeVideoInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isEditEpisodeSubmitting ? 'Guardando...' : 'Guardar Cambios del Capítulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
