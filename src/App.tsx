import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_KEY, readSession } from './api/client';
import { api } from './api';
import { GlobalLoader } from './components/GlobalLoader';
import { Shell } from './components/layout';
import { CheckoutPage } from './pages/CheckoutPage';
import { AuditJournalPage } from './pages/AuditJournalPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StyleguidePage } from './pages/StyleguidePage';
import { UsersPage } from './pages/UsersPage';
import type { Session, User } from './types';
import './App.css';

function App() {
  const [session, setSession] = useState<Session | null>(readSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  function login(nextSession: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    navigate('/');
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // Clear the local session even if the server cannot record the logout.
    } finally {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      queryClient.clear();
      navigate('/login');
    }
  }

  function updateUser(updatedUser: User) {
    if (!session) {
      return;
    }
    const nextSession = { ...session, utilisateur: updatedUser };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  return (
    <>
      <Routes>
        <Route
          path="/styleguide"
          element={import.meta.env.DEV ? <StyleguidePage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />}
        />
        <Route
          path="*"
          element={
            session ? (
              <Shell session={session} onLogout={logout}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route
                    path="/produits"
                    element={<ProductsPage role={session.utilisateur.role} />}
                  />
                  <Route path="/caisse" element={<CheckoutPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route
                    path="/arrivages"
                    element={<DeliveriesPage role={session.utilisateur.role} />}
                  />
                  <Route path="/ventes" element={<HistoryPage role={session.utilisateur.role} />} />
                  <Route
                    path="/profil"
                    element={<ProfilePage user={session.utilisateur} onUserUpdated={updateUser} />}
                  />
                  <Route
                    path="/utilisateurs"
                    element={
                      session.utilisateur.role === 'ADMIN' ? (
                        <UsersPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route
                    path="/journaux"
                    element={
                      session.utilisateur.role === 'ADMIN' ? (
                        <AuditJournalPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Shell>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      <GlobalLoader />
    </>
  );
}

export default App;
