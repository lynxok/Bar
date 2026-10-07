import React, { useEffect, useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { login, needsSuperadminSetup, setupSuperadmin, type SessionUser } from '../lib/auth';

interface LoginProps {
  onLogin: (user: SessionUser) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Primer uso en la PC principal: no existe ningún Superadmin todavía
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    needsSuperadminSetup().then(setSetupMode).catch(() => setSetupMode(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (setupMode) {
      if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
      if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    }

    setIsLoading(true);
    try {
      const result = setupMode
        ? await setupSuperadmin(email.trim(), password)
        : await login(email.trim(), password);
      if (result.ok && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Credenciales incorrectas o usuario no encontrado.');
      }
    } catch {
      setError('No se pudo conectar con la PC principal. Verificá la red.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-slate-950 overflow-hidden">
      {/* Liquid Animated Gradient Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full filter blur-[120px] animate-blob-one" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/15 rounded-full filter blur-[140px] animate-blob-two" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/15 rounded-full filter blur-[120px] animate-blob-three" />
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[60px]" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-8 pb-6 text-center">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
              <KeyRound className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">LYNX BarOS</h1>
            <p className="text-sm text-slate-400">{setupMode ? 'Primer uso: creá la cuenta Superadmin' : 'Accede al panel de control'}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 animate-in shake">
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-200">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-500/70 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all sm:text-sm"
                  placeholder={setupMode ? "Usuario o correo del Superadmin" : "Usuario o correo electrónico"}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-500/70 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all sm:text-sm"
                  placeholder={setupMode ? "Contraseña (mínimo 8 caracteres)" : "Contraseña"}
                />
              </div>

              {setupMode && (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    disabled={isLoading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-500/70 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all sm:text-sm"
                    placeholder="Repetir contraseña"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  {setupMode ? 'Crear Superadmin' : 'Iniciar Sesión'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

        </div>
        
        {/* Footer info */}
        <div className="flex flex-col items-center gap-3 mt-8 opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Desarrollado por</span>
            <a href="https://www.lnx.com.ar" target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform">
              <img src="/lynx-consulting-logo.png" alt="LYNX Consulting" className="h-12 object-contain" />
            </a>
          </div>
          <p className="text-center text-[10px] text-slate-600 tracking-widest font-medium">
            v{__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
