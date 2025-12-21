
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Operation } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { maskCPF, maskRG, maskPhone, maskPlate } from '../../utils/masks';
import { DEFAULT_OPERATIONS, OperationDefinition } from '../../constants/operations';

interface DriversTabProps {
  drivers: Driver[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => void;
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, onSaveDriver }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Gerenciamento de Operações Dinâmicas
  const [availableOps, setAvailableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);
  const [newCat, setNewCat] = useState('');
  const [newClient, setNewClient] = useState('');
  const [selectedCatForNewClient, setSelectedCatForNewClient] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dossierRef = useRef<HTMLDivElement>(null);
  
  const initialForm: Partial<Driver> = { 
    name: '', cpf: '', rg: '', cnh: '', plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    phone: '', email: '', whatsappGroupName: '', whatsappGroupLink: '', photo: '',
    status: 'Ativo', driverType: 'Externo', operations: []
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  useEffect(() => {
    if (form.whatsappGroupLink && form.whatsappGroupLink.includes('chat.whatsapp.com') && !form.whatsappGroupName) {
      setForm(prev => ({ ...prev, whatsappGroupName: 'CARREGANDO GRUPO...' }));
      setTimeout(() => {
        setForm(prev => ({ ...prev, whatsappGroupName: 'GRUPO ALS TRANSPORTES' }));
      }, 1000);
    }
  }, [form.whatsappGroupLink]);

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setForm(driver);
      setEditingId(driver.id);
    } else {
      setForm(initialForm);
      setEditingId(undefined);
    }
    setIsModalOpen(true);
  };

  const handleOpenPreview = (driver: Driver) => {
    setViewingDriver(driver);
    setIsPreviewOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleOperation = (category: string, client: string) => {
    const currentOps = form.operations || [];
    const exists = currentOps.find(o => o.category === category && o.client === client);
    
    if (exists) {
      setForm({ ...form, operations: currentOps.filter(o => !(o.category === category && o.client === client)) });
    } else {
      setForm({ ...form, operations: [...currentOps, { category, client }] });
    }
  };

  const addCategory = () => {
    if (!newCat.trim()) return;
    if (availableOps.find(o => o.category.toLowerCase() === newCat.toLowerCase())) return;
    setAvailableOps([...availableOps, { category: newCat, clients: [] }]);
    setNewCat('');
  };

  const addClient = () => {
    if (!newClient.trim() || !selectedCatForNewClient) return;
    setAvailableOps(availableOps.map(op => {
      if (op.category === selectedCatForNewClient) {
        if (op.clients.includes(newClient)) return op;
        return { ...op, clients: [...op.clients, newClient] };
      }
      return op;
    }));
    setNewClient('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDriver(form, editingId);
    setIsModalOpen(false);
  };

  const downloadDossierPDF = async (driver: Driver) => {
    if (!dossierRef.current) return;
    setIsExporting(true);
    try {
      const element = dossierRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        width: element.offsetWidth, height: element.offsetHeight,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.querySelector('.dossier-paper') as HTMLElement;
          if (clonedEl) clonedEl.style.boxShadow = 'none';
          const noPdfElements = clonedDoc.querySelectorAll('.no-pdf');
          noPdfElements.forEach(el => (el as HTMLElement).style.display = 'none');
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${driver.name}.pdf`);
    } catch (error) {
      alert("Erro ao gerar o PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Gestão de Motoristas</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ALS Transportes</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">Cadastrar Motorista</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5 w-24">Foto</th>
                <th className="px-6 py-5">Motorista</th>
                <th className="px-6 py-5">Documentos</th>
                <th className="px-6 py-5">Operações</th>
                <th className="px-6 py-5">Caminhão / Ano</th>
                <th className="px-6 py-5">Contato</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all" onClick={() => handleOpenPreview(d)}>
                      {d.photo ? <img src={d.photo} alt={d.name} className="w-full h-full object-cover" /> : <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2" /></svg>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 uppercase text-sm leading-tight truncate max-w-[140px]">{d.name}</p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter ${d.driverType === 'Frota' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      {d.driverType || 'Externo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 whitespace-nowrap">
                      <p className="text-slate-500 font-medium text-[9px] uppercase tracking-tighter"><span className="text-slate-400">CPF:</span> {d.cpf || '---'}</p>
                      <p className="text-slate-500 font-medium text-[9px] uppercase tracking-tighter"><span className="text-slate-400">RG:</span> {d.rg || '---'}</p>
                      <p className="text-slate-500 font-medium text-[9px] uppercase tracking-tighter"><span className="text-slate-400">CNH:</span> {d.cnh || '---'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {d.operations && d.operations.length > 0 ? d.operations.map((op, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[7px] font-bold uppercase border border-slate-200">
                          {op.client} ({op.category})
                        </span>
                      )) : <span className="text-[7px] text-slate-300 italic uppercase">Sem Op.</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-700 uppercase">{d.plateHorse || '---'}</span>
                        <span className="text-[7px] font-bold text-blue-500">{d.yearHorse ? `${d.yearHorse}` : ''}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-1 rounded">C</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-700 uppercase">{d.plateTrailer || '---'}</span>
                        <span className="text-[7px] font-bold text-blue-500">{d.yearTrailer ? `${d.yearTrailer}` : ''}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-1 rounded">R</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-slate-600 font-bold text-[9px]">{d.phone || '---'}</p>
                      <p className="text-slate-400 font-medium text-[8px] lowercase truncate max-w-[120px]">{d.email || '---'}</p>
                      {d.whatsappGroupLink && (
                        <a 
                          href={d.whatsappGroupLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1 w-fit hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.139l.363.216c1.552.923 3.402 1.411 5.292 1.412 5.675 0 10.293-4.617 10.296-10.293 0-2.751-1.071-5.336-3.015-7.281-1.944-1.944-4.529-3.014-7.279-3.014-5.676 0-10.294 4.618-10.297 10.294 0 2.015.53 3.98 1.54 5.717l.235.403-1.012 3.693 3.78-1.007z"/></svg>
                          Grupo
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                      {d.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => handleOpenPreview(d)} className="px-2 py-1 bg-slate-50 text-slate-500 rounded text-[8px] font-bold uppercase border border-slate-100 hover:bg-white hover:text-blue-500">Ver</button>
                    <button onClick={() => handleOpenModal(d)} className="p-1.5 text-slate-300 hover:text-slate-600 inline-block align-middle"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISUALIZADOR DE FICHA (MODAL) */}
      {isPreviewOpen && viewingDriver && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center bg-slate-900/90 backdrop-blur-sm overflow-y-auto p-8">
          <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 sticky top-0 z-[70] bg-slate-900/50 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic">
                ALS
              </div>
              <h3 className="font-bold text-white text-lg uppercase tracking-tight">Ficha Cadastral</h3>
            </div>
            <div className="flex gap-4">
              <button disabled={isExporting} onClick={() => downloadDossierPDF(viewingDriver)} className={`px-6 py-3 ${isExporting ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all`}>
                {isExporting ? 'Exportando...' : 'Baixar PDF'}
              </button>
              <button onClick={() => setIsPreviewOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-red-500/50 transition-all border border-white/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div ref={dossierRef} className="bg-white dossier-paper shadow-2xl mx-auto overflow-hidden text-slate-800" style={{ width: '210mm', minHeight: '297mm', padding: '25mm', boxSizing: 'border-box' }}>
            <div className="border-b-4 border-slate-900 pb-6 mb-10 text-center">
              <h1 className="text-[36px] font-black uppercase tracking-tight leading-none m-0 italic">ALS Transportes</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2">{viewingDriver.name}</p>
            </div>

            <div className="flex gap-10">
              <div className="w-[50mm] flex-shrink-0">
                <div className="w-full h-[65mm] bg-slate-100 rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                   {viewingDriver.photo ? <img src={viewingDriver.photo} className="w-full h-full object-cover" alt="3x4" /> : <span className="text-[10px] font-black text-slate-300 uppercase">Sem Foto</span>}
                </div>
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status em Base</p>
                  <p className={`text-[12px] font-bold uppercase ${viewingDriver.status === 'Ativo' ? 'text-emerald-600' : 'text-red-600'}`}>{viewingDriver.status || 'Ativo'}</p>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Cadastro</p>
                  <p className="text-[11px] font-bold text-blue-700">{viewingDriver.registrationDate || '---'}</p>
                </div>
              </div>

              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-y-6">
                  <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Vínculo</p><p className="text-[16px] font-bold text-slate-800">{viewingDriver.driverType || 'Externo'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF</p><p className="text-[16px] font-bold text-slate-800">{viewingDriver.cpf || '---'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RG</p><p className="text-[16px] font-bold text-slate-800">{viewingDriver.rg || '---'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNH</p><p className="text-[16px] font-bold text-slate-800">{viewingDriver.cnh || '---'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p><p className="text-[16px] font-bold text-slate-800">{viewingDriver.phone || '---'}</p></div>
                  <div className="space-y-1 col-span-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p><p className="text-[16px] font-bold text-slate-800 lowercase">{viewingDriver.email || '---'}</p></div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-widest mb-4 border-b border-blue-100 pb-2">Informações do Veículo</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Cavalo</p>
                      <p className="text-[20px] font-mono font-bold text-slate-900 uppercase">{viewingDriver.plateHorse || '---'}</p>
                      {viewingDriver.yearHorse && <p className="text-[11px] font-bold text-blue-600">ANO: {viewingDriver.yearHorse}</p>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Carreta</p>
                      <p className="text-[20px] font-mono font-bold text-slate-900 uppercase">{viewingDriver.plateTrailer || '---'}</p>
                      {viewingDriver.yearTrailer && <p className="text-[11px] font-bold text-blue-600">ANO: {viewingDriver.yearTrailer}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 no-pdf">
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b-2 border-slate-900 pb-2">Operações Vinculadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingDriver.operations && viewingDriver.operations.map((op, i) => (
                      <div key={i} className="px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
                        <p className="text-[10px] font-black text-slate-500 uppercase">{op.category}</p>
                        <p className="text-[13px] font-bold text-slate-800">{op.client}</p>
                      </div>
                    ))}
                    {(!viewingDriver.operations || viewingDriver.operations.length === 0) && <p className="text-slate-400 text-xs italic uppercase">Nenhuma operação ativa.</p>}
                  </div>
                </div>

                <div className="space-y-4 no-pdf">
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-2 border-b-2 border-slate-900 pb-2">Monitoramento Ativo</h3>
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Grupo de WhatsApp</p>
                      {viewingDriver.whatsappGroupLink ? (
                        <p className="text-[14px] font-bold text-blue-400 uppercase">
                          {viewingDriver.whatsappGroupName || "Acessar Grupo"}
                        </p>
                      ) : (
                        <p className="text-[14px] font-bold text-slate-400 uppercase">Não Atribuído</p>
                      )}
                    </div>
                    {viewingDriver.whatsappGroupLink && (
                      <a 
                        href={viewingDriver.whatsappGroupLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                      >
                        Abrir Grupo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-8 text-center text-[7px] text-slate-300 font-bold uppercase tracking-widest">
                ALS Transportes Command Center - Documento Gerado em {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Cadastro' : 'Novo Motorista'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Preencha os dados e anexe a foto 3x4</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-slate-300 hover:text-red-400 shadow-sm transition-all border border-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6">
              
              {/* Seção Principal de Dados */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-6 items-start">
                  <div className="flex flex-col items-center gap-3">
                    <div onClick={() => fileInputRef.current?.click()} className="w-28 h-36 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden relative group">
                      {form.photo ? <>
                        <img src={form.photo} alt="3x4" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-[9px] font-black text-white uppercase">Trocar</span></div>
                      </> : <>
                        <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2"/></svg>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-tight">3x4</span>
                      </>}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                      <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Vínculo</label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.driverType} onChange={e => setForm({...form, driverType: e.target.value as 'Frota' | 'Externo'})}>
                          <option value="Externo">EXTERNO</option>
                          <option value="Frota">FROTA</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status</label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.status} onChange={e => setForm({...form, status: e.target.value as 'Ativo' | 'Inativo'})}>
                          <option value="Ativo">ATIVO</option>
                          <option value="Inativo">INATIVO</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">RG</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.rg} onChange={e => setForm({...form, rg: maskRG(e.target.value)})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CNH</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telefone</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">E-mail</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="text-[8px] font-black text-blue-400 uppercase ml-1">Placa Cav.</label>
                    <input required type="text" className="w-full px-2 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-mono font-bold text-xs" value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[8px] font-black text-blue-400 uppercase ml-1">Ano Cav.</label>
                    <input type="text" maxLength={4} className="w-full px-2 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs" value={form.yearHorse} onChange={e => setForm({...form, yearHorse: e.target.value.replace(/\D/g, '')})} placeholder="20XX" />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[8px] font-black text-blue-400 uppercase ml-1">Placa Carr.</label>
                    <input required type="text" className="w-full px-2 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-mono font-bold text-xs" value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[8px] font-black text-blue-400 uppercase ml-1">Ano Carr.</label>
                    <input type="text" maxLength={4} className="w-full px-2 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs" value={form.yearTrailer} onChange={e => setForm({...form, yearTrailer: e.target.value.replace(/\D/g, '')})} placeholder="20XX" />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monitoramento</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Link WhatsApp</label>
                      <input type="text" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold" value={form.whatsappGroupLink} onChange={e => setForm({...form, whatsappGroupLink: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Grupo (Auto)</label>
                      <input readOnly type="text" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 font-bold uppercase cursor-not-allowed" value={form.whatsappGroupName} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Operações */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Tipos de Operação</h4>
                    <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black">{form.operations?.length || 0} SELECIONADAS</span>
                  </div>
                  
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[500px]">
                    {availableOps.map((opGroup, idx) => (
                      <div key={idx} className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-200 pb-1 flex justify-between">
                          {opGroup.category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opGroup.clients.length > 0 ? (
                            opGroup.clients.map((client, cIdx) => {
                              const isSelected = form.operations?.find(o => o.category === opGroup.category && o.client === client);
                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => toggleOperation(opGroup.category, client)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'}`}
                                >
                                  {client}
                                </button>
                              );
                            })
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleOperation(opGroup.category, opGroup.category)}
                              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border ${form.operations?.find(o => o.category === opGroup.category && o.client === opGroup.category) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'}`}
                            >
                              {opGroup.category} (Geral)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Gerenciamento de Novas Operações */}
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Adicionar Categoria</p>
                      <div className="flex gap-2">
                        <input type="text" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[9px] uppercase font-bold" placeholder="EX: MERCOSUL" value={newCat} onChange={e => setNewCat(e.target.value)} />
                        <button type="button" onClick={addCategory} className="px-3 bg-slate-800 text-white rounded-lg text-[10px]">+</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Adicionar Cliente/Subcat</p>
                      <div className="space-y-2">
                        <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[9px] font-bold" value={selectedCatForNewClient} onChange={e => setSelectedCatForNewClient(e.target.value)}>
                          <option value="">-- SELECIONE A CAT --</option>
                          {availableOps.map((o, i) => <option key={i} value={o.category}>{o.category}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <input type="text" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[9px] uppercase font-bold" placeholder="EX: VOLKSWAGEN" value={newClient} onChange={e => setNewClient(e.target.value)} />
                          <button type="button" onClick={addClient} className="px-3 bg-slate-800 text-white rounded-lg text-[10px]">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-12 pt-6 flex gap-4">
                <button type="submit" className="flex-1 py-5 bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">Salvar Cadastro</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 bg-slate-100 text-slate-400 rounded-2xl text-[11px] font-bold uppercase hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
