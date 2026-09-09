<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Helper para obtener ID de usuario desde query string, body o path
function getRequestedUserId() {
    if (!empty($_GET['id'])) {
        return trim($_GET['id']);
    }
    $raw = file_get_contents('php://input');
    if ($raw) {
        $data = json_decode($raw, true);
        if (!empty($data['id'])) {
            return trim($data['id']);
        }
    }
    // Inspeccionar URI por si viene en formato /api/users/usr-123
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    $last = end($parts);
    if ($last && $last !== 'users.php' && $last !== 'users' && strpos($last, 'usr-') === 0) {
        return $last;
    }
    return null;
}

try {
    // 1. OBTENER LISTA DE USUARIOS (GET)
    if ($method === 'GET') {
        $users = [];
        if ($pdo !== null) {
            try {
                $stmt = $pdo->query("SELECT id, username, password, name, email, role, badge_number as badgeNumber, department, status, created_at as createdAt, last_login as lastLogin FROM usuarios ORDER BY name ASC");
                $users = $stmt->fetchAll();
            } catch (Exception $e) {
                // Fallback a JSON si la tabla no existe aún
                $users = readJsonData('users.json', []);
            }
        } else {
            $users = readJsonData('users.json', []);
        }

        // Si la lista está vacía, cargar semilla de seguridad inicial
        if (empty($users)) {
            $users = [
                [
                    'id' => 'usr-1788786602829',
                    'username' => '30557',
                    'password' => 'NAVONI30557',
                    'name' => 'Sargento Navoni Leonel',
                    'email' => 'leonel.navoni@gmail.com',
                    'role' => 'superadmin',
                    'badgeNumber' => '30557',
                    'department' => 'Comisaría del Menor y V. Familiar',
                    'status' => 'active',
                    'createdAt' => date('c'),
                    'lastLogin' => date('c')
                ],
                [
                    'id' => 'usr-1',
                    'username' => 'admin',
                    'password' => 'almorial1',
                    'name' => 'Leonel Navoni',
                    'email' => 'leonel.navoni@gmail.com',
                    'role' => 'superadmin',
                    'badgeNumber' => '30557',
                    'department' => 'Comisaría del Menor y V. Familiar',
                    'status' => 'active',
                    'createdAt' => date('c'),
                    'lastLogin' => date('c')
                ]
            ];
            writeJsonData('users.json', $users);
        }

        echo json_encode($users);
        exit();
    }

    // 2. CREAR / ACTUALIZAR / ELIMINAR VÍA POST
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Datos JSON inválidos']);
            exit();
        }

        // A. Acción explícita de eliminación vía POST: { "action": "delete", "id": "usr-..." }
        if (isset($data['action']) && $data['action'] === 'delete' && !empty($data['id'])) {
            $deleteId = trim($data['id']);
            // Borrar de JSON
            $currentUsers = readJsonData('users.json', []);
            $filtered = array_values(array_filter($currentUsers, function($u) use ($deleteId) {
                return $u['id'] !== $deleteId;
            }));
            writeJsonData('users.json', $filtered);

            // Borrar de SQL si está conectado
            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = :id");
                    $stmt->execute([':id' => $deleteId]);
                } catch (Exception $e) {}
            }

            echo json_encode(['success' => true, 'deletedId' => $deleteId, 'remaining' => count($filtered)]);
            exit();
        }

        // B. Sincronización completa de lista de usuarios (Array de usuarios)
        if (isset($data[0]) && is_array($data[0])) {
            $usersList = $data;

            // Asegurar que el Superadministrador nunca sea eliminado
            $hasSuperAdmin = false;
            foreach ($usersList as $u) {
                if (($u['role'] ?? '') === 'superadmin' || ($u['id'] ?? '') === 'usr-1' || ($u['id'] ?? '') === 'usr-1788786602829') {
                    $hasSuperAdmin = true;
                    break;
                }
            }
            if (!$hasSuperAdmin) {
                array_unshift($usersList, [
                    'id' => 'usr-1788786602829',
                    'username' => '30557',
                    'password' => 'NAVONI30557',
                    'name' => 'Sargento Navoni Leonel',
                    'email' => 'leonel.navoni@gmail.com',
                    'role' => 'superadmin',
                    'badgeNumber' => '30557',
                    'department' => 'Comisaría del Menor y V. Familiar',
                    'status' => 'active',
                    'createdAt' => date('c'),
                    'lastLogin' => date('c')
                ]);
            }

            // Guardar en JSON (reemplazo completo)
            writeJsonData('users.json', $usersList);

            // Si hay MySQL, actualizar e insertar Y eliminar los que ya no están en la lista
            if ($pdo !== null) {
                try {
                    $validIds = [];
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

                    foreach ($usersList as $u) {
                        $uId = $u['id'] ?? ('usr-' . time() . '-' . rand(100, 999));
                        $validIds[] = $uId;
                        $stmt->execute([
                            ':id' => $uId,
                            ':username' => $u['username'] ?? $u['badgeNumber'] ?? ('user' . rand(1000, 9999)),
                            ':password' => $u['password'] ?? 'admin123',
                            ':name' => $u['name'] ?? 'Efectivo Policial',
                            ':email' => $u['email'] ?? null,
                            ':role' => $u['role'] ?? 'officer',
                            ':badge_number' => $u['badgeNumber'] ?? '00000',
                            ':department' => $u['department'] ?? 'Comisaría del Menor y V. Familiar',
                            ':status' => $u['status'] ?? 'active'
                        ]);
                    }

                    // Eliminar de MySQL los usuarios que fueron quitados de la lista (salvo superadmin)
                    if (!empty($validIds)) {
                        $placeholders = implode(',', array_fill(0, count($validIds), '?'));
                        $delStmt = $pdo->prepare("DELETE FROM usuarios WHERE id NOT IN ($placeholders) AND role != 'superadmin'");
                        $delStmt->execute($validIds);
                    }
                } catch (Exception $e) {}
            }

            echo json_encode($usersList);
            exit();
        }

        // C. Guardar usuario individual
        if (isset($data['id'])) {
            $userToSave = $data;
            $currentUsers = readJsonData('users.json', []);
            $found = false;
            foreach ($currentUsers as &$u) {
                if ($u['id'] === $userToSave['id']) {
                    $u = array_merge($u, $userToSave);
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                array_unshift($currentUsers, $userToSave);
            }
            writeJsonData('users.json', $currentUsers);

            if ($pdo !== null) {
                try {
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
                        ':id' => $userToSave['id'],
                        ':username' => $userToSave['username'] ?? $userToSave['badgeNumber'] ?? '',
                        ':password' => $userToSave['password'] ?? 'admin123',
                        ':name' => $userToSave['name'] ?? '',
                        ':email' => $userToSave['email'] ?? null,
                        ':role' => $userToSave['role'] ?? 'officer',
                        ':badge_number' => $userToSave['badgeNumber'] ?? '',
                        ':department' => $userToSave['department'] ?? 'Comisaría del Menor y V. Familiar',
                        ':status' => $userToSave['status'] ?? 'active'
                    ]);
                } catch (Exception $e) {}
            }

            echo json_encode($userToSave);
            exit();
        }

        http_response_code(400);
        echo json_encode(['error' => 'Formato no reconocido']);
        exit();
    }

    // 3. ELIMINAR USUARIO (DELETE)
    if ($method === 'DELETE') {
        $userId = getRequestedUserId();
        if (!$userId) {
            http_response_code(400);
            echo json_encode(['error' => 'Se requiere el ID de usuario a eliminar']);
            exit();
        }

        // Borrar de JSON
        $currentUsers = readJsonData('users.json', []);
        $filtered = array_values(array_filter($currentUsers, function($u) use ($userId) {
            return $u['id'] !== $userId;
        }));
        writeJsonData('users.json', $filtered);

        // Borrar de SQL si está conectado
        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = :id AND role != 'superadmin'");
                $stmt->execute([':id' => $userId]);
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true, 'deletedId' => $userId, 'remaining' => count($filtered)]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}
