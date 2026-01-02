
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaForm from './forms/OrdemColetaForm';
import PreStackingTemplate from './forms/PreStackingTemplate';
import LiberacaoVazioTemplate from './forms/LiberacaoVazioTemplate';
import DevolucaoVazioTemplate from './forms/DevolucaoVazioTemplate';
import { maskSeal } from '../../utils/masks';
import { lookupCarrierByContainer } from '../../utils/carrierService';

interface FormsTabProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  initialFormId?: string | null;
}

type FormType = 'ORDEM_COLETA' | 'PRE_STACKING' | 'LIBERACAO_VAZIO' | 'DEVOLUCAO_VAZIO' | 'RETIRADA_CHEIO';

const formConfigs: Record<FormType, { title: string; color: string; description: string }> = {
  ORDEM_COLETA: { title: 'Ordem de Coleta', color: 'bg-blue-600', description: 'Emissão de OC com campos editáveis e barcodes' },
  PRE_STACKING: { title: 'Pré-Stacking (Minuta Cheio)', color: 'bg-emerald-600', description: 'Minuta para entrega de container cheio no terminal' },
  LIBERACAO_VAZIO: { title: 'Liberação de Vazio', color: 'bg-slate-700', description: 'Documento de autorização de retirada em depósitos' },
  DEVOLUCAO_VAZIO: { title: 'Devolução de Vazio', color: 'bg-amber-600', description: 'Minuta de entrega de unidade vazia (Depot/Santos)' },
  RETIRADA_CHEIO: { title: 'Retirada de Cheio', color: 'bg-indigo-600', description: 'Ordem para movimentação de container importado' },
};

const FormsTab: React.FC<FormsTabProps> = ({ drivers, customers, ports, initialFormId }) => {
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const captureRef = useRef<HTMLDivElement>(null);
  const [emissionDate] = useState(new Date().toLocaleDateString('pt-BR'));

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driverId: '', remetenteId: '', destinatarioId: '', os: '', container: '', tara: '', seal: '', booking: '', ship: '', agencia: '', pod: 'SANTOS', obs: '', manualLocal: ''
  });

  useEffect(() => {
    if (initialFormId && formConfigs[initialFormId as FormType]) {
      setSelectedFormType(initialFormId as FormType);
      setIsFormModalOpen(true);
    }
  }, [initialFormId]);

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(p => p.id === formData.destinatarioId);

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const driverName = selectedDriver?.name || 'MOTORISTA';
      const locationName = selectedDestinatario?.legalName || selectedDestinatario?.name || destinatarioSearch || 'NÃO INFORMADO';
      const fileName = `${formConfigs[selectedFormType!].title} - ${driverName} - ${locationName}.pdf`;
      pdf.save(fileName);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* HIDDEN PREVIEWS FOR OTHER FORMS */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
          {selectedFormType === 'LIBERACAO_VAZIO' && <LiberacaoVazioTemplate formData={{...formData, manualLocal: destinatarioSearch}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
          {selectedFormType === 'DEVOLUCAO_VAZIO' && <DevolucaoVazioTemplate formData={{...formData, manualLocal: destinatarioSearch}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 text-center">Central de Emissões Operacionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(formConfigs) as FormType[]).map(type => (
            <button key={type} onClick={() => { setSelectedFormType(type); setIsFormModalOpen(true); }} className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-blue-500 hover:shadow-xl transition-all group text-left">
              <div className={`w-14 h-14 ${formConfigs[type].color} rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg`}>ALS</div>
              <div className="flex-1">
                <h3 className="font-black text-slate-700 uppercase text-xs">{formConfigs[type].title}</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">{formConfigs[type].description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isFormModalOpen && selectedFormType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
            <div className={`p-6 ${formConfigs[selectedFormType].color} text-white flex justify-between items-center`}>
              <h3 className="font-black text-sm uppercase tracking-widest">{formConfigs[selectedFormType].title}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>

            {selectedFormType === 'ORDEM_COLETA' ? (
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => setIsFormModalOpen(false)} />
            ) : (
              <div className="flex-1 p-10 text-center text-slate-400 font-bold uppercase italic">
                O formulário {formConfigs[selectedFormType].title} está sendo migrado para o novo padrão modular.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsTab;
