<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $docs = [];
        if ($pdo !== null) {
            try {
                $stmt = $pdo->query("SELECT id, name, file_url as fileUrl, size, mime_type as mimeType, category, status, created_at as createdAt FROM documentos_pdf ORDER BY created_at DESC");
                $docs = $stmt->fetchAll();
            } catch (Exception $e) {
                $docs = readJsonData('documents.json', []);
            }
        } else {
            $docs = readJsonData('documents.json', []);
        }
        echo json_encode($docs);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $docs = json_decode($raw, true);

        if (!is_array($docs)) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato JSON inválido']);
            exit();
        }

        $items = isset($docs[0]) ? $docs : [$docs];

        $currentDocs = readJsonData('documents.json', []);
        foreach ($items as $d) {
            array_unshift($currentDocs, $d);
        }
        writeJsonData('documents.json', $currentDocs);

        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO documentos_pdf (id, name, file_url, size, mime_type, category, status, created_at)
                    VALUES (:id, :name, :file_url, :size, :mime_type, :category, :status, NOW())
                    ON DUPLICATE KEY UPDATE
                      name = VALUES(name),
                      file_url = VALUES(file_url),
                      size = VALUES(size),
                      category = VALUES(category),
                      status = VALUES(status)
                ");

                foreach ($items as $d) {
                    $stmt->execute([
                        ':id' => $d['id'] ?? ('doc-' . time() . '-' . rand(100, 999)),
                        ':name' => $d['name'] ?? 'Documento Policial.pdf',
                        ':file_url' => $d['fileUrl'] ?? $d['url'] ?? '',
                        ':size' => $d['size'] ?? 0,
                        ':mime_type' => $d['mimeType'] ?? 'application/pdf',
                        ':category' => $d['category'] ?? 'Oficio Judicial',
                        ':status' => $d['status'] ?? 'processed'
                    ]);
                }
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true, 'count' => count($items)]);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}
