
import React, { useState } from 'react';
import { Driver } from '../../../types';
import { exportElementToPDF } from '../../../utils/pdfService';
import DriverProfileTemplate from '../forms/DriverProfileTemplate';

interface DriverDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
}

const DriverDossierModal: React.FC<DriverDossierModalProps> = ({ isOpen, onClose, driver }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState({
    driverInfo: true,
    contacts: true,
    equipment: true,
    type: true,
    beneficiary: true,
    whatsapp: true,
    operations: true,
    portal: true,
    includeCnh: !!driver.cnhPdfUrl
  });

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const fileName = `DOSSIE_ALS_${driver.name.replace(/\s+/g, '_')}_${driver.plateHorse}`;
      const element = document.getElementById(`dossier-preview-container`);
      const parent = element?.parentElement;
      
      let originalTransform = '';
      if (parent) {
        originalTransform = parent.style.transform;
        parent.style.transform = 'none';
      }
      
      if (element) {
        await exportElementToPDF(element, fileName);
        onClose();
      }
      
      if (parent) {
        parent.style.transform = originalTransform;
      }
    } catch (error) {
      console.error(error);
      alert("Falha ao gerar dossiê.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const OptionToggle = ({ label, value, id, description }: any) => (
    <button 
      onClick={() => toggleOption(id)}
      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left group ${
        value ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100 grayscale opacity-60'
      }`}
    >
      <div className="min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-tight ${value ? 'text-blue-900' : 'text-slate-400'}`}>{label}</p>
        <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{description}</p>
      </div>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
        {value ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg> : null}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
               <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Gerador de Dossiê Digital</h3>
              <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">Selecione os módulos que compõem o documento</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {/* PAINEL DE CONFIGURAÇÕES */}
          <div className="w-85 bg-slate-50 border-r border-slate-200 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Estrutura do PDF</p>
              <OptionToggle id="driverInfo" label="Dados Identificação" value={options.driverInfo} description="Nome, CPF, RG, CNH e Foto" />
              <OptionToggle id="contacts" label="Contatos Diretos" value={options.contacts} description="Telefone e E-mail" />
              <OptionToggle id="equipment" label="Equipamento" value={options.equipment} description="Placas e Anos dos veículos" />
              <OptionToggle id="beneficiary" label="Beneficiário" value={options.beneficiary} description="Dados de Pagamento / PIX" />
              <OptionToggle id="portal" label="Acesso ao Portal" value={options.portal} description="Usuário e Senha de login" />
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Módulos de Anexo</p>
              <button 
                onClick={() => toggleOption('includeCnh')}
                disabled={!driver.cnhPdfUrl}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                  options.includeCnh ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100 opacity-60'
                }`}
              >
                <div className="min-w-0">
                   <p className={`text-[10px] font-black uppercase tracking-tight ${options.includeCnh ? 'text-emerald-900' : 'text-slate-400'}`}>Anexar CNH PDF</p>
                   <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                     {driver.cnhPdfUrl ? 'Documento Escaneado Disponível' : 'Nenhuma CNH anexada na ficha'}
                   </p>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${options.includeCnh ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                  {options.includeCnh ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg> : null}
                </div>
              </button>
            </div>

            <div className="mt-auto pt-6">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-5 bg-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Gerar Documento HD
                  </>
                )}
              </button>
            </div>
          </div>

          {/* VISUALIZAÇÃO PREVIEW */}
          <div className="flex-1 bg-slate-200 overflow-auto p-12 custom-scrollbar flex justify-center items-start">
             <div className="origin-top transform scale-[0.6] xl:scale-[0.75] shadow-2xl bg-white">
                <div id="dossier-preview-container">
                   <DriverProfileTemplate 
                     driver={driver} 
                     visibility={{
                       ...options,
                       driverInfo: options.driverInfo,
                       contacts: options.contacts,
                       equipment: options.equipment,
                       type: options.type,
                       beneficiary: options.beneficiary,
                       whatsapp: options.whatsapp,
                       operations: options.operations,
                       portal: options.portal
                     }} 
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDossierModal;
