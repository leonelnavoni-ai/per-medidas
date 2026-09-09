<?php
// ==========================================================
// CONFIGURACIÓN DE BASE DE DATOS Y MOTOR DE PERSISTENCIA
// Compatible con cPanel / Hosting compartido (MySQL y JSON)
// ==========================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración opcional cargada desde config.php o variables de entorno
$configPath = __DIR__ . '/config.php';
if (file_exists($configPath)) {
    @include_once $configPath;
}

$DB_HOST = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
$DB_NAME = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'per_medidas_db');
$DB_USER = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'root');
$DB_PASS = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: '');

$pdo = null;
$dbMode = 'json'; // 'mysql' | 'json'

// Intento de conexión a MySQL solo si no está explícitamente desactivado
$disableSql = defined('DISABLE_SQL') ? DISABLE_SQL : (getenv('DISABLE_SQL') === 'true');

if (!$disableSql) {
    try {
        $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 2,
        ]);
        $dbMode = 'mysql';
    } catch (PDOException $e) {
        // En caso de que MySQL no esté configurado en el hosting (ej. error 1045 access denied),
        // no rompemos la aplicación con un HTTP 500. Pasamos automáticamente al motor JSON nativo
        // garantizando persistencia inmediata en el servidor sin configuración requerida.
        $pdo = null;
        $dbMode = 'json';
    }
}

// ==========================================================
// FUNCIONES DEL MOTOR DE PERSISTENCIA EN DISCO (JSON)
// ==========================================================
function getDataDir() {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    return $dir;
}

function getJsonDataPath($filename) {
    return getDataDir() . '/' . $filename;
}

function readJsonData($filename, $default = []) {
    $path = getJsonDataPath($filename);
    if (!file_exists($path)) {
        writeJsonData($filename, $default);
        return $default;
    }
    $content = @file_get_contents($path);
    if ($content === false || trim($content) === '') {
        return $default;
    }
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : $default;
}

function writeJsonData($filename, $data) {
    $path = getJsonDataPath($filename);
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tmp = $path . '.tmp.' . uniqid();
    if (@file_put_contents($tmp, $json, LOCK_EX) !== false) {
        @rename($tmp, $path);
        @chmod($path, 0666);
        return true;
    }
    return @file_put_contents($path, $json, LOCK_EX) !== false;
}
