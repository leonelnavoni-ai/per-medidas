<?php
require_once __DIR__ . '/db.php';

echo json_encode([
    'status' => 'ok',
    'serverTime' => date('c'),
    'engine' => 'php',
    'storageMode' => $dbMode,
    'dataDir' => is_dir(getDataDir()),
    'usersCount' => count(readJsonData('users.json', [])),
    'identificationsCount' => count(readJsonData('identifications.json', [])),
    'measuresCount' => count(readJsonData('measures.json', []))
]);
