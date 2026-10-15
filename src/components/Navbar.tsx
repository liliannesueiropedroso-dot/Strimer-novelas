import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Search, 
  Bookmark, 
  User as UserIcon, 
  LogOut, 
  Shield, 
  Compass, 
  Home, 
  Film,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { user, isAdmin, signIn, signOutUser, toggleAdminBypass } = useAuth();
  const { currentTab, setCurrentTab, watchlist, setSearchFilter, searchFilter } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchFilter.trim()) {
      setCurrentTab('explore');
      setShowSearchModal(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080D1A]/95 backdrop-blur-md border-b border-[#162244] shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between flex-nowrap gap-2 sm:gap-4">
        
        {/* Brand Logo - Fixed size, never shrinks */}
        <div 
          onClick={() => { setCurrentTab('home'); setSearchFilter(''); }}
          className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] via-[#38BDF8] to-[#FF4B55] flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base sm:text-lg tracking-tight text-[#F7F7FA]">
              Novela<span className="text-[#38BDF8]">Stream</span>
            </span>
            <span className="hidden xs:inline-block text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[#38BDF8] border border-blue-500/30">
              HD
            </span>
          </div>
        </div>

        {/* Central Navigation - Stays centered, flex-nowrap, never pushed */}
        <nav className="hidden md:flex items-center gap-1 bg-[#101935]/80 p-1 rounded-2xl border border-[#1E3A8A]/40 shrink-0">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              currentTab === 'home' 
                ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/30' 
                : 'text-[#A7B0C0] hover:text-[#F7F7FA] hover:bg-white/5'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Inicio
          </button>

          <button
            onClick={() => setCurrentTab('explore')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              currentTab === 'explore' 
                ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/30' 
                : 'text-[#A7B0C0] hover:text-[#F7F7FA] hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Explorar
          </button>

          <button
            onClick={() => setCurrentTab('watchlist')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              currentTab === 'watchlist' 
                ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-md shadow-blue-500/30' 
                : 'text-[#A7B0C0] hover:text-[#F7F7FA] hover:bg-white/5'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Mi lista
            {watchlist.length > 0 && (
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF4B55] text-white font-black">
                {watchlist.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'admin'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md shadow-purple-500/30'
                  : 'text-[#8B5CF6] hover:bg-purple-500/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </nav>

        {/* Right Section: Compact Search + User Action (Strictly sized, no shifting) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Desktop Search Bar (Only on large screens to avoid any menu displacement) */}
          <form 
            onSubmit={handleSearchSubmit} 
            className="hidden lg:flex items-center relative w-48 xl:w-56"
          >
            <Search className="w-3.5 h-3.5 text-[#38BDF8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar novelas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#101935] border border-[#1E3A8A]/50 rounded-full pl-8 pr-7 py-1.5 text-xs text-[#F7F7FA] placeholder-[#A7B0C0]/60 outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 transition-all font-medium"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#A7B0C0] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {/* Search Trigger Button for Mobile & Medium Screens */}
          <button
            onClick={() => setShowSearchModal(!showSearchModal)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#101935] border border-[#1E3A8A]/50 flex items-center justify-center text-[#38BDF8] hover:text-white transition-colors shrink-0"
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* User Profile / Admin Access Trigger */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 p-1 rounded-full border border-[#1E3A8A]/60 hover:border-[#38BDF8] transition-colors bg-[#101935] shrink-0"
              aria-label="Perfil"
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Usuario'} 
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-extrabold">
                  {user?.email ? user.email.charAt(0).toUpperCase() : (isAdmin ? <Shield className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />)}
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#101935] border border-[#1E3A8A]/60 shadow-2xl p-2 z-50 animate-in fade-in duration-100"
              >
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-bold text-[#F7F7FA] truncate">
                    {user?.displayName || (isAdmin ? 'Administrador' : 'Observador')}
                  </p>
                  <p className="text-[11px] text-[#A7B0C0] truncate">
                    {user?.email || (isAdmin ? 'Modo Admin Activo' : 'Sin cuenta vinculada')}
                  </p>
                  {isAdmin && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#C084FC] border border-purple-500/30">
                      ★ Modo Administrador
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setCurrentTab('profile'); setShowProfileMenu(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-[#A7B0C0] hover:text-[#F7F7FA] hover:bg-white/5 rounded-xl transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Mi Perfil & Ajustes
                </button>

                <button
                  onClick={() => { setCurrentTab('watchlist'); setShowProfileMenu(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-[#A7B0C0] hover:text-[#F7F7FA] hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#FF4B55]" />
                  Mi Lista ({watchlist.length})
                </button>

                {/* Direct Admin Access Button */}
                <button
                  onClick={() => {
                    toggleAdminBypass(true);
                    setCurrentTab('admin');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-[#C084FC] hover:bg-purple-500/10 rounded-xl transition-colors font-bold"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Panel Administrativo
                </button>

                <div className="my-1 border-t border-white/5" />

                {user ? (
                  <button
                    onClick={() => { signOutUser(); setShowProfileMenu(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar sesión
                  </button>
                ) : (
                  <button
                    onClick={() => { signIn(); setShowProfileMenu(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors font-bold"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Iniciar sesión Google
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Modal Search Overlay (Fixed position, NEVER displaces the header) */}
      {showSearchModal && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-[#080D1A]/98 border-b border-[#1E3A8A]/60 p-3 shadow-2xl z-30 animate-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#38BDF8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar novelas o microdramas..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#101935] border border-[#1E3A8A] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F7F7FA] outline-none focus:border-[#38BDF8]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => setShowSearchModal(false)}
              className="p-2 text-xs text-[#A7B0C0] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
