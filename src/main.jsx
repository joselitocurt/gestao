import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import { aplicarTemaInicial } from '@/lib/tema';
import '@/index.css';

aplicarTemaInicial();

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
