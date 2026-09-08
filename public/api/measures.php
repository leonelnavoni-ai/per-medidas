<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, caratula, expediente, juzgado, tipo_medida as tipoMedida, estado, fecha_inicio as fechaInicio, fecha_vencimiento as fechaVencimiento, notificados, observaciones, datos_extra as datosExtra, created_at as createdAt FROM medidas_judiciales ORDER BY created_at DESC");
        $measures = $stmt->fetchAll();
        
        $result = array_map(function($m) {
            if (!empty($m['datosExtra'])) {
                $decoded = json_decode($m['datosExtra'], true);
                if (is_array($decoded)) {
                    return array_merge($decoded, $m);
                }
            }
            return $m;
        }, $measures);

        echo json_encode($result);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $measures = json_decode($raw, true);

        if (!is_array($measures)) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato JSON inválido']);
            exit();
        }

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

        foreach ($measures as $m) {
            $stmt->execute([
                ':id' => $m['id'] ?? ('med-' . time() . '-' . rand(100, 999)),
                ':caratula' => $m['caratula'] ?? 'Sin carátula',
                ':expediente' => $m['expediente'] ?? null,
                ':juzgado' => $m['juzgado'] ?? null,
                ':tipo_medida' => $m['tipoMedida'] ?? $m['tipo_medida'] ?? 'Medida Cautelar',
                ':estado' => $m['estado'] ?? 'vigente',
                ':fecha_inicio' => !empty($m['fechaInicio']) ? date('Y-m-d', strtotime($m['fechaInicio'])) : null,
                ':fecha_vencimiento' => !empty($m['fechaVencimiento']) ? date('Y-m-d', strtotime($m['fechaVencimiento'])) : null,
                ':notificados' => is_array($m['notificados'] ?? null) ? implode(', ', $m['notificados']) : ($m['notificados'] ?? ''),
                ':observaciones' => $m['observaciones'] ?? null,
                ':datos_extra' => json_encode($m)
            ]);
        }

        echo json_encode(['success' => true, 'count' => count($measures)]);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en base de datos SQL: ' . $e->getMessage()]);
}
