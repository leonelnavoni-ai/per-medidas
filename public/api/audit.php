<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $logs = [];
        if ($pdo !== null) {
            try {
                $stmt = $pdo->query("SELECT id, user_id as userId, user_name as userName, user_role as userRole, action, target_file_name as targetFileName, details, status, timestamp FROM logs_auditoria ORDER BY timestamp DESC LIMIT 1000");
                $logs = $stmt->fetchAll();
            } catch (Exception $e) {
                $logs = readJsonData('audit.json', []);
            }
        } else {
            $logs = readJsonData('audit.json', []);
        }

        echo json_encode($logs);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato JSON inválido']);
            exit();
        }

        $items = isset($data['id']) ? [$data] : (is_array($data) ? $data : []);

        // Guardar en JSON (manteniendo los 2000 más recientes)
        $currentLogs = readJsonData('audit.json', []);
        foreach ($items as $item) {
            array_unshift($currentLogs, $item);
        }
        if (count($currentLogs) > 2000) {
            $currentLogs = array_slice($currentLogs, 0, 2000);
        }
        writeJsonData('audit.json', $currentLogs);

        // Guardar en MySQL si está conectado
        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO logs_auditoria (id, user_id, user_name, user_role, action, target_file_name, details, status, timestamp)
                    VALUES (:id, :user_id, :user_name, :user_role, :action, :target_file_name, :details, :status, :timestamp)
                    ON DUPLICATE KEY UPDATE
                      user_name = VALUES(user_name),
                      user_role = VALUES(user_role),
                      action = VALUES(action),
                      target_file_name = VALUES(target_file_name),
                      details = VALUES(details),
                      status = VALUES(status)
                ");

                foreach ($items as $item) {
                    $stmt->execute([
                        ':id' => $item['id'] ?? ('log-' . time() . '-' . rand(100, 999)),
                        ':user_id' => $item['userId'] ?? '',
                        ':user_name' => $item['userName'] ?? 'Sistema',
                        ':user_role' => $item['userRole'] ?? 'viewer',
                        ':action' => $item['action'] ?? 'AUDIT',
                        ':target_file_name' => $item['targetFileName'] ?? null,
                        ':details' => $item['details'] ?? '',
                        ':status' => $item['status'] ?? 'SUCCESS',
                        ':timestamp' => !empty($item['timestamp']) ? date('Y-m-d H:i:s', strtotime($item['timestamp'])) : date('Y-m-d H:i:s')
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
