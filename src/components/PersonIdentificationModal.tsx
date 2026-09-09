import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserCheck,
  User,
  MapPin,
  FileText,
  Shield,
  Car,
  AlertTriangle,
  MessageCircle,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { IdentifiedPerson, JudicialMeasure, LegalStatusType, UserProfile } from '../types';

interface PersonIdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (person: IdentifiedPerson, sendWhatsApp: boolean) => void;
  initialPerson: IdentifiedPerson | null;
  mode: 'create' | 'edit';
  currentUser: UserProfile;
  measures: JudicialMeasure[];
}

export const PersonIdentificationModal: React.FC<PersonIdentificationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPerson,
  mode,
  currentUser,
  measures,
}) => {
  const [apellidoNombre, setApellidoNombre] = useState('');
  const [dni, setDni] = useState('');
  const [alias, setAlias] = useState('');
  const [edad, setEdad] = useState<string>('');
  const [nacionalidad, setNacionalidad] = useState('Argentina');
  const [domicilio, setDomicilio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [motivo, setMotivo] = useState('Control de rutina en vía pública');
  const [customMotivo, setCustomMotivo] = useState('');
  const [lugar, setLugar] = useState('');
  const [interviniente, setInterviniente] = useState('');
  const [dependencia, setDependencia] = useState('');
  const [estadoLegal, setEstadoLegal] = useState<LegalStatusType>('Sin impedimento');
  const [observaciones, setObservaciones] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [sendWhatsAppDirectly, setSendWhatsAppDirectly] = useState(false);
  const [fechaHora, setFechaHora] = useState('');

  // Pre-fill form when opening or editing
  useEffect(() => {
    if (initialPerson && mode === 'edit') {
      setApellidoNombre(initialPerson.apellidoNombre || '');
      setDni(initialPerson.dni || '');
      setAlias(initialPerson.alias || '');
      setEdad(initialPerson.edad ? String(initialPerson.edad) : '');
      setNacionalidad(initialPerson.nacionalidad || 'Argentina');
      setDomicilio(initialPerson.domicilio || '');
      setTelefono(initialPerson.telefono || '');
      setLugar(initialPerson.lugar || '');
      setInterviniente(initialPerson.interviniente || '');
      setDependencia(initialPerson.dependencia || '');
      setEstadoLegal(initialPerson.estadoLegal || 'Sin impedimento');
      setObservaciones(initialPerson.observaciones || '');
      setVehiculo(initialPerson.vehiculo || '');
      setFechaHora(initialPerson.fechaHora || new Date().toISOString());

      const standardMotivos = [
        'Control de rutina en vía pública',
        'Actitud sospechosa en zona comercial',
        'Operativo Control Nocturno',
        'Averiguación de antecedentes y medios de vida',
        'Operativo Control Vehicular',
        'Demorado por contravención',
      ];
      if (standardMotivos.includes(initialPerson.motivo)) {
        setMotivo(initialPerson.motivo);
        setCustomMotivo('');
      } else {
        setMotivo('Otro');
        setCustomMotivo(initialPerson.motivo);
      }
    } else {
      // New Person Identification Defaults
      setApellidoNombre('');
      setDni('');
      setAlias('');
      setEdad('');
      setNacionalidad('Argentina');
      setDomicilio('');
      setTelefono('');
      setMotivo('Control de rutina en vía pública');
      setCustomMotivo('');
      setLugar('');
      const badge = currentUser.badgeNumber ? ` (Leg. ${currentUser.badgeNumber})` : '';
      setInterviniente(`${currentUser.name}${badge}`);
      setDependencia(currentUser.department || 'Comisaría de Minoridad y Violencia Familiar');
      setEstadoLegal('Sin impedimento');
      setObservaciones('');
      setVehiculo('');
      setSendWhatsAppDirectly(false);

      // Current local datetime in YYYY-MM-DDTHH:mm format
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFechaHora(localIso);
    }
  }, [initialPerson, mode, isOpen, currentUser]);

  // Live cross-reference with judicial measures
  const matchingMeasures = useMemo(() => {
    const cleanName = apellidoNombre.trim().toLowerCase();
    const cleanDni = dni.trim();
    if (!cleanName && cleanDni.length < 5) return [];

    return measures.filter((m) => {
      const victimaMatch = cleanName && m.victima.toLowerCase().includes(cleanName);
      const victimarioMatch = cleanName && m.victimario.toLowerCase().includes(cleanName);
      return victimaMatch || victimarioMatch;
    });
  }, [apellidoNombre, dni, measures]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apellidoNombre.trim()) {
      alert('Por favor ingrese el Apellido y Nombre de la persona identificada.');
      return;
    }

    const finalMotivo = motivo === 'Otro' ? customMotivo.trim() || 'Control policial' : motivo;

    const personRecord: IdentifiedPerson = {
      id: initialPerson && mode === 'edit' ? initialPerson.id : `ident-${Date.now()}`,
      fechaHora: fechaHora || new Date().toISOString(),
      apellidoNombre: apellidoNombre.trim().toUpperCase(),
      dni: dni.trim(),
      alias: alias.trim() || undefined,
      edad: edad.trim() ? Number(edad) || edad.trim() : undefined,
      nacionalidad: nacionalidad.trim() || 'Argentina',
      domicilio: domicilio.trim() || undefined,
      telefono: telefono.trim() || undefined,
      motivo: finalMotivo,
      lugar: lugar.trim() || 'Jurisdicción Victoria, Entre Ríos',
      interviniente: interviniente.trim() || currentUser.name,
      dependencia: dependencia.trim() || 'Comisaría de Minoridad y Violencia Familiar',
      estadoLegal,
      observaciones: observaciones.trim() || undefined,
      vehiculo: vehiculo.trim() || undefined,
      createdAt: initialPerson && mode === 'edit' ? initialPerson.createdAt : new Date().toISOString(),
      createdBy: initialPerson && mode === 'edit' ? initialPerson.createdBy : currentUser.name,
    };

    onSave(personRecord, sendWhatsAppDirectly);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'create'
                  ? 'Registrar Identificación de Persona'
                  : 'Modificar Datos de Persona Identificada'}
              </h3>
              <p className="text-xs text-slate-400">
                Policía de Entre Ríos • Control y Verificación de Antecedentes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Live Cross-Check Banner if matching Judicial Measures found */}
          {matchingMeasures.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/70 text-amber-200 animate-in slide-in-from-top-2 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>¡ALERTA OPERATIVA! Coincidencia con Medidas Judiciales Vigentes ({matchingMeasures.length})</span>
              </div>
              <p className="text-[11px] text-amber-300/90 leading-tight">
                El nombre ingresado coincide con personas registradas en oficios judiciales:
              </p>
              <div className="space-y-1 pt-1 max-h-24 overflow-y-auto">
                {matchingMeasures.map((m) => (
                  <div
                    key={m.id}
                    className="p-1.5 rounded bg-amber-900/40 border border-amber-700/40 text-[11px] flex items-center justify-between gap-2"
                  >
                    <span>
                      <strong>Oficio N° {m.nroOficio}</strong> ({m.provenienteDe}): {m.tipoMedida} — Denunciado: <strong>{m.victimario}</strong>
                    </span>
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-800 text-[10px] font-bold">
                      {m.estadoVigencia || 'Vigente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Datos Personales */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <User className="w-3.5 h-3.5" />
              <span>1. Datos del Ciudadano / Filiatorios</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Apellido y Nombre */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Apellido y Nombres: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={apellidoNombre}
                  onChange={(e) => setApellidoNombre(e.target.value)}
                  placeholder="Ej: BROIN IVAN GUILLERMO"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* DNI */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  D.N.I. / Documento:
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 38452190 o indocumentado"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              {/* Alias / Apodo */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Alias / Apodo:
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: Guille, El Ruso, etc."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Edad & Nacionalidad */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 text-xs mb-1">
                    Edad:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    placeholder="Años"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 text-xs mb-1">
                    Nacionalidad:
                  </label>
                  <input
                    type="text"
                    value={nacionalidad}
                    onChange={(e) => setNacionalidad(e.target.value)}
                    placeholder="Argentina"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Domicilio */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Domicilio declarado:
                </label>
                <input
                  type="text"
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                  placeholder="Ej: B° Abadía, Calle Piaggio s/n, Victoria"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Teléfono de contacto:
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 3436-419823"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Procedimiento y Lugar */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>2. Lugar, Fecha y Motivo del Control</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fecha y Hora */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Fecha y Hora del Control:
                </label>
                <input
                  type="datetime-local"
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Lugar */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Lugar exacto / Intersección: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Ej: San Martín y Congreso (Plaza San Martín)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Motivo */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Motivo de la identificación:
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer"
                >
                  <option value="Control de rutina en vía pública">Control de rutina en vía pública</option>
                  <option value="Actitud sospechosa en zona comercial">Actitud sospechosa en zona comercial</option>
                  <option value="Operativo Control Nocturno">Operativo Control Nocturno</option>
                  <option value="Averiguación de antecedentes y medios de vida">Averiguación de antecedentes y medios de vida</option>
                  <option value="Operativo Control Vehicular">Operativo Control Vehicular</option>
                  <option value="Demorado por contravención">Demorado por contravención</option>
                  <option value="Otro">Otro motivo personalizado...</option>
                </select>

                {motivo === 'Otro' && (
                  <input
                    type="text"
                    value={customMotivo}
                    onChange={(e) => setCustomMotivo(e.target.value)}
                    placeholder="Especifique el motivo de la intervención..."
                    className="mt-2 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Vehículo */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 text-xs mb-1 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vehículo o medio de movilidad (si correspondiese):</span>
                </label>
                <input
                  type="text"
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="Ej: Motocicleta Honda Wave 110cc - Dominio A142XYZ / Peatonal / Bicicleta"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Situación Legal e Interviniente */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>3. Situación Legal e Intervención Policial</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Estado Legal */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Situación Legal / Antecedentes:
                </label>
                <select
                  value={estadoLegal}
                  onChange={(e) => setEstadoLegal(e.target.value as LegalStatusType)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold cursor-pointer"
                >
                  <option value="Sin impedimento">🟢 Sin impedimento legal</option>
                  <option value="Con medida cautelar">⚠️ Con medida cautelar vigente</option>
                  <option value="Pedido de captura / paradero">🚨 Pedido de captura / paradero</option>
                  <option value="En averiguación">🟡 En averiguación de antecedentes</option>
                  <option value="Demorado">⛔ Demorado en dependencia</option>
                </select>
              </div>

              {/* Interviniente */}
              <div>
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Oficial / Móvil Interviniente:
                </label>
                <input
                  type="text"
                  value={interviniente}
                  onChange={(e) => setInterviniente(e.target.value)}
                  placeholder="Ej: Of. Roberto Gómez - Móvil 402"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Dependencia */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Dependencia Policial:
                </label>
                <input
                  type="text"
                  value={dependencia}
                  onChange={(e) => setDependencia(e.target.value)}
                  placeholder="Comisaría de Minoridad y Violencia Familiar"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Observaciones */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 text-xs mb-1">
                  Observaciones, vestimenta o detalles del procedimiento:
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Describa vestimenta, pertenencias, resultado de consulta de antecedentes o advertencias notificadas..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Share Option */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWhatsAppDirectly}
                onChange={(e) => setSendWhatsAppDirectly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enviar datos de identificación por WhatsApp al guardar</span>
                </span>
                <p className="text-[10.5px] text-emerald-400/80">
                  Abre la ventana con el informe completo formateado listo para enviar a la guardia o superiores.
                </p>
              </div>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{mode === 'create' ? 'Guardar Identificación' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
