<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, dni, nombre, apellido, alias, domicilio, fecha_control as fechaControl, oficial_interviniente as oficialInterviniente, observaciones, tiene_pedido_captura as tienePedidoCaptura, datos_extra as datosExtra, created_at as createdAt FROM personas_identificadas ORDER BY fecha_control DESC");
        $items = $stmt->fetchAll();
        
        $result = array_map(function($p) {
            if (!empty($p['datosExtra'])) {
                $decoded = json_decode($p['datosExtra'], true);
                if (is_array($decoded)) {
                    return array_merge($decoded, $p);
                }
            }
            return $p;
        }, $items);

        echo json_encode($result);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $persons = json_decode($raw, true);

        if (!is_array($persons)) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato JSON inválido']);
            exit();
        }

        $stmt = $pdo->prepare("
            INSERT INTO personas_identificadas (id, dni, nombre, apellido, alias, domicilio, fecha_control, oficial_interviniente, observaciones, tiene_pedido_captura, datos_extra, created_at)
            VALUES (:id, :dni, :nombre, :apellido, :alias, :domicilio, :fecha_control, :oficial_interviniente, :observaciones, :tiene_pedido_captura, :datos_extra, NOW())
            ON DUPLICATE KEY UPDATE
              dni = VALUES(dni),
              nombre = VALUES(nombre),
              apellido = VALUES(apellido),
              alias = VALUES(alias),
              domicilio = VALUES(domicilio),
              fecha_control = VALUES(fecha_control),
              oficial_interviniente = VALUES(oficial_interviniente),
              observaciones = VALUES(observaciones),
              tiene_pedido_captura = VALUES(tiene_pedido_captura),
              datos_extra = VALUES(datos_extra)
        ");

        foreach ($persons as $p) {
            $stmt->execute([
                ':id' => $p['id'] ?? ('id-' . time() . '-' . rand(100, 999)),
                ':dni' => $p['dni'] ?? '',
                ':nombre' => $p['nombre'] ?? '',
                ':apellido' => $p['apellido'] ?? '',
                ':alias' => $p['alias'] ?? null,
                ':domicilio' => $p['domicilio'] ?? null,
                ':fecha_control' => !empty($p['fechaControl']) ? date('Y-m-d H:i:s', strtotime($p['fechaControl'])) : date('Y-m-d H:i:s'),
                ':oficial_interviniente' => $p['oficialInterviniente'] ?? null,
                ':observaciones' => $p['observaciones'] ?? null,
                ':tiene_pedido_captura' => !empty($p['tienePedidoCaptura']) ? 1 : 0,
                ':datos_extra' => json_encode($p)
            ]);
        }

        echo json_encode(['success' => true, 'count' => count($persons)]);
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en base de datos SQL: ' . $e->getMessage()]);
}
