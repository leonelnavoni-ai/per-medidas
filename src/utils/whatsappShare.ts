import { JudicialMeasure, UserProfile, IdentifiedPerson } from '../types';

/**
 * Builds a clean, professional markdown-formatted WhatsApp message
 * containing the judicial measure data, official court document link/status,
 * and sender identity.
 */
export function buildMeasureWhatsAppMessage(
  measure: JudicialMeasure,
  sender: UserProfile,
  customNote?: string
): string {
  const lines: string[] = [];

  lines.push('🚨 *POLICÍA DE ENTRE RÍOS*');
  lines.push('🏛️ *Comisaría de Minoridad y Violencia Familiar - Victoria*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('📋 *NOTIFICACIÓN DE MEDIDA JUDICIAL*');
  lines.push('');

  // Primary measure details
  lines.push(`📌 *N° Oficio / Causa:* ${measure.nroOficio || 'S/N'}`);
  lines.push(`⚖️ *Tipo de Medida:* ${measure.tipoMedida || 'No especificada'}`);
  lines.push(`🏛️ *Juzgado / Organismo:* ${measure.provenienteDe || 'No especificado'}`);
  lines.push('');

  lines.push(`👤 *Víctima:* ${measure.victima || 'No especificada'}`);
  lines.push(`⚠️ *Denunciado / Victimario:* ${measure.victimario || 'No especificado'}`);
  lines.push('');

  // Validity and dates
  lines.push('📅 *Vigencia de la Medida:*');
  lines.push(`• *Desde:* ${measure.fechaDesde || 'No fijada'}`);
  const vigenciaHasta = measure.fechaHasta || 'Duración de la causa';
  const diasTexto = measure.diasVigencia ? ` (${measure.diasVigencia} días de vigencia)` : '';
  lines.push(`• *Hasta:* ${vigenciaHasta}${diasTexto}`);
  
  if (measure.estadoVigencia) {
    lines.push(`• *Estado:* ${measure.estadoVigencia}`);
  }

  if (measure.medidaReciproca === 'Si') {
    lines.push('🔄 *Medida Recíproca:* SÍ');
  }

  if (measure.observaciones && measure.observaciones.trim()) {
    lines.push(`📝 *Observaciones:* ${measure.observaciones.trim()}`);
  }

  // Official Court Order / Attached PDF document
  lines.push('');
  lines.push('📄 *OFICIO JUDICIAL:*');
  if (measure.driveWebViewLink) {
    lines.push(`🔗 *Ver Oficio (Google Drive Oficial):*`);
    lines.push(measure.driveWebViewLink);
    if (measure.pdfFileName) {
      lines.push(`📎 *Archivo:* ${measure.pdfFileName}`);
    }
  } else if (measure.driveFileId) {
    const driveUrl = `https://drive.google.com/file/d/${measure.driveFileId}/view`;
    lines.push(`🔗 *Ver Oficio (Google Drive Oficial):*`);
    lines.push(driveUrl);
    if (measure.pdfFileName) {
      lines.push(`📎 *Archivo:* ${measure.pdfFileName}`);
    }
  } else if (measure.hasCustomPdf) {
    lines.push(`📎 *Archivo adjunto:* ${measure.pdfFileName || 'Oficio digital adjunto en el sistema'}`);
    lines.push('ℹ️ _(Disponible en el Sistema Digital de la Comisaría)_');
  } else {
    lines.push('ℹ️ _(Oficio digital registrado y disponible en el Sistema Policial)_');
  }

  // Optional custom notes added before sending
  if (customNote && customNote.trim()) {
    lines.push('');
    lines.push(`💬 *Nota adicional:* ${customNote.trim()}`);
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');

  // Sender information (who is sending it)
  const badgeInfo = sender.badgeNumber ? ` (Legajo: ${sender.badgeNumber})` : '';
  const depInfo = sender.department ? ` - ${sender.department}` : ' - Comisaría de Minoridad y V. Familiar';
  lines.push(`👮‍♂️ *Enviado por:* ${sender.name}${badgeInfo}${depInfo}`);

  const now = new Date();
  const fechaHora =
    now.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    ' hs';

  lines.push(`⏱️ *Fecha y hora de envío:* ${fechaHora}`);

  return lines.join('\n');
}

/**
 * Builds the WhatsApp direct link URL (api.whatsapp.com / wa.me)
 */
export function getWhatsAppUrl(text: string, phone?: string): string {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const encodedText = encodeURIComponent(text);

  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  superadmin: 'Super Administrador (Acceso y control total del sistema)',
  admin: 'Administrador (Gestión de medidas, oficios y usuarios)',
  editor: 'Editor Policial (Búsqueda, carga, edición y descarga de oficios)',
  viewer: 'Lector / Consulta (Búsqueda y visualización de medidas)',
};

/**
 * Builds a clean, professional markdown-formatted WhatsApp message
 * containing system login credentials, access link, and administrator sender data.
 */
export function buildUserCredentialsWhatsAppMessage(
  targetUser: UserProfile,
  sender: UserProfile,
  appUrl?: string,
  customNote?: string
): string {
  const lines: string[] = [];

  lines.push('🚨 *POLICÍA DE ENTRE RÍOS*');
  lines.push('🏛️ *Comisaría de Minoridad y Violencia Familiar - Victoria*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔐 *CREDENCIALES DE ACCESO AL SISTEMA*');
  lines.push('📋 _Sistema Integral de Gestión de Medidas Judiciales y Oficios_');
  lines.push('');

  // Beneficiary / Officer information
  lines.push(`👮‍♂️ *Funcionario / Agente:* ${targetUser.name}`);
  if (targetUser.badgeNumber) {
    lines.push(`💳 *Legajo Policial:* ${targetUser.badgeNumber}`);
  }
  if (targetUser.department) {
    lines.push(`🏢 *Dependencia:* ${targetUser.department}`);
  }
  const roleLabel = ROLE_DESCRIPTIONS[targetUser.role] || targetUser.role;
  lines.push(`🛡️ *Rol asignado:* ${roleLabel}`);
  lines.push('');

  // Login credentials
  lines.push('🔑 *DATOS PARA INICIAR SESIÓN:*');
  const userIdentifier = targetUser.username || targetUser.email.split('@')[0];
  lines.push(`• *Usuario:* ${userIdentifier}`);
  lines.push(`• *Correo oficial:* ${targetUser.email}`);
  lines.push(`• *Contraseña provisoria:* ${targetUser.password || 'admin123'}`);
  lines.push('');

  // Direct link to access the system
  const systemLink = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  if (systemLink) {
    lines.push('🌐 *Enlace de Ingreso al Sistema:*');
    lines.push(systemLink);
    lines.push('');
  }

  // Security notes
  lines.push('⚠️ *Indicaciones de seguridad:*');
  lines.push('1. Ingrese con el usuario y la contraseña indicada.');
  lines.push('2. Esta credencial es personal e intransferible. No comparta este mensaje con personas ajenas al servicio policial.');

  // Custom administrator message
  if (customNote && customNote.trim()) {
    lines.push('');
    lines.push(`💬 *Mensaje del Administrador:* ${customNote.trim()}`);
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');

  // Administrator who generated the credentials
  const badgeInfo = sender.badgeNumber ? ` (Legajo: ${sender.badgeNumber})` : '';
  const depInfo = sender.department ? ` - ${sender.department}` : ' - PER Victoria';
  lines.push(`👮‍♂️ *Generado por:* ${sender.name}${badgeInfo}${depInfo}`);

  const now = new Date();
  const fechaHora =
    now.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    ' hs';

  lines.push(`⏱️ *Fecha y hora de emisión:* ${fechaHora}`);

  return lines.join('\n');
}

/**
 * Builds a clean, professional markdown-formatted WhatsApp message
 * containing the identified person's data, check location, legal status,
 * any active judicial measure alerts, and the reporting officer's identity.
 */
export function buildPersonIdentificationWhatsAppMessage(
  person: IdentifiedPerson,
  sender: UserProfile,
  matchingMeasures?: JudicialMeasure[],
  customNote?: string
): string {
  const lines: string[] = [];

  lines.push('🚨 *POLICÍA DE ENTRE RÍOS*');
  lines.push('🏛️ *Jefatura Departamental Victoria - Comisaría de Minoridad y V. Familiar*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('📋 *INFORME DE IDENTIFICACIÓN DE PERSONA*');
  lines.push('');

  // Personal Identification Details
  lines.push('👤 *DATOS DEL CIUDADANO:*');
  lines.push(`• *Apellido y Nombres:* ${person.apellidoNombre.toUpperCase()}`);
  lines.push(`• *D.N.I.:* ${person.dni || 'Sin documento al momento del control'}`);
  if (person.alias && person.alias.trim()) {
    lines.push(`• *Apodo / Alias:* "${person.alias.trim()}"`);
  }
  if (person.edad) {
    lines.push(`• *Edad:* ${person.edad} años`);
  }
  if (person.nacionalidad) {
    lines.push(`• *Nacionalidad:* ${person.nacionalidad}`);
  }
  if (person.domicilio && person.domicilio.trim()) {
    lines.push(`• *Domicilio declarado:* ${person.domicilio.trim()}`);
  }
  if (person.telefono && person.telefono.trim()) {
    lines.push(`• *Teléfono de contacto:* ${person.telefono.trim()}`);
  }
  lines.push('');

  // Procedure and Location
  lines.push('📍 *DATOS DEL PROCEDIMIENTO:*');
  const fechaObj = new Date(person.fechaHora);
  const fechaStr = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' a las ' +
      fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
      ' hs'
    : person.fechaHora;
  lines.push(`• *Fecha y Hora:* ${fechaStr}`);
  lines.push(`• *Lugar:* ${person.lugar}`);
  lines.push(`• *Motivo del control:* ${person.motivo}`);
  if (person.vehiculo && person.vehiculo.trim()) {
    lines.push(`• *Vehículo / Medio de movilidad:* ${person.vehiculo.trim()}`);
  }
  lines.push(`• *Interviniente:* ${person.interviniente}`);
  lines.push(`• *Dependencia policial:* ${person.dependencia}`);
  lines.push('');

  // Legal Status
  lines.push('⚖️ *SITUACIÓN LEGAL / ANTECEDENTES:*');
  let statusEmoji = '🟢';
  if (person.estadoLegal === 'Con medida cautelar') statusEmoji = '⚠️';
  else if (person.estadoLegal === 'Pedido de captura / paradero') statusEmoji = '🚨';
  else if (person.estadoLegal === 'Demorado') statusEmoji = '⛔';
  else if (person.estadoLegal === 'En averiguación') statusEmoji = '🟡';
  lines.push(`• *Estado:* ${statusEmoji} *${person.estadoLegal.toUpperCase()}*`);

  // Active Judicial Measures Matching Alert
  if (matchingMeasures && matchingMeasures.length > 0) {
    lines.push('');
    lines.push('⚠️ *ALERTA DE MEDIDAS JUDICIALES ENCONTRADAS:*');
    matchingMeasures.forEach((m, idx) => {
      lines.push(`  ${idx + 1}) *Oficio N° ${m.nroOficio}* (${m.provenienteDe || 'Juzgado'})`);
      lines.push(`     - *Tipo:* ${m.tipoMedida}`);
      lines.push(`     - *Víctima:* ${m.victima}`);
      lines.push(`     - *Denunciado:* ${m.victimario}`);
      lines.push(`     - *Vigencia:* ${m.fechaDesde} hasta ${m.fechaHasta || 'Duración de la causa'}`);
    });
  }

  // Observations
  if (person.observaciones && person.observaciones.trim()) {
    lines.push('');
    lines.push(`📝 *Observaciones del Oficial:* ${person.observaciones.trim()}`);
  }

  // Custom Note if entered in modal
  if (customNote && customNote.trim()) {
    lines.push('');
    lines.push(`💬 *Mensaje adicional:* ${customNote.trim()}`);
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');

  // Reporting Officer details
  const badgeInfo = sender.badgeNumber ? ` (Legajo: ${sender.badgeNumber})` : '';
  const depInfo = sender.department ? ` - ${sender.department}` : ' - PER Victoria';
  lines.push(`👮‍♂️ *Informado por:* ${sender.name}${badgeInfo}${depInfo}`);

  const now = new Date();
  const nowStr =
    now.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    ' hs';

  lines.push(`⏱️ *Fecha/Hora reporte:* ${nowStr}`);

  return lines.join('\n');
}

