import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/AuthContext';
import { AcessoProvider } from '@/lib/AcessoContext';
import PageNotFound from '@/lib/PageNotFound';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import RotaPermitida from '@/components/RotaPermitida';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Apuracao from '@/pages/Apuracao';
import ImportarXml from '@/pages/ImportarXml';
import CadastrarNota from '@/pages/CadastrarNota';
import Cnpjs from '@/pages/Cnpjs';
import Consulta from '@/pages/Consulta';
import Consolidado from '@/pages/Consolidado';
import Usuarios from '@/pages/Usuarios';
import EmissaoLote from '@/pages/EmissaoLote';

const ROTAS = [
  { path: '/', chave: 'apuracao', elemento: <Apuracao />, redirecionar: true },
  { path: '/lote', chave: 'emissao_lote', elemento: <EmissaoLote /> },
  { path: '/importar', chave: 'importar_xml', elemento: <ImportarXml /> },
  { path: '/notas/nova', chave: 'cadastrar_nota', elemento: <CadastrarNota /> },
  { path: '/cnpjs', chave: 'cnpjs', elemento: <Cnpjs /> },
  { path: '/consulta', chave: 'consulta', elemento: <Consulta /> },
  { path: '/consolidado', chave: 'consolidado', elemento: <Consolidado /> },
  { path: '/usuarios', chave: 'usuarios', elemento: <Usuarios /> },
];

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <AcessoProvider>
                  <AppShell />
                </AcessoProvider>
              }
            >
              {ROTAS.map((rota) => (
                <Route
                  key={rota.path}
                  path={rota.path}
                  element={
                    <RotaPermitida chave={rota.chave} redirecionar={rota.redirecionar}>
                      {rota.elemento}
                    </RotaPermitida>
                  }
                />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}
