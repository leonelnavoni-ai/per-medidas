import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  PlusCircle,
  Copy,
  Printer,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  Shield,
  Search,
  Trash2,
  Sparkles,
  UserCheck,
  Building2,
  Car,
  MapPin,
  X,
  BadgeCheck,
  PhoneCall,
  Radio,
  Briefcase,
  Download,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { JudicialMeasure, PoliceMemo, TipoComisionPolicial, UserProfile } from '../types';
import { PoliceLogo } from './PoliceLogo';
import { resolveMeasureLocation } from '../utils/geoUtils';
import { generatePoliceMemoPdfBlob } from '../utils/pdfGenerator';

interface PoliceMemosTabProps {
  measures: JudicialMeasure[];
  currentUser: UserProfile;
  initialMeasure?: JudicialMeasure | null;
  onClearInitialMeasure?: () => void;
}

// 17 Jefaturas Departamentales oficiales de la Policía de Entre Ríos (Victoria predeterminada)
export const DEPARTAMENTALES_PER = [
  'Jefatura Departamental Victoria',
  'Jefatura Departamental Paraná',
  'Jefatura Departamental Concordia',
  'Jefatura Departamental Gualeguaychú',
  'Jefatura Departamental Uruguay',
  'Jefatura Departamental Colón',
  'Jefatura Departamental Gualeguay',
  'Jefatura Departamental Villaguay',
  'Jefatura Departamental La Paz',
  'Jefatura Departamental Diamante',
  'Jefatura Departamental Nogoyá',
  'Jefatura Departamental Federación',
  'Jefatura Departamental Tala',
  'Jefatura Departamental Federal',
  'Jefatura Departamental San Salvador',
  'Jefatura Departamental Feliciano',
  'Jefatura Departamental Islas del Ibicuy',
];

// Jerarquías oficiales de la Policía de Entre Ríos (PER) con Oficial Inspector incluido
export const JERARQUIAS_PER = [
  'Oficial Principal',
  'Oficial Inspector',
  'Oficial Subinspector',
  'Oficial Auxiliar',
  'Oficial Ayudante',
  'Subcomisario',
  'Comisario',
  'Comisario Principal',
  'Comisario Inspector',
  'Comisario Mayor',
  'Suboficial Mayor',
  'Suboficial Principal',
  'Sargento Ayudante',
  'Sargento 1°',
  'Sargento',
  'Cabo 1°',
  'Cabo',
  'Agente',
];

// Plantillas alineadas con el procedimiento policial de Entre Ríos
const MEMO_TEMPLATES: Record<
  TipoComisionPolicial,
  {
    titulo: string;
    motivo: string;
    relatoSugerido: (v: string, d: string, dom: string, juzg?: string, ofi?: string) => string;
    resultadoSugerido: string;
  }
> = {
  llamado_comisaria: {
    titulo: 'Comisión Policial por Llamado a Dependencia',
    motivo: 'Intervención y constatación en domicilio a requerimiento de llamado telefónico o comparecencia en guardia de la dependencia policial.',
    relatoSugerido: (v, d, dom, juzg, ofi) =>
      `A requerimiento de la guardia de prevención por llamado telefónico recibido en la dependencia policial, la dotación se constituyó en forma inmediata en calle ${dom || 'fijada en autos'}. En el lugar, se procedió a entrevistar a la ciudadana ${v || 'VÍCTIMA'}, constatándose el estado de situación en el lugar respecto de ${d || 'el denunciado'}${ofi ? ` en relación a la medida cautelar ordenada mediante Oficio N° ${ofi} emanado del ${juzg}` : ''}. Se verificó que las inmediaciones se hallan en orden y el perímetro despejado, brindándole contención y reiterando números directos de emergencia de la dependencia.`,
    resultadoSugerido: 'Sin novedad',
  },
  comision_911: {
    titulo: 'Comisión de Móvil por Alerta Radial 911',
    motivo: 'Intervención urgente irradiada por Sala de Comando Radioeléctrico 911.',
    relatoSugerido: (v, d, dom, juzg, ofi) =>
      `Atento a modulación radial de la Sala de Comando y Tráfico del 911 en código preventivo, el móvil policial arribó con prontitud al domicilio de calle ${dom || 'fijada en autos'}. En el lugar, se procedió a efectuar una inspección ocular perimetral de seguridad, manteniendo diálogo con la requirente ${v || 'VÍCTIMA'}${ofi ? ` (autos con intervención judicial mediante Oficio N° ${ofi})` : ''}. Se constató el normal desarrollo vecinal, no observándose anomalías ni transgresión alguna en el sector.`,
    resultadoSugerido: 'Sin novedad',
  },
  otra_comision: {
    titulo: 'Otra Comisión Policial Especial',
    motivo: 'Comisión especial derivada de directivas operativas o servicio de prevención ordinario.',
    relatoSugerido: (v, d, dom, juzg, ofi) =>
      `En cumplimiento de las directivas impartidas por la superioridad en el marco del servicio ordinario de patrulla y prevención, personal policial se constituyó en calle ${dom || 'indicada'}, procediéndose a efectuar las constataciones de rigor en relación a ${v ? `la ciudadana ${v}` : 'la zona asignada'}${ofi ? ` y medida judicial Oficio N° ${ofi}` : ''}. No se registraron incidentes ni presencias de personas no autorizadas.`,
    resultadoSugerido: 'Sin novedad',
  },
  verificacion_domicilio: {
    titulo: 'Verificación de Domicilio y Recorrida Preventiva',
    motivo: 'Control preventivo de cumplimiento de medidas cautelares.',
    relatoSugerido: (v, _d, dom) =>
      `Constituidos en el domicilio fijado en autos, sito en calle ${dom || 'fijada en autos'}, se procedió a efectuar recorrida perimetral preventiva en un radio de seguridad. Seguidamente se mantuvo entrevista con la ciudadana ${v || 'VÍCTIMA'}, quien manifestó encontrarse en buen estado psicofísico.`,
    resultadoSugerido: 'Sin novedad',
  },
  incumplimiento_perimetral: {
    titulo: 'Constatación de Incumplimiento de Medida Cautelar',
    motivo: 'Verificación de presunta infracción a la orden judicial de prohibición de acercamiento.',
    relatoSugerido: (_v, d, dom) =>
      `La dotación se comisionó en forma urgente a calle ${dom || 'fijada en autos'}. En el lugar, se constató la presencia del ciudadano ${d || 'DENUNCIADO'}. Se procedió a su inmediata interceptación e identificación.`,
    resultadoSugerido: 'Sin novedad',
  },
  notificacion_judicial: {
    titulo: 'Notificación de Mandamiento Judicial / Cédula',
    motivo: 'Notificación formal de resolución judicial.',
    relatoSugerido: () => `Se procedió a notificar formalmente a las partes de los alcances y prohibiciones impuestas.`,
    resultadoSugerido: 'Sin novedad',
  },
  exclusion_hogar: {
    titulo: 'Exclusión de Hogar con Auxilio de la Fuerza Pública',
    motivo: 'Ejecución de orden judicial de retiro del demandado de la vivienda familiar.',
    relatoSugerido: () => `Se intimó al denunciado al retiro pacífico del inmueble.`,
    resultadoSugerido: 'Sin novedad',
  },
  asistencia_911: {
    titulo: 'Asistencia Urgente por Llamado al 911 / Sala de Tráfico',
    motivo: 'Intervención inmediata por reporte de emergencia.',
    relatoSugerido: () => `El móvil policial arribó en código de emergencia al lugar.`,
    resultadoSugerido: 'Sin novedad',
  },
  entrevista_victima: {
    titulo: 'Entrevista y Contención a la Víctima',
    motivo: 'Relevamiento socioambiental y constatación de cumplimiento de pautas cautelares.',
    relatoSugerido: () => `Personal policial se hizo presente a fin de realizar entrevista pormenorizada...`,
    resultadoSugerido: 'Sin novedad',
  },
  recorrida_preventiva: {
    titulo: 'Recorrida Preventiva General',
    motivo: 'Patrullaje preventivo de rutina en cuadrícula.',
    relatoSugerido: () => `Durante el servicio de guardia ordinaria, la dotación efectuó sucesivas pasadas preventivas...`,
    resultadoSugerido: 'Sin novedad',
  },
  otro: {
    titulo: 'Otra Comisión Policial Especial',
    motivo: 'Comisión especial derivada de requerimiento policial u operativo.',
    relatoSugerido: () => `La dotación policial se constituyó en el lugar para dar cumplimiento a directivas específicas...`,
    resultadoSugerido: 'Sin novedad',
  },
};

export const PoliceMemosTab: React.FC<PoliceMemosTabProps> = ({
  currentUser,
  initialMeasure,
  onClearInitialMeasure,
}) => {
  // Lista de memos almacenada EXCLUSIVAMENTE en el servidor policial (sin persistencia en localStorage)
  const [savedMemos, setSavedMemos] = useState<PoliceMemo[]>([]);
  const [loadingMemos, setLoadingMemos] = useState<boolean>(true);
  const [savingMemo, setSavingMemo] = useState<boolean>(false);

  // Limpiar cualquier residuo previo de caché de memos en localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('police_app_memos_cache');
    } catch {}
  }, []);

  // Función para consultar memorándums en el servidor policial aplicando RBAC
  const loadMemosFromServer = async () => {
    try {
      setLoadingMemos(true);
      const queryParams = new URLSearchParams({
        userId: currentUser?.id || '',
        role: currentUser?.role || 'viewer',
        legajo: currentUser?.badgeNumber || '',
        name: currentUser?.name || '',
      });
      const res = await fetch(`/api/memos?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSavedMemos(data);
        }
      }
    } catch (err) {
      console.error('Error al consultar memorándums en el servidor policial:', err);
    } finally {
      setLoadingMemos(false);
    }
  };

  useEffect(() => {
    loadMemosFromServer();
  }, [currentUser]);

  // Vista activa: 'create' o 'history'
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');

  // JEFATURA DEPARTAMENTAL FIJADA (Persistente)
  const [departamental, setDepartamental] = useState<string>(() => {
    const saved = localStorage.getItem('per_fixed_departamental');
    if (saved && saved !== 'Jefatura Departamental Paraná') return saved;
    return 'Jefatura Departamental Victoria';
  });

  // DEPENDENCIA / COMISARÍA FIJADA (Persistente)
  const [dependencia, setDependencia] = useState<string>(() => {
    return (
      localStorage.getItem('per_fixed_dependencia') ||
      currentUser.department ||
      'División Minoridad y Violencia Familiar'
    );
  });

  // Funcionario interviniente FIJADO (jerarquía, nombre y legajo que persisten)
  const [jerarquiaFuncionario, setJerarquiaFuncionario] = useState<string>(() => {
    return localStorage.getItem('per_fixed_jerarquia') || 'Oficial Inspector';
  });

  const [nombreFuncionario, setNombreFuncionario] = useState<string>(() => {
    return (
      localStorage.getItem('per_fixed_nombre') ||
      currentUser.name ||
      'Navoni Leonel'
    );
  });

  const [legajoFuncionario, setLegajoFuncionario] = useState<string>(() => {
    return (
      localStorage.getItem('per_fixed_legajo') ||
      currentUser.badgeNumber ||
      '16.482'
    );
  });

  // Ciudad predeterminada (Persistente)
  const [ciudadComision, setCiudadComision] = useState<string>(() => {
    const saved = localStorage.getItem('per_fixed_ciudad');
    if (saved && saved !== 'Paraná' && saved !== 'Concordia') return saved;
    return 'Victoria';
  });

  // Móvil policial predeterminado (Persistente)
  const [movilPolicial, setMovilPolicial] = useState<string>(() => {
    return localStorage.getItem('per_fixed_movil') || 'Móvil Policial JP-412';
  });

  // Guardar cambios fijos en localStorage cuando se editan
  useEffect(() => {
    localStorage.setItem('per_fixed_departamental', departamental);
  }, [departamental]);

  useEffect(() => {
    localStorage.setItem('per_fixed_dependencia', dependencia);
  }, [dependencia]);

  useEffect(() => {
    localStorage.setItem('per_fixed_jerarquia', jerarquiaFuncionario);
  }, [jerarquiaFuncionario]);

  useEffect(() => {
    localStorage.setItem('per_fixed_nombre', nombreFuncionario);
  }, [nombreFuncionario]);

  useEffect(() => {
    localStorage.setItem('per_fixed_legajo', legajoFuncionario);
  }, [legajoFuncionario]);

  useEffect(() => {
    localStorage.setItem('per_fixed_ciudad', ciudadComision);
  }, [ciudadComision]);

  useEffect(() => {
    localStorage.setItem('per_fixed_movil', movilPolicial);
  }, [movilPolicial]);

  // Campos del formulario
  const [numeroMemo, setNumeroMemo] = useState<string>(() => {
    const year = new Date().getFullYear();
    const count = savedMemos.length + 1;
    const padded = String(count).padStart(3, '0');
    return `MEMO N° ${padded}/${year} - D.M.V.F.`;
  });

  const [fechaHora, setFechaHora] = useState<string>(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  // Tipo de comisión por defecto: 'llamado_comisaria'
  const [tipoComision, setTipoComision] = useState<TipoComisionPolicial>('llamado_comisaria');

  const [victima, setVictima] = useState(initialMeasure?.victima || '');
  const [victimario, setVictimario] = useState(initialMeasure?.victimario || '');
  const [nroOficio, setNroOficio] = useState(initialMeasure?.nroOficio || '');
  const [juzgadoInterviniente, setJuzgadoInterviniente] = useState(initialMeasure?.provenienteDe || '');
  const [domicilioComision, setDomicilioComision] = useState(() => {
    if (initialMeasure) {
      const loc = resolveMeasureLocation(initialMeasure);
      return loc.direccion;
    }
    return '';
  });

  const [motivoComision, setMotivoComision] = useState(
    MEMO_TEMPLATES.llamado_comisaria.motivo
  );
  const [relatoHechos, setRelatoHechos] = useState(() => {
    const tmpl = MEMO_TEMPLATES.llamado_comisaria;
    return tmpl.relatoSugerido(
      initialMeasure?.victima || '',
      initialMeasure?.victimario || '',
      initialMeasure ? resolveMeasureLocation(initialMeasure).direccion : '',
      initialMeasure?.provenienteDe || '',
      initialMeasure?.nroOficio || ''
    );
  });

  // Resultado predeterminado: "Sin novedad"
  const [resultadoIntervencion, setResultadoIntervencion] = useState<string>('Sin novedad');
  const [observaciones, setObservaciones] = useState('');

  // UI status helpers
  const [copiedGuardBook, setCopiedGuardBook] = useState(false);
  const [copiedMemoText, setCopiedMemoText] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [previewTab, setPreviewTab] = useState<'official' | 'whatsapp'>('official');
  const [searchHistoryTerm, setSearchHistoryTerm] = useState('');

  // Sincronizar datos si proviene de una medida seleccionada en tarjeta o mapa
  useEffect(() => {
    if (initialMeasure) {
      setVictima(initialMeasure.victima);
      setVictimario(initialMeasure.victimario);
      setNroOficio(initialMeasure.nroOficio);
      setJuzgadoInterviniente(initialMeasure.provenienteDe);
      const loc = resolveMeasureLocation(initialMeasure);
      setDomicilioComision(loc.direccion);
      if (loc.ciudad) {
        setCiudadComision(loc.ciudad);
        // Si la medida indica otra ciudad, sugerir la Departamental correspondiente
        const matchingDep = DEPARTAMENTALES_PER.find((d) =>
          d.toLowerCase().includes(loc.ciudad.toLowerCase())
        );
        if (matchingDep) {
          setDepartamental(matchingDep);
        }
      }

      const tmpl = MEMO_TEMPLATES[tipoComision] || MEMO_TEMPLATES.llamado_comisaria;
      setRelatoHechos(
        tmpl.relatoSugerido(
          initialMeasure.victima,
          initialMeasure.victimario,
          loc.direccion,
          initialMeasure.provenienteDe,
          initialMeasure.nroOficio
        )
      );
      setMotivoComision(tmpl.motivo);
      setResultadoIntervencion('Sin novedad');
      setActiveSubTab('create');
    }
  }, [initialMeasure]);

  // Manejar cambio de tipo de plantilla
  const handleChangeTemplate = (newTipo: TipoComisionPolicial) => {
    setTipoComision(newTipo);
    const tmpl = MEMO_TEMPLATES[newTipo] || MEMO_TEMPLATES.llamado_comisaria;
    setMotivoComision(tmpl.motivo);
    setResultadoIntervencion(tmpl.resultadoSugerido || 'Sin novedad');
    setRelatoHechos(
      tmpl.relatoSugerido(
        victima,
        victimario,
        domicilioComision || 'domicilio fijado',
        juzgadoInterviniente || 'Juzgado interviniente',
        nroOficio || 'S/N'
      )
    );
  };

  // Texto para Libro de Guardia / SIGEP Policial
  const generateGuardBookText = () => {
    const formattedDate = new Date(fechaHora).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = new Date(fechaHora).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `--- POLICÍA DE ENTRE RÍOS - ASIENTO DE LIBRO DE GUARDIA ---
FECHA/HORA: ${formattedDate} a las ${formattedTime} Hs.
JEFATURA: ${departamental}
DEPENDENCIA: ${dependencia}
DOTACIÓN: ${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Leg. ${legajoFuncionario})` : ''} - Móvil: ${movilPolicial}
COMISIÓN: ${MEMO_TEMPLATES[tipoComision]?.titulo || tipoComision}
AUTOS / REF: "${victima || 'VÍCTIMA'} C/ ${victimario || 'DENUNCIADO'}" ${nroOficio ? `- Oficio N° ${nroOficio}` : ''} ${juzgadoInterviniente ? `(${juzgadoInterviniente})` : ''}
LUGAR: ${domicilioComision || 'No especificado'}, ${ciudadComision}
NOVEDAD CIRCUNSTANCIADA: ${relatoHechos}
RESULTADO: ${resultadoIntervencion || 'Sin novedad'}
${observaciones ? `OBSERVACIONES: ${observaciones}\n` : ''}FUNCIONARIO INTERVINIENTE: ${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Legajo ${legajoFuncionario})` : ''}`;
  };

  // Texto para Memorándum Oficial PER (actualiza dinámicamente la Departamental seleccionada)
  const generateOfficialMemoText = () => {
    const formattedDate = new Date(fechaHora).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = new Date(fechaHora).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `POLICÍA DE ENTRE RÍOS
${departamental.toUpperCase()}
${dependencia.toUpperCase()}

${numeroMemo}

LUGAR Y FECHA: ${ciudadComision}, Entre Ríos, ${formattedDate} - ${formattedTime} Hs.
A LA SUPERIORIDAD: Sr. Jefe de Dependencia / División
DEL FUNCIONARIO ACTUANTE: ${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Leg. N° ${legajoFuncionario})` : ''} (A cargo de ${movilPolicial})

OBJETO: PARTE POLICIAL DE COMISIÓN
${victima ? `REF: "${victima} C/ ${victimario || 'DENUNCIADO'}"` : ''}
${nroOficio ? `OFICIO JUDICIAL N°: ${nroOficio} - ${juzgadoInterviniente}` : ''}

1. LUGAR DE LA COMISIÓN:
Se comisionó al domicilio sito en calle ${domicilioComision || 'domicilio fijado'}, localidad de ${ciudadComision}, provincia de Entre Ríos.

2. MÓVIL Y FUNCIONARIO INTERVINIENTE:
Móvil Policial: ${movilPolicial}
Funcionario a cargo: ${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Legajo N° ${legajoFuncionario})` : ''}

3. MOTIVO DE LA INTERVENCIÓN:
${motivoComision}

4. RELATO CIRCUNSTANCIADO DE LA COMISIÓN:
${relatoHechos}

5. RESULTADO DE LA INTERVENCIÓN:
${resultadoIntervencion || 'Sin novedad'}
${observaciones ? `\n6. OBSERVACIONES COMPLEMENTARIAS:\n${observaciones}` : ''}

                                _________________________________________
                                     ${jerarquiaFuncionario} ${nombreFuncionario}
                                    ${legajoFuncionario ? `Legajo Policial N° ${legajoFuncionario}\n` : ''}                                Funcionario a Cargo de la Comisión
                                ${dependencia} - ${departamental}`;
  };

  // Descargar archivo PDF (.pdf) directo con Departamental actualizada
  const handleDownloadPdf = () => {
    try {
      const pdfBlob = generatePoliceMemoPdfBlob({
        numeroMemo,
        fechaHora: new Date(fechaHora).toLocaleString('es-AR'),
        departamental,
        dependencia,
        oficialACargo: `${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Leg. ${legajoFuncionario})` : ''}`,
        movilPolicial,
        victima,
        victimario,
        nroOficio,
        juzgadoInterviniente,
        domicilioComision,
        ciudadComision,
        tipoComisionTitulo: MEMO_TEMPLATES[tipoComision]?.titulo || 'Parte de Comisión',
        motivoComision,
        relatoHechos,
        resultadoIntervencion: resultadoIntervencion || 'Sin novedad',
        observaciones,
        jerarquia: jerarquiaFuncionario,
        nombre: nombreFuncionario,
        legajo: legajoFuncionario,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNumber = numeroMemo.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanNumber}_${departamental.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('Error al generar archivo PDF. Puede usar el botón Imprimir / Guardar PDF.');
    }
  };

  // Acciones de portapapeles
  const handleCopyGuardBook = () => {
    navigator.clipboard.writeText(generateGuardBookText());
    setCopiedGuardBook(true);
    setTimeout(() => setCopiedGuardBook(false), 2000);
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(generateOfficialMemoText());
    setCopiedMemoText(true);
    setTimeout(() => setCopiedMemoText(false), 2000);
  };

  // Formato resumido para WhatsApp (distribución ultra concisa y directa)
  const generateWhatsAppMemoText = (customData?: {
    numeroMemo?: string;
    departamental?: string;
    dependencia?: string;
    fechaHora?: string;
    movilPolicial?: string;
    jerarquia?: string;
    nombre?: string;
    legajo?: string;
    domicilioComision?: string;
    ciudadComision?: string;
    tipoComision?: TipoComisionPolicial;
    victima?: string;
    victimario?: string;
    nroOficio?: string;
    relatoHechos?: string;
    resultadoIntervencion?: string;
    observaciones?: string;
  }) => {
    const num = customData?.numeroMemo || numeroMemo;
    const dep = customData?.dependencia || dependencia;
    const deptal = customData?.departamental || departamental;
    const fHora = customData?.fechaHora || fechaHora;
    const movil = customData?.movilPolicial || movilPolicial;
    const jer = customData?.jerarquia || jerarquiaFuncionario;
    const nom = customData?.nombre || nombreFuncionario;
    const leg = customData?.legajo !== undefined ? customData.legajo : legajoFuncionario;
    const dom = customData?.domicilioComision !== undefined ? customData.domicilioComision : domicilioComision;
    const ciu = customData?.ciudadComision !== undefined ? customData.ciudadComision : ciudadComision;
    const tipo = customData?.tipoComision || tipoComision;
    const vic = customData?.victima !== undefined ? customData.victima : victima;
    const victo = customData?.victimario !== undefined ? customData.victimario : victimario;
    const oficio = customData?.nroOficio !== undefined ? customData.nroOficio : nroOficio;
    const relato = customData?.relatoHechos !== undefined ? customData.relatoHechos : relatoHechos;
    const resultado = customData?.resultadoIntervencion !== undefined ? customData.resultadoIntervencion : (resultadoIntervencion || 'Sin novedad');
    const obs = customData?.observaciones !== undefined ? customData.observaciones : observaciones;

    const d = new Date(fHora);
    const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const tipoLabel =
      tipo === 'llamado_comisaria'
        ? 'Llamado a Dependencia'
        : tipo === 'comision_911'
        ? 'Comisión por 911'
        : tipo === 'otra_comision'
        ? 'Otra comisión'
        : MEMO_TEMPLATES[tipo]?.titulo || 'Comisión Policial';

    // En "Lugar" va la dirección exacta de la comisión
    const dirLugar = dom?.trim()
      ? `${dom.trim()}${ciu && !dom.toLowerCase().includes(ciu.toLowerCase()) ? `, ${ciu}` : ''}`
      : (ciu || 'Dirección no consignada');

    const cleanRelato = relato
      ? relato.replace(/\r\n/g, ' ').replace(/\n+/g, ' ').trim()
      : 'Sin novedad.';

    const lines: string[] = [
      `🚨 *PARTE DE COMISIÓN* (${num})`,
      `🏛️ *Dependencia:* ${dep} (${deptal})`,
      `🗓️ *Fecha:* ${fecha} - ${hora} Hs.`,
      `🚔 *Móvil/Dotación:* ${movil} | ${jer} ${nom}${leg ? ` (Leg. ${leg})` : ''}`,
      `📍 *Lugar:* ${dirLugar}`,
      `🎯 *Motivo:* ${tipoLabel}`,
    ];

    if (vic || victo || oficio) {
      lines.push(
        `⚖️ *Autos:* ${vic || 'S/D'} c/ ${victo || 'S/D'}${oficio ? ` | Of. ${oficio}` : ''}`
      );
    }

    lines.push(`📝 *Novedad:* ${cleanRelato}`);
    lines.push(`✅ *Resultado:* ${resultado || 'Sin novedad'}`);

    if (obs && obs.trim()) {
      lines.push(`📌 *Obs:* ${obs.trim()}`);
    }

    return lines.join('\n');
  };

  // Copiar formato resumido para WhatsApp
  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(generateWhatsAppMemoText());
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = () => {
    const text = generateWhatsAppMemoText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Imprimir / Guardar como PDF del navegador
  const handlePrintMemo = () => {
    window.print();
  };

  // Guardar memo exclusivamente en servidor policial centralizado
  const handleSaveMemo = async () => {
    if (!relatoHechos.trim()) {
      alert('Por favor complete el relato de la comisión.');
      return;
    }

    const newMemo: PoliceMemo = {
      id: `memo-${Date.now()}`,
      numeroMemo,
      fechaHora,
      dependencia,
      jefatura: departamental,
      tipoComision,
      measureId: initialMeasure?.id,
      nroOficio,
      victima: victima || 'No especificada',
      victimario: victimario || 'No especificado',
      domicilioComision: domicilioComision || 'No especificado',
      ciudadComision,
      juzgadoInterviniente,
      movilPolicial,
      oficialACargo: `${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Leg. ${legajoFuncionario})` : ''}`,
      jerarquia: jerarquiaFuncionario,
      legajo: legajoFuncionario,
      motivoComision,
      relatoHechos,
      resultadoIntervencion: resultadoIntervencion || 'Sin novedad',
      observaciones,
      creadoPor: `${jerarquiaFuncionario} ${nombreFuncionario}`,
      creadoPorId: currentUser?.id,
      creadoPorLegajo: currentUser?.badgeNumber || legajoFuncionario,
      creadoPorRole: currentUser?.role,
      createdAt: new Date().toISOString(),
    };

    setSavingMemo(true);
    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemo),
      });

      if (res.ok) {
        setSavedMemos((prev) => [newMemo, ...prev]);
        const year = new Date().getFullYear();
        const count = savedMemos.length + 2;
        setNumeroMemo(`MEMO N° ${String(count).padStart(3, '0')}/${year} - D.M.V.F.`);
        alert('¡Memorándum policial guardado correctamente en el servidor central!');
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Error al guardar en el servidor: ${errJson.error || 'No se pudo registrar'}`);
      }
    } catch (err: any) {
      console.error('Error al guardar memo en servidor:', err);
      alert('Error de conexión con el servidor policial al guardar el memorándum.');
    } finally {
      setSavingMemo(false);
    }
  };

  // Eliminar memo de historial (controlado por permisos de creador y administradores)
  const handleDeleteMemo = async (id: string) => {
    if (confirm('¿Desea eliminar este memorándum del registro del servidor policial?')) {
      try {
        const queryParams = new URLSearchParams({
          userId: currentUser?.id || '',
          role: currentUser?.role || 'viewer',
        });
        const res = await fetch(`/api/memos/${id}?${queryParams.toString()}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setSavedMemos((prev) => prev.filter((m) => m.id !== id));
        } else {
          const errJson = await res.json().catch(() => ({}));
          alert(errJson.error || 'No se pudo eliminar el memorándum en el servidor.');
        }
      } catch (err) {
        console.error('Error al eliminar memo en servidor:', err);
        alert('Error de conexión al eliminar del servidor policial.');
      }
    }
  };

  // Role-Based Access Control (RBAC): Administradores ven todos los memos; oficiales ven los que ellos registraron
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const userVisibleMemos = useMemo(() => {
    if (isAdmin) return savedMemos;

    const myId = currentUser.id;
    const myLegajo = currentUser.badgeNumber ? currentUser.badgeNumber.replace(/\D/g, '') : '';
    const myName = currentUser.name ? currentUser.name.trim().toLowerCase() : '';

    return savedMemos.filter((m) => {
      // Coincidencia por ID único del usuario
      if (m.creadoPorId && myId && m.creadoPorId === myId) return true;
      // Coincidencia por legajo policial
      if (m.creadoPorLegajo && myLegajo && m.creadoPorLegajo.replace(/\D/g, '').includes(myLegajo)) return true;
      if (m.legajo && myLegajo && m.legajo.replace(/\D/g, '').includes(myLegajo)) return true;
      // Coincidencia por nombre completo del funcionario
      if (m.creadoPor && myName && m.creadoPor.toLowerCase().includes(myName)) return true;
      // Memos creados en la misma sesión/dispositivo sin ID explícito
      if (!m.creadoPorId && !m.creadoPorLegajo) return true;
      return false;
    });
  }, [savedMemos, currentUser, isAdmin]);

  // Filtrado de historial visible con término de búsqueda
  const filteredSavedMemos = useMemo(() => {
    if (!searchHistoryTerm.trim()) return userVisibleMemos;
    const q = searchHistoryTerm.toLowerCase();
    return userVisibleMemos.filter(
      (m) =>
        m.numeroMemo.toLowerCase().includes(q) ||
        m.victima.toLowerCase().includes(q) ||
        m.victimario.toLowerCase().includes(q) ||
        m.domicilioComision.toLowerCase().includes(q) ||
        (m.jefatura && m.jefatura.toLowerCase().includes(q)) ||
        (m.nroOficio && m.nroOficio.toLowerCase().includes(q)) ||
        (m.creadoPor && m.creadoPor.toLowerCase().includes(q))
    );
  }, [userVisibleMemos, searchHistoryTerm]);

  return (
    <div className="space-y-4">
      {/* Barra superior con navegación entre Crear e Historial */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Memos y Partes Policiales de Comisión
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Policía de Entre Ríos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generador oficial de partes con actualización inmediata de Departamental en PDF e impresión.
              </p>
            </div>
          </div>

          {/* Subtabs switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('create')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'create'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nuevo Memo</span>
            </button>

            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Registro de Memos ({savedMemos.length})</span>
            </button>
          </div>
        </div>

        {/* Notificación de precarga si viene de una medida judicial */}
        {initialMeasure && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Datos precargados de la medida: <strong>{initialMeasure.victima}</strong> c/{' '}
                <strong>{initialMeasure.victimario}</strong> (Oficio N° {initialMeasure.nroOficio})
              </span>
            </div>
            {onClearInitialMeasure && (
              <button
                type="button"
                onClick={() => {
                  onClearInitialMeasure();
                  setVictima('');
                  setVictimario('');
                  setNroOficio('');
                  setJuzgadoInterviniente('');
                  setDomicilioComision('');
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Limpiar datos</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* SUBTAB 1: CREAR MEMO */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Formulario Izquierda (7 columnas) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. SECCIÓN FIJADA: DEPARTAMENTAL, DEPENDENCIA, FUNCIONARIO INTERVINIENTE, CIUDAD Y MÓVIL */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Departamental, Dependencia y Funcionario (Fijo / Predeterminado)
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Fijado en PDF y Memos</span>
                </span>
              </div>

              {/* JEFATURA DEPARTAMENTAL Y DEPENDENCIA (Actualizan el PDF inmediatamente) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Jefatura Departamental (Entre Ríos):</span>
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      Actualiza el PDF
                    </span>
                  </div>
                  <select
                    value={departamental}
                    onChange={(e) => setDepartamental(e.target.value)}
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                  >
                    {DEPARTAMENTALES_PER.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Dependencia / Comisaría / División:
                  </label>
                  <input
                    type="text"
                    value={dependencia}
                    onChange={(e) => setDependencia(e.target.value)}
                    placeholder="Ej: División Minoridad y Violencia Familiar"
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Jerarquía con Oficial Inspector, Nombre y Legajo fijados */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-blue-100/60 dark:border-slate-800/80">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jerarquía Policial:
                  </label>
                  <select
                    value={jerarquiaFuncionario}
                    onChange={(e) => setJerarquiaFuncionario(e.target.value)}
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                  >
                    {JERARQUIAS_PER.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Apellido y Nombres:
                  </label>
                  <input
                    type="text"
                    value={nombreFuncionario}
                    onChange={(e) => setNombreFuncionario(e.target.value)}
                    placeholder="Ej: Navoni Leonel"
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Legajo Policial:
                  </label>
                  <input
                    type="text"
                    value={legajoFuncionario}
                    onChange={(e) => setLegajoFuncionario(e.target.value)}
                    placeholder="Ej: 16.482"
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Ciudad y Móvil predeterminados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-blue-100/60 dark:border-slate-800/80">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span>Ciudad / Localidad:</span>
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      Predeterminada
                    </span>
                  </div>
                  <input
                    type="text"
                    value={ciudadComision}
                    onChange={(e) => setCiudadComision(e.target.value)}
                    placeholder="Victoria"
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Car className="w-3 h-3 text-blue-500" />
                      <span>Móvil Policial:</span>
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      Predeterminado
                    </span>
                  </div>
                  <input
                    type="text"
                    value={movilPolicial}
                    onChange={(e) => setMovilPolicial(e.target.value)}
                    placeholder="Móvil Policial JP-412"
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. TIPO DE COMISIÓN POLICIAL: LAS 3 OPCIONES SOLICITADAS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Tipo de Comisión Policial
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Selecciona la vía de comisionamiento
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    [
                      'llamado_comisaria',
                      'Llamado a Dependencia',
                      'Llamada o comparecencia en guardia',
                      PhoneCall,
                    ],
                    [
                      'comision_911',
                      'Comisión por 911',
                      'Alerta radial de Sala de Comando 911',
                      Radio,
                    ],
                    [
                      'otra_comision',
                      'Otra comisión',
                      'Operativo o directiva especial',
                      Briefcase,
                    ],
                  ] as const
                ).map(([key, label, desc, IconComponent]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChangeTemplate(key)}
                    className={`p-3 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between gap-2 ${
                      tipoComision === key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 ${
                          tipoComision === key ? 'text-white' : 'text-blue-500'
                        }`}
                      />
                      <span className="font-bold text-xs">{label}</span>
                    </div>
                    <span
                      className={`text-[10.5px] leading-tight ${
                        tipoComision === key
                          ? 'text-blue-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. DATOS DE LA COMISIÓN / PERSONAS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
                Datos de la Comisión y Personas Intervinientes
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Número de Memorándum / Parte:
                  </label>
                  <input
                    type="text"
                    value={numeroMemo}
                    onChange={(e) => setNumeroMemo(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Fecha y Hora:
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaHora}
                    onChange={(e) => setFechaHora(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Víctima / Denunciante:
                  </label>
                  <input
                    type="text"
                    value={victima}
                    onChange={(e) => setVictima(e.target.value)}
                    placeholder="Apellido y Nombres de la víctima"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Denunciado / Demandado:
                  </label>
                  <input
                    type="text"
                    value={victimario}
                    onChange={(e) => setVictimario(e.target.value)}
                    placeholder="Apellido y Nombres del denunciado"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Lugar (Dirección de la Comisión):
                  </label>
                  <input
                    type="text"
                    value={domicilioComision}
                    onChange={(e) => setDomicilioComision(e.target.value)}
                    placeholder="Dirección exacta: Calle, altura, barrio o esquina"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Oficio N° y Juzgado:
                  </label>
                  <input
                    type="text"
                    value={nroOficio ? `Oficio N° ${nroOficio} ${juzgadoInterviniente ? `(${juzgadoInterviniente})` : ''}` : ''}
                    onChange={(e) => setNroOficio(e.target.value)}
                    placeholder="Oficio N° 1086 (Juzgado de Familia N° 1)"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. NOVEDAD CIRCUNSTANCIADA Y RESULTADO (SIN NOVEDAD PREDETERMINADO) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Novedad de la Comisión (Relato Circunstanciado)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const tmpl = MEMO_TEMPLATES[tipoComision] || MEMO_TEMPLATES.llamado_comisaria;
                    setRelatoHechos(
                      tmpl.relatoSugerido(
                        victima,
                        victimario,
                        domicilioComision || 'domicilio fijado',
                        juzgadoInterviniente || 'Juzgado interviniente',
                        nroOficio || 'S/N'
                      )
                    );
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Cargar texto sugerido</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Relato Pormenorizado de lo Acontecido:
                </label>
                <textarea
                  rows={6}
                  value={relatoHechos}
                  onChange={(e) => setRelatoHechos(e.target.value)}
                  placeholder="Detalle exactamente lo acontecido al arribo del funcionario policial, personas entrevistadas, condiciones observadas y medidas preventivas adoptadas..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Resultado / Estado de Situación:
                  </label>
                  <button
                    type="button"
                    onClick={() => setResultadoIntervencion('Sin novedad')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Fijar "Sin novedad"</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={resultadoIntervencion}
                  onChange={(e) => setResultadoIntervencion(e.target.value)}
                  placeholder="Sin novedad"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Observaciones Complementarias (Opcional):
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Datos adicionales relevantes, testigos o notas del funcionario..."
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* BOTONES DE ACCIÓN RÁPIDA: GUARDAR, PDF, IMPRIMIR, LIBRO DE GUARDIA Y WHATSAPP */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSaveMemo}
                disabled={savingMemo}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {savingMemo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{savingMemo ? 'Guardando en servidor...' : 'Guardar Memo'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Descargar documento en formato PDF con la Departamental seleccionada"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={handlePrintMemo}
                className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir diálogo de impresión o Guardar como PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={handleCopyGuardBook}
                className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar texto formateado listo para pegar en el libro de guardia policial"
              >
                {copiedGuardBook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGuardBook ? '¡Copiado Guardia!' : 'Libro Guardia'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Copiar memo resumido con formato óptimo para WhatsApp"
              >
                {copiedWhatsApp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWhatsApp ? '¡Copiado para WhatsApp!' : 'Copiar para WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Abrir WhatsApp para enviar este memo resumido"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>

          </div>

          {/* VISTA PREVIA OFICIAL Y WHATSAPP A LA DERECHA (5 columnas) */}
          <div className="lg:col-span-5 space-y-3 sticky top-16">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewTab('official')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                    previewTab === 'official'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documento Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('whatsapp')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                    previewTab === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Resumen WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {previewTab === 'official' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      title="Descargar archivo PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMemo}
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copiedMemoText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMemoText ? 'Copiado' : 'Copiar Texto'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWhatsApp ? '¡Copiado!' : 'Copiar WA'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="text-xs text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Enviar</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* VISTA RESUMIDA DE WHATSAPP (DISTRIBUCIÓN ULTRA COMPACTA) */}
            {previewTab === 'whatsapp' && (
              <div className="bg-[#e5ddd5] dark:bg-slate-950 p-4 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-md space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-black/10 dark:border-white/10">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>Memo Resumido para WhatsApp</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    Listo para grupo/superioridad
                  </span>
                </div>

                <div className="bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 p-4 rounded-xl rounded-tl-none shadow-sm text-xs leading-relaxed font-sans whitespace-pre-wrap select-all border border-black/5 dark:border-white/5">
                  {generateWhatsAppMemoText()}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    En <strong>Lugar</strong> figura la dirección exacta de la comisión.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWhatsApp ? '¡Copiado!' : 'Copiar Texto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Abrir WA</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hoja oficial membretada (siempre presente en DOM con print:block) */}
            <div
              id="official-police-memo-print"
              className={`${previewTab === 'official' ? 'block' : 'hidden print:block'} bg-white text-slate-900 border-2 border-slate-300 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5 text-xs font-serif leading-relaxed`}
            >
              
              {/* Membrete Oficial PER con Departamental Dinámica */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
                <div className="flex items-center justify-center mb-1">
                  <PoliceLogo className="w-12 h-12" variant="original" />
                </div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 font-sans">
                  Policía de Entre Ríos
                </h4>
                <p className="text-[11px] font-bold text-slate-800 font-sans uppercase">
                  {departamental}
                </p>
                <p className="text-[10px] text-slate-600 font-sans uppercase">
                  {dependencia}
                </p>
              </div>

              {/* Número de Memo y Fecha */}
              <div className="flex items-center justify-between text-[11px] font-sans font-bold border-b border-slate-200 pb-2">
                <span className="text-blue-900 font-mono">{numeroMemo}</span>
                <span>
                  {ciudadComision}, {new Date(fechaHora).toLocaleDateString('es-AR')} -{' '}
                  {new Date(fechaHora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} Hs.
                </span>
              </div>

              {/* Encabezado formal */}
              <div className="space-y-1 text-[11px] font-sans">
                <p><strong>A LA SUPERIORIDAD:</strong> Sr. Jefe de Dependencia / División</p>
                <p>
                  <strong>DEL FUNCIONARIO ACTUANTE:</strong> {jerarquiaFuncionario} {nombreFuncionario}
                  {legajoFuncionario ? ` (Leg. N° ${legajoFuncionario})` : ''} - {movilPolicial}
                </p>
                <p><strong>OBJETO:</strong> {MEMO_TEMPLATES[tipoComision]?.titulo || 'Parte de Comisión'}</p>
                {victima && (
                  <p>
                    <strong>REF:</strong> Autos <em>"{victima} c/ {victimario || 'DENUNCIADO'}"</em>
                    {nroOficio ? ` - Oficio N° ${nroOficio}` : ''} {juzgadoInterviniente ? `(${juzgadoInterviniente})` : ''}
                  </p>
                )}
              </div>

              {/* Cuerpo del Parte */}
              <div className="space-y-3 pt-2 text-[11.5px] text-justify font-sans">
                <p>
                  Tengo el agrado de dirigirme a Ud., a fin de elevar el presente parte de comisión policial llevado a cabo en el domicilio sito en calle <strong>{domicilioComision || '____________________'}</strong>, localidad de <strong>{ciudadComision}</strong>.
                </p>

                <p className="whitespace-pre-wrap leading-relaxed">
                  {relatoHechos || 'Se comisionó al domicilio indicado a los efectos de dar cumplimiento a directivas policiales en la zona...'}
                </p>

                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300 font-sans text-[11px]">
                  <strong>Resultado de la Comisión:</strong> {resultadoIntervencion || 'Sin novedad'}
                </div>

                {observaciones && (
                  <p className="text-[11px] text-slate-700 italic">
                    <strong>Observaciones:</strong> {observaciones}
                  </p>
                )}
              </div>

              {/* FIRMA ÚNICA: SOLO FIRMA DEL FUNCIONARIO A CARGO CON DEPARTAMENTAL ACTUALIZADA */}
              <div className="pt-10 flex flex-col items-center justify-center text-center font-sans text-slate-800">
                <div className="w-72 border-t-2 border-slate-800 pt-2 space-y-1">
                  <span className="block font-bold text-xs uppercase tracking-wider">
                    {jerarquiaFuncionario} {nombreFuncionario}
                  </span>
                  {legajoFuncionario && (
                    <span className="block text-[11px] text-slate-600 font-mono">
                      Legajo Policial N° {legajoFuncionario}
                    </span>
                  )}
                  <span className="block text-[10px] text-slate-700 font-medium">
                    {dependencia} - {departamental}
                  </span>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-widest pt-0.5">
                    Firma y Sello del Funcionario a Cargo
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* SUBTAB 2: HISTORIAL DE MEMOS GUARDADOS */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isAdmin
                    ? `Todos los Memorándums Registrados (${filteredSavedMemos.length})`
                    : `Mis Memorándums Registrados (${filteredSavedMemos.length})`}
                </h4>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Vista Administrador (Acceso Completo)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Solo visibles por ti y administradores</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Como administrador, puedes supervisar, consultar y auditar los memorándums de todos los funcionarios y comisarías.'
                  : `Visualizando exclusivamente los partes confeccionados por tu usuario policial (${currentUser.name}).`}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchHistoryTerm}
                  onChange={(e) => setSearchHistoryTerm(e.target.value)}
                  placeholder="Buscar memo por víctima, oficio o número..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={loadMemosFromServer}
                disabled={loadingMemos}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Actualizar memorándums desde el servidor policial"
              >
                <RefreshCw className={`w-4 h-4 ${loadingMemos ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {loadingMemos ? (
            <div className="text-center py-14 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consultando memorándums policiales en el servidor central...
              </p>
            </div>
          ) : filteredSavedMemos.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No hay memorándums registrados en el servidor
                </h5>
                <p className="text-xs text-slate-400 mt-1">
                  {isAdmin
                    ? 'Aún no se han registrado memorándums policiales en el servidor central.'
                    : 'Aún no has registrado ningún memorándum con tu usuario policial.'}
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('create')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Crear Memo Ahora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSavedMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {memo.numeroMemo}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(memo.fechaHora).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {memo.victima}
                    </h5>
                    {memo.victimario && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        c/ {memo.victimario}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 pt-1">
                      <div><strong>Jefatura:</strong> {memo.jefatura || 'Policía de Entre Ríos'}</div>
                      <div><strong>Comisión:</strong> {MEMO_TEMPLATES[memo.tipoComision]?.titulo || memo.tipoComision}</div>
                      <div>
                        <strong>Lugar:</strong>{' '}
                        {memo.domicilioComision
                          ? `${memo.domicilioComision}${memo.ciudadComision && !memo.domicilioComision.toLowerCase().includes(memo.ciudadComision.toLowerCase()) ? `, ${memo.ciudadComision}` : ''}`
                          : (memo.ciudadComision || 'No especificado')}
                      </div>
                      {memo.nroOficio && <div><strong>Oficio:</strong> {memo.nroOficio}</div>}
                      <div><strong>Funcionario a cargo:</strong> {memo.oficialACargo} ({memo.movilPolicial})</div>
                      {memo.creadoPor && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          <strong>Cargado por:</strong> {memo.creadoPor}
                        </div>
                      )}
                      <div><strong>Resultado:</strong> {memo.resultadoIntervencion || 'Sin novedad'}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          const text = generateWhatsAppMemoText({
                            numeroMemo: memo.numeroMemo,
                            departamental: memo.jefatura,
                            dependencia: memo.dependencia,
                            fechaHora: memo.fechaHora,
                            movilPolicial: memo.movilPolicial,
                            jerarquia: memo.jerarquia,
                            nombre: memo.nombre,
                            legajo: memo.legajo,
                            domicilioComision: memo.domicilioComision,
                            ciudadComision: memo.ciudadComision,
                            tipoComision: memo.tipoComision,
                            victima: memo.victima,
                            victimario: memo.victimario,
                            nroOficio: memo.nroOficio,
                            relatoHechos: memo.relatoHechos,
                            resultadoIntervencion: memo.resultadoIntervencion,
                            observaciones: memo.observaciones,
                          });
                          navigator.clipboard.writeText(text);
                          alert('¡Memo resumido para WhatsApp copiado al portapapeles!');
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Copiar formato resumido para WhatsApp"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar WA</span>
                      </button>

                      <button
                        onClick={() => {
                          const text = generateWhatsAppMemoText({
                            numeroMemo: memo.numeroMemo,
                            departamental: memo.jefatura,
                            dependencia: memo.dependencia,
                            fechaHora: memo.fechaHora,
                            movilPolicial: memo.movilPolicial,
                            jerarquia: memo.jerarquia,
                            nombre: memo.nombre,
                            legajo: memo.legajo,
                            domicilioComision: memo.domicilioComision,
                            ciudadComision: memo.ciudadComision,
                            tipoComision: memo.tipoComision,
                            victima: memo.victima,
                            victimario: memo.victimario,
                            nroOficio: memo.nroOficio,
                            relatoHechos: memo.relatoHechos,
                            resultadoIntervencion: memo.resultadoIntervencion,
                            observaciones: memo.observaciones,
                          });
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Enviar por WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WA</span>
                      </button>

                      <button
                        onClick={() => {
                          const blob = generatePoliceMemoPdfBlob({
                            numeroMemo: memo.numeroMemo,
                            fechaHora: new Date(memo.fechaHora).toLocaleString('es-AR'),
                            departamental: memo.jefatura || 'Jefatura Departamental Victoria',
                            dependencia: memo.dependencia,
                            oficialACargo: memo.oficialACargo,
                            movilPolicial: memo.movilPolicial,
                            victima: memo.victima,
                            victimario: memo.victimario,
                            nroOficio: memo.nroOficio,
                            juzgadoInterviniente: memo.juzgadoInterviniente,
                            domicilioComision: memo.domicilioComision,
                            ciudadComision: memo.ciudadComision,
                            tipoComisionTitulo: MEMO_TEMPLATES[memo.tipoComision]?.titulo || 'Parte de Comisión',
                            motivoComision: memo.motivoComision,
                            relatoHechos: memo.relatoHechos,
                            resultadoIntervencion: memo.resultadoIntervencion || 'Sin novedad',
                            observaciones: memo.observaciones,
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${memo.numeroMemo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Descargar este memo en PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>

                    {(isAdmin || !memo.creadoPorId || memo.creadoPorId === currentUser.id) && (
                      <button
                        onClick={() => handleDeleteMemo(memo.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Eliminar este memo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
