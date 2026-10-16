import React from 'react';
import { Home, Compass, Bookmark, User, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, watchlist } = useApp();
  const { isAdmin } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080D1A]/95 backdrop-blur-lg border-t border-[#162244] px-4 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            currentTab === 'home' ? 'text-[#38BDF8]' : 'text-[#A7B0C0] hover:text-[#F7F7FA]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Inicio</span>
        </button>

        <button
          onClick={() => setCurrentTab('explore')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            currentTab === 'explore' ? 'text-[#38BDF8]' : 'text-[#A7B0C0] hover:text-[#F7F7FA]'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-bold">Explorar</span>
        </button>

        <button
          onClick={() => setCurrentTab('watchlist')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors relative ${
            currentTab === 'watchlist' ? 'text-[#38BDF8]' : 'text-[#A7B0C0] hover:text-[#F7F7FA]'
          }`}
        >
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {watchlist.length > 0 && (
              <span className="absolute -top-1 -right-2 text-[9px] w-4 h-4 rounded-full bg-[#FF4B55] text-white flex items-center justify-center font-black">
                {watchlist.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Mi lista</span>
        </button>

        <button
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            currentTab === 'profile' ? 'text-[#FF5A5F]' : 'text-[#A7B0C0] hover:text-[#F7F7FA]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
              currentTab === 'admin' ? 'text-[#C084FC]' : 'text-[#C084FC]/70 hover:text-[#C084FC]'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        )}
      </div>
    </div>
  );
};
