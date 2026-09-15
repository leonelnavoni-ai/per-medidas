import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Sparkles,
  SwitchCamera,
  ShieldAlert,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { JudicialMeasure } from '../types';
import {
  ScannedDocumentResult,
  decodeBarcodeFromImage,
  scanDocumentWithAI,
  compressImage,
} from '../utils/documentScanner';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ScannedDocumentResult, documentPhotoBase64?: string, personPhotoBase64?: string) => void;
  measures: JudicialMeasure[];
  initialMode?: 'document' | 'person';
  existingPersonPhoto?: string;
  existingDocumentPhoto?: string;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  measures,
  initialMode = 'document',
  existingPersonPhoto,
  existingDocumentPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'person'>(initialMode);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Document scan state
  const [documentPhoto, setDocumentPhoto] = useState<string | null>(existingDocumentPhoto || null);
  const [personPhoto, setPersonPhoto] = useState<string | null>(existingPersonPhoto || null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<ScannedDocumentResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start / stop camera stream when modal opens or tab changes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    // Set appropriate camera facing default per tab
    if (activeTab === 'person') {
      setCameraFacing('user');
    } else {
      setCameraFacing('environment');
    }
  }, [isOpen, activeTab]);

  // Restart camera when facing changes or tab changes if open
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, cameraFacing, activeTab]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('El navegador no soporta acceso directo a la cámara. Utilice el botón para tomar o subir foto.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('getUserMedia failed with ideal constraints, trying standard:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsCameraActive(true);
        }
      } catch (finalErr: any) {
        console.error('Final getUserMedia error:', finalErr);
        setIsCameraActive(false);
        setCameraError(
          'No se pudo acceder a la cámara. Verifique los permisos del navegador o use la opción "Tomar/Subir Foto con App del Teléfono".'
        );
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Toggle front/back camera
  const handleToggleFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame from the live video
  const captureCurrentFrame = async (): Promise<string | null> => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return await compressImage(rawDataUrl, 1400, 0.85);
  };

  // Analyze document photo with hybrid pipeline:
  // Step 1: Client-side PDF417 barcode reader (instant 100% RENAPER DNI decode)
  // Step 2: Gemini OCR Multimodal (reads DNI front, Driving License, blurry codes)
  const processDocumentPhoto = async (photoBase64: string) => {
    setDocumentPhoto(photoBase64);
    setIsScanning(true);
    setScannedResult(null);

    try {
      setScanStatusMessage('1/2. Buscando código de barras DNI oficial (PDF417)...');
      const barcodeResult = await decodeBarcodeFromImage(photoBase64);

      if (barcodeResult) {
        setScannedResult(barcodeResult);
        setScanStatusMessage('✓ Código de barras de DNI decodificado exitosamente.');
        setIsScanning(false);
        return;
      }

      setScanStatusMessage('2/2. Código no presente o ilegible. Analizando con IA (DNI frente / Licencia de Conducir)...');
      const aiResult = await scanDocumentWithAI(photoBase64);
      setScannedResult(aiResult);
      setScanStatusMessage('✓ Documento reconocido por Inteligencia Artificial.');
    } catch (err: any) {
      console.error('Error processing document photo:', err);
      setScanStatusMessage(`Advertencia: ${err.message || 'No se pudo leer el documento automáticamente'}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Action: Take photo from live stream
  const handleTakePhoto = async () => {
    const photo = await captureCurrentFrame();
    if (!photo) return;

    if (activeTab === 'document') {
      await processDocumentPhoto(photo);
    } else {
      setPersonPhoto(photo);
    }
  };

  // Handle native file or camera app capture (<input type="file" capture />)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanStatusMessage('Optimizando fotografía...');
      const compressed = await compressImage(file, 1400, 0.85);

      if (activeTab === 'document') {
        await processDocumentPhoto(compressed);
      } else {
        setPersonPhoto(compressed);
        setIsScanning(false);
      }
    } catch (err: any) {
      console.error('Error uploading image file:', err);
      setScanStatusMessage('Error al cargar la imagen seleccionada.');
      setIsScanning(false);
    }
  };

  // Cross-reference live with judicial measures
  const matchingMeasures = React.useMemo(() => {
    if (!scannedResult) return [];
    const name = scannedResult.apellidoNombre?.trim().toLowerCase() || '';
    const dni = scannedResult.dni?.trim() || '';

    return measures.filter((m) => {
      const matchVictim = name && m.victima.toLowerCase().includes(name);
      const matchVictimario = name && m.victimario.toLowerCase().includes(name);
      return matchVictim || matchVictimario;
    });
  }, [scannedResult, measures]);

  // Apply data and send to Person form
  const handleConfirmAndApply = () => {
    if (!scannedResult) {
      // If only photos were taken without scan results, create a basic container
      const fallbackResult: ScannedDocumentResult = {
        tipoDocumento: 'DNI',
        apellidoNombre: '',
        dni: '',
        metodo: 'OCR_INTELIGENTE',
      };
      onApplyData(fallbackResult, documentPhoto || undefined, personPhoto || undefined);
    } else {
      onApplyData(scannedResult, documentPhoto || undefined, personPhoto || undefined);
    }
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Escáner Policial Móvil</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                  DNI • Licencia • Rostro
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Extracción automática de datos y captura fotográfica en vía pública
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-5 pt-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'document'
                ? 'border-blue-500 text-blue-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Escanear DNI o Licencia</span>
            {documentPhoto && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('person')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'person'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>2. Foto del Ciudadano</span>
            {personPhoto && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* CAMERA FEED & VIEWFINDER */}
          <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-[4/3] sm:aspect-[16/10] max-h-[360px] flex items-center justify-center">
            {/* Live Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
            />

            {/* Viewfinder guides */}
            {isCameraActive && activeTab === 'document' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-full max-w-sm aspect-[85/54] border-2 border-dashed border-blue-400/80 rounded-xl shadow-2xl relative flex flex-col justify-between p-3 bg-black/20 backdrop-blur-[1px]">
                  <div className="flex justify-between items-center text-[10px] text-blue-300 font-mono font-bold">
                    <span>ENCUADRE DNI / LICENCIA</span>
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-center text-[11px] text-white/90 font-medium bg-black/60 py-1 px-2 rounded-lg mx-auto">
                    Alinee el frente del documento o el código de barras posterior
                  </div>
                </div>
              </div>
            )}

            {isCameraActive && activeTab === 'person' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-56 h-72 border-2 border-dashed border-indigo-400/80 rounded-full flex items-center justify-center bg-black/20">
                  <span className="text-[11px] text-indigo-200 font-semibold bg-black/60 px-2 py-1 rounded-md">
                    Encuadre rostro y hombros
                  </span>
                </div>
              </div>
            )}

            {/* Error or Fallback Message if camera cannot be opened */}
            {!isCameraActive && (
              <div className="p-6 text-center space-y-3 max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {cameraError ? 'Cámara en vivo no disponible' : 'Iniciando cámara...'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || 'Si su teléfono solicita permiso para usar la cámara, presione Permitir.'}
                  </p>
                </div>
                <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Conexión</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Abrir Cámara del Teléfono</span>
                  </button>
                </div>
              </div>
            )}

            {/* Top camera controls overlay */}
            {isCameraActive && (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handleToggleFacing}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                  title="Cambiar entre cámara trasera y frontal"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Capture Buttons Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Primary Live Snap */}
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={!isCameraActive || isScanning}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{activeTab === 'document' ? 'Capturar y Escanear' : 'Capturar Rostro'}</span>
            </button>

            {/* Native Mobile Camera Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Tomar / Subir Foto</span>
            </button>

            {/* Switch to the other tab quickly */}
            <button
              type="button"
              onClick={() => setActiveTab((prev) => (prev === 'document' ? 'person' : 'document'))}
              className="col-span-2 sm:col-span-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs sm:text-sm rounded-xl border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{activeTab === 'document' ? 'Pasar a Foto Persona ➔' : '➔ Volver a DNI'}</span>
            </button>

            {/* Hidden native input with capture parameter */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture={activeTab === 'document' ? 'environment' : 'user'}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* SCAN STATUS & PROGRESS */}
          {isScanning && (
            <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-800/80 text-blue-200 flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Analizando documento...</span>
                <span className="text-blue-300/80 text-[11px]">{scanStatusMessage}</span>
              </div>
            </div>
          )}

          {/* CRITICAL OPERATIONAL ALERT IF SCANNED PERSON HAS RESTRICTIONS */}
          {matchingMeasures.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 space-y-2 animate-in zoom-in-95 shadow-xl shadow-rose-950/40">
              <div className="flex items-center gap-2.5 font-extrabold text-sm text-rose-300">
                <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce shrink-0" />
                <span>⚠️ ¡ALERTA OPERATIVA INMEDIATA! MEDIDA JUDICIAL VIGENTE</span>
              </div>
              <p className="text-xs text-rose-200 leading-relaxed font-semibold">
                La persona escaneada ({scannedResult?.apellidoNombre}) coincide con antecedentes en la base judicial de Entre Ríos:
              </p>
              <div className="space-y-1.5 pt-1">
                {matchingMeasures.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-rose-900/60 border border-rose-700 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-white block">
                        Oficio N° {m.nroOficio} ({m.provenienteDe}): {m.tipoMedida}
                      </span>
                      <span className="text-[11px] text-rose-200 block">
                        Víctima: <strong>{m.victima}</strong> | Victimario/Denunciado: <strong>{m.victimario}</strong>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-800 text-[10px] font-bold text-white shrink-0">
                      {m.estadoVigencia || 'Vigente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETECTED RESULTS PREVIEW CARD */}
          {scannedResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Datos Extraídos del Documento ({scannedResult.tipoDocumento})</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                  Método: {scannedResult.metodo === 'CODIGO_BARRAS_PDF417' ? 'Código PDF417 RENAPER' : 'OCR Inteligente'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Apellido y Nombres:
                  </span>
                  <span className="text-sm font-extrabold text-white block">
                    {scannedResult.apellidoNombre || 'No detectado'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    D.N.I. / Documento:
                  </span>
                  <span className="text-sm font-mono font-bold text-blue-400 block">
                    {scannedResult.dni || 'S/D'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Fecha Nacimiento / Edad:
                  </span>
                  <span className="text-slate-200 block font-medium">
                    {scannedResult.fechaNacimiento || 'No especificada'}
                    {scannedResult.edad ? ` (${scannedResult.edad} años)` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Nacionalidad / Sexo:
                  </span>
                  <span className="text-slate-200 block font-medium">
                    {scannedResult.nacionalidad || 'Argentina'}
                    {scannedResult.sexo ? ` • Sexo: ${scannedResult.sexo}` : ''}
                  </span>
                </div>

                {scannedResult.domicilio && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">
                      Domicilio en el Documento:
                    </span>
                    <span className="text-slate-200 block font-medium">
                      {scannedResult.domicilio}
                    </span>
                  </div>
                )}

                {scannedResult.claseLicencia && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">
                      Clases Habilitadas de Licencia:
                    </span>
                    <span className="text-amber-300 font-mono font-bold block">
                      {scannedResult.claseLicencia}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CAPTURED PHOTOS GALLERY PREVIEW */}
          {(documentPhoto || personPhoto) && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Fotografías Registradas para la Ficha:
              </span>
              <div className="grid grid-cols-2 gap-3">
                {documentPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-[4/3] bg-black">
                    <img
                      src={documentPhoto}
                      alt="Foto Documento"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                      DNI / Licencia
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentPhoto(null);
                        setScannedResult(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white text-xs cursor-pointer"
                      title="Eliminar foto de documento"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setActiveTab('document');
                      fileInputRef.current?.click();
                    }}
                    className="rounded-xl border border-dashed border-slate-800 p-3 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer aspect-[4/3]"
                  >
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-[10px] text-center">Sin foto de DNI</span>
                  </div>
                )}

                {personPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-[4/3] bg-black">
                    <img
                      src={personPhoto}
                      alt="Foto Ciudadano"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                      Rostro / Persona
                    </span>
                    <button
                      type="button"
                      onClick={() => setPersonPhoto(null)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white text-xs cursor-pointer"
                      title="Eliminar foto del ciudadano"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setActiveTab('person');
                      fileInputRef.current?.click();
                    }}
                    className="rounded-xl border border-dashed border-slate-800 p-3 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer aspect-[4/3]"
                  >
                    <User className="w-5 h-5 mb-1" />
                    <span className="text-[10px] text-center">Sin foto de rostro</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmAndApply}
            disabled={!scannedResult && !documentPhoto && !personPhoto}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Rellenar Formulario con estos Datos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
