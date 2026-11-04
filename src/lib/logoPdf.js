// Logomarca Controlar.io para os relatórios em PDF (carregada só na hora de exportar).
let cache = null;

export async function carregarLogoPdf() {
  if (cache) return cache;
  try {
    const resposta = await fetch('/marca/controlar-horizontal-pdf.png');
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    const dados = await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
    const { largura, altura } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
      img.onerror = () => resolve({ largura: 900, altura: 260 });
      img.src = dados;
    });
    cache = { dados, proporcao: altura / largura };
    return cache;
  } catch {
    return null; // sem logo, o relatório sai só com o texto
  }
}

/** Desenha a logo com a largura indicada; devolve a altura usada. */
export function desenharLogo(doc, logo, x, y, largura) {
  if (!logo) return 0;
  const altura = largura * logo.proporcao;
  doc.addImage(logo.dados, 'PNG', x, y, largura, altura);
  return altura;
}
