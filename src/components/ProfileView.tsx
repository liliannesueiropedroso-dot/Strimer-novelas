import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  HardDrive, 
  Bell, 
  Trash2, 
  LogOut, 
  CheckCircle2, 
  Volume2, 
  History,
  Bookmark,
  Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const ProfileView: React.FC = () => {
  const { user, token, isAdmin, signIn, signOutUser } = useAuth();
  const { progressMap, setCurrentTab, showToast, watchlist, novels } = useApp();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoplayAudio, setAutoplayAudio] = useState(false);

  const historyEntries = Object.values(progressMap);

  const handleClearHistory = () => {
    if (window.confirm('¿Seguro que deseas borrar tu historial de reproducción? Se reiniciará el avance en todas las series.')) {
      localStorage.removeItem('novelastream_progress');
      showToast('Historial de reproducción borrado');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 text-[#F7F7FA] space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Mi Perfil & Ajustes</h1>
        <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1">
          Gestiona tu cuenta personal, preferencias de visualización y progreso.
        </p>
      </div>

      {/* User Card */}
      <div className="p-6 rounded-3xl bg-[#151C2E] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Usuario'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#8B5CF6]/50 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF5A5F] to-[#8B5CF6] flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user ? user.email?.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>
          )}

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#F7F7FA]">
              {user?.displayName || (user ? 'Usuario Registrado' : 'Observador Invitado')}
            </h2>
            <p className="text-xs text-[#A7B0C0]">{user?.email || 'Inicia sesión para guardar tus capítulos vistos en cualquier dispositivo'}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                <Shield className="w-3 h-3" /> Administrador de la Plataforma
              </span>
            )}
          </div>
        </div>

        <div>
          {user ? (
            <button
              onClick={() => signOutUser()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-gray-900 font-bold text-xs shadow-md hover:bg-gray-100 transition-all active:scale-95"
            >
              Iniciar sesión con Google
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats for Viewer */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div 
          onClick={() => setCurrentTab('watchlist')}
          className="p-4 rounded-2xl bg-[#151C2E] border border-white/5 hover:border-white/20 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-[#FF5A5F] mb-1">
            <Bookmark className="w-4 h-4" />
            <span className="text-lg font-bold text-white">{watchlist.length}</span>
          </div>
          <p className="text-xs font-semibold text-[#F7F7FA]">Mi Lista de Novelas</p>
          <p className="text-[10px] text-[#A7B0C0] mt-0.5">Series guardadas para continuar</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#151C2E] border border-white/5">
          <div className="flex items-center justify-between text-[#8B5CF6] mb-1">
            <History className="w-4 h-4" />
            <span className="text-lg font-bold text-white">{historyEntries.length}</span>
          </div>
          <p className="text-xs font-semibold text-[#F7F7FA]">Capítulos en Progreso</p>
          <p className="text-[10px] text-[#A7B0C0] mt-0.5">Historias con punto de reanudación</p>
        </div>
      </div>

      {/* Google Workspace / Drive Connection Card (ONLY VISIBLE TO ADMIN) */}
      {isAdmin && (
        <div className="p-5 rounded-3xl bg-[#151C2E] border border-[#8B5CF6]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F7F7FA]">Conexión con Google Drive (Solo Admin)</h3>
                <p className="text-xs text-[#A7B0C0]">Para examinar videos e imágenes desde la unidad</p>
              </div>
            </div>

            {token ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#2ECC8F] px-2.5 py-1 rounded-full bg-[#2ECC8F]/10 border border-[#2ECC8F]/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Drive Conectado
              </span>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                Conectar Drive
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#A7B0C0] leading-relaxed">
            Permite explorar archivos de video y portadas directamente desde tu almacenamiento de Google Drive para publicar en la plataforma.
          </p>
        </div>
      )}

      {/* Admin Panel Quick Link (ONLY VISIBLE TO ADMIN) */}
      {isAdmin && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#1F2840] to-[#151C2E] border border-[#8B5CF6]/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#8B5CF6]" /> Panel de Administración
            </h3>
            <p className="text-xs text-[#A7B0C0] mt-0.5">
              Administrar novelas, agregar capítulos desde Drive y configurar monetización.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('admin')}
            className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c4df2] text-white text-xs font-bold shadow-md transition-all shrink-0"
          >
            Abrir Admin
          </button>
        </div>
      )}

      {/* Playback & Privacy Preferences */}
      <div className="p-5 rounded-3xl bg-[#151C2E] border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-[#F7F7FA] border-b border-white/5 pb-2">
          Preferencias de Reproducción
        </h3>

        {/* Muted Autoplay */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-[#A7B0C0]" />
            <div>
              <h4 className="text-xs font-semibold text-[#F7F7FA]">Iniciar reproducción en silencio</h4>
              <p className="text-[11px] text-[#A7B0C0]">Evita audio repentino al cambiar de capítulo.</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoplayAudio}
            onChange={(e) => {
              setAutoplayAudio(e.target.checked);
              showToast(e.target.checked ? 'Silencio inicial desactivado' : 'Inicio silencioso activado');
            }}
            className="w-4 h-4 accent-[#FF5A5F]"
          />
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-[#A7B0C0]" />
            <div>
              <h4 className="text-xs font-semibold text-[#F7F7FA]">Notificaciones de nuevos estrenos</h4>
              <p className="text-[11px] text-[#A7B0C0]">Avisos de capítulos nuevos de tus series guardadas.</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => {
              setNotificationsEnabled(e.target.checked);
              showToast(e.target.checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
            }}
            className="w-4 h-4 accent-[#FF5A5F]"
          />
        </div>

        {/* History Stats & Clear */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-4 h-4 text-[#A7B0C0]" />
            <div>
              <h4 className="text-xs font-semibold text-[#F7F7FA]">Historial de reproducción</h4>
              <p className="text-[11px] text-[#A7B0C0]">{historyEntries.length} historias con avance guardado</p>
            </div>
          </div>
          {historyEntries.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar historial
            </button>
          )}
        </div>
      </div>

      {/* App Info & PWA Status */}
      <div className="text-center text-xs text-[#A7B0C0] space-y-1 py-4">
        <p className="font-semibold text-[#F7F7FA]">NovelaStream Vertical</p>
        <p>Plataforma cinematográfica de microdramas verticales en tiempo real.</p>
      </div>
    </div>
  );
};
