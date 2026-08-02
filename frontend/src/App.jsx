import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import AuthCallback from './pages/AuthCallback';
import MeuPerfil from './pages/MeuPerfil';
import CarteiraDigital from './pages/CarteiraDigital';
import AdminPagamentos from './pages/AdminPagamentos';
import AdminEstudantes from './pages/AdminEstudantes';
import ValidarCarteirinha from './pages/ValidarCarteirinha';
import VerificarEmail from './pages/VerificarEmail';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Termos from './pages/Termos';

/** Manda cada perfil para a sua tela inicial. */
function Inicio() {
  const { ehAdmin } = useAuth();
  return <Navigate to={ehAdmin ? '/admin/pagamentos' : '/carteirinha'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/termos" element={<Termos />} />
          {/* A política de privacidade está no mesmo documento dos termos. */}
          <Route path="/privacidade" element={<Termos />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/validar" element={<ValidarCarteirinha />} />
          <Route path="/validar/:qrCodeUuid" element={<ValidarCarteirinha />} />

          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/app" element={<Inicio />} />
            <Route path="/carteirinha" element={<CarteiraDigital />} />
            <Route path="/perfil" element={<MeuPerfil />} />
          </Route>

          <Route
            element={
              <RotaProtegida apenasAdmin>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/admin/pagamentos" element={<AdminPagamentos />} />
            <Route path="/admin/estudantes" element={<AdminEstudantes />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
