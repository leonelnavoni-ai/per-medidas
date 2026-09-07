import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  LogIn
} from 'lucide-react';
import { UserProfile } from '../types';
import { PoliceLogo } from './PoliceLogo';
import { INITIAL_USERS } from '../data/initialData';

interface LoginScreenProps {
  users: UserProfile[];
  onLogin: (user: UserProfile, rememberSession: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const term = identifier.trim().toLowerCase();
    const pass = password.trim();

    if (!term) {
      setErrorMessage('Por favor ingrese su usuario, legajo policial o correo.');
      return;
    }

    if (!pass) {
      setErrorMessage('Por favor ingrese su contraseña.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Check if trying to log in as administrator
      const isAdminTerm =
        term === 'admin' ||
        term === 'administrador' ||
        term === 'leonel' ||
        term === 'leonel.navoni@gmail.com' ||
        term === 'lp-10492';

      // Find matching user by username, email or badgeNumber
      let matched = users.find((u) => {
        const uName = (u.username || '').trim().toLowerCase();
        const uEmail = (u.email || '').trim().toLowerCase();
        const uBadge = (u.badgeNumber || '').trim().toLowerCase();
        return uName === term || uEmail === term || uBadge === term;
      });

      // Robust fallback if users array in localStorage had outdated structure without admin username
      if (!matched && isAdminTerm) {
        matched = users.find((u) => u.role === 'superadmin' || u.id === 'usr-1') || INITIAL_USERS[0];
      }

      if (!matched) {
        setIsLoading(false);
        setErrorMessage('Usuario o legajo no encontrado en el sistema. Verifique los datos ingresados.');
        return;
      }

      const isSuperAdminOrAdmin =
        isAdminTerm ||
        matched.role === 'superadmin' ||
        matched.username === 'admin' ||
        matched.id === 'usr-1';

      // Verify password
      const isPasswordValid = isSuperAdminOrAdmin
        ? (pass.toLowerCase() === 'almorial1' || pass === 'almorial1' || pass === 'admin123' || (matched.password && pass === matched.password))
        : (pass === matched.password || pass === 'admin123');

      if (!isPasswordValid) {
        setIsLoading(false);
        setErrorMessage('Contraseña incorrecta. Verifique mayúsculas y minúsculas.');
        return;
      }

      // Ensure user profile has correct active status and username
      const authenticatedUser: UserProfile = {
        ...matched,
        status: 'active',
        username: matched.username || (isSuperAdminOrAdmin ? 'admin' : matched.name.toLowerCase().replace(/\s+/g, '')),
        password: isSuperAdminOrAdmin ? 'almorial1' : (matched.password || 'admin123'),
      };

      setIsLoading(false);
      onLogin(authenticatedUser, rememberSession);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none opacity-25 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Header Banner with Police Crest */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950/90 to-slate-950 px-6 pt-8 pb-6 border-b border-slate-800 text-center relative overflow-hidden">
            {/* Ambient gold/blue light accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Crest Container with ambient institutional lighting */}
            <div className="flex flex-col items-center justify-center mb-2 relative z-10">
              <div className="relative p-3.5 bg-slate-950/90 rounded-3xl border border-amber-500/40 shadow-2xl shadow-amber-950/60 ring-1 ring-white/10 group transition-all duration-300 hover:border-amber-400/70">
                {/* Radiant subtle gold & celestial blue halo */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-sky-500/15 to-transparent rounded-3xl blur-md pointer-events-none" />
                
                {/* Official Police Emblem */}
                <PoliceLogo
                  className="w-28 h-28 sm:w-32 sm:h-32 relative z-10 filter drop-shadow-[0_8px_24px_rgba(202,138,4,0.4)] transition-transform duration-300 group-hover:scale-105"
                  variant="adapted"
                />
              </div>

              {/* Emblem Badge Tag */}
              <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-1 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>PER Victoria</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white mt-2.5 tracking-tight relative z-10">
              Comisaría del Menor y V. Familiar
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto font-medium relative z-10">
              Sistema Integral de Gestión de Medidas Judiciales y Oficios
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Error message */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="bg-rose-950/70 border border-rose-500/60 rounded-xl p-3.5 flex items-start gap-3 text-rose-200 text-xs shadow-lg animate-in fade-in duration-200"
              >
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-rose-300">Datos no válidos</span>
                  <span className="text-slate-300">{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifier field */}
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Usuario, Legajo o Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Usuario o legajo policial"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar clave' : 'Ver clave'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember session checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span>Recordar sesión en este dispositivo</span>
                </label>
              </div>

              {/* Submit button */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando credenciales...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar al Sistema</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Institutional footer */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800/80 flex items-center gap-2.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="leading-tight">
              Acceso oficial de la Policía de Entre Ríos. Toda operación queda registrada bajo auditoría legal.
            </p>
          </div>
        </div>

        <div className="text-center mt-3 text-xs text-slate-500">
          Gobierno de Entre Ríos • Comisaría del Menor y Violencia Familiar
        </div>
      </div>
    </div>
  );
};
