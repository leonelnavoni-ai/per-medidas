import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PlusCircle,
  Save,
  Shield,
  Calendar,
  Building2,
  FileCheck,
  User,
  UserX,
  AlertCircle,
  UploadCloud,
  FileText,
  Trash2,
  HardDrive,
  FolderPlus,
  Eye,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Clock,
  CalendarDays,
  CalendarCheck,
  Calculator,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { JudicialMeasure, DriveConnectionState, UserProfile } from '../types';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { formatBytes } from '../utils/formatters';
import { DEFAULT_DRIVE_FOLDER_ID, DEFAULT_DRIVE_FOLDER_URL } from '../data/initialData';
import {
  parseDateFlexible,
  formatToDDMMYYYY,
  formatToInputDate,
  addDays,
  calculateDaysDiff,
  formatFriendlySpanishDate,
} from '../utils/dateCalculations';

interface MeasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    measure: JudicialMeasure,
    attachedFile?: File | null,
    folderName?: string,
    removeExistingPdf?: boolean
  ) => Promise<void> | void;
  initialMeasure?: JudicialMeasure | null;
  mode: 'create' | 'edit';
  driveState?: DriveConnectionState;
  onViewExistingPdf?: (measure: JudicialMeasure) => void;
  currentUser?: UserProfile;
}

const MEASURE_TYPES = [
  'Prohibición de acercamiento',
  'Exclusión',
  'Prohibición malos tratos',
  'Prohibición de acercamiento y malos tratos',
  'Prohibición de acercamiento al domicilio y lugares de concurrencia',
  'Exclusión del hogar y prohibición de acercamiento',
  'Otra medida judicial',
];

const COURTS = [
  'JDO FLIA',
  'JDO. GARANTIAS',
  'JDO. GTIAS. VICTORIA',
  'JUZGADO DE PAZ',
  'JDO FLIA NOGOYA',
  'JDO. N°3',
];

export const MeasureModal: React.FC<MeasureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMeasure,
  mode,
  driveState,
  onViewExistingPdf,
  currentUser,
}) => {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [formData, setFormData] = useState<Partial<JudicialMeasure>>({
    victima: '',
    victimario: '',
    tipoMedida: 'Prohibición de acercamiento',
    nroOficio: '',
    provenienteDe: 'JDO FLIA',
    fechaDesde: '',
    fechaHasta: '',
    medidaReciproca: 'No',
    observaciones: '',
  });

  const [isDuracionCausa, setIsDuracionCausa] = useState(false);
  const [daysCount, setDaysCount] = useState<number | ''>(90);
  const [showManualDateOverride, setShowManualDateOverride] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // PDF Upload & Google Drive states
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [driveFolderName, setDriveFolderName] = useState<string>('Medidas Judiciales');
  const [removeExistingPdf, setRemoveExistingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMeasure && mode === 'edit') {
      setFormData({ ...initialMeasure });
      const isCausa =
        initialMeasure.fechaHasta?.toUpperCase().includes('DURACION') ||
        initialMeasure.fechaHasta?.toUpperCase().includes('FINALIZAR') ||
        false;
      setIsDuracionCausa(isCausa);

      if (!isCausa) {
        if (typeof initialMeasure.diasVigencia === 'number' && initialMeasure.diasVigencia > 0) {
          setDaysCount(initialMeasure.diasVigencia);
        } else {
          const s = parseDateFlexible(initialMeasure.fechaDesde);
          const e = parseDateFlexible(initialMeasure.fechaHasta);
          if (s && e) {
            const diff = calculateDaysDiff(s, e);
            setDaysCount(diff >= 0 ? diff : 90);
          } else {
            setDaysCount(90);
          }
        }
      } else {
        setDaysCount(90);
      }

      setDriveFolderName(initialMeasure.driveFolder || 'Medidas Judiciales');
      setAttachedFile(null);
      setRemoveExistingPdf(false);
      setShowManualDateOverride(false);
    } else {
      const now = new Date();
      const todayStr = formatToDDMMYYYY(now);
      const in90Days = addDays(now, 90);
      const expiryStr = formatToDDMMYYYY(in90Days);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      setDaysCount(90);
      setFormData({
        id: `med-${Date.now()}`,
        timestamp: `${todayStr} ${timeStr}`,
        victima: '',
        victimario: '',
        tipoMedida: 'Prohibición de acercamiento',
        nroOficio: '',
        provenienteDe: 'JDO FLIA',
        fechaDesde: todayStr,
        fechaHasta: expiryStr,
        diasVigencia: 90,
        medidaReciproca: 'No',
        observaciones: '',
      });
      setIsDuracionCausa(false);
      setDriveFolderName('Medidas Judiciales');
      setAttachedFile(null);
      setRemoveExistingPdf(false);
      setShowManualDateOverride(false);
    }
    setErrors({});
    setIsSaving(false);
  }, [initialMeasure, mode, isOpen]);

  // Handler when user updates days count
  const handleDaysChange = (val: number | '') => {
    setDaysCount(val);
    if (val === '' || isDuracionCausa) return;
    const days = Number(val);
    if (days >= 0) {
      const startDate = parseDateFlexible(formData.fechaDesde) || new Date();
      const calculatedEnd = addDays(startDate, days);
      const calculatedEndStr = formatToDDMMYYYY(calculatedEnd);
      setFormData((prev) => ({
        ...prev,
        fechaHasta: calculatedEndStr,
        diasVigencia: days,
      }));
    }
  };

  // Handler when user updates start date (A partir de cuándo)
  const handleFechaDesdeChange = (newDateStr: string) => {
    const parsedStart = parseDateFlexible(newDateStr);
    if (parsedStart && daysCount !== '' && Number(daysCount) >= 0 && !isDuracionCausa) {
      const calculatedEnd = addDays(parsedStart, Number(daysCount));
      const calculatedEndStr = formatToDDMMYYYY(calculatedEnd);
      setFormData((prev) => ({
        ...prev,
        fechaDesde: newDateStr,
        fechaHasta: calculatedEndStr,
        diasVigencia: Number(daysCount),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        fechaDesde: newDateStr,
      }));
    }
  };

  // Handler for native datepicker selection on start date
  const handleNativeStartDateSelect = (isoDateStr: string) => {
    const d = parseDateFlexible(isoDateStr);
    if (d) {
      handleFechaDesdeChange(formatToDDMMYYYY(d));
    }
  };

  // Quick preset actions for start date
  const handleQuickStartSelect = (type: 'today' | 'yesterday') => {
    const d = type === 'today' ? new Date() : addDays(new Date(), -1);
    handleFechaDesdeChange(formatToDDMMYYYY(d));
  };

  // Handler when user directly alters end date
  const handleFechaHastaChange = (newDateStr: string) => {
    setIsDuracionCausa(false);
    const parsedStart = parseDateFlexible(formData.fechaDesde);
    const parsedEnd = parseDateFlexible(newDateStr);
    if (parsedStart && parsedEnd) {
      const diff = calculateDaysDiff(parsedStart, parsedEnd);
      if (diff >= 0) {
        setDaysCount(diff);
        setFormData((prev) => ({
          ...prev,
          fechaHasta: newDateStr,
          diasVigencia: diff,
        }));
        return;
      }
    }
    setFormData((prev) => ({
      ...prev,
      fechaHasta: newDateStr,
    }));
  };

  // Toggle Duracion de la Causa
  const handleToggleDuracionCausa = (checked: boolean) => {
    setIsDuracionCausa(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        fechaHasta: 'DURACION DE LA CAUSA',
        diasVigencia: undefined,
      }));
    } else {
      const days = typeof daysCount === 'number' && daysCount > 0 ? daysCount : 90;
      setDaysCount(days);
      const start = parseDateFlexible(formData.fechaDesde) || new Date();
      const end = addDays(start, days);
      setFormData((prev) => ({
        ...prev,
        fechaHasta: formatToDDMMYYYY(end),
        diasVigencia: days,
      }));
    }
  };

  // Computed properties for date pickers and preview
  const startDateForPicker = React.useMemo(() => {
    const d = parseDateFlexible(formData.fechaDesde);
    return d ? formatToInputDate(d) : '';
  }, [formData.fechaDesde]);

  const endDateForPicker = React.useMemo(() => {
    if (isDuracionCausa) return '';
    const d = parseDateFlexible(formData.fechaHasta);
    return d ? formatToInputDate(d) : '';
  }, [formData.fechaHasta, isDuracionCausa]);

  const calculatedEndPreview = React.useMemo(() => {
    if (isDuracionCausa) return null;
    const startDate = parseDateFlexible(formData.fechaDesde);
    const endDate = parseDateFlexible(formData.fechaHasta);
    if (!startDate || !endDate) return null;
    const diff = calculateDaysDiff(startDate, endDate);
    return {
      friendlyText: formatFriendlySpanishDate(endDate),
      daysText: `${diff} ${diff === 1 ? 'día corrido' : 'días corridos'}`,
      diff,
    };
  }, [formData.fechaDesde, formData.fechaHasta, isDuracionCausa]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrors((prev) => ({ ...prev, file: 'Solo se admiten documentos en formato PDF (.pdf)' }));
      return;
    }
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.file;
      return updated;
    });
    setAttachedFile(file);
    setRemoveExistingPdf(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.victima?.trim()) {
      errs.victima = 'El nombre y apellido de la víctima es obligatorio';
    }
    if (!formData.victimario?.trim()) {
      errs.victimario = 'El nombre y apellido del denunciado/victimario es obligatorio';
    }
    if (!formData.tipoMedida?.trim()) {
      errs.tipoMedida = 'Debe indicar el tipo de medida';
    }
    if (!formData.nroOficio?.trim()) {
      errs.nroOficio = 'Indique el N° de Oficio o Expediente';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    setIsSaving(true);
    try {
      const measureToSave: JudicialMeasure = {
        id: formData.id || `med-${Date.now()}`,
        timestamp: formData.timestamp || new Date().toLocaleString(),
        victima: formData.victima?.trim().toUpperCase() || '',
        victimario: formData.victimario?.trim().toUpperCase() || '',
        tipoMedida: formData.tipoMedida || 'Prohibición de acercamiento',
        nroOficio: formData.nroOficio?.trim().toUpperCase() || 'S/N',
        provenienteDe: formData.provenienteDe || 'JDO FLIA',
        fechaDesde: formData.fechaDesde?.trim() || '',
        fechaHasta: isDuracionCausa ? 'DURACION DE LA CAUSA' : (formData.fechaHasta?.trim() || ''),
        diasVigencia: isDuracionCausa ? undefined : (typeof daysCount === 'number' && daysCount >= 0 ? daysCount : undefined),
        medidaReciproca: formData.medidaReciproca === 'Si' ? 'Si' : 'No',
        observaciones: formData.observaciones?.trim(),
        isOfficialRegistry: true,
        lastUpdated: new Date().toLocaleString(),
        driveFolder: driveFolderName.trim() || 'Medidas Judiciales',
      };

      await onSave(measureToSave, attachedFile, driveFolderName.trim() || 'Medidas Judiciales', removeExistingPdf);
      onClose();
    } catch (err: any) {
      console.error('Error al guardar medida judicial:', err);
      setErrors((prev) => ({ ...prev, form: err.message || 'Error al guardar los datos' }));
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingCustomPdf = Boolean(initialMeasure?.hasCustomPdf && !removeExistingPdf);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {mode === 'create' ? 'Cargar Nueva Medida Judicial' : 'Actualizar Datos de la Medida'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'create' 
                  ? 'Registra una nueva medida cautelar y carga su oficio PDF a Google Drive'
                  : 'Modifica los datos del oficio y actualiza o adjunta el documento PDF a Google Drive'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errors.form && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Víctima & Denunciado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Apellido y Nombre de la Víctima *
              </label>
              <input
                type="text"
                value={formData.victima || ''}
                onChange={(e) => setFormData({ ...formData, victima: e.target.value })}
                placeholder="Ej. GARCIA MARIA VALERIA"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.victima ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.victima && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.victima}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                Apellido y Nombres del Denunciado / Victimario *
              </label>
              <input
                type="text"
                value={formData.victimario || ''}
                onChange={(e) => setFormData({ ...formData, victimario: e.target.value })}
                placeholder="Ej. LOPEZ CARLOS ALBERTO"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.victimario ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.victimario && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.victimario}
                </p>
              )}
            </div>
          </div>

          {/* Tipo de Medida & Medida Recíproca */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Tipo de Medida Judicial *
              </label>
              <select
                value={formData.tipoMedida || 'Prohibición de acercamiento'}
                onChange={(e) => setFormData({ ...formData, tipoMedida: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {MEASURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                ¿Medida Recíproca?
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="reciproca"
                    value="No"
                    checked={formData.medidaReciproca !== 'Si'}
                    onChange={() => setFormData({ ...formData, medidaReciproca: 'No' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>No</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="reciproca"
                    value="Si"
                    checked={formData.medidaReciproca === 'Si'}
                    onChange={() => setFormData({ ...formData, medidaReciproca: 'Si' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-purple-600 dark:text-purple-400">Sí (Recíproca)</span>
                </label>
              </div>
            </div>
          </div>

          {/* N° Oficio & Proveniente De */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                N° de Oficio / Causa *
              </label>
              <input
                type="text"
                value={formData.nroOficio || ''}
                onChange={(e) => setFormData({ ...formData, nroOficio: e.target.value })}
                placeholder="Ej. 1422 o EXPTE-2024-89"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.nroOficio ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.nroOficio && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.nroOficio}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Juzgado / Organismo Proveniente
              </label>
              <input
                type="text"
                list="courts-list"
                value={formData.provenienteDe || ''}
                onChange={(e) => setFormData({ ...formData, provenienteDe: e.target.value })}
                placeholder="Ej. JDO FLIA, JUZGADO DE PAZ..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="courts-list">
                {COURTS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: VIGENCIA Y CÁLCULO AUTOMÁTICO DE PLAZO */}
          {/* ========================================================================= */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            
            {/* Header with Title & Duracion de la Causa option */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Vigencia y Plazo de la Medida</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <Calculator className="w-2.5 h-2.5" />
                      Cálculo Automático
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Definí fecha de inicio y cantidad de días para calcular automáticamente el vencimiento.
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <input
                  type="checkbox"
                  checked={isDuracionCausa}
                  onChange={(e) => handleToggleDuracionCausa(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={isDuracionCausa ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>
                  Duración de la causa (sin plazo en días)
                </span>
              </label>
            </div>

            {isDuracionCausa ? (
              /* MODO DURACIÓN DE LA CAUSA */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      A partir de cuándo (Fecha de Inicio / Notificación):
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.fechaDesde || ''}
                        onChange={(e) => handleFechaDesdeChange(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={startDateForPicker}
                        onChange={(e) => handleNativeStartDateSelect(e.target.value)}
                        className="absolute right-2 opacity-60 hover:opacity-100 cursor-pointer w-5 h-5"
                        title="Seleccionar en calendario"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickStartSelect('today')}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStartSelect('yesterday')}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      >
                        Ayer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Fecha de Finalización:
                    </label>
                    <div className="px-3.5 py-2 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs text-blue-800 dark:text-blue-300 font-bold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>DURACION DE LA CAUSA</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                      La medida rige de forma continua mientras dure el trámite del expediente judicial.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO CÁLCULO AUTOMÁTICO POR DÍAS */
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Campo 1: A partir de cuándo (Fecha de Inicio) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        A partir de cuándo (Fecha de inicio):
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">DD/MM/AAAA</span>
                    </label>
                    
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.fechaDesde || ''}
                        onChange={(e) => handleFechaDesdeChange(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      <input
                        type="date"
                        value={startDateForPicker}
                        onChange={(e) => handleNativeStartDateSelect(e.target.value)}
                        className="absolute right-2 opacity-60 hover:opacity-100 cursor-pointer w-5 h-5"
                        title="Seleccionar en calendario"
                      />
                    </div>

                    {/* Botones de selección rápida */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400">Atajo:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickStartSelect('today')}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Hoy ({formatToDDMMYYYY(new Date())})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStartSelect('yesterday')}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      >
                        Ayer
                      </button>
                    </div>
                  </div>

                  {/* Campo 2: Cantidad de Días */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Cantidad de días de vigencia:
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Plazo en días</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          max="3650"
                          value={daysCount}
                          onChange={(e) => handleDaysChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="Ej. 90"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        días corridos
                      </span>
                    </div>

                    {/* Presets de plazos usuales */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {[30, 60, 90, 120, 180, 365].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleDaysChange(preset)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                            daysCount === preset
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          {preset}d{preset === 365 ? ' (1 año)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tarjeta Destacada: Cálculo Automático de Finalización */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 dark:from-emerald-950/40 dark:via-slate-850 dark:to-blue-950/30 rounded-xl border border-emerald-500/30 dark:border-emerald-700/50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Fecha de Finalización Calculada:
                          </span>
                          <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                            {formData.fechaHasta || 'Indique fecha y días'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowManualDateOverride(!showManualDateOverride)}
                      className="text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted cursor-pointer transition-colors"
                    >
                      {showManualDateOverride ? 'Ocultar ajuste manual' : '¿Ajustar fecha manualmente?'}
                    </button>
                  </div>

                  {calculatedEndPreview && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 pl-9 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <p>
                        Finaliza el <strong className="text-slate-900 dark:text-white">{calculatedEndPreview.friendlyText}</strong> (plazo de <strong>{calculatedEndPreview.daysText}</strong>).
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Cálculo automático exacto
                      </span>
                    </div>
                  )}

                  {showManualDateOverride && (
                    <div className="pt-2 mt-2 border-t border-emerald-500/20 dark:border-emerald-800/40 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Modificar manualmente:
                      </span>
                      <div className="relative flex items-center max-w-[160px]">
                        <input
                          type="text"
                          value={formData.fechaHasta || ''}
                          onChange={(e) => handleFechaHastaChange(e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className="w-full pl-2 pr-7 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="date"
                          value={endDateForPicker}
                          onChange={(e) => {
                            const d = parseDateFlexible(e.target.value);
                            if (d) handleFechaHastaChange(formatToDDMMYYYY(d));
                          }}
                          className="absolute right-1 opacity-60 hover:opacity-100 cursor-pointer w-4 h-4"
                          title="Seleccionar en calendario"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 italic">
                        (Al editar manualmente se recalcula la cantidad de días)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION: CARGAR PDF A GOOGLE DRIVE (NUEVA OPCIÓN DE ACTUALIZAR DATOS) */}
          {/* ========================================================================= */}
          <div className="p-4 bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/40 dark:from-slate-800/80 dark:via-slate-850 dark:to-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-3">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Cargar Oficio o Resolución en PDF</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50">
                      Google Drive
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    El archivo se cargará en Google Drive en la carpeta seleccionada para visualizarlo y descargarlo en las búsquedas.
                  </p>
                </div>
              </div>

              {/* Status badge */}
              {driveState?.isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Drive Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Modo Local & Drive
                </span>
              )}
            </div>

            {/* Folder Name & Official Destination in Google Drive */}
            <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-semibold">
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Carpeta destino Google Drive:</span>
                </div>
                <a
                  href={DEFAULT_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-mono text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 hover:underline"
                  title="Abrir carpeta oficial en Google Drive"
                >
                  <span className="truncate max-w-[180px] sm:max-w-[220px]">ID: {DEFAULT_DRIVE_FOLDER_ID}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </div>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80">
                Los archivos PDF subidos se guardarán automáticamente en esta carpeta de Google Drive para su consulta y descarga en las búsquedas.
              </p>
            </div>

            {/* File input (Hidden, triggered by button or drop) */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* Existing File Display (if editing and measure already had a custom PDF) */}
            {hasExistingCustomPdf && !attachedFile && (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 font-bold text-[10px]">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {initialMeasure?.pdfFileName || `Oficio_${initialMeasure?.nroOficio}.pdf`}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>Cargado en: <strong>{initialMeasure?.driveFolder || 'Medidas Judiciales'}</strong></span>
                      {initialMeasure?.pdfFileSize && (
                        <span>• {formatBytes(initialMeasure.pdfFileSize)}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onViewExistingPdf && initialMeasure && (
                    <button
                      type="button"
                      onClick={() => onViewExistingPdf(initialMeasure)}
                      className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Previsualizar PDF actual"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reemplazar por otro archivo PDF"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reemplazar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingPdf(true)}
                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Desvincular PDF de esta medida"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* If user marked existing PDF to be removed */}
            {removeExistingPdf && !attachedFile && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <span>El PDF adjunto se eliminará de este registro al guardar.</span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingPdf(false)}
                  className="text-[11px] font-bold underline cursor-pointer ml-2"
                >
                  Deshacer
                </button>
              </div>
            )}

            {/* Selected New File Display */}
            {attachedFile ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {attachedFile.name}
                      </p>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                        Listo
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300">
                      {formatBytes(attachedFile.size)} • Se cargará en Google Drive / {driveFolderName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    title="Quitar archivo seleccionado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone if no new file is selected */
              (!hasExistingCustomPdf || removeExistingPdf) && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-white/70 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Arrastra el oficio en PDF aquí o <span className="text-blue-600 dark:text-blue-400 underline">haz clic para examinar</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Archivos PDF escaneados o digitales de hasta 50 MB
                    </p>
                  </div>
                </div>
              )
            )}

            {errors.file && (
              <p className="text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.file}
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Observaciones Adicionales (Opcional):
            </label>
            <textarea
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
              placeholder="Detalles sobre domicilios especificados, intervención policial o medidas cautelares complementarias..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              * Al guardar, los datos se registrarán en la base de datos oficial. Si adjuntaste un PDF, se subirá a Google Drive en la carpeta indicada y estará disponible para visualización y descarga directa desde el buscador.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              {initialMeasure && currentUser && (
                <button
                  type="button"
                  onClick={() => setShowWhatsApp(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Enviar datos y oficio por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Compartir por WhatsApp</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando y cargando a Google Drive...</span>
                  </>
                ) : mode === 'create' ? (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Cargar y Registrar Medida</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Datos y Cargar PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>

      {/* WhatsApp Share Modal */}
      {initialMeasure && currentUser && (
        <WhatsAppShareModal
          isOpen={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
          measure={initialMeasure}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
