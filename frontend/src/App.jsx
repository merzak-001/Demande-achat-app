import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import AcheteurApp from './components/AcheteurApp';
import DemandeurApp from './components/DemandeurApp';
import PrintableRequest from './components/PrintableRequest';
import { formatCleanName } from './utils/nameUtils';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const sanitizeUser = (u) => {
  if (!u) return u;
  const copy = { ...u };
  if (!copy.fullName && copy.name) copy.fullName = copy.name;
  if (copy.fullName) copy.fullName = formatCleanName(copy.fullName);
  if (copy.name) copy.name = formatCleanName(copy.name);
  return copy;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Une erreur inattendue est survenue</h2>
            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl font-mono text-left overflow-x-auto max-h-36">
              {this.state.error?.toString()}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
              }}
              className="px-6 py-2.5 rounded-full bg-[#0084ff] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Se Reconnecter</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (savedUser && token) {
        return sanitizeUser(JSON.parse(savedUser));
      }
    } catch { /* ignore */ }
    return null;
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data?.user) {
            const u = sanitizeUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(u));
            setUser(u);
          }
        })
        .catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        });
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    const u = sanitizeUser(userData);
    if (u) {
      localStorage.setItem('user', JSON.stringify(u));
    }
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user || !localStorage.getItem('token')) {
    return (
      <ErrorBoundary>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Print route accessible to all */}
          <Route path="/print/:id" element={<PrintableRequest />} />

          {/* Role-based main app */}
          <Route path="/*" element={
            user.role === 'Admin' ? (
              <AdminPage user={user} onLogout={handleLogout} />
            ) : user.role === 'Acheteur' ? (
              <AcheteurApp user={user} onLogout={handleLogout} />
            ) : (
              <DemandeurApp user={user} onLogout={handleLogout} />
            )
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
