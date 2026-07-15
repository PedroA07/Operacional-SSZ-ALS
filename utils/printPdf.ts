import type { jsPDF } from 'jspdf';

/**
 * Abre o diálogo de impressão do navegador para um PDF gerado com jsPDF,
 * SEM iniciar download.
 *
 * Usa `autoPrint()` (embute a ação de impressão no PDF) + um iframe oculto,
 * abordagem mais confiável que `window.open`, que em muitos navegadores baixa
 * o arquivo em vez de exibir o visualizador (ou é bloqueado como pop-up).
 */
export function printJsPdf(pdf: jsPDF, fileName?: string): void {
  try {
    // Dispara o diálogo de impressão assim que o PDF carrega no visualizador.
    pdf.autoPrint();
  } catch {
    /* alguns builds do jsPDF podem não expor autoPrint — seguimos com o iframe */
  }

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  if (fileName) iframe.title = fileName;
  iframe.src = url;

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback: abre em nova aba — o autoPrint dispara o diálogo lá.
      window.open(url, '_blank');
    }
  };

  iframe.onload = () => setTimeout(triggerPrint, 250);
  document.body.appendChild(iframe);

  // Limpeza: remove o iframe e revoga a URL após a impressão.
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* já removido */ }
    URL.revokeObjectURL(url);
  }, 60000);
}
