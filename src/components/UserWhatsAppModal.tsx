import React, { useState, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Shield,
  KeyRound,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile } from '../types';
import { buildUserCredentialsWhatsAppMessage, getWhatsAppUrl } from '../utils/whatsappShare';

interface UserWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile | null;
  currentUser: UserProfile;
}

export const UserWhatsAppModal: React.FC<UserWhatsAppModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentUser,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Generate preview message
  const messageText = useMemo(() => {
    if (!targetUser) return '';
    const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return buildUserCredentialsWhatsAppMessage(targetUser, currentUser, currentUrl, customNote);
  }, [targetUser, currentUser, customNote]);

  // WhatsApp Web / App link URL
  const whatsappUrl = useMemo(() => {
    if (!messageText) return '';
    return getWhatsAppUrl(messageText, phoneNumber);
  }, [messageText, phoneNumber]);

  if (!isOpen || !targetUser) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(messageText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = messageText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Error al copiar credenciales:', err);
    }
  };

  const userPassword = targetUser.password || 'admin123';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  Enviar Credenciales por WhatsApp
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-800/60 text-[10px] font-semibold uppercase tracking-wider text-emerald-100 border border-emerald-400/30">
                  Acceso Seguro
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Policía de Entre Ríos - Comisaría de Minoridad y Violencia Familiar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* User summary card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Funcionario / Efectivo:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {targetUser.name}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Usuario de Acceso (@):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  @{targetUser.username || targetUser.email.split('@')[0]}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Correo Electrónico:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {targetUser.email}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Contraseña Asignada:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded">
                    {showPassword ? userPassword : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Rol: <strong className="capitalize">{targetUser.role}</strong>
                  {targetUser.badgeNumber ? ` • Legajo: ${targetUser.badgeNumber}` : ''}
                  {targetUser.department ? ` • ${targetUser.department}` : ''}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                Credencial Lista
              </span>
            </div>
          </div>

          {/* Recipient Phone & Custom Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número de WhatsApp (Opcional):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ej: 5493436123456 (o dejar vacío)"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Si lo deja vacío, podrá seleccionar cualquier contacto o grupo en WhatsApp.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mensaje o indicación extra (Opcional):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ej: Contraseña provisoria para la guardia de hoy"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Se incluirá al final del mensaje de WhatsApp.
              </p>
            </div>
          </div>

          {/* WhatsApp text preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Vista previa del mensaje de WhatsApp:</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar texto'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-800 selection:bg-emerald-700 selection:text-white">
              {messageText}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Se abrirá WhatsApp Web o la aplicación móvil con el texto cargado.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar Credenciales'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 hover:shadow-emerald-700/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
