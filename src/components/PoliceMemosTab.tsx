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

// Jerarquías oficiales de la Policía de Entre Ríos (PER) con Sub Comisario e Inspector
export const JERARQUIAS_PER = [
  'Sub Comisario',
  'Subcomisario',
  'Comisario',
  'Comisario Principal',
  'Comisario Inspector',
  'Comisario Mayor',
  'Oficial Principal',
  'Oficial Inspector',
  'Oficial Subinspector',
  'Oficial Auxiliar',
  'Oficial Ayudante',
  'Suboficial Mayor',
  'Suboficial Principal',
  'Sargento Ayudante',
  'Sargento 1°',
  'Sargento',
  'Cabo 1°',
  'Cabo',
  'Agente',
];

// Dependencias y Comisarías oficiales de Victoria, Entre Ríos
export const DEPENDENCIAS_VICTORIA = [
  'COMISARÍA QUINTO CUARTEL',
  'SECCIÓN COMANDO RADIOELÉCTRICO',
  'SECCIÓN MOTORIZADA',
  'COMISARÍA SUBURBIOS',
  'COMISARÍA DE MINORIDAD Y VIOLENCIA FAMILIAR',
  'DIV. OP. Y SEGURIDAD PUBLICA',
  'DIVISIÓN INVESTIGACIONES',
  'DIVISIÓN TOXICOLOGÍA',
  'COMISARÍA RINCON DEL DOLL',
  'COMISARÍA LAGUNA DEL PESCADO',
  'COMISARÍA MOLINO DOLLEZ',
  'COMISARÍA PAJONAL',
  'COMISARÍA MONTOYA',
];

// Hechos operativos y carátulas policiales más frecuentes
export const HECHOS_COMUNES = [
  'ROBO C/A/D',
  'Sup. Desobediencia Judicial',
  'HURTO',
  'DESOBEDIENCIA JUDICIAL',
  'MEDIDA CAUTELAR / PROHIBICIÓN',
  'AMENAZAS Y LESIONES',
  'AVERIGUACIÓN DE ILÍCITO',
  'HALLAZGO / SECUESTRO',
  'LLAMADO A COMISARÍA',
  'COMISIÓN POR 911',
];

// Opciones de persona involucrada en el memo
export const TIPOS_PERSONA_COMUNES = [
  'DAMNIFICADO',
  'Detenido',
  'Aprehendido',
  'Imputado',
  'Denunciante',
  'Victimario',
];

export interface VictoriaOperationalMemoParams {
  dgdpEncabezado?: string;
  divisionEncabezado?: string;
  dependencia?: string;
  estiloEncabezado?: 'tres_lineas' | 'dos_lineas_combinadas';
  hecho?: string;
  etiquetaHecho?: string;
  fechaHora?: string;
  domicilioComision?: string;
  tipoPersona?: string;
  personaDetalle?: string;
  damnificado?: string;
  ordenInvolucrado?: 'arriba' | 'abajo';
  sinopsis?: string;
  jerarquia?: string;
  nombre?: string;
}

// Generador del Formato Operativo Oficial de Victoria (WhatsApp / Despacho / Parte Policial)
export const generateVictoriaOperationalMemo = (params: VictoriaOperationalMemoParams): string => {
  const estiloEncabezado = params.estiloEncabezado || 'tres_lineas';
  const dgdp = params.dgdpEncabezado?.trim() || 'DGDP- D VICTORIA.';
  const div = params.divisionEncabezado?.trim() || 'DIV. OP. Y SEGURIDAD PUBLICA';
  const dep = params.dependencia?.trim() || 'COMISARÍA QUINTO CUARTEL';
  const hecho = params.hecho?.trim() || 'ROBO C/A/D';
  const etiquetaHecho = params.etiquetaHecho?.trim() || (hecho.startsWith('Sup.') || hecho.startsWith('Desobediencia') ? '*Hecho*' : '*"HECHO"*');

  const d = params.fechaHora ? new Date(params.fechaHora) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yearShort = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const fechaStr = `${day}/${month}/${yearShort}`;
  const horaStr = `${hours}:${minutes}`;

  const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const fechaLarga = `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;

  const lugar = params.domicilioComision?.trim() || 'Calle Maipú y Los Horneros';
  
  const personaTexto = params.personaDetalle?.trim() || params.damnificado?.trim() || 'CHEVASCO BERNARDO DAMIAN, DNI 34.605.353, de 36 años.';
  const etiquetaPersona = params.tipoPersona?.trim() || (personaTexto.toLowerCase().includes('sánchez') || hecho.toLowerCase().includes('desobediencia') ? 'Detenido' : 'DAMNIFICADO');

  const sinopsis = params.sinopsis?.trim() || 'momentos en que la propiedad estaba deshabitada dos masculinos desconocidos con los rostros cubiertos y con guantes puestos irrumpieron en el domicilio rompieron una ventana trasera, dónde en una de las habitaciones sustrajeron únicamente una mochila que contenía $25.000.000 pesos argentinos y 10.000 dólares.';
  const jer = params.jerarquia?.trim() || 'Sub Comisario';
  const nom = params.nombre?.trim() || 'BUSTOS Alejandro';

  // Líneas de encabezado institucional
  let encabezadoBloque = '';
  if (estiloEncabezado === 'dos_lineas_combinadas') {
    encabezadoBloque = `*${dgdp}*\n*${div}*`;
  } else {
    encabezadoBloque = `*${dgdp}*\n*${div}*\n*${dep}*`;
  }

  // Línea de Hecho
  const hechoBloque = etiquetaHecho.startsWith('*') ? `${etiquetaHecho} ${hecho}` : `*${etiquetaHecho}* ${hecho}`;

  // Línea de Persona Involucrada
  const etiquetaPersonaPura = etiquetaPersona.replace(/\*/g, '');
  const personaBloque = `*${etiquetaPersonaPura}* ${personaTexto}`;

  // Cierre / Firma institucional (siempre Fdo. con fecha larga)
  const firmaBloque = `*${fechaLarga}*\nFdo. ${jer} ${nom}`;

  // Si ordenInvolucrado === 'arriba' (como en Sup. Desobediencia Judicial / Detenido):
  // Encabezado -> Hecho -> Detenido -> Fecha -> Hora -> Lugar -> SINOPSIS -> Cierre
  // Si ordenInvolucrado === 'abajo' (como en Robo / Damnificado):
  // Encabezado -> Hecho -> Fecha -> Hora -> Lugar -> Damnificado -> SINOPSIS -> Cierre
  const orden = params.ordenInvolucrado || (etiquetaPersona === 'Detenido' ? 'arriba' : 'abajo');

  if (orden === 'arriba') {
    return `${encabezadoBloque}

${hechoBloque}
${personaBloque}

*FECHA:*  ${fechaStr}
*HORA:* ${horaStr}
*LUGAR:* ${lugar}
*"SINOPSIS"* ${sinopsis}

${firmaBloque}`;
  } else {
    return `${encabezadoBloque}
${hechoBloque}
*FECHA:*  ${fechaStr}
*HORA:* ${horaStr}
*LUGAR:* ${lugar}
${personaBloque}
*"SINOPSIS"* ${sinopsis}

${firmaBloque}`;
  }
};

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

  // ENCABEZADOS OPERATIVOS VICTORIA (Persistentes)
  const [dgdpEncabezado, setDgdpEncabezado] = useState<string>(() => {
    return localStorage.getItem('per_fixed_dgdp') || 'DGDP- D VICTORIA.';
  });

  const [divisionEncabezado, setDivisionEncabezado] = useState<string>(() => {
    return localStorage.getItem('per_fixed_division') || 'DIV. OP. Y SEGURIDAD PUBLICA';
  });

  // DEPENDENCIA / COMISARÍA FIJADA (Persistente)
  const [dependencia, setDependencia] = useState<string>(() => {
    const saved = localStorage.getItem('per_fixed_dependencia');
    if (saved === 'DIVISIÓN MINORIDAD Y FAMILIA' || saved === 'DIV. MINORIDAD Y FAMILIA' || saved === 'COMISARÍA PRIMER CUARTEL') {
      return 'COMISARÍA DE MINORIDAD Y VIOLENCIA FAMILIAR';
    }
    return (
      saved ||
      currentUser.department ||
      'COMISARÍA QUINTO CUARTEL'
    );
  });

  // Funcionario interviniente FIJADO (jerarquía, nombre y legajo que persisten)
  const [jerarquiaFuncionario, setJerarquiaFuncionario] = useState<string>(() => {
    return localStorage.getItem('per_fixed_jerarquia') || 'Sub Comisario';
  });

  const [nombreFuncionario, setNombreFuncionario] = useState<string>(() => {
    return (
      localStorage.getItem('per_fixed_nombre') ||
      currentUser.name ||
      'BUSTOS Alejandro'
    );
  });

  const [legajoFuncionario, setLegajoFuncionario] = useState<string>(() => {
    return (
      localStorage.getItem('per_fixed_legajo') ||
      currentUser.badgeNumber ||
      ''
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
    localStorage.setItem('per_fixed_dgdp', dgdpEncabezado);
  }, [dgdpEncabezado]);

  useEffect(() => {
    localStorage.setItem('per_fixed_division', divisionEncabezado);
  }, [divisionEncabezado]);

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

  // Cargo / Rol policial del firmante (Persistente)
  const [cargoFuncionario, setCargoFuncionario] = useState<string>(() => {
    return localStorage.getItem('per_fixed_cargo') || 'Jefe de Comisaría Quinto Cuartel';
  });

  // Estilo de encabezado ('tres_lineas' | 'dos_lineas_combinadas')
  const [estiloEncabezado, setEstiloEncabezado] = useState<'tres_lineas' | 'dos_lineas_combinadas'>(() => {
    return (localStorage.getItem('per_fixed_estilo_encabezado') as any) || 'tres_lineas';
  });

  useEffect(() => {
    localStorage.setItem('per_fixed_estilo_encabezado', estiloEncabezado);
  }, [estiloEncabezado]);

  // Etiqueta de Hecho (*"HECHO"* o *Hecho*)
  const [etiquetaHecho, setEtiquetaHecho] = useState<string>('*\"HECHO\"*');

  // Tipo y orden de persona involucrada (DAMNIFICADO, Detenido, Aprehendido, etc.)
  const [tipoPersona, setTipoPersona] = useState<string>('DAMNIFICADO');
  const [ordenInvolucrado, setOrdenInvolucrado] = useState<'arriba' | 'abajo'>('abajo');

  // Campos del formulario
  const [numeroMemo, setNumeroMemo] = useState<string>(() => {
    const year = new Date().getFullYear();
    const count = savedMemos.length + 1;
    const padded = String(count).padStart(3, '0');
    return `MEMO N° ${padded}/${year} - D.M.V.F.`;
  });

  const [fechaHora, setFechaHora] = useState<string>(() => {
    // 14/07/26 09:20 como fecha de referencia si coincide o fecha actual
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  // HECHO / CARÁTULA
  const [hecho, setHecho] = useState<string>('ROBO C/A/D');

  // Tipo de comisión por defecto: 'llamado_comisaria'
  const [tipoComision, setTipoComision] = useState<TipoComisionPolicial>('llamado_comisaria');

  const [victima, setVictima] = useState(initialMeasure?.victima || '');
  const [victimario, setVictimario] = useState(initialMeasure?.victimario || '');
  const [damnificado, setDamnificado] = useState<string>(() => {
    if (initialMeasure?.victima) return initialMeasure.victima;
    return 'CHEVASCO BERNARDO DAMIAN, DNI 34.605.353, de 36 años.';
  });
  const [nroOficio, setNroOficio] = useState(initialMeasure?.nroOficio || '');
  const [juzgadoInterviniente, setJuzgadoInterviniente] = useState(initialMeasure?.provenienteDe || '');
  const [domicilioComision, setDomicilioComision] = useState(() => {
    if (initialMeasure) {
      const loc = resolveMeasureLocation(initialMeasure);
      return loc.direccion;
    }
    return 'Calle Maipú y Los Horneros';
  });

  const [motivoComision, setMotivoComision] = useState(
    MEMO_TEMPLATES.llamado_comisaria.motivo
  );

  const [sinopsis, setSinopsis] = useState<string>(
    'momentos en que la propiedad estaba deshabitada dos masculinos desconocidos con los rostros cubiertos y con guantes puestos irrumpieron en el domicilio rompieron una ventana trasera, dónde en una de las habitaciones sustrajeron únicamente una mochila que contenía $25.000.000 pesos argentinos y 10.000 dólares.'
  );

  const [relatoHechos, setRelatoHechos] = useState(() => {
    return 'momentos en que la propiedad estaba deshabitada dos masculinos desconocidos con los rostros cubiertos y con guantes puestos irrumpieron en el domicilio rompieron una ventana trasera, dónde en una de las habitaciones sustrajeron únicamente una mochila que contenía $25.000.000 pesos argentinos y 10.000 dólares.';
  });

  // Resultado predeterminado: "Sin novedad"
  const [resultadoIntervencion, setResultadoIntervencion] = useState<string>('Sin novedad');

  // UI status helpers
  const [copiedGuardBook, setCopiedGuardBook] = useState(false);
  const [copiedMemoText, setCopiedMemoText] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [previewTab, setPreviewTab] = useState<'official' | 'whatsapp'>('whatsapp');
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
FUNCIONARIO INTERVINIENTE: ${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Legajo ${legajoFuncionario})` : ''}`;
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
        victima: damnificado || victima,
        victimario,
        nroOficio,
        juzgadoInterviniente,
        domicilioComision,
        ciudadComision,
        tipoComisionTitulo: hecho || MEMO_TEMPLATES[tipoComision]?.titulo || 'Parte de Comisión',
        motivoComision: hecho || motivoComision,
        relatoHechos: sinopsis || relatoHechos,
        resultadoIntervencion: resultadoIntervencion || 'Sin novedad',
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

  // Acciones de limpieza de formulario
  const handleClearForm = () => {
    setHecho('');
    setDomicilioComision('');
    setDamnificado('');
    setVictima('');
    setVictimario('');
    setNroOficio('');
    setSinopsis('');
    setRelatoHechos('');
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setFechaHora(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  // Formato Operativo Policial Victoria (exacto al memo requerido)
  const generateWhatsAppMemoText = (customData?: Partial<VictoriaOperationalMemoParams>) => {
    return generateVictoriaOperationalMemo({
      dgdpEncabezado: customData?.dgdpEncabezado !== undefined ? customData.dgdpEncabezado : dgdpEncabezado,
      divisionEncabezado: customData?.divisionEncabezado !== undefined ? customData.divisionEncabezado : divisionEncabezado,
      dependencia: customData?.dependencia !== undefined ? customData.dependencia : dependencia,
      estiloEncabezado: customData?.estiloEncabezado !== undefined ? customData.estiloEncabezado : estiloEncabezado,
      hecho: customData?.hecho !== undefined ? customData.hecho : hecho,
      etiquetaHecho: customData?.etiquetaHecho !== undefined ? customData.etiquetaHecho : etiquetaHecho,
      fechaHora: customData?.fechaHora !== undefined ? customData.fechaHora : fechaHora,
      domicilioComision: customData?.domicilioComision !== undefined ? customData.domicilioComision : domicilioComision,
      tipoPersona: customData?.tipoPersona !== undefined ? customData.tipoPersona : tipoPersona,
      personaDetalle: customData?.personaDetalle !== undefined ? customData.personaDetalle : (damnificado || victima),
      damnificado: customData?.damnificado !== undefined ? customData.damnificado : (damnificado || victima),
      ordenInvolucrado: customData?.ordenInvolucrado !== undefined ? customData.ordenInvolucrado : ordenInvolucrado,
      sinopsis: customData?.sinopsis !== undefined ? customData.sinopsis : (sinopsis || relatoHechos),
      jerarquia: customData?.jerarquia !== undefined ? customData.jerarquia : jerarquiaFuncionario,
      nombre: customData?.nombre !== undefined ? customData.nombre : nombreFuncionario,
    });
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
    const finalRelato = (sinopsis || relatoHechos).trim();
    if (!finalRelato) {
      alert('Por favor complete la sinopsis o relato de la comisión.');
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
      victima: damnificado || victima || 'No especificada',
      victimario: victimario || '',
      domicilioComision: domicilioComision || 'No especificado',
      ciudadComision,
      juzgadoInterviniente,
      movilPolicial,
      oficialACargo: `${jerarquiaFuncionario} ${nombreFuncionario}${legajoFuncionario ? ` (Leg. ${legajoFuncionario})` : ''}`,
      jerarquia: jerarquiaFuncionario,
      legajo: legajoFuncionario,
      motivoComision: hecho || motivoComision,
      relatoHechos: finalRelato,
      resultadoIntervencion: resultadoIntervencion || 'Sin novedad',
      dgdpEncabezado,
      divisionEncabezado,
      hecho,
      sinopsis: finalRelato,
      damnificado: damnificado || victima,
      tipoPersona,
      personaDetalle: damnificado || victima,
      tipoCierre: 'fdo',
      estiloEncabezado,
      ordenInvolucrado,
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
            
            {/* BARRA SUPERIOR: REDACCIÓN DE MEMO POLICIAL OFICIAL */}
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border border-blue-200 dark:border-blue-900/40 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Memorándum Policial Oficial - Jefatura Departamental Victoria
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Redacción y emisión de partes oficiales, notificaciones y despacho de comisión
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                  title="Vaciar formulario para nuevo memo"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Limpiar</span>
                </button>
              </div>
            </div>

            {/* 1. ENCABEZADO INSTITUCIONAL DEPARTAMENTAL */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Encabezado Policial Institucional
                  </h4>
                </div>
                {/* Selector de formato de encabezado */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-[10.5px]">
                  <button
                    type="button"
                    onClick={() => setEstiloEncabezado('tres_lineas')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all ${
                      estiloEncabezado === 'tres_lineas'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    3 Líneas Separadas
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstiloEncabezado('dos_lineas_combinadas')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all ${
                      estiloEncabezado === 'dos_lineas_combinadas'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    2 Líneas (Combinado)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Línea 1 (DGDP / DGPD):
                  </label>
                  <input
                    type="text"
                    value={dgdpEncabezado}
                    onChange={(e) => setDgdpEncabezado(e.target.value)}
                    placeholder="DGDP- D VICTORIA."
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div className={estiloEncabezado === 'dos_lineas_combinadas' ? 'sm:col-span-2' : ''}>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {estiloEncabezado === 'dos_lineas_combinadas' ? 'Línea 2 (División y Comisaría combinadas):' : 'Línea 2 (División):'}
                  </label>
                  <input
                    type="text"
                    value={divisionEncabezado}
                    onChange={(e) => setDivisionEncabezado(e.target.value)}
                    placeholder="DIV. OP. Y SEGURIDAD PUBLICA"
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {estiloEncabezado === 'tres_lineas' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Línea 3 (Dependencia / Comisaría):
                    </label>
                    <input
                      type="text"
                      value={dependencia}
                      onChange={(e) => setDependencia(e.target.value)}
                      placeholder="COMISARÍA QUINTO CUARTEL"
                      className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                )}
              </div>

              {/* Botones de selección rápida de Comisaría y Secciones en Victoria */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-semibold">Dependencias Victoria:</span>
                {DEPENDENCIAS_VICTORIA.slice(0, 8).map((depName) => (
                  <button
                    key={depName}
                    type="button"
                    onClick={() => {
                      setDependencia(depName);
                      if (estiloEncabezado === 'dos_lineas_combinadas') {
                        setDivisionEncabezado(`Div. Operaciones y Seguridad Publica - ${depName}`);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-all ${
                      dependencia === depName
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {depName
                      .replace('COMISARÍA DE MINORIDAD Y VIOLENCIA FAMILIAR', 'C. Minoridad y V. Fam.')
                      .replace('COMISARÍA ', 'C. ')
                      .replace('SECCIÓN ', 'Sec. ')
                      .replace('DIVISIÓN ', 'Div. ')}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. HECHO POLICIAL / CARÁTULA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>"HECHO" (Carátula del Suceso)</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-slate-500 font-medium">Etiqueta:</span>
                  <button
                    type="button"
                    onClick={() => setEtiquetaHecho('*\"HECHO\"*')}
                    className={`px-2 py-0.5 rounded font-mono font-bold cursor-pointer ${
                      etiquetaHecho === '*\"HECHO\"*'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    *"HECHO"*
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtiquetaHecho('*Hecho*')}
                    className={`px-2 py-0.5 rounded font-mono font-bold cursor-pointer ${
                      etiquetaHecho === '*Hecho*'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    *Hecho*
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={hecho}
                  onChange={(e) => setHecho(e.target.value)}
                  placeholder="Ej: ROBO C/A/D, Sup. Desobediencia Judicial (incumplimiento Arresto Domiciliario...)"
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-wide"
                />
              </div>

              {/* Botones rápidos de hechos comunes */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {HECHOS_COMUNES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHecho(h);
                      if (h.startsWith('Sup.') || h.startsWith('DESOBEDIENCIA')) {
                        setEtiquetaHecho('*Hecho*');
                        setTipoPersona('Detenido');
                        setOrdenInvolucrado('arriba');
                      } else if (h.includes('ROBO') || h.includes('HURTO')) {
                        setEtiquetaHecho('*\"HECHO\"*');
                        setTipoPersona('DAMNIFICADO');
                        setOrdenInvolucrado('abajo');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      hecho === h
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. PERSONA INVOLUCRADA (DAMNIFICADO / DETENIDO / APREHENDIDO) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Persona Involucrada ({tipoPersona})</span>
                </h4>

                <div className="flex items-center gap-2">
                  {/* Selector de posición de la persona en el memo */}
                  <span className="text-[10px] text-slate-500 font-medium">Ubicación:</span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setOrdenInvolucrado('arriba')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        ordenInvolucrado === 'arriba'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="Ubicado tras Hecho (como en Desobediencia / Detenciones)"
                    >
                      ⬆️ Tras Hecho
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdenInvolucrado('abajo')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        ordenInvolucrado === 'abajo'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="Ubicado tras Lugar (como en Robos y Hurtos)"
                    >
                      ⬇️ Tras Lugar
                    </button>
                  </div>
                </div>
              </div>

              {/* Botones de selección de Rol: DAMNIFICADO / Detenido / Aprehendido / Imputado / etc. */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-500">Rol en el suceso:</span>
                {TIPOS_PERSONA_COMUNES.map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setTipoPersona(tp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      tipoPersona === tp
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    *{tp}*
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Datos de la Persona (*{tipoPersona}* Apellido, Nombres, DNI, Edad):
                </label>
                <input
                  type="text"
                  value={damnificado}
                  onChange={(e) => {
                    setDamnificado(e.target.value);
                    setVictima(e.target.value);
                  }}
                  placeholder="Ej: SÁNCHEZ Julio Alberto, DNI Nro. 47.676.118, de 20 años."
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 4. FECHA, HORA Y LUGAR */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Fecha, Hora y Lugar del Suceso</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    *FECHA:* y *HORA:* del Suceso:
                  </label>
                  <input
                    type="datetime-local"
                    value={fechaHora}
                    onChange={(e) => setFechaHora(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    *LUGAR:* (Calle, Esquina o Barrio):
                  </label>
                  <input
                    type="text"
                    value={domicilioComision}
                    onChange={(e) => setDomicilioComision(e.target.value)}
                    placeholder="Calle Brassesco y calle Publica Barrio Quinto Cuartel."
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. RELATO CIRCUNSTANCIADO: SINOPSIS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>*"SINOPSIS"* (Relato Circunstanciado)</span>
                </h4>
              </div>

              <div>
                <textarea
                  rows={5}
                  value={sinopsis}
                  onChange={(e) => {
                    setSinopsis(e.target.value);
                    setRelatoHechos(e.target.value);
                  }}
                  placeholder="Relato circunstanciado de los hechos acontecidos..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                />
              </div>
            </div>

            {/* 6. FIRMA INSTITUCIONAL (FDO.) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Firma del Funcionario (Fdo.)</span>
                </h4>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Fdo. Jerarquía y Apellido
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jerarquía Policial:
                  </label>
                  <select
                    value={jerarquiaFuncionario}
                    onChange={(e) => setJerarquiaFuncionario(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
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
                    placeholder="BUSTOS Alejandro"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
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
                    <span>Memo Operativo Victoria (*WhatsApp / Despacho*)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    Listo para grupo / superioridad
                  </span>
                </div>

                <div className="bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 p-4 rounded-xl rounded-tl-none shadow-sm text-xs leading-relaxed font-mono whitespace-pre-wrap select-all border border-black/5 dark:border-white/5">
                  {generateWhatsAppMemoText()}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    En <strong>Lugar</strong> figura la dirección exacta del suceso.
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
                <p><strong>OBJETO:</strong> {hecho || MEMO_TEMPLATES[tipoComision]?.titulo || 'Parte de Comisión'}</p>
                {damnificado && (
                  <p>
                    <strong>DAMNIFICADO / VÍCTIMA:</strong> {damnificado}
                  </p>
                )}
                {nroOficio && (
                  <p>
                    <strong>OFICIO JUDICIAL:</strong> N° {nroOficio} {juzgadoInterviniente ? `(${juzgadoInterviniente})` : ''}
                  </p>
                )}
              </div>

              {/* Cuerpo del Parte */}
              <div className="space-y-3 pt-2 text-[11.5px] text-justify font-sans">
                <p>
                  Tengo el agrado de dirigirme a Ud., a fin de elevar el presente parte de comisión policial llevado a cabo en el lugar sito en <strong>{domicilioComision || '____________________'}</strong>, localidad de <strong>{ciudadComision}</strong>.
                </p>

                <p className="whitespace-pre-wrap leading-relaxed">
                  {sinopsis || relatoHechos || 'Se comisionó al lugar indicado a los efectos de dar cumplimiento a directivas policiales en la zona...'}
                </p>

                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300 font-sans text-[11px]">
                  <strong>Resultado de la Comisión:</strong> {resultadoIntervencion || 'Sin novedad'}
                </div>
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

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {memo.hecho || MEMO_TEMPLATES[memo.tipoComision]?.titulo || 'Parte Policial'}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {memo.tipoPersona && (
                        <span className="text-blue-600 dark:text-blue-400 font-bold mr-1">
                          *{memo.tipoPersona}*
                        </span>
                      )}
                      {memo.personaDetalle || memo.damnificado || memo.victima}
                    </h5>
                    {memo.victimario && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        c/ {memo.victimario}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 pt-1">
                      <div><strong>Dependencia:</strong> {memo.dependencia}</div>
                      <div>
                        <strong>Lugar:</strong>{' '}
                        {memo.domicilioComision
                          ? `${memo.domicilioComision}${memo.ciudadComision && !memo.domicilioComision.toLowerCase().includes(memo.ciudadComision.toLowerCase()) ? `, ${memo.ciudadComision}` : ''}`
                          : (memo.ciudadComision || 'No especificado')}
                      </div>
                      {memo.nroOficio && <div><strong>Oficio:</strong> {memo.nroOficio}</div>}
                      <div>
                        <strong>Firma:</strong> Fdo. {memo.jerarquia || ''} {memo.nombre || memo.oficialACargo}
                      </div>
                      {memo.creadoPor && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          <strong>Cargado por:</strong> {memo.creadoPor}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          const text = generateVictoriaOperationalMemo({
                            dgdpEncabezado: memo.dgdpEncabezado,
                            divisionEncabezado: memo.divisionEncabezado,
                            dependencia: memo.dependencia,
                            estiloEncabezado: memo.estiloEncabezado,
                            hecho: memo.hecho || memo.tipoComision,
                            fechaHora: memo.fechaHora,
                            domicilioComision: memo.domicilioComision,
                            tipoPersona: memo.tipoPersona,
                            personaDetalle: memo.personaDetalle || memo.damnificado || memo.victima,
                            damnificado: memo.damnificado || memo.victima,
                            ordenInvolucrado: memo.ordenInvolucrado,
                            sinopsis: memo.sinopsis || memo.relatoHechos,
                            jerarquia: memo.jerarquia,
                            nombre: memo.nombre,
                          });
                          navigator.clipboard.writeText(text);
                          alert('¡Memo formato oficial Victoria copiado al portapapeles!');
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Copiar memo en formato oficial Victoria para WhatsApp"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar WA</span>
                      </button>

                      <button
                        onClick={() => {
                          const text = generateVictoriaOperationalMemo({
                            dgdpEncabezado: memo.dgdpEncabezado,
                            divisionEncabezado: memo.divisionEncabezado,
                            dependencia: memo.dependencia,
                            estiloEncabezado: memo.estiloEncabezado,
                            hecho: memo.hecho || memo.tipoComision,
                            fechaHora: memo.fechaHora,
                            domicilioComision: memo.domicilioComision,
                            tipoPersona: memo.tipoPersona,
                            personaDetalle: memo.personaDetalle || memo.damnificado || memo.victima,
                            damnificado: memo.damnificado || memo.victima,
                            ordenInvolucrado: memo.ordenInvolucrado,
                            sinopsis: memo.sinopsis || memo.relatoHechos,
                            jerarquia: memo.jerarquia,
                            nombre: memo.nombre,
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
