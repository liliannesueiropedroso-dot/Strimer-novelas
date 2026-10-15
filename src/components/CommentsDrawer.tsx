import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Flag, EyeOff, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import { Comment, Episode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { 
  subscribeComments, 
  addComment, 
  toggleReportComment, 
  toggleHideComment 
} from '../services/firestoreService';

interface CommentsDrawerProps {
  episode: Episode;
  novelId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({ episode, novelId, isOpen, onClose }) => {
  const { user, isAdmin, signIn } = useAuth();
  const { showToast } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeComments(novelId, episode.id, (list) => {
      setComments(list);
    });
    return () => unsubscribe();
  }, [novelId, episode.id, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    if (!user) {
      showToast('Inicia sesión con Google para comentar');
      signIn();
      return;
    }

    try {
      setIsSubmitting(true);
      await addComment(
        novelId,
        episode.id,
        user.uid,
        user.displayName || 'Fan de NovelaStream',
        newText,
        user.photoURL || undefined
      );
      setNewText('');
      showToast('Comentario publicado');
    } catch (error) {
      console.error(error);
      showToast('Error al publicar comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async (c: Comment) => {
    await toggleReportComment(novelId, episode.id, c.id, !c.isReported);
    showToast(c.isReported ? 'Reporte cancelado' : 'Comentario reportado para moderación');
  };

  const handleHide = async (c: Comment) => {
    await toggleHideComment(novelId, episode.id, c.id, !c.isHidden);
    showToast(c.isHidden ? 'Comentario visible' : 'Comentario ocultado por moderación');
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-end p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md h-[75vh] sm:h-[90%] bg-[#151C2E] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#F7F7FA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#FF5A5F]" />
            <h3 className="text-sm font-bold">Comentarios ({comments.length})</h3>
            <span className="text-xs text-[#A7B0C0]">Capítulo {episode.episodeNumber}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {comments.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A7B0C0] space-y-1">
              <p>Sé la primera persona en comentar este capítulo.</p>
              <p className="text-[11px] text-[#A7B0C0]/60">¡Comparte tus teorías y emociones!</p>
            </div>
          ) : (
            comments.map((c) => {
              // Hide from normal viewers if hidden by admin
              if (c.isHidden && !isAdmin) return null;

              return (
                <div 
                  key={c.id} 
                  className={`p-3 rounded-2xl border transition-all ${
                    c.isHidden 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : c.isReported 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-[#0B1020]/60 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {c.userPhotoUrl ? (
                        <img src={c.userPhotoUrl} alt={c.userDisplayName} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {c.userDisplayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-[#F7F7FA] block leading-tight">{c.userDisplayName}</span>
                        <span className="text-[10px] text-[#A7B0C0]/70">
                          {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReport(c)}
                        className={`text-[10px] flex items-center gap-1 transition-colors ${
                          c.isReported ? 'text-amber-400 font-bold' : 'text-[#A7B0C0] hover:text-amber-300'
                        }`}
                        title="Reportar comentario inapropiado"
                      >
                        <Flag className="w-3 h-3" />
                        {c.isReported && <span>Reportado</span>}
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleHide(c)}
                          className={`text-[10px] p-1 rounded transition-colors ${
                            c.isHidden ? 'text-red-400 bg-red-500/20' : 'text-[#A7B0C0] hover:text-white'
                          }`}
                          title={c.isHidden ? 'Mostrar comentario' : 'Ocultar comentario (Admin)'}
                        >
                          <EyeOff className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#F7F7FA] mt-2 leading-relaxed break-words font-normal">
                    {c.text}
                  </p>
                  
                  {c.isHidden && (
                    <div className="mt-1 text-[10px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Ocultado por moderación comunitaria
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-[#0B1020]/80 flex items-center gap-2">
          <input
            type="text"
            placeholder={user ? "Escribe un comentario..." : "Inicia sesión para comentar"}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 bg-[#151C2E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F7F7FA] placeholder-[#A7B0C0]/60 outline-none focus:border-[#FF5A5F]"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newText.trim()}
            className="w-9 h-9 rounded-xl bg-[#FF5A5F] hover:bg-[#e04e53] disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
