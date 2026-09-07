<?php
// PER-Medidas: Backend PHP para cPanel y hosting compartido
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/../data';
$uploadsDir = __DIR__ . '/../uploads/pdfs';

if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

// Determinar el endpoint solicitado
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH);
$route = basename($path);

// 1. Subida de PDF: /api/upload-pdf
if ($route === 'upload-pdf' || strpos($path, 'upload-pdf') !== false) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        exit;
    }

    if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No se recibió ningún archivo PDF válido']);
        exit;
    }

    $file = $_FILES['pdf'];
    $origName = basename($file['name']);
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

    if ($ext !== 'pdf') {
        http_response_code(400);
        echo json_encode(['error' => 'Solo se admiten archivos en formato PDF (.pdf)']);
        exit;
    }

    $sanitized = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
    $uniqueName = time() . '_' . substr($sanitized, 0, 60) . '.pdf';
    $targetPath = $uploadsDir . '/' . $uniqueName;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode([
            'success' => true,
            'fileUrl' => '/uploads/pdfs/' . $uniqueName,
            'fileName' => $uniqueName,
            'originalName' => $origName,
            'fileSize' => filesize($targetPath),
            'mimeType' => 'application/pdf',
            'uploadedAt' => date('c'),
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al mover el archivo al servidor']);
    }
    exit;
}

// Funciones para leer/guardar JSON en el servidor
function getJsonPath($name) {
    global $dataDir;
    return $dataDir . '/' . $name . '.json';
}

function readData($name, $fallback = []) {
    $file = getJsonPath($name);
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $decoded = json_decode($content, true);
        if ($decoded !== null) return $decoded;
    }
    return $fallback;
}

function writeData($name, $data) {
    $file = getJsonPath($name);
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// 2. Usuarios y contraseñas: /api/users
if ($route === 'users' || strpos($path, '/users') !== false) {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $users = readData('users', []);
        echo json_encode($users);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (is_array($input)) {
            // Check if single user or array
            if (isset($input['id'])) {
                $users = readData('users', []);
                $found = false;
                foreach ($users as &$u) {
                    if ($u['id'] === $input['id']) {
                        $u = array_merge($u, $input);
                        $found = true;
                        break;
                    }
                }
                if (!$found) $users[] = $input;
                writeData('users', $users);
                echo json_encode($input);
            } else {
                writeData('users', $input);
                echo json_encode($input);
            }
            exit;
        }
        http_response_code(400);
        echo json_encode(['error' => 'Datos inválidos']);
        exit;
    }
}

// 3. Medidas Judiciales: /api/measures
if ($route === 'measures' || strpos($path, '/measures') !== false) {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(readData('measures', []));
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (is_array($input)) {
            writeData('measures', $input);
            echo json_encode($input);
            exit;
        }
    }
}

// 4. Identificaciones: /api/identifications
if ($route === 'identifications' || strpos($path, '/identifications') !== false) {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(readData('identifications', []));
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (is_array($input)) {
            writeData('identifications', $input);
            echo json_encode($input);
            exit;
        }
    }
}

// 5. Documentos generales: /api/documents
if ($route === 'documents' || strpos($path, '/documents') !== false) {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(readData('documents', []));
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (is_array($input)) {
            writeData('documents', $input);
            echo json_encode($input);
            exit;
        }
    }
}

// Fallback health
echo json_encode(['status' => 'ok', 'server' => 'PHP cPanel API', 'time' => date('c')]);
