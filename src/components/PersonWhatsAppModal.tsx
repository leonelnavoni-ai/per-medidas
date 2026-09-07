import React, { useState, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  User,
  ShieldAlert,
  MapPin,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { IdentifiedPerson, JudicialMeasure, UserProfile } from '../types';
import {
  buildPersonIdentificationWhatsAppMessage,
  getWhatsAppUrl,
} from '../utils/whatsappShare';

interface PersonWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: IdentifiedPerson | null;
  currentUser: UserProfile;
  matchingMeasures?: JudicialMeasure[];
}

export const PersonWhatsAppModal: React.FC<PersonWhatsAppModalProps> = ({
  isOpen,
  onClose,
  person,
  currentUser,
  matchingMeasures = [],
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate preview of the WhatsApp message dynamically
  const messagePreview = useMemo(() => {
    if (!person) return '';
    return buildPersonIdentificationWhatsAppMessage(
      person,
      currentUser,
      matchingMeasures,
      customNote
    );
  }, [person, currentUser, matchingMeasures, customNote]);

  if (!isOpen || !person) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messagePreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed, fallback:', err);
    }
  };

  const handleSendWhatsApp = () => {
    const url = getWhatsAppUrl(messagePreview, phoneNumber);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-950/70 border-b border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Enviar Identificación por WhatsApp</span>
              </h3>
              <p className="text-xs text-emerald-300/90">
                Policía de Entre Ríos • Informe Operativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-200 text-xs sm:text-sm">
          {/* Person summary banner */}
          <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm">
                    {person.apellidoNombre}
                  </h4>
                  {person.alias && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                      "{person.alias}"
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  DNI: <span className="text-slate-200 font-bold">{person.dni || 'Sin DNI'}</span>
                  {person.edad ? ` • ${person.edad} años` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  person.estadoLegal === 'Sin impedimento'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : person.estadoLegal === 'Con medida cautelar'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : person.estadoLegal === 'Pedido de captura / paradero'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {person.estadoLegal}
              </span>
            </div>
          </div>

          {/* Alert if matching judicial measures */}
          {matchingMeasures.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-200">
                  Se incluirá la alerta de {matchingMeasures.length} medida(s) judicial(es) en el mensaje
                </p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Esta persona coincide con registros de víctimas o victimarios en medidas judiciales activas.
                </p>
              </div>
            </div>
          )}

          {/* Quick Details Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/60">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">Lugar: <strong>{person.lugar}</strong></span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/60">
              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">Motivo: <strong>{person.motivo}</strong></span>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Número de Teléfono del destinatario (Opcional):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej: 5493436123456 o déjalo vacío para elegir en WhatsApp"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Si lo dejas en blanco, podrás seleccionar cualquier contacto o grupo policial directamente dentro de WhatsApp.
            </p>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nota o instrucción policial complementaria (Opcional):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ej: Queda demorado para verificación de domicilio / Informado a sala de comunicaciones"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Vista Previa del Mensaje</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed selection:bg-emerald-600 selection:text-white">
              {messagePreview}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado al Portapapeles</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Mensaje</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
