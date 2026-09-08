<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Create table if not exists
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS logs_auditoria (
                id VARCHAR(100) PRIMARY KEY,
                user_id VARCHAR(100),
                user_name VARCHAR(255),
                user_role VARCHAR(50),
                action VARCHAR(100),
                target_file_name VARCHAR(255),
                details TEXT,
                status VARCHAR(20) DEFAULT 'SUCCESS',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $stmt = $pdo->query("SELECT id, user_id as userId, user_name as userName, user_role as userRole, action, target_file_name as targetFileName, details, status, timestamp FROM logs_auditoria ORDER BY timestamp DESC LIMIT 1000");
        $logs = $stmt->fetchAll();
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
                ':timestamp' => isset($item['timestamp']) ? date('Y-m-d H:i:s', strtotime($item['timestamp'])) : date('Y-m-d H:i:s'),
            ]);
        }

        echo json_encode(['success' => true, 'count' => count($items)]);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en base de datos SQL de auditoría: ' . $e->getMessage()]);
}
