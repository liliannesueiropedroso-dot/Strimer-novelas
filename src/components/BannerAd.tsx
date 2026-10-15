import React, { useState } from 'react';
import { ExternalLink, Sparkles, X, ShieldCheck, Code2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BannerAd: React.FC = () => {
  const { adConfig } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!adConfig.adsterraTopBannerEnabled || isDismissed) return null;

  const hasCode = !!(adConfig.adsterraBannerCode && adConfig.adsterraBannerCode.trim());
  const useCodeMode = adConfig.adsterraBannerType === 'code' || (hasCode && !adConfig.adsterraTopBannerUrl);

  const targetUrl = adConfig.adsterraTopBannerUrl || 'https://www.google.com';
  const bannerText = adConfig.adsterraTopBannerText || 'Adsterra Network - Disfruta de los mejores microdramas verticales en alta definición';

  return (
    <div className="mb-6 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
      {useCodeMode && hasCode ? (
        /* ADSTERRA REAL SCRIPT / HTML CODE RENDERER */
        <div className="relative overflow-hidden rounded-2xl bg-[#080D1A] border border-[#1E3A8A] p-2 sm:p-3 shadow-xl">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-[#38BDF8] border border-blue-500/30 flex items-center gap-1">
                <Code2 className="w-3 h-3" /> Adsterra AX Terra Official Ad
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verificado
              </span>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-[#A7B0C0] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Cerrar anuncio"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full flex justify-center items-center overflow-hidden min-h-[90px]">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body { 
                        margin: 0; 
                        padding: 0; 
                        background: transparent; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        overflow: hidden; 
                        color: #F7F7FA;
                        font-family: sans-serif;
                      }
                    </style>
                  </head>
                  <body>
                    ${adConfig.adsterraBannerCode}
                  </body>
                </html>
              `}
              title="Adsterra Banner"
              className="w-full border-0 min-h-[90px] h-[100px] overflow-hidden"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              scrolling="no"
            />
          </div>
        </div>
      ) : (
        /* ADSTERRA SMARTLINK / DIRECT LINK HIGH-CONVERTING CARD */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#101935] via-[#162244] to-[#101935] border border-[#1E3A8A] p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shadow-blue-900/10">
          
          {/* Left Side: Badge and Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-[#38BDF8] border border-blue-500/30">
                  Adsterra AX Terra Sponsor
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verificado
                </span>
              </div>
              <p className="text-xs text-[#F7F7FA] font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                {bannerText}
              </p>
            </div>
          </div>

          {/* Right Side: CTA Button and Dismiss */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:brightness-110 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <span>Ver Patrocinador</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setIsDismissed(true)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-[#A7B0C0] hover:text-white flex items-center justify-center transition-colors"
              title="Cerrar banner publicitario"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
