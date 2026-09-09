<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Utilice POST.']);
    exit();
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$identifier = trim($input['identifier'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($identifier) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Identificador y contraseña requeridos.']);
    exit();
}

try {
    $user = null;

    // 1. Buscar en MySQL si está disponible
    if ($pdo !== null) {
        try {
            $stmt = $pdo->prepare("
                SELECT id, username, password, name, email, role, badge_number as badgeNumber, department, status, created_at as createdAt, last_login as lastLogin 
                FROM usuarios 
                WHERE LOWER(username) = LOWER(:id1) 
                   OR LOWER(badge_number) = LOWER(:id2) 
                   OR LOWER(email) = LOWER(:id3)
                LIMIT 1
            ");
            $stmt->execute([
                ':id1' => $identifier,
                ':id2' => $identifier,
                ':id3' => $identifier
            ]);
            $user = $stmt->fetch();
        } catch (Exception $e) {}
    }

    // 2. Buscar en users.json (motor de persistencia en disco)
    if (!$user) {
        $jsonUsers = readJsonData('users.json', []);
        $cleanId = strtolower($identifier);
        foreach ($jsonUsers as $u) {
            $uName = strtolower(trim($u['username'] ?? ''));
            $uBadge = strtolower(trim($u['badgeNumber'] ?? $u['badge_number'] ?? ''));
            $uEmail = strtolower(trim($u['email'] ?? ''));
            if ($uName === $cleanId || $uBadge === $cleanId || $uEmail === $cleanId) {
                $user = $u;
                break;
            }
        }
    }

    // 3. Fallback especial para Superadmin maestro Leonel Navoni (30557 / admin)
    if (!$user && (strtolower($identifier) === 'admin' || $identifier === '30557' || strtolower($identifier) === 'leonel.navoni@gmail.com')) {
        $jsonUsers = readJsonData('users.json', []);
        foreach ($jsonUsers as $u) {
            if (($u['role'] ?? '') === 'superadmin' || ($u['id'] ?? '') === 'usr-1788786602829' || ($u['id'] ?? '') === 'usr-1') {
                $user = $u;
                break;
            }
        }
    }

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuario o legajo no encontrado en la base de datos policial.']);
        exit();
    }

    if (($user['status'] ?? 'active') !== 'active') {
        http_response_code(403);
        echo json_encode(['error' => 'El usuario se encuentra inactivo. Contacte al Administrador.']);
        exit();
    }

    // 4. Validación de contraseña
    $storedPass = trim($user['password'] ?? '');
    $isValid = ($password === $storedPass) || (strtolower($password) === strtolower($storedPass));

    // Claves maestras del superadministrador
    if (!$isValid && ($user['role'] ?? '') === 'superadmin') {
        $pLower = strtolower($password);
        if ($pLower === 'almorial1' || $pLower === 'almorial' || $pLower === 'navoni30557' || $password === 'NAVONI30557') {
            $isValid = true;
        }
    }

    if (!$isValid) {
        http_response_code(401);
        echo json_encode(['error' => 'Contraseña incorrecta. Verifique sus credenciales.']);
        exit();
    }

    // 5. Actualizar última conexión
    $now = date('c');
    $user['lastLogin'] = $now;

    // Actualizar en JSON
    $jsonUsers = readJsonData('users.json', []);
    foreach ($jsonUsers as &$ju) {
        if ($ju['id'] === $user['id']) {
            $ju['lastLogin'] = $now;
            break;
        }
    }
    writeJsonData('users.json', $jsonUsers);

    // Actualizar en SQL si está conectado
    if ($pdo !== null) {
        try {
            $updateStmt = $pdo->prepare("UPDATE usuarios SET last_login = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $user['id']]);
        } catch (Exception $e) {}
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'] ?? $user['badgeNumber'] ?? '',
            'name' => $user['name'],
            'email' => $user['email'] ?? '',
            'role' => $user['role'],
            'badgeNumber' => $user['badgeNumber'] ?? $user['badge_number'] ?? '',
            'department' => $user['department'] ?? 'Comisaría del Menor y V. Familiar',
            'status' => $user['status'] ?? 'active',
            'lastLogin' => $user['lastLogin']
        ],
        'token' => 'auth_' . bin2hex(random_bytes(16))
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}
