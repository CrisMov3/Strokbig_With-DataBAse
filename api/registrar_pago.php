<?php
// Iniciar encabezados para JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// --- Configuración de la Base de Datos ---
$servername = "localhost";
$username = "root";
$password = "312312"; // <-- ¡¡¡ASEGÚRATE DE PONER TU CONTRASEÑA AQUÍ!!!
$dbname = "strokbig_db";

$response = ['success' => false, 'message' => 'Error desconocido.'];

// Decodificar el JSON enviado desde JavaScript
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    $response['message'] = 'No se recibieron datos (JSON nulo).';
    echo json_encode($response);
    exit;
}

// Datos necesarios del JS
$identificacion = $data['identificacion'] ?? null; // <-- AHORA RECIBE EL ID DE USUARIO (ej: 1001)
$uids_cuotas = $data['uids_cuotas'] ?? []; 
$amountPaid = $data['amountPaid'] ?? 0;
$method = $data['method'] ?? 'Desconocido';
$reference = $data['reference'] ?? 'SinReferencia';
$invoicesText = $data['invoicesText'] ?? '';

if (empty($identificacion) || empty($uids_cuotas) || $amountPaid <= 0) {
    $response['message'] = 'Faltan datos para registrar el pago (ID, cuotas o monto).';
    echo json_encode($response);
    exit;
}

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    $response['message'] = 'Error de conexión a la BD: ' . $conn->connect_error;
    echo json_encode($response);
    exit;
}
$conn->set_charset("utf8mb4");

// 1. Obtener el ID numérico del cliente
$cliente_id = null;
$stmt_cliente = $conn->prepare("SELECT id FROM clientes WHERE identificacion = ?");
$stmt_cliente->bind_param("s", $identificacion);
$stmt_cliente->execute();
$result_cliente = $stmt_cliente->get_result();
if ($result_cliente->num_rows > 0) {
    $cliente_id = $result_cliente->fetch_assoc()['id'];
}
$stmt_cliente->close();

if (!$cliente_id) {
    $response['message'] = 'No se pudo verificar el cliente (ID no encontrado en BD).';
    echo json_encode($response);
    $conn->close();
    exit;
}

// 2. Iniciar Transacción
$conn->begin_transaction();

try {
    // 3. Registrar el pago principal en la nueva tabla 'pagos_recibidos'
    $sql_pago = "INSERT INTO pagos_recibidos (cliente_id, referencia, monto_pagado, metodo_pago, cuotas_pagadas_desc) 
                 VALUES (?, ?, ?, ?, ?)";
    $stmt_pago = $conn->prepare($sql_pago);
    $stmt_pago->bind_param("isdss", $cliente_id, $reference, $amountPaid, $method, $invoicesText);
    $stmt_pago->execute();
    
    if ($stmt_pago->affected_rows == 0) {
        throw new Exception("No se pudo registrar el pago principal (affected_rows = 0).");
    }
    $stmt_pago->close();

    // 4. Actualizar las 'cuotas_pagadas' en la tabla 'facturas'
    $cuotas_por_factura = [];
    foreach ($uids_cuotas as $uid) {
        $parts = explode('-', $uid); 
        $factura_id_visible = $parts[0] . '-' . $parts[1]; 
        $cuota_num = (int)$parts[2];
        
        if (!isset($cuotas_por_factura[$factura_id_visible])) {
            $cuotas_por_factura[$factura_id_visible] = [];
        }
        $cuotas_por_factura[$factura_id_visible][] = $cuota_num;
    }

    foreach ($cuotas_por_factura as $factura_id => $cuotas) {
        $max_cuota_pagada = max($cuotas); 
        
        $sql_update = "UPDATE facturas SET cuotas_pagadas = ? 
                       WHERE factura_id_visible = ? AND cliente_id = ? AND cuotas_pagadas < ?";
        
        $stmt_update = $conn->prepare($sql_update);
        $stmt_update->bind_param("isis", $max_cuota_pagada, $factura_id, $cliente_id, $max_cuota_pagada);
        $stmt_update->execute();
        $stmt_update->close();
    }

    // 5. Confirmar la transacción
    $conn->commit();
    $response['success'] = true;
    $response['message'] = 'Pago registrado exitosamente.';
    $response['newReference'] = $reference;

} catch (Exception $e) {
    // 6. Si algo falló, revertir
    $conn->rollback();
    $response['message'] = 'Error al registrar el pago en la BD: ' . $e->getMessage();
}

$conn->close();
echo json_encode($response);
?>