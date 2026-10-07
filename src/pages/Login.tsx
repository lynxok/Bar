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
    <div className="min-h-screen flex items-center justify-center relative bg-[#1C1C1C] overflow-hidden">
      {/* Liquid Animated Gradient Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#0F6B41]/25 rounded-full filter blur-[120px] animate-blob-one" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#1E4437]/50 rounded-full filter blur-[140px] animate-blob-two" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-[#FA4515]/10 rounded-full filter blur-[120px] animate-blob-three" />
        <div className="absolute inset-0 bg-[#1C1C1C]/40 backdrop-blur-[60px]" />
      </div>


      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-8 pb-6 text-center">
            <div className="flex items-center justify-center mx-auto mb-5">
              <img
                src="./brand/logo-full-dark.png"
                alt="LYNX BarOS"
                className="w-48 max-w-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">LYNX BarOS</h1>
            <p className="text-sm text-slate-300 font-medium">
              {setupMode ? 'Primer uso: creá la cuenta Superadmin' : 'Accedé al panel de control'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            
            {error && (
              <div className="bg-[#C62828]/20 border border-[#C62828]/60 p-3 rounded-xl flex items-center gap-3 animate-in shake">
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-200">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-[#0F6B41] transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-[#1C1C1C]/70 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B41]/50 focus:border-[#0F6B41] transition-all sm:text-sm font-semibold"
                  placeholder={setupMode ? "Usuario o correo del Superadmin" : "Usuario o correo electrónico"}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#0F6B41] transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-[#1C1C1C]/70 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B41]/50 focus:border-[#0F6B41] transition-all sm:text-sm font-semibold"
                  placeholder={setupMode ? "Contraseña (mínimo 8 caracteres)" : "Contraseña"}
                />
              </div>

              {setupMode && (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#0F6B41] transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    disabled={isLoading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-[#1C1C1C]/70 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F6B41]/50 focus:border-[#0F6B41] transition-all sm:text-sm font-semibold"
                    placeholder="Repetir contraseña"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-[#0F6B41] hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F6B41] focus:ring-offset-slate-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
        <div className="flex flex-col items-center gap-2 mt-8 opacity-80 hover:opacity-100 transition-opacity">
          <span className="text-xs text-slate-300 font-semibold tracking-wide">
            LYNX BarOS by LYNX Consulting
          </span>
          <p className="text-center text-[11px] text-slate-400 tracking-wider font-semibold">
            v{__APP_VERSION__} (Local-First)
          </p>
        </div>
      </div>

    </div>
  );
}
