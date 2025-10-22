<?php
// --- Configuración de la Base de Datos ---
$servername = "localhost"; 
$username = "root";        
$password = "312312";            // <-- RECUERDA PONER TU CONTRASEÑA DE MYSQL AQUÍ
$dbname = "strokbig_db";    

// Variable para mensajes
$mensaje = "";
$error = "";

// --- Lógica para procesar el formulario ---
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        die("Conexión fallida: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");

    // Datos del Cliente
    $identificacion = $conn->real_escape_string($_POST['identificacion']);
    $nombre = $conn->real_escape_string($_POST['nombre']);
    $tipo = $conn->real_escape_string($_POST['tipo']);

    // Datos de la Factura
    $concepto = $conn->real_escape_string($_POST['concepto']); // Viene del <select>
    $monto_total = floatval($_POST['monto_total']);
    $total_cuotas = intval($_POST['total_cuotas']);
    $fecha_base_vencimiento = $conn->real_escape_string($_POST['fecha_base_vencimiento']);
    $cuotas_pagadas = 0; 

    // --- NUEVO: Lógica de ID de Factura Automático ---
    $factura_id_visible = "";
    $is_id_unique = false;
    
    while (!$is_id_unique) {
        // Generar un ID, ej: SB-123456
        $factura_id_visible = "SB-" . rand(100000, 999999);
        
        // Comprobar si ya existe
        $sql_check_id = "SELECT 1 FROM facturas WHERE factura_id_visible = ?";
        $stmt_check = $conn->prepare($sql_check_id);
        $stmt_check->bind_param("s", $factura_id_visible);
        $stmt_check->execute();
        $stmt_check->store_result();
        
        if ($stmt_check->num_rows == 0) {
            // No se encontró, el ID es único
            $is_id_unique = true;
        }
        $stmt_check->close();
    }
    // --- FIN LÓGICA ID ---

    // 1. Insertar o actualizar el cliente (UPSERT)
    $sql_cliente = "INSERT INTO clientes (identificacion, nombre, tipo) 
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = VALUES(tipo)";
    
    $stmt_cliente = $conn->prepare($sql_cliente);
    $stmt_cliente->bind_param("sss", $identificacion, $nombre, $tipo);
    
    if ($stmt_cliente->execute()) {
        // 2. Obtener el ID del cliente
        $cliente_id = $conn->insert_id;
        if ($cliente_id == 0) { 
            $result = $conn->query("SELECT id FROM clientes WHERE identificacion = '$identificacion'");
            $cliente_id = $result->fetch_assoc()['id'];
        }

        // 3. Insertar la factura (usando el ID de factura generado)
        $sql_factura = "INSERT INTO facturas (cliente_id, factura_id_visible, concepto, monto_total, total_cuotas, cuotas_pagadas, fecha_base_vencimiento)
                        VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt_factura = $conn->prepare($sql_factura);
        $stmt_factura->bind_param("isssdis", $cliente_id, $factura_id_visible, $concepto, $monto_total, $total_cuotas, $cuotas_pagadas, $fecha_base_vencimiento);
        
        if ($stmt_factura->execute()) {
            $mensaje = "¡Cliente registrado y factura '$factura_id_visible' creada exitosamente!";
        } else {
            $error = "Error al registrar la factura: " . $stmt_factura->error;
        }
        $stmt_factura->close();
        
    } else {
        $error = "Error al registrar el cliente: " . $stmt_cliente->error;
    }
    
    $stmt_cliente->close();
    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Registrar Facturas</title>
    <link rel="stylesheet" href="Styles/pagos.css"> 
    <style>
        body { background: #f0f4f8; }
        .admin-container { max-width: 800px; margin: 40px auto; padding: 20px; }
        .admin-card { background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .form-section { margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 25px; }
        .form-section h3 { margin-bottom: 15px; border-bottom: 2px solid #042a63; padding-bottom: 5px; display: inline-block; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { margin-bottom: 5px; font-weight: 600; }
        .form-group input, .form-group select { padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 1rem; }
        .btn-submit { background: #042a63; color: white; border: 0; padding: 12px 20px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.3s ease; }
        .btn-submit:hover { background: #03306b; }
        .mensaje { padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px; margin-bottom: 20px; }
        .error { padding: 15px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 5px; margin-bottom: 20px; }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-card">
            <h2>Panel de Administración de Facturas</h2>
            
            <?php if ($mensaje): ?>
                <div class="mensaje"><?php echo $mensaje; ?></div>
            <?php endif; ?>
            <?php if ($error): ?>
                <div class="error"><?php echo $error; ?></div>
            <?php endif; ?>

            <form action="admin_facturas.php" method="POST">
                
                <div class="form-section">
                    <h3>Datos del Cliente</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="identificacion">Identificación (ID de Usuario)</label>
                            <input type="text" id="identificacion" name="identificacion" required>
                        </div>
                        <div class="form-group">
                            <label for="nombre">Nombre Completo</label>
                            <input type="text" id="nombre" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label for="tipo">Tipo de Cliente</label>
                            <select id="tipo" name="tipo" required>
                                <option value="natural">Persona Natural</option>
                                <option value="juridica">Persona Jurídica (Empresa)</option>
                            </select>
                        </div>
                    </div>
                    <small>Si la identificación ya existe, se actualizará el nombre y tipo del cliente.</small>
                </div>

                <div class="form-section">
                    <h3>Datos de la Factura</h3>
                    <div class="form-grid">
                        
                        <div class="form-group">
                            <label for="concepto">Concepto</label>
                            <select id="concepto" name="concepto" required>
                                <option value="" disabled selected>Selecciona un concepto...</option>
                                <option value="Licencia Básico">Licencia Básico</option>
                                <option value="Licencia Profesional">Licencia Profesional</option>
                                <option value="Licencia Avanzada">Licencia Avanzada</option>
                                <option value="Mantenimiento de Computadores">Mantenimiento de Computadores</option>
                                <option value="Soporte tecnico">Soporte tecnico</option>
                                <option value="Desarrollo Web">Desarrollo Web</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="monto_total">Monto Total (Ej: 1500000)</label>
                            <input type="number" step="0.01" id="monto_total" name="monto_total" required>
                        </div>
                        <div class="form-group">
                            <label for="total_cuotas">Total de Cuotas</label>
                            <input type="number" id="total_cuotas" name="total_cuotas" value="1" required>
                        </div>
                        <div class="form-group">
                            <label for="fecha_base_vencimiento">Fecha Vencimiento (1ra Cuota)</label>
                            <input type="date" id="fecha_base_vencimiento" name="fecha_base_vencimiento" required>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn-submit">Registrar Factura</button>
            </form>
        </div>
    </div>
</body>
</html>