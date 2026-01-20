
import React, { useState, useRef } from 'react';
import { Driver } from '../../../types';
import { exportElementToPDF } from '../../../utils/pdfService';
import DriverProfileTemplate from '../forms/DriverProfileTemplate';

interface DriverDossierActionProps {
  driver: Driver;
}

const DriverDossierAction: React.FC<DriverDossierActionProps> = ({ driver }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerateDossier = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      // Pequeno delay para garantir que o DOM oculto esteja pronto
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const fileName = `DOSSIE_ALS_${driver.name.replace(/\s+/g, '_')}_${driver.plateHorse}`;
      const element = document.getElementById(`driver-profile-pdf-container-${driver.id}`);
      
      if (element) {
        await exportElementToPDF(element, fileName);
      }
    } catch (error) {
      console.error("Erro ao gerar dossiê:", error);
      alert("Falha ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Container Oculto para Renderização do PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id={`driver-profile-pdf-container-${driver.id}`}>
          <DriverProfileTemplate 
            driver={driver} 
            visibility={{
              driverInfo: true,
              contacts: true,
              equipment: true,
              type: true,
              beneficiary: true,
              whatsapp: true,
              operations: true,
              portal: true
            }} 
          />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleGenerateDossier();
        }}
        disabled={isGenerating}
        className={`p-2 rounded-xl transition-all border shadow-sm flex items-center justify-center group ${
          isGenerating 
          ? 'bg-slate-50 border-slate-100 text-slate-300 animate-pulse' 
          : 'bg-white border-slate-100 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'
        }`}
        title="Gerar Dossiê Digital (PDF)"
      >
        {isGenerating ? (
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </button>
    </>
  );
};

export default DriverDossierAction;
