<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

function getRequestedPersonId() {
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
    if ($last && $last !== 'identifications.php' && $last !== 'identifications') {
        return $last;
    }
    return null;
}

try {
    // 1. LISTAR IDENTIFICACIONES (GET)
    if ($method === 'GET') {
        $items = [];
        if ($pdo !== null) {
            try {
                $stmt = $pdo->query("SELECT id, dni, nombre, apellido, alias, domicilio, fecha_control as fechaControl, oficial_interviniente as oficialInterviniente, observaciones, tiene_pedido_captura as tienePedidoCaptura, datos_extra as datosExtra, created_at as createdAt FROM personas_identificadas ORDER BY fecha_control DESC");
                $rows = $stmt->fetchAll();
                $items = array_map(function($p) {
                    if (!empty($p['datosExtra'])) {
                        $decoded = json_decode($p['datosExtra'], true);
                        if (is_array($decoded)) {
                            return array_merge($decoded, $p);
                        }
                    }
                    return $p;
                }, $rows);
            } catch (Exception $e) {
                $items = readJsonData('identifications.json', []);
            }
        } else {
            $items = readJsonData('identifications.json', []);
        }

        echo json_encode($items);
        exit();
    }

    // 2. GUARDAR IDENTIFICACIÓN (POST)
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
            $current = readJsonData('identifications.json', []);
            $filtered = array_values(array_filter($current, function($p) use ($delId) {
                return $p['id'] !== $delId;
            }));
            writeJsonData('identifications.json', $filtered);

            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("DELETE FROM personas_identificadas WHERE id = :id");
                    $stmt->execute([':id' => $delId]);
                } catch (Exception $e) {}
            }

            echo json_encode(['success' => true, 'deletedId' => $delId]);
            exit();
        }

        // B. Lista completa de personas (Array de objetos)
        if (isset($data[0]) && is_array($data[0])) {
            $personsList = $data;
            writeJsonData('identifications.json', $personsList);

            if ($pdo !== null) {
                try {
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

                    foreach ($personsList as $p) {
                        $pId = $p['id'] ?? ('id-' . time() . '-' . rand(100, 999));
                        $stmt->execute([
                            ':id' => $pId,
                            ':dni' => $p['dni'] ?? '',
                            ':nombre' => $p['nombre'] ?? $p['apellidoNombre'] ?? '',
                            ':apellido' => $p['apellido'] ?? '',
                            ':alias' => $p['alias'] ?? null,
                            ':domicilio' => $p['domicilio'] ?? null,
                            ':fecha_control' => !empty($p['fechaControl']) ? date('Y-m-d H:i:s', strtotime($p['fechaControl'])) : date('Y-m-d H:i:s'),
                            ':oficial_interviniente' => $p['oficialInterviniente'] ?? $p['createdBy'] ?? null,
                            ':observaciones' => $p['observaciones'] ?? $p['motivo'] ?? null,
                            ':tiene_pedido_captura' => !empty($p['tienePedidoCaptura']) ? 1 : 0,
                            ':datos_extra' => json_encode($p)
                        ]);
                    }
                } catch (Exception $e) {}
            }

            echo json_encode($personsList);
            exit();
        }

        // C. Persona individual (Objeto único)
        if (isset($data['id']) || isset($data['apellidoNombre']) || isset($data['dni'])) {
            $person = $data;
            if (empty($person['id'])) {
                $person['id'] = 'id-' . time() . '-' . rand(100, 999);
            }

            $current = readJsonData('identifications.json', []);
            $found = false;
            foreach ($current as &$p) {
                if ($p['id'] === $person['id']) {
                    $p = array_merge($p, $person);
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                array_unshift($current, $person);
            }
            writeJsonData('identifications.json', $current);

            if ($pdo !== null) {
                try {
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
                    $stmt->execute([
                        ':id' => $person['id'],
                        ':dni' => $person['dni'] ?? '',
                        ':nombre' => $person['nombre'] ?? $person['apellidoNombre'] ?? '',
                        ':apellido' => $person['apellido'] ?? '',
                        ':alias' => $person['alias'] ?? null,
                        ':domicilio' => $person['domicilio'] ?? null,
                        ':fecha_control' => !empty($person['fechaControl']) ? date('Y-m-d H:i:s', strtotime($person['fechaControl'])) : date('Y-m-d H:i:s'),
                        ':oficial_interviniente' => $person['oficialInterviniente'] ?? $person['createdBy'] ?? null,
                        ':observaciones' => $person['observaciones'] ?? $person['motivo'] ?? null,
                        ':tiene_pedido_captura' => !empty($person['tienePedidoCaptura']) ? 1 : 0,
                        ':datos_extra' => json_encode($person)
                    ]);
                } catch (Exception $e) {}
            }

            echo json_encode($person);
            exit();
        }

        http_response_code(400);
        echo json_encode(['error' => 'Formato no reconocido']);
        exit();
    }

    // 3. ELIMINAR IDENTIFICACIÓN (DELETE)
    if ($method === 'DELETE') {
        $pId = getRequestedPersonId();
        if (!$pId) {
            http_response_code(400);
            echo json_encode(['error' => 'Se requiere el ID de la identificación a eliminar']);
            exit();
        }

        $current = readJsonData('identifications.json', []);
        $filtered = array_values(array_filter($current, function($p) use ($pId) {
            return $p['id'] !== $pId;
        }));
        writeJsonData('identifications.json', $filtered);

        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare("DELETE FROM personas_identificadas WHERE id = :id");
                $stmt->execute([':id' => $pId]);
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true, 'deletedId' => $pId]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}
