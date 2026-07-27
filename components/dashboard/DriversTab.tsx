
import React, { useState, useMemo, useEffect } from 'react';
import { Driver, OperationDefinition, Customer, User } from '../../types';
import { maskPhone, maskCPF, maskRG, maskCNPJ, stripSpecials, normalizeSearch } from '../../utils/masks';
import { Icons } from '../../constants/icons';
import { db } from '../../utils/storage';
import ListFilters from './shared/ListFilters';
import DriverModal from './drivers/DriverModal';
import DriverDossierAction from './drivers/DriverDossierAction';
import DriverVinculosCell from './drivers/DriverVinculosCell';
import AuthorizedPersonsTab from './AuthorizedPersonsTab';

interface DriversTabProps {
  userId: string;
  drivers: Driver[];
  customers: Customer[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ userId, drivers, customers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [activeSubTab, setActiveSubTab] = useState<'motoristas' | 'autorizados'>('motoristas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState('todos');
  
  const [users, setUsers] = useState<User[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [resetInfo, setResetInfo] = useState<{ name: string; login: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [docViewer, setDocViewer] = useState<{ url: string; name: string; kind: 'pdf' | 'image' } | null>(null);

  // Copia um valor já limpo (sem caracteres especiais) para a área de transferência
  const copyClean = (key: string, text: string) => {
    const clean = (text || '').trim();
    if (!clean) return;
    navigator.clipboard.writeText(clean).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1500);
    });
  };

  // Apenas dígitos (CPF, CNPJ, telefone)
  const onlyDigits = (v?: string | null) => (v || '').replace(/\D/g, '');
  // Apenas letras/números (CNH, placas)
  const onlyAlnum = (v?: string | null) => (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Bloco completo de dados do motorista, sem caracteres especiais (pronto para colar)
  const buildCleanInfo = (d: Driver) => {
    const lines = [
      `NOME: ${stripSpecials(d.name)}`,
      `CPF: ${onlyDigits(d.cpf)}`,
      d.cnh ? `CNH: ${onlyAlnum(d.cnh)}` : '',
      d.phone ? `TELEFONE: ${onlyDigits(d.phone)}` : '',
      d.email ? `E-MAIL: ${(d.email || '').trim()}` : '',
      d.plateHorse ? `CAVALO: ${onlyAlnum(d.plateHorse)}` : '',
      d.plateTrailer ? `CARRETA: ${onlyAlnum(d.plateTrailer)}` : '',
      d.beneficiaryName ? `BENEFICIARIO: ${stripSpecials(d.beneficiaryName)}` : '',
      d.beneficiaryCnpj ? `CNPJ: ${onlyDigits(d.beneficiaryCnpj)}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  };

  // Botão de copiar reutilizável (ícone que vira "check" ao copiar)
  const CopyBtn: React.FC<{ ck: string; value: string; title?: string; className?: string }> = ({ ck, value, title, className }) => {
    const done = copiedKey === ck;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); copyClean(ck, value); }}
        title={title || 'Copiar sem caracteres especiais'}
        className={`inline-flex items-center justify-center shrink-0 transition-colors ${done ? 'text-emerald-500' : 'text-slate-400 hover:text-blue-600'} ${className || ''}`}
      >
        {done
          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/></svg>}
      </button>
    );
  };

  const fetchUsers = async () => {
    const data = await db.getUsers();
    setUsers(data);
  };

  // Gera uma senha temporária simples (sem caracteres ambíguos)
  const genPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p = '';
    for (let i = 0; i < 6; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p;
  };

  const handleResetPassword = async (d: Driver) => {
    const linkedUser = usersMap.get(d.id) || usersMap.get((d.cpf || '').replace(/\D/g, ''));
    if (!linkedUser) {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Este motorista ainda não tem acesso ao portal.', type: 'error' } }));
      return;
    }
    setResettingId(d.id);
    const newPass = genPassword();
    // Reset feito pelo operador: nova senha temporária e força troca no login
    const ok = await db.saveUser({ ...linkedUser, password: newPass, isFirstLogin: true });
    setResettingId(null);
    if (ok) {
      await fetchUsers();
      setResetCopied(false);
      setResetInfo({ name: d.name, login: (d.cpf || '').replace(/\D/g, ''), password: newPass });
    } else {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao gerar nova senha.', type: 'error' } }));
    }
  };

  // Busca users só na montagem e quando o modal fecha (não a cada sync de drivers)
  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { if (!isModalOpen) fetchUsers(); }, [isModalOpen]);

  // Mapa para lookup O(1) em vez de .find() por linha de tabela
  const usersMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach(u => {
      if (u.driverId) m.set(u.driverId, u);
      if (u.username) m.set(u.username, u);
    });
    return m;
  }, [users]);

  const handleOpenModal = (d?: Driver) => {
    setEditingDriver(d || null);
    setIsModalOpen(true);
  };

  const filteredDrivers = useMemo(() => {
    // Busca ignorando acentos, pontuação e caracteres especiais
    const q = normalizeSearch(searchQuery);
    let result = !q ? drivers : drivers.filter(d => {
      const haystack = normalizeSearch(
        [d.name, d.cpf, d.cnh, d.phone, d.plateHorse, d.plateTrailer, d.beneficiaryName, d.beneficiaryCnpj, d.email]
          .filter(Boolean).join(' ')
      );
      return haystack.includes(q);
    });
    if (statusFilter !== 'todos') result = result.filter(d => d.status === statusFilter);
    result.sort((a, b) => sortBy === 'name_asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return result;
  }, [drivers, searchQuery, sortBy, statusFilter]);

  // Renderiza um motorista como card
  const renderDriverCard = (d: Driver) => {
    const linkedUser = usersMap.get(d.id) || usersMap.get(onlyDigits(d.cpf));
    const passVisible = showPasswords[d.id];
    const vehicleDocs: { doc: import('../../types').VehicleDoc; label: string }[] = [
      ...((d.horseDocs || []).map(doc => ({ doc, label: 'Cavalo' }))),
      ...((d.trailerDocs || []).map(doc => ({ doc, label: 'Carreta' }))),
    ];
    return (
      <div key={d.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 flex items-start gap-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border overflow-hidden shrink-0 shadow-inner">
            {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white"><img src="/logo.jpg" alt="ALS" className="w-7 h-7 object-contain" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-black text-slate-800 uppercase text-[12px] leading-tight flex items-center gap-1.5 min-w-0">
                <span className="truncate">{d.name}</span>
                <CopyBtn ck={`nome-${d.id}`} value={stripSpecials(d.name)} title="Copiar nome (sem acentos)" />
              </p>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{d.status}</span>
            </div>
            <div className="mt-2 px-2 py-1 bg-blue-50/60 rounded-lg border border-blue-100/60 inline-flex flex-col">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter leading-none">Beneficiário</span>
              <span className="text-[9px] font-bold text-blue-600 uppercase mt-0.5 truncate max-w-[180px]">{d.beneficiaryName || 'O PRÓPRIO'}</span>
            </div>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4 flex-1">
          {/* Contato */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <a href={`https://wa.me/55${onlyDigits(d.phone)}`} target="_blank" className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] hover:underline">
              <Icons.Whatsapp />
              {maskPhone(d.phone)}
            </a>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] text-slate-400 font-bold lowercase truncate max-w-[160px]">{d.email || 'sem e-mail'}</span>
              {d.email && <CopyBtn ck={`email-${d.id}`} value={(d.email || '').trim()} title="Copiar e-mail" />}
            </div>
          </div>

          {/* Documentação */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5">CPF: <span className="text-slate-800 font-mono normal-case">{maskCPF(d.cpf)}</span><CopyBtn ck={`cpf-${d.id}`} value={onlyDigits(d.cpf)} title="Copiar CPF (só números)" /></span>
            <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5">CNH: <span className="text-slate-800">{d.cnh || '---'}</span>{d.cnh && <CopyBtn ck={`cnh-${d.id}`} value={onlyAlnum(d.cnh)} title="Copiar CNH (sem caracteres especiais)" />}</span>
            {d.cnhPdfUrl && (
              <button onClick={() => setDocViewer({ url: d.cnhPdfUrl!, name: `CNH — ${d.name}`, kind: 'pdf' })} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[7px] font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all">VER CNH</button>
            )}
          </div>

          {/* Frota */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-slate-400 uppercase w-12">Cavalo</span>
              <span className="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-mono font-bold shadow-sm">{d.plateHorse || '---'}</span>
              {d.yearHorse && <span className="text-[9px] text-slate-500 font-bold">{d.yearHorse}</span>}
              {d.plateHorse && <CopyBtn ck={`ph-${d.id}`} value={onlyAlnum(d.plateHorse)} title="Copiar placa do cavalo (sem traço)" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-slate-400 uppercase w-12">Carreta</span>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[10px] font-mono font-bold">{d.plateTrailer || '---'}</span>
              {d.yearTrailer && <span className="text-[9px] text-slate-500 font-bold">{d.yearTrailer}</span>}
              {d.plateTrailer && <CopyBtn ck={`pt-${d.id}`} value={onlyAlnum(d.plateTrailer)} title="Copiar placa da carreta (sem traço)" />}
            </div>
          </div>

          {/* Documentos do veículo */}
          {vehicleDocs.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Documentos do Veículo</span>
              <div className="flex flex-wrap gap-1.5">
                {vehicleDocs.map(({ doc, label }) => (
                  <button
                    key={doc.id}
                    onClick={() => setDocViewer({ url: doc.url, name: `${label} — ${doc.name}`, kind: doc.kind })}
                    title={`${label}: ${doc.name}`}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-black uppercase transition-all bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                  >
                    <span className={`inline-block px-1 rounded ${doc.kind === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{doc.kind === 'pdf' ? 'PDF' : 'IMG'}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vínculos */}
          <DriverVinculosCell driver={d} />
        </div>

        {/* Acesso ao portal */}
        <div className="mx-5 mb-4 p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black text-slate-500 uppercase">Login</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-black text-blue-400">{onlyDigits(d.cpf)}</span>
              <CopyBtn ck={`login-${d.id}`} value={onlyDigits(d.cpf)} title="Copiar login" className="!text-slate-500 hover:!text-blue-400" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black text-slate-500 uppercase">Senha</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black text-white">{passVisible ? (linkedUser?.password || '---') : '••••••••'}</span>
              {linkedUser?.password && <CopyBtn ck={`senha-${d.id}`} value={linkedUser.password} title="Copiar senha" className="!text-slate-500 hover:!text-white" />}
              <button onClick={() => setShowPasswords(prev => ({ ...prev, [d.id]: !prev[d.id] }))} className="text-slate-600 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d={passVisible ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"}/></svg>
              </button>
            </div>
          </div>
          <div className="pt-1.5 border-t border-white/5 flex justify-between items-center">
            <span className="text-[7px] font-black text-amber-500 uppercase">Chave Contrato</span>
            <span className="text-[10px] font-mono font-black text-amber-200">{d.beneficiaryCnpj ? onlyDigits(d.beneficiaryCnpj).slice(-4) : onlyDigits(d.cpf).slice(-4)}</span>
          </div>
          <button
            onClick={() => handleResetPassword(d)}
            disabled={resettingId === d.id}
            className="w-full mt-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/40 disabled:opacity-50"
            title="Gerar nova senha para o portal do motorista"
          >
            {resettingId === d.id
              ? <><div className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"/>Gerando...</>
              : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>Solicitar Nova Senha</>}
          </button>
        </div>

        {/* Rodapé de ações */}
        <div className="px-5 pb-5 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => copyClean(`all-${d.id}`, buildCleanInfo(d))}
            title="Copiar todos os dados sem caracteres especiais"
            className={`p-2 rounded-xl transition-all ${copiedKey === `all-${d.id}` ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            {copiedKey === `all-${d.id}`
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/></svg>}
          </button>
          <DriverDossierAction driver={d} />
          <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5"/></svg></button>
          <button onClick={() => { setItemToDelete(d); setIsDeleteModalOpen(true); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icons.Excluir /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Sub-abas: Motoristas | Pessoas Autorizadas */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setActiveSubTab('motoristas')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'motoristas' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
          Motoristas
        </button>
        <button
          onClick={() => setActiveSubTab('autorizados')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeSubTab === 'autorizados' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Pessoas Autorizadas
        </button>
      </div>

      {activeSubTab === 'autorizados' ? (
        <AuthorizedPersonsTab />
      ) : (
      <>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 w-full">
          <ListFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            placeholder="BUSCAR MOTORISTA, BENEFICIÁRIO, CPF OU PLACA..."
          />
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-xl h-[68px] shrink-0">Novo Motorista</button>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Motoristas Cadastrados</h3>
        <span className="text-[10px] font-black text-slate-400">{filteredDrivers.length} {filteredDrivers.length === 1 ? 'registro' : 'registros'}</span>
      </div>

      {filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 text-center">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nenhum motorista encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDrivers.map(renderDriverCard)}
        </div>
      )}
      </>
      )}

      <DriverModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveDriver}
        editingDriver={editingDriver}
        availableOps={availableOps}
      />

      {docViewer && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 flex flex-col p-4 sm:p-8 backdrop-blur-xl" onClick={e => { if (e.target === e.currentTarget) setDocViewer(null); }}>
          <div className="flex justify-between items-center mb-4 gap-4">
            <h3 className="text-white font-black uppercase text-sm truncate">{docViewer.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <a href={docViewer.url} target="_blank" rel="noreferrer" className="text-white bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all">Abrir</a>
              <button onClick={() => setDocViewer(null)} className="text-white bg-red-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg">Fechar</button>
            </div>
          </div>
          {docViewer.kind === 'image' ? (
            <div className="flex-1 flex items-center justify-center overflow-auto">
              <img src={docViewer.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt={docViewer.name} />
            </div>
          ) : (
            <iframe src={docViewer.url} className="flex-1 rounded-[2.5rem] bg-white border-4 border-white/10" />
          )}
        </div>
      )}

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Icons.Excluir />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Excluir Registro</h3>
                    <p className="text-xs text-slate-400 mt-2">Remover permanentemente {itemToDelete.name}?</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                    <button onClick={() => { onDeleteDriver(itemToDelete.id); setIsDeleteModalOpen(false); }} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Confirmar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Nova senha gerada */}
      {resetInfo && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) setResetInfo(null); }}>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-7 py-5 bg-blue-600 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Nova Senha Gerada</h3>
              <button onClick={() => setResetInfo(null)} className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
            </div>
            <div className="p-7 space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Repasse ao motorista <span className="text-slate-800 font-black">{resetInfo.name}</span>. No próximo login ele poderá definir uma senha própria.</p>
              <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Login</span>
                  <span className="text-[12px] font-mono font-black text-blue-400">{resetInfo.login}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Nova senha</span>
                  <span className="text-[16px] font-mono font-black text-white tracking-widest">{resetInfo.password}</span>
                </div>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(`Login: ${resetInfo.login}\nSenha: ${resetInfo.password}`).then(() => { setResetCopied(true); setTimeout(() => setResetCopied(false), 2000); }); }}
                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${resetCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {resetCopied
                  ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> Copiado</>
                  : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/></svg> Copiar Login e Senha</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
