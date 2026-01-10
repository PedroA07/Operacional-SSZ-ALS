
import React, { useState } from 'react';
import { Trip } from '../../../types';
import { emailFormatter } from '../../../utils/emailFormatter';

interface CopyAllStatusesActionProps {
  trips: Trip[];      // Viagens visíveis na tela
  allTrips: Trip[];   // Contexto total para buscas de próxima agenda
}

const CopyAllStatusesAction: React.FC<CopyAllStatusesActionProps> = ({ trips, allTrips }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (trips.length === 0) return;

    try {
      const html = emailFormatter.allTripsToRichText(trips, allTrips);
      const plain = trips.map(t => emailFormatter.toPlainText(t, allTrips)).join('\n\n---\n\n');

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });
      
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobPlain
      })];

      await navigator.clipboard.write(data);
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      alert('Erro ao copiar para a área de transferência.');
    }
  };

  return (
    <button 
      onClick={handleCopy}
      disabled={trips.length === 0}
      className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95 shadow-xl border-2 ${
        isCopied 
        ? 'bg-emerald-500 text-white border-emerald-500' 
        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      {isCopied ? 'Copiado!' : `Copiar Visíveis (${trips.length})`}
    </button>
  );
};

export default CopyAllStatusesAction;
