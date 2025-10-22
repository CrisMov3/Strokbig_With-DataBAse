(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('search-input');
        const tableBody = document.getElementById('report-table-body');
        const noResultsRow = document.getElementById('no-results-row');
        
        let allPayments = []; // Variable para almacenar todos los pagos

        // Función para formatear moneda
        const formatCurrency = (value) => {
            const num = parseFloat(value);
            return `$ ${Math.round(num).toLocaleString('es-CO')}`;
        };

        // Función para formatear fecha
        const formatDateTime = (dateTimeString) => {
            const date = new Date(dateTimeString);
            return date.toLocaleDateString('es-CO', {
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Función para renderizar la tabla de pagos
        function renderTable(payments) {
            tableBody.innerHTML = ''; // Limpiar tabla
            
            if (payments.length === 0) {
                noResultsRow.style.display = 'table-row'; // Mostrar fila "Sin resultados"
            } else {
                noResultsRow.style.display = 'none'; // Ocultar
            }

            payments.forEach(payment => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${payment.id}</td>
                    <td>${payment.cliente_nombre}</td>
                    <td>${payment.referencia}</td>
                    <td>${formatCurrency(payment.monto_pagado)}</td>
                    <td>${payment.metodo_pago}</td>
                    <td>${formatDateTime(payment.fecha_pago)}</td>
                    <td>${payment.cuotas_pagadas_desc}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // Función para filtrar la tabla en tiempo real
        function filterTable() {
            const searchTerm = searchInput.value.toLowerCase();
            
            const filteredPayments = allPayments.filter(payment => {
                const cliente = payment.cliente_nombre ? payment.cliente_nombre.toLowerCase() : '';
                const referencia = payment.referencia ? payment.referencia.toLowerCase() : '';
                const cuotas = payment.cuotas_pagadas_desc ? payment.cuotas_pagadas_desc.toLowerCase() : '';

                return cliente.includes(searchTerm) || 
                       referencia.includes(searchTerm) || 
                       cuotas.includes(searchTerm);
            });
            
            renderTable(filteredPayments);
        }

        // --- Carga Inicial de Datos ---
        function fetchPayments() {
            fetch('api/obtener_pagos.php')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al conectar con la API');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.data) {
                        allPayments = data.data; // Guardar los datos originales
                        renderTable(allPayments); // Renderizar la tabla completa al inicio
                    } else {
                        console.error("No se pudieron obtener los datos:", data.message);
                        noResultsRow.style.display = 'table-row';
                        noResultsRow.querySelector('td').textContent = data.message || "No se pudieron cargar los datos.";
                    }
                })
                .catch(error => {
                    console.error('Error en fetchPayments:', error);
                    noResultsRow.style.display = 'table-row';
                    noResultsRow.querySelector('td').textContent = "Error de conexión al cargar los reportes.";
                });
        }

        // Añadir el listener al campo de búsqueda
        if(searchInput) {
            searchInput.addEventListener('input', filterTable);
        }

        // Cargar los datos al iniciar la página
        fetchPayments();
    });
})();