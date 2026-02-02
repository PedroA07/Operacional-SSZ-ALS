import React from 'react';
import * as XLSX from 'xlsx';
import { StayRecord, StaySession } from '../../../types';

interface ExportStaysButtonProps {
  records: StayRecord[];
  session: StaySession;
  categoryName: string;
}

const ExportStaysButton: React.FC<ExportStaysButtonProps> = ({ records, session, categoryName }) => {
  
  const formatFullDateTime = (iso: string) => {
    if (!iso || iso.length < 10) return '';
    try {
      const [datePart, timePart] = iso.split('T');
      const [y, m, d] = datePart.split('-');
      const time = timePart ? timePart.substring(0, 5) : '00:00';
      return `${d}/${m}/${y} ${time}`;
    } catch (e) { return ''; }
  };

  const handleExport = () => {
    const headers = [
      'PROVEDOR',
      'NUMERO DA OS',
      'CLIENTE',
      'MOTORISTAS',
      'NAVIO/VIAGEM',
      'CONTAINER',
      'HORARIO PROGRAMADO',
      'CHEGADA',
      'SAIDA',
      'ATENDEU AGENDA',
      'FREE-TIME',
      'HORAS EXCEDENTES',
      'CUSTO POR HORA OU FRACAO',
      'CUSTO TOTAL',
      'OS AVULSA',
      'ANÁLISE'
    ];

    // Formatos Numéricos do Excel
    const formatTime = '[h]:mm';
    const formatCurrency = '"R$" #,##0.00';

    const dataRows = records.map((r, index) => {
      const rowIndex = index + 2; // +1 header, +1 base 1 do Excel
      
      // Lógica Atendeu Agenda
      let atendeuAgenda = 'NAO';
      if (r.scheduledStart && r.arrivalTime) {
        const sched = new Date(r.scheduledStart).getTime();
        const arriv = new Date(r.arrivalTime).getTime();
        if (arriv <= sched) atendeuAgenda = 'SIM';
      }

      // No Excel, Tempo é uma fração do dia (1 dia = 1.0)
      // Portanto, horas excedentes devem ser divididas por 24
      const exceededHoursRaw = r.exceededHours === '---' ? 0 : parseInt(r.exceededHours.split('h')[0]);
      const exceededValue = exceededHoursRaw / 24;
      const freeTimeValue = (session.gracePeriodHours || 0) / 24;

      return [
        { v: 'LUARA MEL VIEIRA', t: 's' },
        { v: (r.os || '').toUpperCase(), t: 's' },
        { v: categoryName.toUpperCase(), t: 's' },
        { v: (r.driverName || '').toUpperCase(), t: 's' },
        { v: (r.ship || '').toUpperCase(), t: 's' },
        { v: (r.container || '').toUpperCase(), t: 's' },
        { v: formatFullDateTime(r.scheduledStart), t: 's' },
        { v: formatFullDateTime(r.arrivalTime), t: 's' },
        { v: formatFullDateTime(r.departureTime), t: 's' },
        { v: atendeuAgenda.toUpperCase(), t: 's' },
        { v: freeTimeValue, t: 'n', z: formatTime }, // FREE-TIME como Tempo
        { v: exceededValue, t: 'n', z: formatTime },  // EXCEDENTE como Tempo
        { v: session.costPerHour || 0, t: 'n', z: formatCurrency }, // CUSTO HORA como Moeda
        { f: `L${rowIndex}*24*M${rowIndex}`, t: 'n', z: formatCurrency }, // CUSTO TOTAL (Fórmula: Horas*24*Valor)
        { v: '', t: 's' },
        { v: '', t: 's' }
      ];
    });

    // Criar planilha a partir da matriz de objetos de célula
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers.map(h => ({ v: h, t: 's' })), // Cabeçalhos
      ...dataRows
    ]);

    // Configurar Filtros
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

    // Cálculo de AutoFit (Ajuste Automático de Colunas)
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      // Verifica o tamanho do conteúdo em cada linha desta coluna
      dataRows.forEach(row => {
        const cell = row[i];
        const val = cell.v ? String(cell.v) : (cell.f ? 'R$ 0.000,00' : '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: maxLen + 5 }; // Adiciona margem de respiro
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ESTADIAS');

    const fileName = `PLANILHA_ESTADIAS_${categoryName.replace(/\|/g, '_')}_${new Date().getTime()}.xlsx`.toUpperCase();
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <button 
      onClick={handleExport}
      className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Exportar Planilha
    </button>
  );
};

export default ExportStaysButton;