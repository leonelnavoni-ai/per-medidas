<?php
// ==========================================================
// SUBIDA DE ARCHIVOS PDF AL SERVIDOR WEB
// Guarda el archivo en uploads/pdfs/ y lo registra en SQL
// ==========================================================

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Utilice POST con multipart/form-data.']);
    exit();
}

if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió ningún archivo PDF válido o hubo un error en la subida.']);
    exit();
}

$file = $_FILES['pdf'];
$origName = basename($file['name']);
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

if ($ext !== 'pdf') {
    http_response_code(400);
    echo json_encode(['error' => 'Solo se permiten archivos en formato PDF (.pdf).']);
    exit();
}

// Directorio en el servidor web (public_html/uploads/pdfs)
$primaryDir = dirname(__DIR__) . '/uploads/pdfs';
$secondaryDir = dirname(__DIR__, 2) . '/uploads/pdfs';

if (!is_dir($primaryDir)) {
    @mkdir($primaryDir, 0755, true);
}
if (!is_dir($secondaryDir)) {
    @mkdir($secondaryDir, 0755, true);
}

$safeBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
$safeBase = substr($safeBase, 0, 50);
$uniqueName = time() . '_' . $safeBase . '.pdf';
$targetFilePath = $primaryDir . '/' . $uniqueName;

if (!move_uploaded_file($file['tmp_name'], $targetFilePath)) {
    // Si falló en la ruta primaria, intentar en la secundaria
    $targetFilePath = $secondaryDir . '/' . $uniqueName;
    if (!move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo guardar el archivo PDF en el directorio uploads del servidor. Verifique permisos 755.']);
        exit();
    }
} else {
    // Copiar también a la ruta secundaria para máxima compatibilidad
    @copy($targetFilePath, $secondaryDir . '/' . $uniqueName);
}

@chmod($targetFilePath, 0644);

$fileUrl = '/uploads/pdfs/' . $uniqueName;
$fileSize = filesize($targetFilePath);
$docId = 'doc-' . time() . '-' . rand(100, 999);

$newDoc = [
    'id' => $docId,
    'name' => $origName,
    'fileUrl' => $fileUrl,
    'size' => $fileSize,
    'mimeType' => 'application/pdf',
    'originalName' => $origName,
    'createdAt' => date('c')
];

// Guardar en documents.json
$currDocs = readJsonData('documents.json', []);
array_unshift($currDocs, $newDoc);
writeJsonData('documents.json', $currDocs);

if ($pdo !== null) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO documentos_pdf (id, name, file_url, size, mime_type, original_name, created_at)
            VALUES (:id, :name, :file_url, :size, 'application/pdf', :orig_name, NOW())
        ");
        $stmt->execute([
            ':id' => $docId,
            ':name' => $origName,
            ':file_url' => $fileUrl,
            ':size' => $fileSize,
            ':orig_name' => $origName
        ]);
    } catch (Exception $e) {}
}

echo json_encode([
    'success' => true,
    'fileUrl' => $fileUrl,
    'fileName' => $uniqueName,
    'originalName' => $origName,
    'fileSize' => $fileSize,
    'mimeType' => 'application/pdf',
    'uploadedAt' => date('Y-m-d H:i:s')
]);
