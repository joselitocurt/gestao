import React from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/AuthContext';
import { AcessoProvider } from '@/lib/AcessoContext';
import PageNotFound from '@/lib/PageNotFound';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import PortalShell from '@/components/portal/PortalShell';
import Inicio from '@/pages/Inicio';
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
import RelatorioNotas from '@/pages/RelatorioNotas';

// Módulo I: Gestão DIFAL (rotas relativas a /difal)
const ROTAS_DIFAL = [
  { path: '', chave: 'apuracao', elemento: <Apuracao />, redirecionar: true },
  { path: 'lote', chave: 'emissao_lote', elemento: <EmissaoLote /> },
  { path: 'importar', chave: 'importar_xml', elemento: <ImportarXml /> },
  { path: 'notas/nova', chave: 'cadastrar_nota', elemento: <CadastrarNota /> },
  { path: 'cnpjs', chave: 'cnpjs', elemento: <Cnpjs /> },
  { path: 'consulta', chave: 'consulta', elemento: <Consulta /> },
  { path: 'consolidado', chave: 'consolidado', elemento: <Consolidado /> },
  { path: 'relatorio', chave: 'relatorio_notas', elemento: <RelatorioNotas /> },
];

// Endereços antigos (antes dos módulos) continuam funcionando.
const ANTIGAS = ['lote', 'importar', 'notas/nova', 'cnpjs', 'consulta', 'consolidado'];
function RedirecionarAntiga() {
  const { pathname, search } = useLocation();
  return <Navigate to={`/difal${pathname}${search}`} replace />;
}

const ComAcesso = () => (
  <AcessoProvider>
    <Outlet />
  </AcessoProvider>
);

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
            <Route element={<ComAcesso />}>
              {/* Página inicial: escolha do módulo */}
              <Route element={<PortalShell />}>
                <Route path="/" element={<RotaPermitida><Inicio /></RotaPermitida>} />
                <Route path="/usuarios" element={<RotaPermitida chave="usuarios"><Usuarios /></RotaPermitida>} />
              </Route>

              <Route path="/difal" element={<AppShell />}>
                {ROTAS_DIFAL.map((rota) => (
                  <Route
                    key={rota.path || 'inicio'}
                    index={!rota.path}
                    path={rota.path || undefined}
                    element={
                      <RotaPermitida chave={rota.chave} redirecionar={rota.redirecionar}>
                        {rota.elemento}
                      </RotaPermitida>
                    }
                  />
                ))}
              </Route>

              {ANTIGAS.map((p) => (
                <Route key={p} path={`/${p}`} element={<RedirecionarAntiga />} />
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
