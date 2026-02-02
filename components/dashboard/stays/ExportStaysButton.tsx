
import React, { useState } from 'react';
import { StayRecord, StaySession } from '../../../types';
import { excelStaysHelper } from '../../../utils/excelStaysHelper';

interface ExportStaysButtonProps {
  records: StayRecord[];
  session: StaySession;
  categoryName: string;
}

const ExportStaysButton: React.FC<ExportStaysButtonProps> = ({ records, session }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // O Helper agora cuida de tudo: Estilos, Fórmulas e Nomenclatura
      await excelStaysHelper.exportStays(records, session);
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Falha ao gerar a planilha.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
    >
      {isExporting ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {isExporting ? 'Processando...' : 'Exportar Planilha'}
    </button>
  );
};

export default ExportStaysButton;
