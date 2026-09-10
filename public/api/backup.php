<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';
$id = isset($_GET['id']) ? strtolower(trim($_GET['id'])) : '';

if (!$action && $id) {
    $action = $id;
}

try {
    // 1. EXPORTAR COPIA DE SEGURIDAD (GET)
    if ($method === 'GET' || $action === 'export') {
        $users = readJsonData('users.json', []);
        $measures = readJsonData('measures.json', []);
        $identifications = readJsonData('identifications.json', []);
        $documents = readJsonData('documents.json', []);
        $auditLogs = readJsonData('audit.json', []);

        // Si hay base MySQL conectada, consultar los registros más recientes
        if ($pdo !== null) {
            try {
                $stmt = $pdo->query("SELECT * FROM medidas_judiciales ORDER BY created_at DESC");
                $dbMeasures = $stmt->fetchAll();
                if (!empty($dbMeasures)) {
                    $measures = array_map(function($m) {
                        if (!empty($m['datos_extra'])) {
                            $extra = json_decode($m['datos_extra'], true);
                            if (is_array($extra)) return array_merge($extra, $m);
                        }
                        return $m;
                    }, $dbMeasures);
                }
            } catch (Exception $e) {}

            try {
                $stmt = $pdo->query("SELECT * FROM personas_identificadas ORDER BY created_at DESC");
                $dbPersons = $stmt->fetchAll();
                if (!empty($dbPersons)) {
                    $identifications = $dbPersons;
                }
            } catch (Exception $e) {}
        }

        $backupPackage = [
            'app' => 'Policia Entre Rios - Comisaria de Minoridad y Violencia Familiar',
            'version' => '1.0.0',
            'exportedAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'exportedTimestamp' => round(microtime(true) * 1000),
            'data' => [
                'users' => $users,
                'measures' => $measures,
                'identifications' => $identifications,
                'documents' => $documents,
                'auditLogs' => $auditLogs,
            ],
            'summary' => [
                'totalUsers' => count($users),
                'totalMeasures' => count($measures),
                'totalIdentifications' => count($identifications),
                'totalDocuments' => count($documents),
                'totalAuditLogs' => count($auditLogs),
            ],
        ];

        echo json_encode($backupPackage, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit();
    }

    // 2. RESTAURAR COPIA DE SEGURIDAD (POST)
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $backupData = json_decode($raw, true);

        if (!$backupData || !is_array($backupData)) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato de archivo de respaldo inválido o vacío']);
            exit();
        }

        $payload = isset($backupData['data']) && is_array($backupData['data']) ? $backupData['data'] : $backupData;

        $restored = [
            'users' => 0,
            'measures' => 0,
            'identifications' => 0,
            'documents' => 0,
            'auditLogs' => 0,
        ];

        // 1. Restaurar Usuarios
        if (!empty($payload['users']) && is_array($payload['users'])) {
            $usersToSave = $payload['users'];
            // Asegurar superadmin
            $hasAdmin = false;
            foreach ($usersToSave as $u) {
                if (isset($u['role']) && ($u['role'] === 'superadmin' || $u['role'] === 'admin')) {
                    $hasAdmin = true;
                    break;
                }
            }
            if (!$hasAdmin) {
                $existingUsers = readJsonData('users.json', []);
                if (!empty($existingUsers)) {
                    array_unshift($usersToSave, $existingUsers[0]);
                }
            }
            writeJsonData('users.json', $usersToSave);
            $restored['users'] = count($usersToSave);
        }

        // 2. Restaurar Medidas Judiciales
        if (!empty($payload['measures']) && is_array($payload['measures'])) {
            writeJsonData('measures.json', $payload['measures']);
            $restored['measures'] = count($payload['measures']);
        }

        // 3. Restaurar Identificaciones
        if (!empty($payload['identifications']) && is_array($payload['identifications'])) {
            writeJsonData('identifications.json', $payload['identifications']);
            $restored['identifications'] = count($payload['identifications']);
        }

        // 4. Restaurar Documentos
        if (isset($payload['documents']) && is_array($payload['documents'])) {
            writeJsonData('documents.json', $payload['documents']);
            $restored['documents'] = count($payload['documents']);
        }

        // 5. Registrar en Auditoría
        $existingAudit = readJsonData('audit.json', []);
        $newLog = [
            'id' => 'restore-' . time(),
            'userId' => 'admin-system',
            'userName' => 'Sistema Policial',
            'userRole' => 'superadmin',
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'action' => 'UPDATE_PERMISSIONS',
            'details' => "Restauración de base de datos desde copia de seguridad ({$restored['measures']} medidas, {$restored['identifications']} personas, {$restored['users']} usuarios)",
            'status' => 'SUCCESS',
        ];
        array_unshift($existingAudit, $newLog);
        writeJsonData('audit.json', array_slice($existingAudit, 0, 2000));
        $restored['auditLogs'] = count($existingAudit);

        echo json_encode([
            'success' => true,
            'message' => 'Copia de seguridad restaurada correctamente',
            'restored' => $restored,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
