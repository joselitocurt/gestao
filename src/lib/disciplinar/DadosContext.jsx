import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { fluxosDo, normalizar } from '@shared/disciplinar.js';

// Dados do Módulo II carregados uma vez e compartilhados entre as páginas do módulo.
const Contexto = createContext(null);

// Lê todas as páginas de uma entidade (1.000 registros por vez).
async function todos(entidade) {
  const itens = [];
  let cursor = null;
  do {
    const pagina = await entidade.filter({}, { limit: 1000, cursor });
    itens.push(...(pagina.items || []));
    cursor = pagina.has_more ? pagina.next_cursor : null;
  } while (cursor);
  return itens;
}

export function DisciplinarProvider({ children }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [punicoes, setPunicoes] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const recarregar = useCallback(async () => {
    try {
      const [c, m, p, e] = await Promise.all([
        todos(api.entities.Colaborador),
        todos(api.entities.Motivo),
        todos(api.entities.Punicao),
        api.entities.Empresa.list({ limit: 1 }),
      ]);
      setColaboradores(c);
      setMotivos(m);
      setPunicoes(p);
      setEmpresa(e[0] || null);
      setErro('');
    } catch (err) {
      setErro(err.message || 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const valor = useMemo(() => {
    const porColab = new Map(colaboradores.map((c) => [c.id, c]));
    const porMotivo = new Map(motivos.map((m) => [m.id, m]));
    const nomeMotivo = (id) => porMotivo.get(id)?.nome || '(motivo removido)';
    return {
      colaboradores,
      motivos,
      punicoes,
      empresa,
      carregando,
      erro,
      recarregar,
      colaborador: (id) => porColab.get(id) || null,
      motivo: (id) => porMotivo.get(id) || null,
      nomeMotivo,
      fluxos: (colaboradorId) => fluxosDo(punicoes, colaboradorId, nomeMotivo),
      nivelAtual: (colaboradorId) => Math.max(0, ...fluxosDo(punicoes, colaboradorId).map((f) => f.nivel)),
      buscarColaboradores: (termo, { incluirDemitidos = true } = {}) => {
        const q = normalizar(termo);
        const qd = String(termo || '').replace(/\D/g, '');
        return colaboradores
          .filter((c) => incluirDemitidos || c.status !== 'Demitido')
          .filter(
            (c) =>
              !q ||
              normalizar(c.nome).includes(q) ||
              normalizar(c.matricula).includes(q) ||
              normalizar(c.funcao).includes(q) ||
              (qd.length >= 3 && String(c.cpf || '').replace(/\D/g, '').includes(qd)),
          )
          .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      },
    };
  }, [colaboradores, motivos, punicoes, empresa, carregando, erro, recarregar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useDisciplinar = () => useContext(Contexto);
