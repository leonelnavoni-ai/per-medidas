<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

function getRequestedMeasureId() {
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
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    $last = end($parts);
    if ($last && $last !== 'measures.php' && $last !== 'measures') {
        return $last;
    }
    return null;
}

try {
    // 1. LISTAR MEDIDAS (GET)
    if ($method === 'GET') {
        $items = [];
        if ($pdo !== null) {
            try {
                $stmt = $pdo->query("SELECT id, caratula, expediente, juzgado, tipo_medida as tipoMedida, estado, fecha_inicio as fechaInicio, fecha_vencimiento as fechaVencimiento, notificados, observaciones, datos_extra as datosExtra, created_at as createdAt FROM medidas_judiciales ORDER BY created_at DESC");
                $rows = $stmt->fetchAll();
                $items = array_map(function($m) {
                    if (!empty($m['datosExtra'])) {
                        $decoded = json_decode($m['datosExtra'], true);
                        if (is_array($decoded)) {
                            return array_merge($decoded, $m);
                        }
                    }
                    return $m;
                }, $rows);
            } catch (Exception $e) {
                $items = readJsonData('measures.json', []);
            }
        } else {
            $items = readJsonData('measures.json', []);
        }

        echo json_encode($items);
        exit();
    }

    // 2. GUARDAR MEDIDAS (POST)
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato JSON inválido']);
            exit();
        }

        // A. Acción de borrado vía POST: { "action": "delete", "id": "..." }
        if (isset($data['action']) && $data['action'] === 'delete' && !empty($data['id'])) {
            $delId = trim($data['id']);
            $current = readJsonData('measures.json', []);
            $filtered = array_values(array_filter($current, function($m) use ($delId) {
                return $m['id'] !== $delId;
            }));
            writeJsonData('measures.json', $filtered);

            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("DELETE FROM medidas_judiciales WHERE id = :id");
                    $stmt->execute([':id' => $delId]);
                } catch (Exception $e) {}
            }

            echo json_encode(['success' => true, 'deletedId' => $delId]);
            exit();
        }

        // B. Lista completa de medidas (Array)
        if (isset($data[0]) && is_array($data[0])) {
            $measuresList = $data;
            writeJsonData('measures.json', $measuresList);

            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO medidas_judiciales (id, caratula, expediente, juzgado, tipo_medida, estado, fecha_inicio, fecha_vencimiento, notificados, observaciones, datos_extra, created_at)
                        VALUES (:id, :caratula, :expediente, :juzgado, :tipo_medida, :estado, :fecha_inicio, :fecha_vencimiento, :notificados, :observaciones, :datos_extra, NOW())
                        ON DUPLICATE KEY UPDATE
                          caratula = VALUES(caratula),
                          expediente = VALUES(expediente),
                          juzgado = VALUES(juzgado),
                          tipo_medida = VALUES(tipo_medida),
                          estado = VALUES(estado),
                          fecha_inicio = VALUES(fecha_inicio),
                          fecha_vencimiento = VALUES(fecha_vencimiento),
                          notificados = VALUES(notificados),
                          observaciones = VALUES(observaciones),
                          datos_extra = VALUES(datos_extra)
                    ");

                    foreach ($measuresList as $m) {
                        $mId = $m['id'] ?? ('med-' . time() . '-' . rand(100, 999));
                        $stmt->execute([
                            ':id' => $mId,
                            ':caratula' => $m['caratula'] ?? 'Sin carátula',
                            ':expediente' => $m['expediente'] ?? null,
                            ':juzgado' => $m['juzgado'] ?? null,
                            ':tipo_medida' => $m['tipoMedida'] ?? $m['tipo_medida'] ?? 'Medida Cautelar',
                            ':estado' => $m['estado'] ?? 'vigente',
                            ':fecha_inicio' => !empty($m['fechaInicio']) ? date('Y-m-d', strtotime($m['fechaInicio'])) : null,
                            ':fecha_vencimiento' => !empty($m['fechaVencimiento']) ? date('Y-m-d', strtotime($m['fechaVencimiento'])) : null,
                            ':notificados' => !empty($m['notificados']) ? (is_array($m['notificados']) ? json_encode($m['notificados']) : $m['notificados']) : null,
                            ':observaciones' => $m['observaciones'] ?? null,
                            ':datos_extra' => json_encode($m)
                        ]);
                    }
                } catch (Exception $e) {}
            }

            echo json_encode($measuresList);
            exit();
        }

        // C. Medida individual (Objeto único)
        if (isset($data['id']) || isset($data['caratula']) || isset($data['victima'])) {
            $measure = $data;
            if (empty($measure['id'])) {
                $measure['id'] = 'med-' . time() . '-' . rand(100, 999);
            }

            $current = readJsonData('measures.json', []);
            $found = false;
            foreach ($current as &$m) {
                if ($m['id'] === $measure['id']) {
                    $m = array_merge($m, $measure);
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                array_unshift($current, $measure);
            }
            writeJsonData('measures.json', $current);

            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO medidas_judiciales (id, caratula, expediente, juzgado, tipo_medida, estado, fecha_inicio, fecha_vencimiento, notificados, observaciones, datos_extra, created_at)
                        VALUES (:id, :caratula, :expediente, :juzgado, :tipo_medida, :estado, :fecha_inicio, :fecha_vencimiento, :notificados, :observaciones, :datos_extra, NOW())
                        ON DUPLICATE KEY UPDATE
                          caratula = VALUES(caratula),
                          expediente = VALUES(expediente),
                          juzgado = VALUES(juzgado),
                          tipo_medida = VALUES(tipo_medida),
                          estado = VALUES(estado),
                          fecha_inicio = VALUES(fecha_inicio),
                          fecha_vencimiento = VALUES(fecha_vencimiento),
                          notificados = VALUES(notificados),
                          observaciones = VALUES(observaciones),
                          datos_extra = VALUES(datos_extra)
                    ");
                    $stmt->execute([
                        ':id' => $measure['id'],
                        ':caratula' => $measure['caratula'] ?? 'Sin carátula',
                        ':expediente' => $measure['expediente'] ?? null,
                        ':juzgado' => $measure['juzgado'] ?? null,
                        ':tipo_medida' => $measure['tipoMedida'] ?? $measure['tipo_medida'] ?? 'Medida Cautelar',
                        ':estado' => $measure['estado'] ?? 'vigente',
                        ':fecha_inicio' => !empty($measure['fechaInicio']) ? date('Y-m-d', strtotime($measure['fechaInicio'])) : null,
                        ':fecha_vencimiento' => !empty($measure['fechaVencimiento']) ? date('Y-m-d', strtotime($measure['fechaVencimiento'])) : null,
                        ':notificados' => !empty($measure['notificados']) ? (is_array($measure['notificados']) ? json_encode($measure['notificados']) : $measure['notificados']) : null,
                        ':observaciones' => $measure['observaciones'] ?? null,
                        ':datos_extra' => json_encode($measure)
                    ]);
                } catch (Exception $e) {}
            }

            echo json_encode($measure);
            exit();
        }

        http_response_code(400);
        echo json_encode(['error' => 'Formato no reconocido']);
        exit();
    }

    // 3. ELIMINAR MEDIDA (DELETE)
    if ($method === 'DELETE') {
        $mId = getRequestedMeasureId();
        if (!$mId) {
            http_response_code(400);
            echo json_encode(['error' => 'Se requiere el ID de la medida a eliminar']);
            exit();
        }

        $current = readJsonData('measures.json', []);
        $filtered = array_values(array_filter($current, function($m) use ($mId) {
            return $m['id'] !== $mId;
        }));
        writeJsonData('measures.json', $filtered);

        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare("DELETE FROM medidas_judiciales WHERE id = :id");
                $stmt->execute([':id' => $mId]);
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true, 'deletedId' => $mId]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}
