<?php
// ==========================================================
// VISOR Y DESCARGADOR RESILIENTE DE PDFS POLICIALES
// Permite visualizar o descargar PDFs desde almacenamiento en disco
// o reconstruirlos directamente desde los registros JSON (pdfBase64)
// ==========================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$fileParam = $_GET['file'] ?? $_GET['name'] ?? $_GET['id'] ?? '';
$download = isset($_GET['download']) && $_GET['download'] === '1';

// Si la URL vino como /api/pdf.php/archivo.pdf
if (empty($fileParam) && !empty($_SERVER['PATH_INFO'])) {
    $fileParam = ltrim($_SERVER['PATH_INFO'], '/');
}

// Limpiar nombre de archivo contra path traversal
$fileName = basename(urldecode($fileParam));

if (empty($fileName)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Se requiere el nombre del archivo PDF']);
    exit;
}

// Posibles ubicaciones físicas en el servidor
$possibleDirs = [
    dirname(__DIR__) . '/uploads/pdfs',       // /public_html/uploads/pdfs
    dirname(__DIR__, 2) . '/uploads/pdfs',    // /home/user/uploads/pdfs
    __DIR__ . '/../uploads/pdfs',             // ../uploads/pdfs relativo
    __DIR__ . '/uploads/pdfs',                // api/uploads/pdfs
    sys_get_temp_dir() . '/uploads/pdfs'
];

$foundFilePath = null;
foreach ($possibleDirs as $dir) {
    $candidate = $dir . '/' . $fileName;
    if (file_exists($candidate) && is_file($candidate) && filesize($candidate) > 0) {
        $foundFilePath = $candidate;
        break;
    }
}

// 1. Si existe físicamente en el disco del servidor
if ($foundFilePath) {
    $fileSize = filesize($foundFilePath);
    header('Content-Type: application/pdf');
    header('Content-Length: ' . $fileSize);
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400');
    $disposition = $download ? 'attachment' : 'inline';
    header("Content-Disposition: {$disposition}; filename=\"{$fileName}\"");
    readfile($foundFilePath);
    exit;
}

// 2. Si no existe en disco, buscar en los registros de data/measures.json y documents.json
// para servir el PDF reconstruido desde su propiedad pdfBase64
$measuresFile = __DIR__ . '/data/measures.json';
$pdfBase64 = null;
$displayName = $fileName;

if (file_exists($measuresFile)) {
    $measuresData = json_decode(file_get_contents($measuresFile), true);
    if (is_array($measuresData)) {
        foreach ($measuresData as $m) {
            $mServerUrl = $m['serverPdfUrl'] ?? '';
            $mFileName = $m['pdfFileName'] ?? '';
            $mId = $m['id'] ?? '';
            
            if (
                basename($mServerUrl) === $fileName ||
                $mFileName === $fileName ||
                $mId === $fileName ||
                (!empty($mServerUrl) && strpos($mServerUrl, $fileName) !== false)
            ) {
                if (!empty($m['pdfBase64'])) {
                    $pdfBase64 = $m['pdfBase64'];
                    $displayName = $mFileName ?: $fileName;
                    break;
                }
            }
        }
    }
}

// Buscar en documents.json si no se encontró en measures
if (!$pdfBase64) {
    $docsFile = __DIR__ . '/data/documents.json';
    if (file_exists($docsFile)) {
        $docsData = json_decode(file_get_contents($docsFile), true);
        if (is_array($docsData)) {
            foreach ($docsData as $d) {
                $dServerUrl = $d['serverPdfUrl'] ?? $d['fileUrl'] ?? '';
                $dFileName = $d['name'] ?? '';
                $dId = $d['id'] ?? '';
                
                if (
                    basename($dServerUrl) === $fileName ||
                    $dFileName === $fileName ||
                    $dId === $fileName ||
                    (!empty($dServerUrl) && strpos($dServerUrl, $fileName) !== false)
                ) {
                    if (!empty($d['pdfBase64'])) {
                        $pdfBase64 = $d['pdfBase64'];
                        $displayName = $dFileName ?: $fileName;
                        break;
                    }
                }
            }
        }
    }
}

if ($pdfBase64) {
    // Limpiar encabezado data:application/pdf;base64, si existe
    if (strpos($pdfBase64, 'base64,') !== false) {
        $pdfBase64 = explode('base64,', $pdfBase64)[1];
    }
    $decodedBytes = base64_decode($pdfBase64);
    
    if ($decodedBytes !== false && strlen($decodedBytes) > 0) {
        // Auto-reparar guardando el archivo físicamente en el directorio uploads correcto
        $mainUploadsDir = dirname(__DIR__) . '/uploads/pdfs';
        if (!is_dir($mainUploadsDir)) {
            @mkdir($mainUploadsDir, 0755, true);
        }
        @file_put_contents($mainUploadsDir . '/' . $fileName, $decodedBytes);

        header('Content-Type: application/pdf');
        header('Content-Length: ' . strlen($decodedBytes));
        header('Accept-Ranges: bytes');
        header('Cache-Control: public, max-age=86400');
        $disposition = $download ? 'attachment' : 'inline';
        header("Content-Disposition: {$disposition}; filename=\"{$displayName}\"");
        echo $decodedBytes;
        exit;
    }
}

// 3. No encontrado
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'error' => 'Documento PDF no encontrado en el servidor policial',
    'file' => $fileName
]);
