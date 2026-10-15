import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { WatchlistView } from './components/WatchlistView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { VerticalPlayer } from './components/VerticalPlayer';
import { NovelDetailModal } from './components/NovelDetailModal';
import { CheckCircle2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentTab, toastMessage } = useApp();

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F7F7FA] flex flex-col font-sans selection:bg-[#FF5A5F] selection:text-white">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && <HomeView />}
        {currentTab === 'explore' && <ExploreView />}
        {currentTab === 'watchlist' && <WatchlistView />}
        {currentTab === 'profile' && <ProfileView />}
        {currentTab === 'admin' && <AdminPanel />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Modals & Overlays */}
      <VerticalPlayer />
      <NovelDetailModal />

      {/* Global Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#151C2E]/95 border border-[#8B5CF6]/50 shadow-2xl backdrop-blur-md text-xs font-semibold text-white animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-[#2ECC8F]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </AuthProvider>
  );
}
