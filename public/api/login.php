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
    // Buscar usuario por username, legajo o email en MySQL
    $stmt = $pdo->prepare("
        SELECT id, username, password, name, email, role, badge_number, department, status, created_at, last_login 
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

    // Fallback para admin maestro si no se encuentra
    if (!$user && (strtolower($identifier) === 'admin' || $identifier === '30557')) {
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE role = 'superadmin' LIMIT 1");
        $stmt->execute();
        $user = $stmt->fetch();
    }

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuario o legajo no encontrado en la base de datos SQL.']);
        exit();
    }

    if ($user['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(['error' => 'El usuario se encuentra inactivo. Contacte al Administrador.']);
        exit();
    }

    // Validación de contraseña
    $storedPass = trim($user['password']);
    $isValid = ($password === $storedPass) || (strtolower($password) === strtolower($storedPass));

    // Compatibilidad para superadmin
    if (!$isValid && $user['role'] === 'superadmin') {
        $pLower = strtolower($password);
        if ($pLower === 'almorial1' || $pLower === 'almorial' || $pLower === 'navoni30557' || $password === 'NAVONI30557') {
            $isValid = true;
        }
    }

    if (!$isValid) {
        http_response_code(401);
        echo json_encode(['error' => 'Contraseña incorrecta. Verifique mayúsculas y minúsculas.']);
        exit();
    }

    // Actualizar fecha de último ingreso
    $updateStmt = $pdo->prepare("UPDATE usuarios SET last_login = NOW() WHERE id = :id");
    $updateStmt->execute([':id' => $user['id']]);

    // Retornar perfil de usuario sin exponer el hash/clave
    unset($user['password']);
    
    // Normalizar nombres de campos para la App
    $responseUser = [
        'id' => $user['id'],
        'username' => $user['username'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'badgeNumber' => $user['badge_number'],
        'department' => $user['department'],
        'status' => $user['status'],
        'createdAt' => $user['created_at'],
        'lastLogin' => date('Y-m-d H:i:s')
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Autenticación SQL exitosa.',
        'user' => $responseUser
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno al autenticar con la base de datos SQL: ' . $e->getMessage()]);
}
