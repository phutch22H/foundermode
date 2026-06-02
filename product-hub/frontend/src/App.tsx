import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthState } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductContext from './pages/ProductContext';
import Activity from './pages/Activity';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Digest from './pages/Digest';
import Navigation from './components/Navigation';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Navigation />
      <main className="flex-1 md:ml-56 pt-12 md:pt-0 p-4 md:p-8">{children}</main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('ph_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const auth = useAuthState();

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter basename={(import.meta as any).env?.VITE_BASE_PATH || ''}>
        <Routes>
          <Route path="/login" element={auth.user ? <Navigate to="/dashboard" replace /> : <Login mode="login" />} />
          <Route path="/signup" element={auth.user ? <Navigate to="/dashboard" replace /> : <Login mode="signup" />} />
          <Route path="/dashboard" element={<RequireAuth><ProtectedLayout><Dashboard /></ProtectedLayout></RequireAuth>} />
          <Route path="/products" element={<RequireAuth><ProtectedLayout><Products /></ProtectedLayout></RequireAuth>} />
          <Route path="/products/:id" element={<RequireAuth><ProtectedLayout><ProductDetail /></ProtectedLayout></RequireAuth>} />
          <Route path="/products/:id/context" element={<RequireAuth><ProtectedLayout><ProductContext /></ProtectedLayout></RequireAuth>} />
          <Route path="/activity" element={<RequireAuth><ProtectedLayout><Activity /></ProtectedLayout></RequireAuth>} />
          <Route path="/digest" element={<RequireAuth><ProtectedLayout><Digest /></ProtectedLayout></RequireAuth>} />
          <Route path="/insights" element={<RequireAuth><ProtectedLayout><Insights /></ProtectedLayout></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><ProtectedLayout><Settings /></ProtectedLayout></RequireAuth>} />
          <Route path="*" element={<Navigate to={auth.user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
