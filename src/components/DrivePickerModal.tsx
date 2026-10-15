import React, { useState, useEffect } from 'react';
import { X, Search, HardDrive, Film, Image as ImageIcon, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { listDriveFiles, formatDriveVideoUrl, formatDriveImageUrl } from '../services/driveService';
import { DriveVideoFile } from '../types';
import { useAuth } from '../context/AuthContext';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileType?: 'video' | 'image' | 'all';
  onSelectFile: (file: DriveVideoFile, directUrl: string) => void;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  fileType = 'video',
  onSelectFile,
}) => {
  const { user, token, signIn } = useAuth();
  const [files, setFiles] = useState<DriveVideoFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFiles = async (query = '') => {
    setIsLoading(true);
    setErrorMessage(null);
    const res = await listDriveFiles(fileType, query);
    if (res.error) {
      if (res.error === 'NO_TOKEN') {
        setErrorMessage('Se requiere conectar con Google Drive para listar archivos.');
      } else {
        setErrorMessage(res.error);
      }
    } else {
      setFiles(res.files);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles(searchQuery);
    }
  }, [isOpen, token, fileType]);

  if (!isOpen) return null;

  const handleSelect = (file: DriveVideoFile) => {
    const isImage = file.mimeType.startsWith('image/');
    const finalUrl = isImage ? formatDriveImageUrl(file.id) : formatDriveVideoUrl(file.id);
    onSelectFile(file, finalUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#151C2E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#F7F7FA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0B1020]/90 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {fileType === 'image' ? 'Seleccionar Imagen desde Google Drive' : 'Seleccionar Video desde Google Drive'}
              </h3>
              <p className="text-xs text-[#A7B0C0]">
                {fileType === 'image' 
                  ? 'Elige una foto de portada de tu almacenamiento' 
                  : 'Elige un video (.mp4, vertical, etc.) de tu unidad'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#A7B0C0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Buscar ${fileType === 'image' ? 'imágenes' : 'videos'} en Drive...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFiles(searchQuery)}
              className="w-full bg-[#0B1020] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F7F7FA] outline-none focus:border-[#FF5A5F]"
            />
          </div>
          <button
            onClick={() => fetchFiles(searchQuery)}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#A7B0C0] hover:text-white transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {errorMessage ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-[#A7B0C0] max-w-sm mx-auto">{errorMessage}</p>
              {!user && (
                <button
                  onClick={() => signIn()}
                  className="px-4 py-2 rounded-xl bg-white text-gray-900 font-bold text-xs shadow-md"
                >
                  Conectar con Google Drive
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-xs text-[#A7B0C0]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
              Consultando archivos en Google Drive...
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A7B0C0] space-y-1">
              {fileType === 'image' ? (
                <ImageIcon className="w-8 h-8 mx-auto text-[#A7B0C0]/40 mb-1" />
              ) : (
                <Film className="w-8 h-8 mx-auto text-[#A7B0C0]/40 mb-1" />
              )}
              <p>No se encontraron archivos en tu Google Drive.</p>
              <p className="text-[11px] text-[#A7B0C0]/60">
                Sube archivos {fileType === 'image' ? 'JPG/PNG' : 'MP4/video'} a tu Google Drive para seleccionarlos.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const isImg = file.mimeType.startsWith('image/');
                return (
                  <div
                    key={file.id}
                    onClick={() => handleSelect(file)}
                    className="p-3 rounded-2xl bg-[#0B1020]/70 border border-white/5 hover:border-[#FF5A5F]/40 hover:bg-[#0B1020] flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#151C2E] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {file.thumbnailLink ? (
                          <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                        ) : isImg ? (
                          <ImageIcon className="w-5 h-5 text-[#8B5CF6]" />
                        ) : (
                          <Film className="w-5 h-5 text-[#FF5A5F]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#F7F7FA] truncate group-hover:text-[#FF5A5F] transition-colors">
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#A7B0C0] mt-0.5">
                          <span>{file.mimeType}</span>
                          {file.size && <span>• {(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(file);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF5A5F] group-hover:bg-[#e04e53] text-white text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Seleccionar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0B1020]/80 border-t border-white/5 flex items-center justify-between text-xs text-[#A7B0C0]">
          <span>Conexión autorizada con Google Drive API</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#F7F7FA] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
