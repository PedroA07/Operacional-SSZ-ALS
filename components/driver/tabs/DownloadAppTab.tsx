
import React from 'react';

const DownloadAppTab: React.FC = () => {
  const handleDownloadAPK = () => {
    // Aqui seria o link para o arquivo .apk hospedado
    alert("Iniciando download do instalador ALS_Operacional.apk...");
    // window.location.href = '/downloads/als-driver-latest.apk'; 
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500 pb-32">
      <div className="text-center py-6">
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/20">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-black uppercase text-white">ALS no seu Celular</h2>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Escolha como prefere usar o portal</p>
      </div>

      {/* OPÇÃO 1: INSTALAÇÃO DIRETA (APK) */}
      <section className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-16 h-16 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.523 15.3414L20.355 20.2474C20.5065 20.5114 20.415 20.8429 20.151 20.9944C20.0655 21.0424 19.9695 21.0664 19.8735 21.0664C19.692 21.0664 19.5195 20.9704 19.4235 20.8034L16.551 15.8234C13.56 17.3894 10.44 17.3894 7.449 15.8234L4.5765 20.8034C4.3815 21.1409 3.9495 21.2564 3.612 21.0614C3.2745 20.8664 3.159 20.4344 3.354 20.0969L6.186 15.1909C3.12 13.4354 1.11 10.3274 1.05 6.81143H22.95C22.89 10.3274 20.88 13.4354 17.814 15.1909L17.523 15.3414ZM7.02 11.2334C7.6215 11.2334 8.1105 10.7444 8.1105 10.1429C8.1105 9.54143 7.6215 9.05243 7.02 9.05243C6.4185 9.05243 5.9295 9.54143 5.9295 10.1429C5.9295 10.7444 6.4185 11.2334 7.02 11.2334ZM16.98 11.2334C17.5815 11.2334 18.0705 10.7444 18.0705 10.1429C18.0705 9.54143 17.5815 9.05243 16.98 9.05243C16.3785 9.05243 15.8895 9.54143 15.8895 10.1429C15.8895 10.7444 16.3785 11.2334 16.98 11.2334Z" />
          </svg>
        </div>
        <div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Recomendado Android</span>
          <h3 className="text-lg font-black text-white uppercase mt-3">Baixar Instalador</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Versão leve que funciona offline para consulta de documentos e fotos.</p>
        </div>
        <button 
          onClick={handleDownloadAPK}
          className="w-full py-5 bg-white text-slate-900 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Grátis (.APK)
        </button>
      </section>

      {/* OPÇÃO 2: PWA (WEB APP) */}
      <section className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Transformar Site em App</h3>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0 italic">1</div>
            <div>
              <p className="text-[11px] font-bold text-slate-200 uppercase">Clique nas Opções do Navegador</p>
              <p className="text-[9px] text-slate-500">Geralmente são 3 pontinhos (Android) ou o ícone de compartilhar (iPhone).</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0 italic">2</div>
            <div>
              <p className="text-[11px] font-bold text-slate-200 uppercase">"Instalar Aplicativo"</p>
              <p className="text-[9px] text-slate-500">Ou selecione "Adicionar à Tela de Início".</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
           <p className="text-[8px] text-slate-500 font-bold text-center uppercase leading-relaxed">
             Isso criará um ícone na sua área de trabalho <br/> igual a um aplicativo normal.
           </p>
        </div>
      </section>

      <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-500/10">
        <p className="text-[9px] text-blue-400 font-bold text-center uppercase tracking-widest italic">
          O uso do aplicativo economiza sua bateria <br/> e seu plano de dados.
        </p>
      </div>
    </div>
  );
};

export default DownloadAppTab;
