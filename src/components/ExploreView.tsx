import React, { useMemo, useState } from 'react';
import { Search, Sparkles, Calendar, Layers, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NovelCard } from './NovelCard';

const STATUSES = [
  { label: 'Todos', value: 'all' },
  { label: 'En emisión', value: 'airing' },
  { label: 'Completa', value: 'completed' },
  { label: 'Próxima', value: 'upcoming' },
];

export const ExploreView: React.FC = () => {
  const { 
    novels, 
    searchFilter, 
    setSearchFilter, 
    selectedGenre, 
    setSelectedGenre, 
    selectedStatus, 
    setSelectedStatus, 
    selectedSort, 
    setSelectedSort 
  } = useApp();

  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Dynamic Categories / Genres extracted from all created novels in the catalog
  const dynamicGenres = useMemo(() => {
    const set = new Set<string>();
    novels.forEach(n => {
      (n.genres || []).forEach(g => {
        if (g && g.trim()) set.add(g.trim());
      });
    });
    // Add default popular options if not present
    ['Romance', 'Drama', 'Venganza', 'Comedia', 'Billionaire', 'Misterio'].forEach(g => set.add(g));
    return ['Todos', ...Array.from(set)];
  }, [novels]);

  // Dynamic Years extracted from novels
  const dynamicYears = useMemo(() => {
    const years = new Set<number>();
    novels.forEach(n => {
      if (n.releaseYear) years.add(n.releaseYear);
    });
    // If empty, offer current and recent years
    const curr = new Date().getFullYear();
    years.add(curr);
    years.add(curr - 1);
    return ['all', ...Array.from(years).sort((a, b) => b - a).map(String)];
  }, [novels]);

  const filtered = novels.filter((novel) => {
    // Search query
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = novel.title.toLowerCase().includes(q);
      const matchSynopsis = novel.synopsis.toLowerCase().includes(q);
      const matchGenre = novel.genres.some(g => g.toLowerCase().includes(q));
      const matchTag = novel.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSynopsis && !matchGenre && !matchTag) return false;
    }

    // Dynamic Genre
    if (selectedGenre !== 'all' && selectedGenre !== 'Todos') {
      if (!novel.genres.includes(selectedGenre)) return false;
    }

    // Status
    if (selectedStatus !== 'all') {
      if (novel.status !== selectedStatus) return false;
    }

    // Year
    if (selectedYear !== 'all') {
      const yearNum = parseInt(selectedYear);
      if (novel.releaseYear && novel.releaseYear !== yearNum) return false;
    }

    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (selectedSort === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (selectedSort === 'views') return (b.views || 0) - (a.views || 0);
    if (selectedSort === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
    if (selectedSort === 'recent') return (b.order || 0) - (a.order || 0);
    return (b.views || 0) - (a.views || 0);
  });

  const resetFilters = () => {
    setSearchFilter('');
    setSelectedGenre('all');
    setSelectedStatus('all');
    setSelectedYear('all');
    setSelectedSort('popular');
  };

  const hasActiveFilters = searchFilter || selectedGenre !== 'all' || selectedStatus !== 'all' || selectedYear !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-28 text-[#F7F7FA] overflow-x-hidden">
      {/* Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Explorar Catálogo</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#38BDF8] font-bold border border-blue-500/30">
              {novels.length} novelas
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1">
            Filtra por categorías personalizadas, año de estreno, popularidad y estado de emisión.
          </p>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#A7B0C0] hover:text-white border border-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-5 w-full">
        <Search className="w-4 h-4 text-[#38BDF8] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por título, trama, actores, categorías o etiquetas..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-[#101935] border border-[#1E3A8A]/60 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-[#F7F7FA] placeholder-[#A7B0C0]/60 outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all font-medium"
        />
        {searchFilter && (
          <button
            onClick={() => setSearchFilter('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#A7B0C0] hover:text-white bg-white/10 px-2 py-0.5 rounded-md"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Dynamic Categories Row (Horizontal scroll, perfectly wrapped and responsive) */}
      <div className="w-full mb-4">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#A7B0C0]">
          <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Categorías ({dynamicGenres.length - 1}):</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 w-full max-w-full">
          {dynamicGenres.map((g) => {
            const isSelected = selectedGenre === g || (selectedGenre === 'all' && g === 'Todos');
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(g === 'Todos' ? 'all' : g)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/25 border border-blue-400/40'
                    : 'bg-[#101935] border border-[#1E3A8A]/50 text-[#A7B0C0] hover:text-white hover:border-[#38BDF8]/40'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Row 2: Status, Year & Sort (Clean responsive flex-wrap box, NO overflow) */}
      <div className="w-full mb-6 p-3 sm:p-4 rounded-2xl bg-[#101935] border border-[#1E3A8A]/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        
        {/* Left side: Status pills (Wrapped, no breaking outside box) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#A7B0C0] mr-1 shrink-0">Estado:</span>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStatus(s.value)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                selectedStatus === s.value 
                  ? 'bg-[#38BDF8] text-[#080D1A] font-bold shadow-sm' 
                  : 'bg-[#080D1A] border border-[#1E3A8A]/40 text-[#A7B0C0] hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Right side: Year & Sort selectors (Cleanly fitted) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-[#080D1A] px-2.5 py-1 rounded-xl border border-[#1E3A8A]/50">
            <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[11px] font-semibold text-[#A7B0C0]">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#101935]">Todos</option>
              {dynamicYears.filter(y => y !== 'all').map((yr) => (
                <option key={yr} value={yr} className="bg-[#101935]">{yr}</option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#080D1A] px-2.5 py-1 rounded-xl border border-[#1E3A8A]/50">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[11px] font-semibold text-[#A7B0C0]">Orden:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer pr-1"
            >
              <option value="popular" className="bg-[#101935]">Más vistas</option>
              <option value="likes" className="bg-[#101935]">Más Me Gusta</option>
              <option value="rating" className="bg-[#101935]">Mayor calificación</option>
              <option value="recent" className="bg-[#101935]">Estrenos recientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Results */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-[#101935]/40 rounded-3xl border border-[#1E3A8A]/30 p-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-[#38BDF8]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F7F7FA]">No se encontraron novelas</h3>
          <p className="text-xs text-[#A7B0C0] max-w-sm mx-auto">
            No hay novelas que coincidan con estos filtros. Prueba cambiando la categoría, el año o el término de búsqueda.
          </p>
          <button
            onClick={resetFilters}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-colors"
          >
            Ver todas las novelas
          </button>
        </div>
      ) : (
        <div>
          <div className="text-xs text-[#A7B0C0] mb-4 flex items-center justify-between">
            <span>Mostrando {sorted.length} {sorted.length === 1 ? 'historia' : 'historias'}</span>
            <span className="text-[11px] font-semibold text-[#38BDF8]">
              Formato vertical microdrama HD
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {sorted.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
