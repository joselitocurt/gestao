import { api } from '@/api/client';

// Abre o PDF anexado numa aba nova (link assinado de curta duração).
export async function abrirAnexo(uri) {
  const aba = window.open('', '_blank');
  try {
    const { signed_url } = await api.files.signedUrl(uri);
    if (aba) aba.location.href = signed_url;
    else window.open(signed_url, '_blank', 'noopener');
  } catch (e) {
    aba?.close();
    throw e;
  }
}

// Baixa o PDF anexado com o nome original.
export async function baixarAnexo(uri, nome) {
  const { signed_url } = await api.files.signedUrl(uri);
  const resposta = await fetch(signed_url);
  if (!resposta.ok) throw new Error('arquivo não encontrado');
  baixarBlob(await resposta.blob(), nome || 'documento.pdf');
}

export function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
