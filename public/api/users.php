<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Listar usuarios desde SQL
        $stmt = $pdo->query("SELECT id, username, password, name, email, role, badge_number as badgeNumber, department, status, created_at as createdAt, last_login as lastLogin FROM usuarios ORDER BY name ASC");
        $users = $stmt->fetchAll();
        echo json_encode($users);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Datos JSON inválidos']);
            exit();
        }

        // Si es un array de usuarios (sincronización completa)
        if (isset($data[0]) && is_array($data[0])) {
            $stmt = $pdo->prepare("
                INSERT INTO usuarios (id, username, password, name, email, role, badge_number, department, status, created_at)
                VALUES (:id, :username, :password, :name, :email, :role, :badge_number, :department, :status, NOW())
                ON DUPLICATE KEY UPDATE
                  username = VALUES(username),
                  password = IF(VALUES(password) != '', VALUES(password), password),
                  name = VALUES(name),
                  email = VALUES(email),
                  role = VALUES(role),
                  badge_number = VALUES(badge_number),
                  department = VALUES(department),
                  status = VALUES(status)
            ");

            foreach ($data as $u) {
                $stmt->execute([
                    ':id' => $u['id'] ?? ('usr-' . time() . '-' . rand(100, 999)),
                    ':username' => $u['username'] ?? $u['badgeNumber'] ?? ('user' . rand(1000, 9999)),
                    ':password' => $u['password'] ?? 'admin123',
                    ':name' => $u['name'] ?? 'Efectivo Policial',
                    ':email' => $u['email'] ?? null,
                    ':role' => $u['role'] ?? 'officer',
                    ':badge_number' => $u['badgeNumber'] ?? $u['badge_number'] ?? '00000',
                    ':department' => $u['department'] ?? 'Comisaría del Menor y V. Familiar',
                    ':status' => $u['status'] ?? 'active'
                ]);
            }

            echo json_encode(['success' => true, 'count' => count($data)]);
            exit();
        }

        // Si es un usuario único
        $id = $data['id'] ?? ('usr-' . time());
        $username = trim($data['username'] ?? $data['badgeNumber'] ?? '');
        $password = trim($data['password'] ?? 'admin123');
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $role = $data['role'] ?? 'officer';
        $badgeNumber = trim($data['badgeNumber'] ?? $data['badge_number'] ?? '');
        $department = $data['department'] ?? 'Comisaría del Menor y V. Familiar';
        $status = $data['status'] ?? 'active';

        $stmt = $pdo->prepare("
            INSERT INTO usuarios (id, username, password, name, email, role, badge_number, department, status, created_at)
            VALUES (:id, :username, :password, :name, :email, :role, :badge_number, :department, :status, NOW())
            ON DUPLICATE KEY UPDATE
              username = VALUES(username),
              password = IF(VALUES(password) != '', VALUES(password), password),
              name = VALUES(name),
              email = VALUES(email),
              role = VALUES(role),
              badge_number = VALUES(badge_number),
              department = VALUES(department),
              status = VALUES(status)
        ");

        $stmt->execute([
            ':id' => $id,
            ':username' => $username,
            ':password' => $password,
            ':name' => $name,
            ':email' => $email,
            ':role' => $role,
            ':badge_number' => $badgeNumber,
            ':department' => $department,
            ':status' => $status
        ]);

        echo json_encode(['success' => true, 'user' => $data]);
        exit();
    }

    if ($method === 'DELETE') {
        $uriParts = explode('/', $_SERVER['REQUEST_URI']);
        $userId = end($uriParts);
        if ($userId && $userId !== 'users.php') {
            $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = :id");
            $stmt->execute([':id' => $userId]);
            echo json_encode(['success' => true]);
            exit();
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en base de datos SQL: ' . $e->getMessage()]);
}
