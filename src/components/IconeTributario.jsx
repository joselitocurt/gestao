import React from 'react';

// Ícone do sistema: guia de arrecadação (recibo serrilhado) com o símbolo de porcentagem do imposto.
// Mesmo traço dos ícones lucide usados no restante da interface.
export default function IconeTributario({ className = 'h-5 w-5', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="m15 8-6 8" />
      <circle cx="9.5" cy="8.5" r="1.25" />
      <circle cx="14.5" cy="15.5" r="1.25" />
    </svg>
  );
}
