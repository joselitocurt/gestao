import { useCallback, useEffect, useState } from 'react';

// Tema claro/escuro. A escolha fica no navegador; sem escolha, segue o sistema.
const CHAVE = 'difal_tema';

const lerPreferencia = () => {
  try {
    return window.localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

const temaInicial = () => {
  const salvo = lerPreferencia();
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
};

export const aplicarTemaInicial = () => {
  document.documentElement.classList.toggle('dark', temaInicial() === 'escuro');
};

export function useTema() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro');
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => {
      const novo = atual === 'escuro' ? 'claro' : 'escuro';
      try {
        window.localStorage.setItem(CHAVE, novo);
      } catch {
        // armazenamento indisponível
      }
      return novo;
    });
  }, []);

  return { tema, alternar };
}
