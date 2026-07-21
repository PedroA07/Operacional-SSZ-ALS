import type { jsPDF } from 'jspdf';

/**
 * Abre o diálogo de impressão do navegador para um PDF gerado com jsPDF,
 * SEM iniciar download.
 *
 * Combina duas coisas:
 *  1. `autoPrint()` — embute no PDF a ação de imprimir ao abrir (dispara
 *     sozinho no visualizador nativo do Chrome/Edge).
 *  2. Um iframe COM DIMENSÃO REAL, porém invisível (fora da tela / opacity 0).
 *     Iframes com 0x0 ou `visibility:hidden` NÃO inicializam o visualizador de
 *     PDF no Chrome — por isso nem o autoPrint nem `contentWindow.print()`
 *     funcionavam e o arquivo acabava baixando. Mantendo dimensão real, o
 *     visualizador carrega e o diálogo de impressão abre.
 */
export function printJsPdf(pdf: jsPDF, fileName?: string): void {
  try {
    pdf.autoPrint();
  } catch {
    /* alguns builds do jsPDF podem não expor autoPrint — seguimos com o iframe */
  }

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  // Fora da tela, mas com tamanho real: o Chrome só carrega o visualizador de
  // PDF (e executa o autoPrint) quando o iframe tem dimensão e não está oculto.
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '900px';
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  if (fileName) iframe.title = fileName;

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      /* o autoPrint embutido já dispara o diálogo ao carregar o PDF */
    }
  };

  iframe.onload = () => setTimeout(triggerPrint, 400);
  iframe.src = url;
  document.body.appendChild(iframe);

  // Limpeza: remove o iframe e revoga a URL após a impressão.
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* já removido */ }
    URL.revokeObjectURL(url);
  }, 120000);
}
