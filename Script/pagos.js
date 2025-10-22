(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const paymentSection = document.getElementById('pagos-en-linea');
        if (paymentSection) {
            // --- Elementos UI ---
            const step1 = document.getElementById('payment-step-1');
            const step2 = document.getElementById('payment-step-2');
            const step3 = document.getElementById('payment-step-3');
            const btnNextStep1 = document.getElementById('btn-next-step-1');
            const docInput = document.getElementById('document-number');
            const idError = document.getElementById('id-error');
            const paymentButtons = document.querySelectorAll('.btn-pay');
            const cancelPaymentLink = document.getElementById('cancel-payment');
            const btnFinishPayment = document.getElementById('btn-finish-payment');
            const paymentAmountRadios = document.querySelectorAll('input[name="payment-amount"]');
            const partialAmountInput = document.getElementById('partial-amount-input');
            const stepIndicators = document.querySelectorAll('.step-item');
            const greetingElement = document.getElementById('payment-step-2-greeting');
            const invoiceSelectorContainer = document.getElementById('invoice-selector-container');
            const invoiceOptionsList = document.getElementById('invoice-options-list'); 
            const paymentSummaryContainer = document.getElementById('payment-summary-container'); 
            const selectAllCheckbox = document.getElementById('select-all-invoices');
            const selectedBaseAmountEl = document.getElementById('selected-base-amount');
            const selectedPenaltyAmountEl = document.getElementById('selected-penalty-amount');
            const selectedTotalAmountEl = document.getElementById('selected-total-amount');
            const selectedInvoicesCountEl = document.getElementById('selected-invoices-count');
            const totalSelectedAmountLabelEl = document.getElementById('total-selected-amount-label');
            const penaltyDetailsSummaryItems = document.querySelectorAll('.penalty-details-summary'); 
            const interestRateDetailsEl = document.getElementById('interest-rate-details');
            const downloadInvoiceBtn = document.getElementById('download-invoice-btn'); 
            const downloadReceiptBtn = document.getElementById('download-receipt-btn'); 
            const lateFeeNotice = document.getElementById('late-fee-notice');
            const noPendingPaymentsContainer = document.getElementById('no-pending-payments-container'); // Contenedor "Felicidades"

            // --- Constantes y Datos ---
            const RATE_NATURAL = 0.075; // 7.5% diario
            const RATE_JURIDICA = 0.15; // 15% diario
            
            let currentUser = null; 
            let processedInvoices = []; 
            let currentReceiptData = {};

            // --- Funciones Auxiliares ---
            const formatCurrency = (value) => `$ ${Math.round(value).toLocaleString('es-CO')}`; 
            const formatPercentage = (rate) => `${(rate * 100).toFixed(1)}%`;

            const getDaysOverdue = (dueDateString) => {
                const dueDate = new Date(dueDateString + "T00:00:00"); 
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0,0,0,0);
                if (dueDate >= today) return 0;
                const diffTime = today - dueDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            };
            
            const formatLocaleDate = (dateString) => {
                 const date = new Date(dateString + "T00:00:00");
                 return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric'});
            };

            const addMonths = (dateStr, months) => {
                const date = new Date(dateStr + "T00:00:00");
                date.setMonth(date.getMonth() + months);
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            const processInvoicesToInstallments = (invoices, userType) => {
                let allInstallments = [];
                const dailyRate = userType === 'natural' ? RATE_NATURAL : RATE_JURIDICA;
                
                for (const invoice of invoices) {
                    const installmentBaseAmount = invoice.amount / invoice.totalInstallments;
                    
                    for (let i = invoice.paidInstallments + 1; i <= invoice.totalInstallments; i++) {
                        const installmentNum = i;
                        const installmentDueDate = addMonths(invoice.dueDate, installmentNum - (invoice.paidInstallments + 1)); 
                        const daysOverdue = getDaysOverdue(installmentDueDate);
                        let penalty = 0;
                        const status = daysOverdue > 0 ? "EN MORA" : "PENDIENTE";

                        if (daysOverdue > 0) {
                            penalty = installmentBaseAmount * dailyRate * daysOverdue; 
                        }
                        const totalAmount = installmentBaseAmount + penalty; 

                        allInstallments.push({
                            invoiceId: invoice.id,
                            concept: invoice.concept,
                            installmentNum: installmentNum,
                            totalInstallments: invoice.totalInstallments,
                            baseAmount: installmentBaseAmount,
                            dueDate: installmentDueDate, 
                            formattedDueDate: formatLocaleDate(installmentDueDate), 
                            daysOverdue: daysOverdue,
                            penalty: penalty,
                            totalAmount: totalAmount,
                            status: status,
                            isOverdue: daysOverdue > 0,
                            uid: `${invoice.id}-${installmentNum}` 
                        });
                    }
                }
                return allInstallments;
            };

            const showStep = (stepToShow) => {
                [step1, step2, step3].forEach(step => {
                    step.classList.add('hidden');
                    step.classList.remove('active');
                });
                stepToShow.classList.remove('hidden');
                stepToShow.classList.add('active');

                stepIndicators.forEach(indicator => indicator.classList.remove('active'));
                if (stepToShow === step1) {
                    document.getElementById('step-indicator-1').classList.add('active');
                } else if (stepToShow === step2) {
                    document.getElementById('step-indicator-1').classList.add('active');
                    document.getElementById('step-indicator-2').classList.add('active');
                } else if (stepToShow === step3) {
                    stepIndicators.forEach(indicator => indicator.classList.add('active'));
                }
            };

            // --- Lógica Principal (MODIFICADA CON FETCH) ---
            btnNextStep1.addEventListener('click', () => {
                const enteredValue = docInput.value.trim().toUpperCase();
                processedInvoices = []; 
                invoiceOptionsList.innerHTML = ''; 
                paymentSummaryContainer.classList.add('hidden'); 
                selectAllCheckbox.checked = false; 
                currentUser = null; 
                let invoicesToProcess = [];

                // Ocultar mensaje de "Felicidades" al iniciar una nueva búsqueda
                noPendingPaymentsContainer.classList.add('hidden');

                if (enteredValue === '') {
                    idError.textContent = 'Por favor, ingresa un número de identificación o referencia.';
                    idError.style.display = 'block';
                    return; 
                }

                btnNextStep1.disabled = true; 
                btnNextStep1.innerHTML = 'Buscando... <i class="mdi mdi-loading mdi-spin"></i>';

                fetch(`api/buscar_cliente.php?id=${encodeURIComponent(enteredValue)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Error de red o servidor no encontrado.');
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            idError.style.display = 'none';
                            currentUser = data.user; 
                            processedInvoices = processInvoicesToInstallments(currentUser.invoices, currentUser.type); 
                            
                            greetingElement.textContent = `Hola ${currentUser.name},`;

                            const showLateFeeNotice = processedInvoices.some(inst => inst.isOverdue);
                            lateFeeNotice.style.display = showLateFeeNotice ? 'flex' : 'none';

                            if (processedInvoices.length > 0) {
                                // Hay facturas, mostrar selector
                                invoiceSelectorContainer.style.display = 'block'; 
                                noPendingPaymentsContainer.classList.add('hidden'); // Ocultar mensaje "Felicidades"
                                
                                const invoicesGrouped = processedInvoices.reduce((acc, installment) => {
                                    (acc[installment.invoiceId] = acc[installment.invoiceId] || []).push(installment);
                                    return acc;
                                }, {});

                                document.querySelector('.select-all-container').style.display = processedInvoices.length > 1 ? 'flex' : 'none';

                                Object.keys(invoicesGrouped).forEach(invoiceId => {
                                    const installments = invoicesGrouped[invoiceId];
                                    const firstInstallment = installments[0];
                                    const hasOverdue = installments.some(inst => inst.isOverdue);
                                    
                                    let statusText = '';
                                    if (firstInstallment.totalInstallments > 1) {
                                        const pendingCount = installments.length;
                                        const overdueText = hasOverdue ? ' - 1 o más vencidas' : '';
                                        const cuotaString = pendingCount === 1 ? 'cuota pendiente' : 'cuotas pendientes';
                                        statusText = `
                                            <span class="invoice-group-status ${hasOverdue ? 'en-mora' : ''}">
                                                (${pendingCount} ${cuotaString}${overdueText})
                                            </span>
                                        `;
                                    }

                                    const groupContainer = document.createElement('div');
                                    groupContainer.className = 'invoice-group';
                                    
                                    groupContainer.innerHTML = `
                                        <div class="invoice-group-header" data-target="#installments-${invoiceId}">
                                            <span>Factura ${invoiceId} - ${firstInstallment.concept}</span>
                                            ${statusText}
                                            <i class="mdi mdi-chevron-down"></i>
                                        </div>
                                        <div class="installment-list" id="installments-${invoiceId}">
                                            ${installments.map((installment, index) => `
                                                <div class="invoice-option">
                                                    <input type="checkbox" id="inst-${installment.uid}" name="installment-selection" value="${installment.uid}" 
                                                           data-base-amount="${installment.baseAmount}" 
                                                           data-penalty="${installment.penalty}" 
                                                           data-total="${installment.totalAmount}" 
                                                           data-is-overdue="${installment.isOverdue}">
                                                    <label for="inst-${installment.uid}">
                                                        <span class="invoice-details-summary">
                                                            Cuota ${installment.installmentNum} de ${installment.totalInstallments}
                                                            (<span class="status-${installment.status.toLowerCase().replace(' ', '-')}">${installment.status}</span>)
                                                            <br><span class="invoice-installment-info">Vence: ${installment.formattedDueDate} ${installment.isOverdue ? `(${installment.daysOverdue} días)` : ''}</span>
                                                        </span>
                                                        <span class="invoice-amount">${formatCurrency(installment.totalAmount)} ${installment.isOverdue ? '<i class="mdi mdi-alert-circle" style="color:var(--error-color); font-size: 1.1em;" title="Incluye mora"></i>' : ''}</span>
                                                    </label>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `;
                                    invoiceOptionsList.appendChild(groupContainer);
                                });

                                invoiceOptionsList.querySelectorAll('.invoice-group-header').forEach(header => {
                                    header.addEventListener('click', () => {
                                        const targetId = header.dataset.target;
                                        const targetList = document.querySelector(targetId);
                                        header.classList.toggle('open');
                                        targetList.classList.toggle('open');
                                    });
                                });
                                
                                if(currentUser.invoices.length === 1) { 
                                     const firstHeader = invoiceOptionsList.querySelector('.invoice-group-header');
                                     if (firstHeader) firstHeader.click(); 
                                     if(processedInvoices.length === 1){
                                        const checkboxToSelect = invoiceOptionsList.querySelector('input[name="installment-selection"]');
                                        if(checkboxToSelect){
                                            checkboxToSelect.checked = true;
                                            checkboxToSelect.closest('.invoice-option').classList.add('selected');
                                            updatePaymentSummary();
                                        }
                                     }
                                }

                                invoiceOptionsList.removeEventListener('change', updatePaymentSummary); 
                                invoiceOptionsList.addEventListener('change', updatePaymentSummary);
                                selectAllCheckbox.removeEventListener('change', handleSelectAll); 
                                selectAllCheckbox.addEventListener('change', handleSelectAll);
                                
                            } else { 
                                // NO HAY FACTURAS PENDIENTES
                                invoiceSelectorContainer.style.display = 'none'; // Ocultar selector
                                document.querySelector('.select-all-container').style.display = 'none';
                                noPendingPaymentsContainer.classList.remove('hidden'); // Mostrar mensaje "Felicidades"
                            }
                            showStep(step2);

                        } else {
                            idError.textContent = data.message || 'Número de identificación o referencia inválido'; 
                            idError.style.display = 'block';
                        }
                    })
                    .catch(error => {
                        console.error('Error al buscar datos:', error);
                        idError.textContent = 'Error al conectar con el servidor. Asegúrate de que XAMPP esté corriendo y la URL sea correcta.';
                        idError.style.display = 'block';
                    })
                    .finally(() => {
                        btnNextStep1.disabled = false;
                        btnNextStep1.innerHTML = 'Siguiente <i class="mdi mdi-check"></i>';
                    });
            });
            
            function handleSelectAll() {
                const isChecked = selectAllCheckbox.checked;
                const installmentCheckboxes = invoiceOptionsList.querySelectorAll('input[name="installment-selection"]');
                installmentCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    checkbox.closest('.invoice-option').classList.toggle('selected', isChecked);
                });
                updatePaymentSummary(); 
            }

            function updatePaymentSummary() {
                const selectedCheckboxes = invoiceOptionsList.querySelectorAll('input[name="installment-selection"]:checked');
                let subtotalBase = 0;
                let totalPenalty = 0;
                let totalSelectedAmount = 0;
                let selectedCount = 0;
                let hasOverdueSelected = false;

                invoiceOptionsList.querySelectorAll('.invoice-option').forEach(opt => {
                     const checkbox = opt.querySelector('input[type="checkbox"]');
                     opt.classList.toggle('selected', checkbox.checked);
                });

                selectedCheckboxes.forEach(checkbox => {
                    subtotalBase += parseFloat(checkbox.dataset.baseAmount); 
                    totalPenalty += parseFloat(checkbox.dataset.penalty);
                    totalSelectedAmount += parseFloat(checkbox.dataset.total);
                    selectedCount++;
                    if (checkbox.dataset.isOverdue === 'true') {
                        hasOverdueSelected = true;
                    }
                });

                if (selectedCount > 0) {
                    selectedBaseAmountEl.textContent = formatCurrency(subtotalBase);
                    selectedPenaltyAmountEl.textContent = formatCurrency(totalPenalty);
                    selectedTotalAmountEl.textContent = formatCurrency(totalSelectedAmount);
                    selectedInvoicesCountEl.textContent = selectedCount;
                    totalSelectedAmountLabelEl.textContent = formatCurrency(totalSelectedAmount);

                    if (hasOverdueSelected && currentUser) { 
                        const rate = currentUser.type === 'natural' ? RATE_NATURAL : RATE_JURIDICA;
                        interestRateDetailsEl.textContent = formatPercentage(rate);
                        penaltyDetailsSummaryItems.forEach(el => el.classList.remove('hidden'));
                    } else {
                        penaltyDetailsSummaryItems.forEach(el => el.classList.add('hidden'));
                    }
                    
                    paymentSummaryContainer.classList.remove('hidden');
                    downloadInvoiceBtn.classList.remove('hidden'); 

                     const allCheckboxes = invoiceOptionsList.querySelectorAll('input[name="installment-selection"]');
                     if (allCheckboxes.length > 1) {
                         selectAllCheckbox.checked = selectedCount === allCheckboxes.length;
                     }

                } else {
                    paymentSummaryContainer.classList.add('hidden'); 
                    downloadInvoiceBtn.classList.add('hidden'); 
                    selectAllCheckbox.checked = false; 
                }
                
                document.getElementById('pago-total-seleccionado').checked = true;
                partialAmountInput.disabled = true;
                partialAmountInput.value = '';
            }
            
            paymentAmountRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    partialAmountInput.disabled = !document.getElementById('pago-parcial').checked;
                    if (partialAmountInput.disabled) partialAmountInput.value = '';
                    else partialAmountInput.focus();
                });
            });

            paymentButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const selectedCheckboxes = invoiceOptionsList.querySelectorAll('input[name="installment-selection"]:checked');
                    if (selectedCheckboxes.length === 0 || !currentUser) {
                        alert("Por favor, selecciona al menos una cuota para pagar.");
                        return;
                    }

                    const method = this.dataset.method;
                    let totalToPay = 0;
                    let selectedInstallmentDetails = []; 
                    let selectedInstallmentUIDs = []; 
                    
                     selectedCheckboxes.forEach(checkbox => {
                         const installment = processedInvoices.find(inst => inst.uid === checkbox.value);
                         if(installment){
                             totalToPay += installment.totalAmount;
                             selectedInstallmentUIDs.push(installment.uid);
                             const installmentText = `(Cuota ${installment.installmentNum}/${installment.totalInstallments})`;
                             selectedInstallmentDetails.push(`${installment.invoiceId} ${installmentText}${installment.isOverdue ? ' (Mora)' : ''}`); 
                         }
                     });

                    let amountValue = totalToPay; 

                    if (document.getElementById('pago-parcial').checked && partialAmountInput.value) {
                        amountValue = parseFloat(partialAmountInput.value.replace(/[^0-9]/g, '')) || 0;
                        if (amountValue > totalToPay || amountValue <= 0) {
                            alert(`El valor ingresado (${amountValue > 0 ? formatCurrency(amountValue) : '0'}) debe ser mayor a cero y no puede ser mayor al total seleccionado (${formatCurrency(totalToPay)}).`);
                            return;
                        }
                    }
                    const amountPaidFormatted = `COP ${amountValue.toLocaleString('es-CO')}`;
                    const paymentDate = new Date(); 
                    const reference = `#${Math.floor(Math.random() * 9000000) + 1000000}`;

                    const paymentData = {
                        identificacion: currentUser.identificacion, 
                        uids_cuotas: selectedInstallmentUIDs, 
                        amountPaid: amountValue,
                        method: method,
                        reference: reference,
                        invoicesText: selectedInstallmentDetails.join(', ')
                    };
                    
                    paymentButtons.forEach(btn => {
                        btn.disabled = true;
                        btn.innerHTML = '<i class="mdi mdi-loading mdi-spin"></i> Procesando...';
                    });

                    fetch('api/registrar_pago.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(paymentData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            currentReceiptData = {
                                invoicesText: selectedInstallmentDetails.join(', '),
                                amount: amountPaidFormatted,
                                method: method,
                                date: paymentDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric'}),
                                reference: data.newReference || reference
                            };

                            showStep(step3);
                            
                            document.getElementById('receipt-invoices').textContent = currentReceiptData.invoicesText; 
                            document.getElementById('receipt-amount').textContent = currentReceiptData.amount;
                            document.getElementById('receipt-method').textContent = currentReceiptData.method;
                            document.getElementById('receipt-date').textContent = currentReceiptData.date;
                            document.getElementById('receipt-ref').textContent = currentReceiptData.reference;
                            
                            setTimeout(() => { 
                                step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100); 

                        } else {
                            alert(`Error al registrar el pago: ${data.message}`);
                        }
                    })
                    .catch(error => {
                        console.error('Error en el fetch de pago:', error);
                        alert('Error de conexión al registrar el pago. Inténtalo de nuevo.');
                    })
                    .finally(() => {
                        paymentButtons[0].disabled = false;
                        paymentButtons[0].innerHTML = '<i class="mdi mdi-bank"></i> Pagar con PSE';
                        paymentButtons[1].disabled = false;
                        paymentButtons[1].innerHTML = '<i class="mdi mdi-credit-card"></i> Pagar con Bancolombia';
                    });
                });
            });

            // Función de reseteo para Cancelar y Finalizar
            const resetPaymentFlow = () => {
                showStep(step1);
                docInput.value = '';
                currentUser = null;
                processedInvoices = [];
                invoiceOptionsList.innerHTML = '';
                paymentSummaryContainer.classList.add('hidden');
                invoiceSelectorContainer.style.display = 'none';
                selectAllCheckbox.checked = false;
                downloadInvoiceBtn.classList.add('hidden'); 
                noPendingPaymentsContainer.classList.add('hidden'); // Ocultar mensaje "Felicidades"
                currentReceiptData = {};
            };

            cancelPaymentLink.addEventListener('click', (e) => {
                e.preventDefault();
                resetPaymentFlow();
            });

            btnFinishPayment.addEventListener('click', () => {
                resetPaymentFlow();
                setTimeout(() => {
                    step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50); 
            });
            
             // --- LÓGICA PARA DESCARGAR PDF DE FACTURA ---
            if (downloadInvoiceBtn) {
                downloadInvoiceBtn.addEventListener('click', generateInvoicePDF);
            }

            function generateInvoicePDF() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const logoImg = document.getElementById('logo-for-pdf'); 

                const selectedCheckboxes = invoiceOptionsList.querySelectorAll('input[name="installment-selection"]:checked');
                
                if (selectedCheckboxes.length === 0) {
                    alert("Por favor, selecciona al menos una cuota para descargar.");
                    return;
                }
                 if (!currentUser) return;


                let tableBody = [];
                let subtotalBase = 0;
                let totalPenalty = 0;
                let grandTotal = 0;
                let hasOverdue = false;

                 selectedCheckboxes.forEach(checkbox => {
                    const installment = processedInvoices.find(inst => inst.uid === checkbox.value); 
                    if(installment){
                        const installmentText = installment.totalInstallments > 1 ? ` (Cuota ${installment.installmentNum}/${installment.totalInstallments})` : '';
                         tableBody.push([
                            installment.invoiceId, 
                            installment.concept + installmentText, 
                            installment.formattedDueDate,
                            formatCurrency(installment.baseAmount), 
                            installment.isOverdue ? `${installment.daysOverdue} días` : 'N/A',
                            installment.isOverdue ? formatCurrency(installment.penalty) : '$ 0', 
                            formatCurrency(installment.totalAmount)
                        ]);
                        subtotalBase += installment.baseAmount; 
                        totalPenalty += installment.penalty; 
                        grandTotal += installment.totalAmount;
                        if(installment.isOverdue) hasOverdue = true;
                    }
                });
               

                 try {
                     doc.addImage(logoImg, 'PNG', 15, 10, 50, 15); 
                 } catch (e) {
                     console.error("Error al añadir logo al PDF:", e);
                     doc.setFontSize(10);
                     doc.text("Strokbig S.A.S", 15, 20);
                 }

                doc.setFontSize(18);
                doc.text("Resumen de Cuotas", 105, 20, null, null, 'center');
                doc.setFontSize(10);
                doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 195, 25, null, null, 'right');

                doc.setFontSize(12);
                doc.text("Datos del Cliente:", 15, 40);
                doc.setFontSize(10);
                doc.text(`Nombre: ${currentUser.name}`, 15, 46);
                doc.text(`Identificación: ${currentUser.identificacion}`, 15, 52); 
                doc.text(`Tipo: ${currentUser.type === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}`, 15, 58);

                doc.autoTable({
                    startY: 65,
                    head: [['Factura ID', 'Concepto / Cuota', 'Vencimiento', 'Valor Base', 'Días Mora', 'Valor Mora', 'Total Cuota']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [4, 42, 99] }, 
                    styles: { fontSize: 8 },
                    columnStyles: { 
                       3: { halign: 'right' }, 
                       5: { halign: 'right' },
                       6: { halign: 'right', fontStyle: 'bold' }
                    }
                });

                let finalY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(10);
                doc.text("Resumen Total:", 15, finalY);
                doc.text(`Subtotal Base: ${formatCurrency(subtotalBase)}`, 195, finalY, null, null, 'right');
                finalY += 6;
                if (hasOverdue) {
                     const rate = currentUser.type === 'natural' ? RATE_NATURAL : RATE_JURIDICA;
                     doc.setTextColor(190, 0, 0); 
                     doc.text(`Tasa Interés (Diaria): ${formatPercentage(rate)}`, 15, finalY);
                     doc.text(`Total Mora: ${formatCurrency(totalPenalty)}`, 195, finalY, null, null, 'right');
                     doc.setTextColor(0); 
                     finalY += 6;
                }
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`Total Seleccionado: ${formatCurrency(grandTotal)}`, 195, finalY, null, null, 'right');
                doc.setFont(undefined, 'normal');

                doc.save(`Detalle_Pago_Strokbig_${currentUser.name.replace(' ', '_')}_${Date.now()}.pdf`);
            }

            // --- LÓGICA PARA DESCARGAR PDF DE RECIBO ---
            if (downloadReceiptBtn) {
                downloadReceiptBtn.addEventListener('click', generateReceiptPDF);
            }

            function generateReceiptPDF() {
                 if (!currentReceiptData.reference || !currentUser) { 
                     alert("No hay información de pago reciente para generar el recibo.");
                     return;
                 }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const logoImg = document.getElementById('logo-for-pdf');

                 try {
                     doc.addImage(logoImg, 'PNG', 15, 10, 50, 15); 
                 } catch (e) {
                     console.error("Error al añadir logo al PDF:", e);
                     doc.setFontSize(10);
                     doc.text("Strokbig S.A.S", 15, 20);
                 }

                doc.setFontSize(18);
                doc.text("Comprobante de Pago", 105, 20, null, null, 'center');
                doc.setFontSize(10);
                doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 195, 25, null, null, 'right');

                doc.setFontSize(12);
                doc.text("Pagado por:", 15, 40);
                doc.setFontSize(10);
                doc.text(`Nombre: ${currentUser.name}`, 15, 46);
                doc.text(`Identificación: ${currentUser.identificacion}`, 15, 52); 

                doc.setFontSize(12);
                doc.text("Detalles de la Transacción:", 15, 65);
                doc.setFontSize(10);
                let currentY = 71;
                const addDetail = (label, value) => {
                    doc.text(`${label}:`, 15, currentY);
                    doc.text(value, 80, currentY, { maxWidth: 110 }); 
                    const lines = doc.splitTextToSize(value, 110);
                    currentY += (lines.length * 4) + 2; 
                };

                addDetail("Referencia de Pago", currentReceiptData.reference || 'N/A');
                addDetail("Fecha de Pago", currentReceiptData.date || 'N/A');
                addDetail("Método de Pago", currentReceiptData.method || 'N/A');
                addDetail("Valor Pagado", currentReceiptData.amount || '$ 0');
                addDetail("Factura(s)/Cuota(s) Pagada(s)", currentReceiptData.invoicesText || 'N/A');

                doc.setFontSize(10);
                doc.text("Gracias por su pago.", 105, currentY + 10, null, null, 'center');

                doc.save(`Recibo_Strokbig_${currentReceiptData.reference}.pdf`);
            }
            
            showStep(step1);
        }
    });
})();