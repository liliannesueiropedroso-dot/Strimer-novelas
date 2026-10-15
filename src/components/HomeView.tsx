import React from 'react';
import { Sparkles, Flame, Zap, Crown, Heart, Film, Smile, Clock, Plus, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { HeroBanner } from './HeroBanner';
import { NovelRow } from './NovelRow';
import { ContinueWatchingRow } from './ContinueWatchingRow';

export const HomeView: React.FC = () => {
  const { novels, setCurrentTab } = useApp();
  const { isAdmin } = useAuth();

  // Dynamically group novels by categories created by admin (Hook must always run before any return)
  const dynamicCategoryRows = React.useMemo(() => {
    const map = new Map<string, typeof novels>();
    novels.forEach(n => {
      (n.genres || []).forEach(g => {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(n);
      });
    });
    return Array.from(map.entries());
  }, [novels]);

  // Segmenting rows dynamically
  const trendingNovels = React.useMemo(
    () => [...novels].sort((a, b) => (b.views || 0) - (a.views || 0)),
    [novels]
  );
  const newReleases = React.useMemo(
    () => novels.filter(n => n.isNew || n.status === 'airing'),
    [novels]
  );
  const mostLikedNovels = React.useMemo(
    () => [...novels].filter(n => (n.likesCount || 0) > 0).sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)),
    [novels]
  );

  if (novels.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#F7F7FA] space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#2563EB] via-[#38BDF8] to-[#FF4B55] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/25">
          <Film className="w-10 h-10 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Bienvenido a Novela<span className="text-[#38BDF8]">Stream</span>
          </h1>
          <p className="text-sm text-[#A7B0C0] max-w-md mx-auto leading-relaxed">
            Plataforma de novelas verticales y microdramas en tiempo real.
          </p>
        </div>

        {isAdmin ? (
          <div className="p-6 rounded-3xl bg-[#101935] border border-[#1E3A8A] max-w-lg mx-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#38BDF8]">
              <Shield className="w-4 h-4" />
              <span>Panel de Administración Activo</span>
            </div>
            <p className="text-xs text-[#A7B0C0] leading-relaxed">
              La plataforma está lista. Puedes agregar tu primera novela insertando el código de iframe o enlace del video (Streamtape) y la imagen de portada.
            </p>
            <button
              onClick={() => setCurrentTab('admin')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Abrir Admin y Cargar Novela
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#101935] border border-[#1E3A8A]/50 max-w-lg mx-auto space-y-3 shadow-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mx-auto animate-ping" />
            <h3 className="text-sm font-bold text-white">Preparando nuevos estrenos</h3>
            <p className="text-xs text-[#A7B0C0]">
              El catálogo se actualizará en tiempo real con producciones de novelas verticales.
            </p>
          </div>
        )}
      </div>
    );
  }

  const featuredNovel = novels.find(n => n.isFeatured) || novels[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-24 text-[#F7F7FA]">
      {/* Featured Cinematic Hero Banner */}
      {featuredNovel && <HeroBanner novel={featuredNovel} />}

      {/* Continue Watching Row (Dynamic based on user progress) */}
      <ContinueWatchingRow />

      {/* Row 1: Tendencias */}
      {trendingNovels.length > 0 && (
        <NovelRow
          title="Tendencias"
          subtitle="Las series verticales más vistas y comentadas"
          novels={trendingNovels}
          icon={<Flame className="w-5 h-5 fill-current text-[#38BDF8]" />}
        />
      )}

      {/* Row 2: Nuevos episodios / Estrenos */}
      {newReleases.length > 0 && (
        <NovelRow
          title="Nuevos Episodios & Estrenos"
          subtitle="Producciones recién agregadas en emisión"
          novels={newReleases}
          icon={<Zap className="w-5 h-5 fill-current text-amber-400" />}
        />
      )}

      {/* Row 3: Más Me Gusta */}
      {mostLikedNovels.length > 0 && (
        <NovelRow
          title="Favoritas de la Audiencia"
          subtitle="Las historias con más Me Gusta y recomendaciones"
          novels={mostLikedNovels}
          icon={<Heart className="w-5 h-5 fill-current text-[#FF5A5F]" />}
        />
      )}

      {/* Dynamic Rows for Every Category Created */}
      {dynamicCategoryRows.map(([categoryName, novelList]) => (
        <NovelRow
          key={categoryName}
          title={categoryName}
          subtitle={`Explora producciones en la categoría ${categoryName}`}
          novels={novelList}
          icon={<Film className="w-5 h-5 text-[#38BDF8]" />}
        />
      ))}
    </div>
  );
};
