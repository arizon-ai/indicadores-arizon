// Dashboard data and rendering logic extracted from index.html
// Maintains existing functionality while keeping HTML leaner.

// --- SISTEMA DE LOGO ---
function initializeLogoSystem() {
    const logoContainer = document.getElementById('logo-container');
    const logoImage = document.getElementById('logo-image');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    const changeLogoBtn = document.getElementById('change-logo-btn');
    const logoUpload = document.getElementById('logo-upload');

    // Cargar logo guardado si existe
    const savedLogo = localStorage.getItem('arizon-logo');
    if (savedLogo) {
        logoImage.src = savedLogo;
        logoImage.classList.remove('hidden');
        logoPlaceholder.classList.add('hidden');
    }

    // Evento para abrir selector de archivo
    changeLogoBtn.addEventListener('click', () => {
        logoUpload.click();
    });

    // También permitir click en el contenedor
    logoContainer.addEventListener('click', () => {
        logoUpload.click();
    });

    // Manejar carga de archivo
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }

        // Validar tamaño (máximo 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen es demasiado grande. Por favor usa una imagen menor a 2MB');
            return;
        }

        // Leer y guardar la imagen
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            
            // Guardar en localStorage
            localStorage.setItem('arizon-logo', imageData);
            
            // Mostrar la imagen
            logoImage.src = imageData;
            logoImage.classList.remove('hidden');
            logoPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    });

    // Agregar opción de eliminar logo (click derecho)
    logoContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm('¿Deseas eliminar el logo y volver al placeholder?')) {
            localStorage.removeItem('arizon-logo');
            logoImage.src = '';
            logoImage.classList.add('hidden');
            logoPlaceholder.classList.remove('hidden');
        }
    });
}

// --- SISTEMA DE BACKUP/RESTORE ---
function exportDashboardData() {
    try {
        // Obtener todos los datos del localStorage
        const data = {
            dashboardData: dashboardData,
            logo: localStorage.getItem('arizon-logo'),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        // Convertir a JSON
        const jsonString = JSON.stringify(data, null, 2);
        
        // Crear blob y descargar
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Nombre del archivo con fecha
        const fileName = `arizon-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.download = fileName;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Actualizar indicador de último backup
        updateLastBackupIndicator();
        
        // Mostrar mensaje de éxito
        alert('✅ Datos exportados exitosamente\n\nArchivo: ' + fileName);
        
    } catch (error) {
        console.error('Error al exportar datos:', error);
        alert('❌ Error al exportar los datos. Por favor, intenta nuevamente.');
    }
}

function importDashboardData() {
    // Trigger file input
    const fileInput = document.getElementById('import-file-input');
    fileInput.click();
}

function processImportedFile(file) {
    if (!file) return;

    // Validar que sea JSON
    if (!file.name.endsWith('.json')) {
        alert('❌ Por favor selecciona un archivo JSON válido');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const content = e.target.result;
            const importedData = JSON.parse(content);

            // Validar estructura básica
            if (!importedData.dashboardData || !importedData.version) {
                alert('❌ El archivo no tiene el formato correcto de backup');
                return;
            }

            // Confirmar antes de sobrescribir usando el modal personalizado
            const backupDate = new Date(importedData.exportDate).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const confirmed = await showConfirmationModal({
                title: '⚠️ Sobrescribir todos los datos',
                message: `Esta acción reemplazará TODOS tus datos actuales con los del backup.\n\nFecha del backup: ${backupDate}\n\n¿Estás seguro de que deseas continuar?`,
                confirmText: 'Sí, importar',
                cancelText: 'Cancelar',
                type: 'danger'
            });
            
            if (!confirmed) {
                return;
            }

            // Importar datos
            dashboardData = importedData.dashboardData;
            
            // Importar logo si existe
            if (importedData.logo) {
                localStorage.setItem('arizon-logo', importedData.logo);
            }

            // Actualizar vista
            loadInitialData();
            populateMasterFilter();
            renderDashboardView();
            
            // Actualizar indicador
            updateLastBackupIndicator(new Date(importedData.exportDate));

            alert('✅ Datos importados exitosamente\n\nLa página se recargará para aplicar todos los cambios.');
            
            // Recargar página para asegurar que todo se actualice
            setTimeout(() => {
                location.reload();
            }, 1000);

        } catch (error) {
            console.error('Error al procesar archivo:', error);
            alert('❌ Error al importar datos. Verifica que el archivo sea un backup válido.');
        }
    };

    reader.onerror = () => {
        alert('❌ Error al leer el archivo');
    };

    reader.readAsText(file);
}

function updateLastBackupIndicator(backupDate = null) {
    const indicator = document.getElementById('last-backup-indicator');
    const timeSpan = document.getElementById('last-backup-time');
    
    if (!indicator || !timeSpan) return;

    const date = backupDate || new Date();
    
    // Guardar en localStorage
    localStorage.setItem('last-backup-date', date.toISOString());
    
    // Formatear fecha
    const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    timeSpan.textContent = formattedDate;
    indicator.classList.remove('hidden');
}

function autoBackup() {
    // Auto-backup cada vez que se guardan datos
    const lastBackup = localStorage.getItem('last-backup-date');
    const now = new Date();
    
    // Si no hay backup o han pasado más de 1 hora, hacer auto-backup
    if (!lastBackup || (now - new Date(lastBackup)) > 3600000) {
        try {
            const data = {
                dashboardData: dashboardData,
                logo: localStorage.getItem('arizon-logo'),
                exportDate: now.toISOString(),
                version: '1.0',
                autoBackup: true
            };
            
            // Guardar en localStorage como respaldo automático
            localStorage.setItem('arizon-auto-backup', JSON.stringify(data));
            updateLastBackupIndicator();
        } catch (error) {
            console.warn('No se pudo crear auto-backup:', error);
        }
    }
}

// --- SISTEMA DE MODALES DE CONFIRMACIÓN ---
let modalResolveCallback = null;

function showConfirmationModal(options = {}) {
    const {
        title = '¿Estás seguro?',
        message = 'Esta acción no se puede deshacer.',
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        type = 'warning' // 'warning', 'danger', 'info'
    } = options;

    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalIconContainer = document.getElementById('modal-icon-container');
        const modalIcon = document.getElementById('modal-icon');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        if (!modal) {
            resolve(false);
            return;
        }

        // Configurar contenido
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        // Configurar estilos según tipo
        if (type === 'danger') {
            modalIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10';
            modalIcon.className = 'h-6 w-6 text-red-600';
            confirmBtn.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm';
        } else if (type === 'info') {
            modalIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10';
            modalIcon.className = 'h-6 w-6 text-blue-600';
            confirmBtn.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm';
        } else {
            modalIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10';
            modalIcon.className = 'h-6 w-6 text-yellow-600';
            confirmBtn.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm';
        }

        // Guardar callback
        modalResolveCallback = resolve;

        // Mostrar modal
        modal.classList.remove('hidden');
        
        // Focus en botón de cancelar
        setTimeout(() => cancelBtn.focus(), 100);
    });
}

function hideConfirmationModal(confirmed = false) {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    if (modalResolveCallback) {
        modalResolveCallback(confirmed);
        modalResolveCallback = null;
    }
}

// --- SISTEMA DE DESHACER ---
let undoState = null;
let undoTimeout = null;
let undoCountdownInterval = null;

function saveUndoState(monthName, weekIndex) {
    // Guardar copia profunda del estado antes de modificar
    undoState = {
        monthName,
        weekIndex,
        previousData: JSON.parse(JSON.stringify(dashboardData[monthName].weeks[weekIndex])),
        timestamp: Date.now()
    };
}

function showUndoToast() {
    const toast = document.getElementById('undo-toast');
    const countdownSpan = document.getElementById('undo-countdown');
    
    if (!toast) return;

    // Limpiar timeouts previos
    if (undoTimeout) clearTimeout(undoTimeout);
    if (undoCountdownInterval) clearInterval(undoCountdownInterval);

    // Mostrar toast
    toast.classList.remove('hidden');
    
    let secondsLeft = 30;
    countdownSpan.textContent = secondsLeft;

    // Actualizar countdown cada segundo
    undoCountdownInterval = setInterval(() => {
        secondsLeft--;
        countdownSpan.textContent = secondsLeft;
        
        if (secondsLeft <= 0) {
            hideUndoToast();
        }
    }, 1000);

    // Ocultar automáticamente después de 30 segundos
    undoTimeout = setTimeout(() => {
        hideUndoToast();
        undoState = null;
    }, 30000);
}

function hideUndoToast() {
    const toast = document.getElementById('undo-toast');
    if (toast) {
        toast.classList.add('hidden');
    }
    
    if (undoTimeout) clearTimeout(undoTimeout);
    if (undoCountdownInterval) clearInterval(undoCountdownInterval);
}

function performUndo() {
    if (!undoState) {
        alert('No hay cambios para deshacer');
        return;
    }

    const { monthName, weekIndex, previousData } = undoState;

    // Restaurar datos previos
    dashboardData[monthName].weeks[weekIndex] = JSON.parse(JSON.stringify(previousData));

    // Recalcular y actualizar vistas
    recalculateAllData();
    populateMasterFilter();
    const currentFilter = document.getElementById('master-filter').value;
    renderAllKPIs(currentFilter);
    updateAllCharts();
    renderDataManagementView();
    updateProgressIndicator();

    // Ocultar toast
    hideUndoToast();
    undoState = null;

    // Mostrar mensaje
    showFormMessage('✅ Cambios deshechos correctamente', 'success');
}

// --- SISTEMA DE VALIDACIÓN DE DATOS ---
function validateFormData(formData) {
    const errors = [];

    // Helper para obtener valores numéricos del formulario
    const getNumber = (fieldName, defaultValue = 0) => {
        const value = formData.get(fieldName);
        if (!value || value.trim() === '') return defaultValue;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    };

    // === REGLA 1: Jerarquía de Leads ===
    const leadsAds = getNumber('leadsAds');
    const leadsOrganico = getNumber('leadsOrganico');
    const leadsReferido = getNumber('leadsReferido');
    const leadsRecibidos = getNumber('leadsRecibidos');
    const leadsCalificados = getNumber('leadsCalificados');
    const leadsConvertidos = getNumber('leadsConvertidos');

    const totalLeads = leadsAds + leadsOrganico + leadsReferido;
    
    if (leadsRecibidos > 0 && totalLeads > 0 && totalLeads !== leadsRecibidos) {
        errors.push({
            field: 'leadsRecibidos',
            message: `Leads Recibidos (${leadsRecibidos}) debe ser igual a la suma de Leads por canal (${totalLeads} = Ads + Orgánico + Referido)`
        });
    }

    if (leadsCalificados > leadsRecibidos && leadsRecibidos > 0) {
        errors.push({
            field: 'leadsCalificados',
            message: `Leads Calificados (${leadsCalificados}) no puede ser mayor que Leads Recibidos (${leadsRecibidos})`
        });
    }

    if (leadsConvertidos > leadsCalificados && leadsCalificados > 0) {
        errors.push({
            field: 'leadsConvertidos',
            message: `Leads Convertidos (${leadsConvertidos}) no puede ser mayor que Leads Calificados (${leadsCalificados})`
        });
    }

    // === REGLA 2: Validación de Conversiones por Canal ===
    const convertidosAds = getNumber('convertidosAds');
    const convertidosOrganico = getNumber('convertidosOrganico');
    const convertidosReferido = getNumber('convertidosReferido');

    if (convertidosAds > leadsAds && leadsAds > 0) {
        errors.push({
            field: 'convertidosAds',
            message: `Convertidos Ads (${convertidosAds}) no puede superar Leads Ads (${leadsAds})`
        });
    }

    if (convertidosOrganico > leadsOrganico && leadsOrganico > 0) {
        errors.push({
            field: 'convertidosOrganico',
            message: `Convertidos Orgánico (${convertidosOrganico}) no puede superar Leads Orgánico (${leadsOrganico})`
        });
    }

    if (convertidosReferido > leadsReferido && leadsReferido > 0) {
        errors.push({
            field: 'convertidosReferido',
            message: `Convertidos Referido (${convertidosReferido}) no puede superar Leads Referido (${leadsReferido})`
        });
    }

    // === REGLA 3: Validación de Demos ===
    const demosRealizados = getNumber('demosRealizados');
    const demosExitosos = getNumber('demosExitosos');

    if (demosExitosos > demosRealizados && demosRealizados > 0) {
        errors.push({
            field: 'demosExitosos',
            message: `Demos Exitosos (${demosExitosos}) no puede ser mayor que Demos Realizados (${demosRealizados})`
        });
    }

    if (demosRealizados > 0 && demosExitosos > 0) {
        const tasaExito = (demosExitosos / demosRealizados) * 100;
        if (tasaExito > 100) {
            errors.push({
                field: 'demosExitosos',
                message: `Tasa de éxito de demos es ${tasaExito.toFixed(1)}% (imposible superar 100%)`
            });
        }
    }

    // === REGLA 4: Validación de MRR ===
    const mrrMini = getNumber('mrrMini');
    const mrrPro = getNumber('mrrPro');
    const mrrMax = getNumber('mrrMax');
    const mrrWariMini = getNumber('mrrWariMini');
    const mrrWariPro = getNumber('mrrWariPro');
    const totalMRR = mrrMini + mrrPro + mrrMax + mrrWariMini + mrrWariPro;

    if (totalMRR < 0) {
        errors.push({
            field: 'mrrMini',
            message: 'El MRR total no puede ser negativo'
        });
    }

    // Validar que MRR individual no sea negativo
    if (mrrMini < 0) errors.push({ field: 'mrrMini', message: 'MRR Mini no puede ser negativo' });
    if (mrrPro < 0) errors.push({ field: 'mrrPro', message: 'MRR Pro no puede ser negativo' });
    if (mrrMax < 0) errors.push({ field: 'mrrMax', message: 'MRR Max no puede ser negativo' });
    if (mrrWariMini < 0) errors.push({ field: 'mrrWariMini', message: 'MRR Wari Mini no puede ser negativo' });
    if (mrrWariPro < 0) errors.push({ field: 'mrrWariPro', message: 'MRR Wari Pro no puede ser negativo' });

    // === REGLA 5: Validación de Churn ===
    const churnSemanal = getNumber('churnSemanal');
    const clientesNuevosActivados = getNumber('clientesNuevosActivados');

    if (churnSemanal < 0) {
        errors.push({
            field: 'churnSemanal',
            message: 'Churn semanal no puede ser negativo'
        });
    }

    if (churnSemanal > 100) {
        errors.push({
            field: 'churnSemanal',
            message: `Churn semanal (${churnSemanal}) parece muy alto. Verifica si es un porcentaje o número de clientes.`
        });
    }

    // === REGLA 6: Validación de Inversiones ===
    const inversionAds = getNumber('inversionAds');
    const inversionFacebook = getNumber('inversionFacebook');
    const inversionInstagram = getNumber('inversionInstagram');
    const inversionTikTok = getNumber('inversionTikTok');
    const totalInversionCanales = inversionFacebook + inversionInstagram + inversionTikTok;

    if (inversionAds > 0 && totalInversionCanales > 0 && Math.abs(inversionAds - totalInversionCanales) > 50) {
        errors.push({
            field: 'inversionAds',
            message: `Inversión Ads Total ($${inversionAds}) debería ser similar a la suma de inversiones por canal ($${totalInversionCanales.toFixed(2)})`
        });
    }

    if (inversionAds < 0) errors.push({ field: 'inversionAds', message: 'Inversión en Ads no puede ser negativa' });
    if (inversionFacebook < 0) errors.push({ field: 'inversionFacebook', message: 'Inversión en Facebook no puede ser negativa' });
    if (inversionInstagram < 0) errors.push({ field: 'inversionInstagram', message: 'Inversión en Instagram no puede ser negativa' });
    if (inversionTikTok < 0) errors.push({ field: 'inversionTikTok', message: 'Inversión en TikTok no puede ser negativa' });

    // === REGLA 7: Validación de Cobranza y CxC ===
    const cobranzaUSD = getNumber('cobranzaUSD');
    const cxc = getNumber('cxc');

    if (cobranzaUSD < 0) {
        errors.push({
            field: 'cobranzaUSD',
            message: 'Cobranza USD no puede ser negativa'
        });
    }

    if (cxc < 0) {
        errors.push({
            field: 'cxc',
            message: 'Cuentas por Cobrar no puede ser negativa'
        });
    }

    // === REGLA 8: Validación de NPS ===
    const npsSemanal = getNumber('npsSemanal');

    if (npsSemanal < -100 || npsSemanal > 100) {
        errors.push({
            field: 'npsSemanal',
            message: `NPS (${npsSemanal}) debe estar entre -100 y 100`
        });
    }

    // === REGLA 9: Validación de CSAT ===
    const csatScore = getNumber('csatScore');

    if (csatScore < 1 || csatScore > 5) {
        errors.push({
            field: 'csatScore',
            message: `CSAT Score (${csatScore}) debe estar entre 1 y 5`
        });
    }

    // === REGLA 10: Validación de Uptime ===
    const uptimeAri = getNumber('uptimeAri');

    if (uptimeAri < 0 || uptimeAri > 100) {
        errors.push({
            field: 'uptimeAri',
            message: `Uptime Ari (${uptimeAri}%) debe estar entre 0% y 100%`
        });
    }

    // === REGLA 11: Validación de Tickets ===
    const ticketsAbiertos = getNumber('ticketsAbiertos');
    const ticketsResueltos = getNumber('ticketsResueltos');

    if (ticketsAbiertos < 0) {
        errors.push({
            field: 'ticketsAbiertos',
            message: 'Tickets Abiertos no puede ser negativo'
        });
    }

    if (ticketsResueltos < 0) {
        errors.push({
            field: 'ticketsResueltos',
            message: 'Tickets Resueltos no puede ser negativo'
        });
    }

    // === REGLA 12: Validación de Health Score ===
    const healthScorePromedio = getNumber('healthScorePromedio');

    if (healthScorePromedio < 0 || healthScorePromedio > 100) {
        errors.push({
            field: 'healthScorePromedio',
            message: `Health Score (${healthScorePromedio}) debe estar entre 0 y 100`
        });
    }

    return errors;
}

function displayValidationErrors(errors) {
    const panel = document.getElementById('validation-errors-panel');
    const errorsList = document.getElementById('validation-errors-list');

    if (!panel || !errorsList) return;

    if (errors.length === 0) {
        panel.classList.add('hidden');
        clearFieldErrors();
        return;
    }

    // Limpiar errores previos
    errorsList.innerHTML = '';
    clearFieldErrors();

    // Mostrar panel
    panel.classList.remove('hidden');

    // Agregar cada error a la lista
    errors.forEach(error => {
        const li = document.createElement('li');
        li.className = 'text-sm';
        li.textContent = error.message;
        errorsList.appendChild(li);

        // Marcar campo con error
        markFieldWithError(error.field);
    });

    // Scroll al panel de errores
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function markFieldWithError(fieldName) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        field.classList.add('border-red-500', 'border-2', 'focus:ring-red-500', 'focus:border-red-500');
        field.classList.remove('border-gray-300');
    }
}

function clearFieldErrors() {
    const fields = document.querySelectorAll('.border-red-500');
    fields.forEach(field => {
        field.classList.remove('border-red-500', 'border-2', 'focus:ring-red-500', 'focus:border-red-500');
        field.classList.add('border-gray-300');
    });
}

function hideValidationPanel() {
    const panel = document.getElementById('validation-errors-panel');
    if (panel) {
        panel.classList.add('hidden');
    }
    clearFieldErrors();
}

// --- BASE DE DATOS SIMULADA ---
// Actualizada con datos por canal
let dashboardData = {
    "Enero": {
        weeks: [
            { leadsAds: 30, leadsOrganico: 15, leadsReferido: 5, leadsCalificados: 30, convertidosAds: 7, convertidosOrganico: 2, convertidosReferido: 1, demosRealizados: 10, demosExitosos: 7, cobranzaUSD: 5000, cobranzaBCV: 180000, inversionAds: 1000, clientesMorosos: 3, clientesPerdidos: 1, influvideosEnCola: 3, influvideosEntregados: 2, conversacionesAri: 420, mrrMini: 534, mrrPro: 1323, mrrMax: 598, mrrWariMini: 220, mrrWariPro: 327, clientesNuevosActivados: 8, churnSemanal: 1, npsSemanal: 38, tiempoPromedioOnboarding: 5, cicloVentaTotal: 12, grossMargin: 75, expansionMRR: 0, contractionMRR: 50, inversionFacebook: 400, inversionInstagram: 350, inversionTikTok: 250, ticketsAbiertos: 5, ticketsResueltos: 4, csatScore: 4.2, uptimeAri: 99.5, errorRateAri: 0.3, healthScorePromedio: 82 },
            { leadsAds: 35, leadsOrganico: 15, leadsReferido: 5, leadsCalificados: 33, convertidosAds: 9, convertidosOrganico: 2, convertidosReferido: 1, demosRealizados: 12, demosExitosos: 9, cobranzaUSD: 4500, cobranzaBCV: 162000, inversionAds: 1100, clientesMorosos: 1, clientesPerdidos: 0, influvideosEnCola: 2, influvideosEntregados: 3, conversacionesAri: 465, mrrMini: 623, mrrPro: 1512, mrrMax: 598, mrrWariMini: 220, mrrWariPro: 436, clientesNuevosActivados: 10, churnSemanal: 0, npsSemanal: 42, tiempoPromedioOnboarding: 4, cicloVentaTotal: 11, grossMargin: 76, expansionMRR: 120, contractionMRR: 0, inversionFacebook: 440, inversionInstagram: 385, inversionTikTok: 275, ticketsAbiertos: 3, ticketsResueltos: 3, csatScore: 4.5, uptimeAri: 99.8, errorRateAri: 0.2, healthScorePromedio: 85 },
            { leadsAds: 40, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 36, convertidosAds: 10, convertidosOrganico: 2, convertidosReferido: 2, demosRealizados: 11, demosExitosos: 8, cobranzaUSD: 6000, cobranzaBCV: 216000, inversionAds: 1200, clientesMorosos: 2, clientesPerdidos: 2, influvideosEnCola: 4, influvideosEntregados: 2, conversacionesAri: 510, mrrMini: 712, mrrPro: 1701, mrrMax: 897, mrrWariMini: 275, mrrWariPro: 436, clientesNuevosActivados: 12, churnSemanal: 2, npsSemanal: 40, tiempoPromedioOnboarding: 6, cicloVentaTotal: 13, grossMargin: 74, expansionMRR: 80, contractionMRR: 100, inversionFacebook: 480, inversionInstagram: 420, inversionTikTok: 300, ticketsAbiertos: 6, ticketsResueltos: 5, csatScore: 4.0, uptimeAri: 99.2, errorRateAri: 0.5, healthScorePromedio: 78 },
            { leadsAds: 32, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 31, convertidosAds: 8, convertidosOrganico: 1, convertidosReferido: 2, demosRealizados: 15, demosExitosos: 10, cobranzaUSD: 5200, cobranzaBCV: 187200, inversionAds: 1050, clientesMorosos: 0, clientesPerdidos: 1, influvideosEnCola: 2, influvideosEntregados: 4, conversacionesAri: 495, mrrMini: 801, mrrPro: 1890, mrrMax: 897, mrrWariMini: 275, mrrWariPro: 545, clientesNuevosActivados: 9, churnSemanal: 1, npsSemanal: 45, tiempoPromedioOnboarding: 5, cicloVentaTotal: 12, grossMargin: 77, expansionMRR: 150, contractionMRR: 30, inversionFacebook: 420, inversionInstagram: 367, inversionTikTok: 263, ticketsAbiertos: 4, ticketsResueltos: 4, csatScore: 4.6, uptimeAri: 99.9, errorRateAri: 0.1, healthScorePromedio: 88 },
        ],
        consolidated: {},
        meta: {}
    },
    "Febrero": {
        weeks: [
            { leadsAds: 45, leadsOrganico: 15, leadsReferido: 5, leadsCalificados: 40, convertidosAds: 11, convertidosOrganico: 3, convertidosReferido: 1, demosRealizados: 15, demosExitosos: 11, cobranzaUSD: 7000, cobranzaBCV: 252000, inversionAds: 1300, clientesMorosos: 4, clientesPerdidos: 2, influvideosEnCola: 3, influvideosEntregados: 3, conversacionesAri: 540, mrrMini: 890, mrrPro: 2079, mrrMax: 1196, mrrWariMini: 330, mrrWariPro: 654, clientesNuevosActivados: 13, churnSemanal: 2, npsSemanal: 43, tiempoPromedioOnboarding: 5, cicloVentaTotal: 11, grossMargin: 78, expansionMRR: 200, contractionMRR: 80, inversionFacebook: 520, inversionInstagram: 455, inversionTikTok: 325, ticketsAbiertos: 7, ticketsResueltos: 6, csatScore: 4.3, uptimeAri: 99.6, errorRateAri: 0.3, healthScorePromedio: 83 },
            { leadsAds: 50, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 42, convertidosAds: 12, convertidosOrganico: 3, convertidosReferido: 2, demosRealizados: 18, demosExitosos: 14, cobranzaUSD: 7200, cobranzaBCV: 259200, inversionAds: 1400, clientesMorosos: 1, clientesPerdidos: 1, influvideosEnCola: 2, influvideosEntregados: 4, conversacionesAri: 612, mrrMini: 979, mrrPro: 2268, mrrMax: 1495, mrrWariMini: 385, mrrWariPro: 763, clientesNuevosActivados: 15, churnSemanal: 1, npsSemanal: 47, tiempoPromedioOnboarding: 4, cicloVentaTotal: 10, grossMargin: 79, expansionMRR: 250, contractionMRR: 50, inversionFacebook: 560, inversionInstagram: 490, inversionTikTok: 350, ticketsAbiertos: 5, ticketsResueltos: 5, csatScore: 4.7, uptimeAri: 99.9, errorRateAri: 0.1, healthScorePromedio: 89 },
            { leadsAds: 48, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 41, convertidosAds: 11, convertidosOrganico: 3, convertidosReferido: 2, demosRealizados: 16, demosExitosos: 12, cobranzaUSD: 6800, cobranzaBCV: 244800, inversionAds: 1350, clientesMorosos: 2, clientesPerdidos: 2, influvideosEnCola: 4, influvideosEntregados: 3, conversacionesAri: 585, mrrMini: 1068, mrrPro: 2457, mrrMax: 1495, mrrWariMini: 385, mrrWariPro: 872, clientesNuevosActivados: 14, churnSemanal: 2, npsSemanal: 44, tiempoPromedioOnboarding: 5, cicloVentaTotal: 11, grossMargin: 77, expansionMRR: 180, contractionMRR: 100, inversionFacebook: 540, inversionInstagram: 472, inversionTikTok: 338, ticketsAbiertos: 6, ticketsResueltos: 5, csatScore: 4.1, uptimeAri: 99.3, errorRateAri: 0.4, healthScorePromedio: 80 },
            { leadsAds: 55, leadsOrganico: 15, leadsReferido: 5, leadsCalificados: 45, convertidosAds: 13, convertidosOrganico: 3, convertidosReferido: 2, demosRealizados: 20, demosExitosos: 15, cobranzaUSD: 8000, cobranzaBCV: 288000, inversionAds: 1500, clientesMorosos: 1, clientesPerdidos: 0, influvideosEnCola: 2, influvideosEntregados: 5, conversacionesAri: 648, mrrMini: 1157, mrrPro: 2646, mrrMax: 1794, mrrWariMini: 440, mrrWariPro: 981, clientesNuevosActivados: 16, churnSemanal: 0, npsSemanal: 49, tiempoPromedioOnboarding: 4, cicloVentaTotal: 10, grossMargin: 80, expansionMRR: 300, contractionMRR: 20, inversionFacebook: 600, inversionInstagram: 525, inversionTikTok: 375, ticketsAbiertos: 4, ticketsResueltos: 4, csatScore: 4.8, uptimeAri: 99.9, errorRateAri: 0.1, healthScorePromedio: 91 },
        ],
        consolidated: {},
        meta: {}
    },
    "Marzo": {
        weeks: [
            { leadsAds: 60, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 48, convertidosAds: 14, convertidosOrganico: 4, convertidosReferido: 2, demosRealizados: 20, demosExitosos: 16, cobranzaUSD: 8500, cobranzaBCV: 306000, inversionAds: 1600, clientesMorosos: 3, clientesPerdidos: 3, influvideosEnCola: 3, influvideosEntregados: 4, conversacionesAri: 720, mrrMini: 1246, mrrPro: 2835, mrrMax: 2093, mrrWariMini: 495, mrrWariPro: 1090, clientesNuevosActivados: 18, churnSemanal: 3, npsSemanal: 46, tiempoPromedioOnboarding: 5, cicloVentaTotal: 11, grossMargin: 79, expansionMRR: 280, contractionMRR: 120, inversionFacebook: 640, inversionInstagram: 560, inversionTikTok: 400, ticketsAbiertos: 8, ticketsResueltos: 7, csatScore: 4.4, uptimeAri: 99.5, errorRateAri: 0.3, healthScorePromedio: 84 },
            { leadsAds: 62, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 50, convertidosAds: 15, convertidosOrganico: 4, convertidosReferido: 3, demosRealizados: 22, demosExitosos: 18, cobranzaUSD: 9000, cobranzaBCV: 324000, inversionAds: 1650, clientesMorosos: 0, clientesPerdidos: 1, influvideosEnCola: 2, influvideosEntregados: 5, conversacionesAri: 792, mrrMini: 1335, mrrPro: 3024, mrrMax: 2392, mrrWariMini: 550, mrrWariPro: 1199, clientesNuevosActivados: 20, churnSemanal: 1, npsSemanal: 51, tiempoPromedioOnboarding: 4, cicloVentaTotal: 9, grossMargin: 81, expansionMRR: 350, contractionMRR: 40, inversionFacebook: 660, inversionInstagram: 577, inversionTikTok: 413, ticketsAbiertos: 4, ticketsResueltos: 4, csatScore: 4.9, uptimeAri: 99.9, errorRateAri: 0.1, healthScorePromedio: 92 },
            { leadsAds: 58, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 47, convertidosAds: 15, convertidosOrganico: 3, convertidosReferido: 3, demosRealizados: 21, demosExitosos: 17, cobranzaUSD: 8800, cobranzaBCV: 316800, inversionAds: 1550, clientesMorosos: 2, clientesPerdidos: 2, influvideosEnCola: 4, influvideosEntregados: 4, conversacionesAri: 765, mrrMini: 1424, mrrPro: 3213, mrrMax: 2392, mrrWariMini: 550, mrrWariPro: 1308, clientesNuevosActivados: 19, churnSemanal: 2, npsSemanal: 48, tiempoPromedioOnboarding: 5, cicloVentaTotal: 10, grossMargin: 78, expansionMRR: 220, contractionMRR: 90, inversionFacebook: 620, inversionInstagram: 542, inversionTikTok: 388, ticketsAbiertos: 7, ticketsResueltos: 6, csatScore: 4.2, uptimeAri: 99.4, errorRateAri: 0.4, healthScorePromedio: 81 },
            { leadsAds: 65, leadsOrganico: 10, leadsReferido: 10, leadsCalificados: 52, convertidosAds: 18, convertidosOrganico: 4, convertidosReferido: 3, demosRealizados: 25, demosExitosos: 20, cobranzaUSD: 9200, cobranzaBCV: 331200, inversionAds: 1700, clientesMorosos: 1, clientesPerdidos: 0, influvideosEnCola: 2, influvideosEntregados: 6, conversacionesAri: 855, mrrMini: 1513, mrrPro: 3402, mrrMax: 2691, mrrWariMini: 605, mrrWariPro: 1417, clientesNuevosActivados: 23, churnSemanal: 0, npsSemanal: 53, tiempoPromedioOnboarding: 4, cicloVentaTotal: 9, grossMargin: 82, expansionMRR: 400, contractionMRR: 20, inversionFacebook: 680, inversionInstagram: 595, inversionTikTok: 425, ticketsAbiertos: 3, ticketsResueltos: 3, csatScore: 4.9, uptimeAri: 99.9, errorRateAri: 0.1, healthScorePromedio: 93 },
        ],
        consolidated: {},
        meta: {}
    },
    "Abril": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Mayo": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Junio": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Julio": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Agosto": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Septiembre": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Octubre": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Noviembre": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} },
    "Diciembre": { weeks: [{}, {}, {}, {}], consolidated: {}, meta: {} }
};

// --- OBJETOS DE GRÁFICOS (Globales) ---
let leadFunnelChart, profitabilityChart, clientHealthChart, conversionRateChart, demoSuccessTrendChart, clientNetGrowthChart, aovVsCpaChart;
let leadsByChannelChart, cpaByChannelChart;
let mrrByPlanChart, churnVsNewChart, ariPerformanceChart, influvideoProductionChart, npsEvolutionChart;
let ltvCacRatioChart, nrrQuickRatioChart, ruleOf40Chart;

let yearConsolidated = {};

let dataFormElement = null;
let dataFormMessageEl = null;
let suppressFormResetMessage = false;
let editingContext = null;

function clearFormMessage() {
    if (!dataFormMessageEl) return;
    dataFormMessageEl.textContent = '';
    dataFormMessageEl.className = 'text-sm text-gray-500';
}

function showFormMessage(message, type = 'info') {
    if (!dataFormMessageEl) return;
    const colorClass = type === 'success'
        ? 'text-green-600'
        : type === 'error'
            ? 'text-red-600'
            : 'text-gray-500';
    dataFormMessageEl.textContent = message;
    dataFormMessageEl.className = `text-sm ${colorClass}`;
}

// --- FUNCIONES DE EXPORTACIÓN A PDF ---
async function exportDashboardToPDF() {
    const button = document.getElementById('export-dashboard-pdf');
    const originalText = button.innerHTML;
    
    // Mostrar loading
    button.disabled = true;
    button.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generando PDF...
    `;
    
    try {
        const dashboardView = document.getElementById('dashboard-view');
        const filterContainer = document.getElementById('period-filter-container');
        const currentFilter = document.getElementById('master-filter').value;
        
        // Obtener el nombre del periodo seleccionado
        let periodName = 'Todas las Semanas';
        if (currentFilter !== 'all') {
            const filterOption = document.querySelector(`#master-filter option[value="${currentFilter}"]`);
            if (filterOption) periodName = filterOption.textContent;
        }
        
        // Crear contenedor temporal con título
        const pdfContainer = document.createElement('div');
        pdfContainer.style.padding = '20px';
        pdfContainer.style.backgroundColor = 'white';
        
        // Agregar encabezado
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.style.borderBottom = '2px solid #3B82F6';
        header.style.paddingBottom = '10px';
        header.innerHTML = `
            <h1 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0;">Dashboard de Indicadores - Arizon.ai</h1>
            <p style="font-size: 14px; color: #3B82F6; margin: 5px 0 0 0;">Periodo: ${periodName}</p>
            <p style="font-size: 12px; color: #6B7280; margin: 5px 0 0 0;">Generado: ${new Date().toLocaleString('es-MX')}</p>
        `;
        pdfContainer.appendChild(header);
        
        // Clonar el dashboard (sin el botón de exportar)
        const dashboardClone = dashboardView.cloneNode(true);
        const exportBtn = dashboardClone.querySelector('#export-dashboard-pdf');
        if (exportBtn) exportBtn.remove();
        
        pdfContainer.appendChild(dashboardClone);
        
        // Configuración de html2pdf
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Arizon_Dashboard_${periodName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        await html2pdf().set(opt).from(pdfContainer).save();
        
        // Restaurar botón
        button.disabled = false;
        button.innerHTML = originalText;
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        button.disabled = false;
        button.innerHTML = originalText;
        alert('Error al generar el PDF. Por favor intenta de nuevo.');
    }
}

async function exportChartsToPDF() {
    const button = document.getElementById('export-charts-pdf');
    const originalText = button.innerHTML;
    
    // Mostrar loading
    button.disabled = true;
    button.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generando PDF...
    `;
    
    try {
        const currentFilter = document.getElementById('master-filter').value;
        
        // Obtener el nombre del periodo seleccionado
        let periodName = 'Todas las Semanas';
        if (currentFilter !== 'all') {
            const filterOption = document.querySelector(`#master-filter option[value="${currentFilter}"]`);
            if (filterOption) periodName = filterOption.textContent;
        }
        
        // Array de todas las gráficas
        const chartIds = [
            'leadFunnelChart',
            'profitabilityChart',
            'conversionRateChart',
            'leadsByChannelChart',
            'cpaByChannelChart',
            'clientHealthChart',
            'demoSuccessTrendChart',
            'clientNetGrowthChart',
            'aovVsCpaChart',
            'mrrByPlanChart',
            'churnVsNewChart',
            'ariPerformanceChart',
            'influvideoProductionChart',
            'npsEvolutionChart',
            'ltvCacRatioChart',
            'nrrQuickRatioChart',
            'ruleOf40Chart'
        ];
        
        // Nombres de las gráficas
        const chartTitles = {
            'leadFunnelChart': 'Funnel de Leads (Tendencia Anual)',
            'profitabilityChart': 'Análisis de Rentabilidad (Tendencia Anual)',
            'conversionRateChart': 'Tasas de Conversión (Tendencia Anual)',
            'leadsByChannelChart': 'Leads por Canal (Tendencia Anual)',
            'cpaByChannelChart': 'Costo por Adquisición (CPA) por Canal',
            'clientHealthChart': 'Tendencia de Salud de Clientes (Anual)',
            'demoSuccessTrendChart': 'Tendencia de Tasa de Éxito de Demos (%)',
            'clientNetGrowthChart': 'Crecimiento Neto de Clientes',
            'aovVsCpaChart': 'Rentabilidad de Adquisición (AOV vs. CPA)',
            'mrrByPlanChart': 'MRR por Plan (Tendencia Anual)',
            'churnVsNewChart': 'Churn y Nuevos Clientes',
            'ariPerformanceChart': 'Performance de Ari (Conversaciones)',
            'influvideoProductionChart': 'Producción de InfluVideos',
            'npsEvolutionChart': 'Evolución del NPS',
            'ltvCacRatioChart': 'LTV:CAC Ratio Evolution',
            'nrrQuickRatioChart': 'NRR & Quick Ratio Trends',
            'ruleOf40Chart': 'Rule of 40 Dashboard'
        };
        
        // Crear el PDF usando jsPDF directamente para mejor control de páginas
        const { jsPDF } = window.jspdf || {};
        
        // Si jsPDF no está disponible, usar el método anterior
        if (!jsPDF) {
            // Método alternativo con html2pdf
            const pdfContainer = document.createElement('div');
            pdfContainer.style.padding = '20px';
            pdfContainer.style.backgroundColor = 'white';
            
            // Agregar encabezado
            const header = document.createElement('div');
            header.style.marginBottom = '20px';
            header.style.borderBottom = '2px solid #3B82F6';
            header.style.paddingBottom = '10px';
            header.innerHTML = `
                <h1 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0;">Análisis Visual de Tendencias - Arizon.ai</h1>
                <p style="font-size: 14px; color: #3B82F6; margin: 5px 0 0 0;">Periodo: ${periodName}</p>
                <p style="font-size: 12px; color: #6B7280; margin: 5px 0 0 0;">Generado: ${new Date().toLocaleString('es-MX')}</p>
            `;
            pdfContainer.appendChild(header);
            
            // Procesar gráficas en grupos de 4 por página (2x2)
            for (let i = 0; i < chartIds.length; i += 4) {
                const pageDiv = document.createElement('div');
                pageDiv.style.pageBreakAfter = 'always';
                pageDiv.style.pageBreakInside = 'avoid';
                pageDiv.style.width = '100%';
                pageDiv.style.marginBottom = '20px';
                
                // Crear una tabla HTML para mejor control del layout 2x2
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'separate';
                table.style.borderSpacing = '10px';
                
                // Primera fila
                const row1 = document.createElement('tr');
                
                // Gráfica 1 (arriba izquierda)
                if (i < chartIds.length) {
                    const cell1 = createChartCell(chartIds[i], chartTitles);
                    row1.appendChild(cell1);
                }
                
                // Gráfica 2 (arriba derecha)
                if (i + 1 < chartIds.length) {
                    const cell2 = createChartCell(chartIds[i + 1], chartTitles);
                    row1.appendChild(cell2);
                }
                
                table.appendChild(row1);
                
                // Segunda fila
                const row2 = document.createElement('tr');
                
                // Gráfica 3 (abajo izquierda)
                if (i + 2 < chartIds.length) {
                    const cell3 = createChartCell(chartIds[i + 2], chartTitles);
                    row2.appendChild(cell3);
                }
                
                // Gráfica 4 (abajo derecha)
                if (i + 3 < chartIds.length) {
                    const cell4 = createChartCell(chartIds[i + 3], chartTitles);
                    row2.appendChild(cell4);
                }
                
                table.appendChild(row2);
                pageDiv.appendChild(table);
                pdfContainer.appendChild(pageDiv);
            }
            
            // Función helper para crear celdas de gráficas
            function createChartCell(chartId, chartTitles) {
                const cell = document.createElement('td');
                cell.style.width = '50%';
                cell.style.verticalAlign = 'top';
                cell.style.padding = '5px';
                
                const canvas = document.getElementById(chartId);
                if (canvas) {
                    const chartCard = document.createElement('div');
                    chartCard.style.backgroundColor = 'white';
                    chartCard.style.border = '1px solid #e5e7eb';
                    chartCard.style.borderRadius = '8px';
                    chartCard.style.padding = '10px';
                    chartCard.style.height = '100%';
                    
                    const title = document.createElement('h3');
                    title.style.fontSize = '11px';
                    title.style.fontWeight = '600';
                    title.style.color = '#111827';
                    title.style.marginBottom = '8px';
                    title.style.marginTop = '0';
                    title.textContent = chartTitles[chartId] || chartId;
                    chartCard.appendChild(title);
                    
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const img = document.createElement('img');
                    img.src = imgData;
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    chartCard.appendChild(img);
                    
                    cell.appendChild(chartCard);
                }
                
                return cell;
            }
            
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Arizon_Graficas_${periodName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { 
                    scale: 1.5,
                    useCORS: true,
                    logging: false
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'landscape'
                },
                pagebreak: { mode: 'css', after: '.pagebreak' }
            };
            
            await html2pdf().set(opt).from(pdfContainer).save();
        }
        
        // Restaurar botón
        button.disabled = false;
        button.innerHTML = originalText;
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        button.disabled = false;
        button.innerHTML = originalText;
        alert('Error al generar el PDF. Por favor intenta de nuevo.');
    }
}

// --- FUNCIÓN DE INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Configuración global de Chart.js para modo claro
    Chart.defaults.color = '#6b7280';
    Chart.defaults.borderColor = '#e5e7eb';
    Chart.defaults.plugins.tooltip.backgroundColor = '#ffffff';
    Chart.defaults.plugins.tooltip.titleColor = '#111827';
    Chart.defaults.plugins.tooltip.bodyColor = '#374151';
    Chart.defaults.plugins.tooltip.borderColor = '#d1d5db';
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    // Inicializar sistema de logo
    initializeLogoSystem();

    // Inicializar sistema de backup/restore
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const importInput = document.getElementById('import-file-input');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportDashboardData);
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', importDashboardData);
    }
    
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            processImportedFile(e.target.files[0]);
            // Limpiar input para permitir seleccionar el mismo archivo nuevamente
            e.target.value = '';
        });
    }
    
    // Cargar fecha del último backup si existe
    const lastBackupDate = localStorage.getItem('last-backup-date');
    if (lastBackupDate) {
        updateLastBackupIndicator(new Date(lastBackupDate));
    }

    // Inicializar event listeners del modal de confirmación
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalOverlay = document.querySelector('#confirmation-modal .fixed.inset-0');
    
    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => hideConfirmationModal(true));
    }
    
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => hideConfirmationModal(false));
    }
    
    // Cerrar modal al hacer click en el overlay
    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => hideConfirmationModal(false));
    }

    // Cerrar modal con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('confirmation-modal');
            if (modal && !modal.classList.contains('hidden')) {
                hideConfirmationModal(false);
            }
        }
    });

    // Inicializar event listeners del toast de deshacer
    const undoBtn = document.getElementById('undo-btn');
    const undoCloseBtn = document.getElementById('undo-close-btn');
    
    if (undoBtn) {
        undoBtn.addEventListener('click', performUndo);
    }
    
    if (undoCloseBtn) {
        undoCloseBtn.addEventListener('click', () => {
            hideUndoToast();
            undoState = null;
        });
    }

    // Inicializar event listener del panel de validación
    const closeValidationBtn = document.getElementById('close-validation-panel');
    if (closeValidationBtn) {
        closeValidationBtn.addEventListener('click', hideValidationPanel);
    }

    // Limpiar errores cuando el usuario empieza a editar campos
    if (dataFormElement) {
        dataFormElement.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                // Limpiar error visual del campo específico
                e.target.classList.remove('border-red-500', 'border-2', 'focus:ring-red-500', 'focus:border-red-500');
                e.target.classList.add('border-gray-300');
            }
        });
    }

    recalculateAllData();
    populateMasterFilter();
    renderAllKPIs('Consolidado Año');
    initializeCharts();
    updateProgressIndicator(); // Actualizar indicador de progreso

    document.getElementById('master-filter').addEventListener('change', handleFilterChange);
    setupViewSwitching();
    setupDataForm();
    
    // Event listeners para exportar PDF
    const exportDashboardBtn = document.getElementById('export-dashboard-pdf');
    if (exportDashboardBtn) {
        exportDashboardBtn.addEventListener('click', exportDashboardToPDF);
    }
    
    const exportChartsBtn = document.getElementById('export-charts-pdf');
    if (exportChartsBtn) {
        exportChartsBtn.addEventListener('click', exportChartsToPDF);
    }

    // Event listeners para filtros de administración
    const filterMonth = document.getElementById('filter-month');
    const filterWeek = document.getElementById('filter-week');
    const filterCompleteness = document.getElementById('filter-completeness');
    const filterSearch = document.getElementById('filter-search');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    if (filterMonth) {
        filterMonth.addEventListener('change', (e) => {
            currentFilters.month = e.target.value;
            applyDataFilters();
        });
    }

    if (filterWeek) {
        filterWeek.addEventListener('change', (e) => {
            currentFilters.week = e.target.value;
            applyDataFilters();
        });
    }

    if (filterCompleteness) {
        filterCompleteness.addEventListener('change', (e) => {
            currentFilters.completeness = e.target.value;
            applyDataFilters();
        });
    }

    if (filterSearch) {
        filterSearch.addEventListener('input', (e) => {
            currentFilters.search = e.target.value;
            applyDataFilters();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearDataFilters);
    }

    // Event listener para mostrar/ocultar desglose de progreso
    const progressDetailsBtn = document.getElementById('progress-details-btn');
    if (progressDetailsBtn) {
        progressDetailsBtn.addEventListener('click', toggleProgressBreakdown);
    }

    // Mostrar notificación de semanas pendientes al cargar
    showPendingWeeksToast();

    // Event listener para cerrar el toast
    const closePendingToastBtn = document.getElementById('close-pending-weeks-toast');
    if (closePendingToastBtn) {
        closePendingToastBtn.addEventListener('click', () => {
            document.getElementById('pending-weeks-toast').classList.add('hidden');
        });
    }
// --- NOTIFICACIÓN DE SEMANAS PENDIENTES ---
function showPendingWeeksToast() {
    let pendingCount = 0;
    Object.keys(dashboardData).forEach(month => {
        dashboardData[month].weeks.forEach(week => {
            if (!week || Object.keys(week).length === 0 || Object.values(week).every(v => v === null || v === undefined || v === '')) {
                pendingCount++;
            }
        });
    });
    const toast = document.getElementById('pending-weeks-toast');
    const countSpan = document.getElementById('pending-weeks-count');
    if (toast && countSpan && pendingCount > 0) {
        countSpan.textContent = pendingCount;
        toast.classList.remove('hidden');
    } else if (toast) {
        toast.classList.add('hidden');
    }
}
});

// --- LÓGICA DE DATOS ---
function recalculateAllData() {
    for (const monthName in dashboardData) {
        dashboardData[monthName].consolidated = recalculateMonthConsolidated(monthName);
    }
    yearConsolidated = recalculateYearConsolidated();
}

const safeDivide = (numerator, denominator) => {
    if (denominator === 0 || !denominator) return 0;
    return numerator / denominator;
};

// === SISTEMA DE TARGETS Y ALERTAS ===
const kpiTargets = {
    // Unit Economics
    ltv: { excellent: 5000, good: 3000, warning: 2000, critical: 1000 },
    ltvCacRatio: { excellent: 4, good: 3, warning: 2, critical: 1 },
    cacPaybackPeriod: { excellent: 6, good: 12, warning: 18, critical: 24, inverse: true },
    grossMargin: { excellent: 80, good: 75, warning: 70, critical: 65 },
    
    // Retention & Growth
    churnRate: { excellent: 2, good: 5, warning: 8, critical: 10, inverse: true },
    nrr: { excellent: 110, good: 100, warning: 95, critical: 90 },
    quickRatio: { excellent: 4, good: 2, warning: 1, critical: 0.5 },
    
    // Revenue
    mrrTotal: { excellent: 10000, good: 5000, warning: 3000, critical: 1500 },
    arr: { excellent: 120000, good: 60000, warning: 36000, critical: 18000 },
    
    // Customer Success
    npsSemanal: { excellent: 50, good: 40, warning: 30, critical: 20 },
    healthScorePromedio: { excellent: 85, good: 75, warning: 65, critical: 55 },
    csatScore: { excellent: 4.5, good: 4.0, warning: 3.5, critical: 3.0 },
    
    // Operational
    uptimeAri: { excellent: 99.9, good: 99.5, warning: 99.0, critical: 98.0 },
    errorRateAri: { excellent: 0.1, good: 0.3, warning: 0.5, critical: 1.0, inverse: true },
    tiempoPromedioOnboarding: { excellent: 3, good: 5, warning: 7, critical: 10, inverse: true },
    
    // Strategic
    ruleOf40: { excellent: 50, good: 40, warning: 30, critical: 20 },
    
    // Conversion
    tasaConversionCierre: { excellent: 30, good: 20, warning: 15, critical: 10 },
    tasaExitoDemos: { excellent: 80, good: 70, warning: 60, critical: 50 }
};

function getKPIStatus(kpiName, value) {
    const target = kpiTargets[kpiName];
    if (!target) return 'neutral';
    
    const inverse = target.inverse || false;
    
    if (inverse) {
        // Para KPIs donde menor es mejor (churn, CAC payback, etc.)
        if (value <= target.excellent) return 'excellent';
        if (value <= target.good) return 'good';
        if (value <= target.warning) return 'warning';
        return 'critical';
    } else {
        // Para KPIs donde mayor es mejor (LTV, NPS, etc.)
        if (value >= target.excellent) return 'excellent';
        if (value >= target.good) return 'good';
        if (value >= target.warning) return 'warning';
        return 'critical';
    }
}

function getTargetProgress(kpiName, value) {
    const target = kpiTargets[kpiName];
    if (!target) return null;
    
    const goodTarget = target.good;
    const percentage = (value / goodTarget) * 100;
    
    return {
        percentage: Math.round(percentage),
        achieved: percentage >= 100,
        close: percentage >= 90 && percentage < 100
    };
}

function recalculateMonthConsolidated(monthName) {
    const month = dashboardData[monthName];
    const defaultMeta = {
        gastosFijos: 15000,
        formasLeads: 5,
        inversionTotal: 1250000,
        deudasSocios: [12500, 12500, 12500, 12500]
    };

    const metaSource = month.meta || {};
    const mergedMeta = {
        gastosFijos: metaSource.gastosFijos ?? defaultMeta.gastosFijos,
        formasLeads: metaSource.formasLeads ?? defaultMeta.formasLeads,
        inversionTotal: metaSource.inversionTotal ?? defaultMeta.inversionTotal,
        deudasSocios: Array.isArray(metaSource.deudasSocios) && metaSource.deudasSocios.length
            ? metaSource.deudasSocios.slice(0, 4)
            : defaultMeta.deudasSocios.slice(0, 4)
    };
    while (mergedMeta.deudasSocios.length < 4) {
        mergedMeta.deudasSocios.push(0);
    }

    const consolidated = {
        leadsCalificados: 0,
        demosRealizados: 0,
        demosExitosos: 0,
        cobranzaUSD: 0,
        cobranzaBCV: 0,
        inversionAds: 0,
        clientesMorosos: 0,
        clientesPerdidos: 0,
        leadsAds: 0,
        leadsOrganico: 0,
        leadsReferido: 0,
        convertidosAds: 0,
        convertidosOrganico: 0,
        convertidosReferido: 0,
        leadsRecibidos: 0,
        leadsConvertidos: 0,
        clientesActivos100: 0,
        clientesActivos50: 0,
        cxc: 0,
        conversacionesGeneradas: 0,
        influvideosVendidos: 0,
        demosInfluvideos: 0,
        gastosFijos: 0,
        formasLeads: 0,
        inversionTotal: 0,
        deudasSociosDetalle: [0, 0, 0, 0],
        deudaSocios: 0,
        tasaConversionCalificados: 0,
        tasaConversionCierre: 0,
        costoPorLead: 0,
        costoPorAdquisicion: 0,
        margenNeto: 0,
        tasaExitoDemos: 0,
        clientesActivosTotales: 0,
        aov: 0,
        cpaAds: 0,
        cpaOrganico: 0,
        cpaReferido: 0,
        // === NUEVOS CAMPOS TOP 10 ===
        influvideosEnCola: 0,
        influvideosEntregados: 0,
        conversacionesAri: 0,
        mrrMini: 0,
        mrrPro: 0,
        mrrMax: 0,
        mrrWariMini: 0,
        mrrWariPro: 0,
        mrrTotal: 0,
        arr: 0,
        clientesNuevosActivados: 0,
        churnSemanal: 0,
        churnRate: 0,
        npsSemanal: 0,
        tiempoPromedioOnboarding: 0,
        cicloVentaTotal: 0,
        // === NUEVOS CAMPOS AVANZADOS ===
        grossMargin: 0,
        expansionMRR: 0,
        contractionMRR: 0,
        inversionFacebook: 0,
        inversionInstagram: 0,
        inversionTikTok: 0,
        ticketsAbiertos: 0,
        ticketsResueltos: 0,
        csatScore: 0,
        uptimeAri: 0,
        errorRateAri: 0,
        healthScorePromedio: 0,
        // Métricas calculadas
        ltv: 0,
        cacPaybackPeriod: 0,
        nrr: 0,
        quickRatio: 0,
        ltvCacRatio: 0,
        ruleOf40: 0,
        cacFacebook: 0,
        cacInstagram: 0,
        cacTikTok: 0,
        churnRateMini: 0,
        churnRatePro: 0,
        churnRateMax: 0,
        churnRateWariMini: 0,
        churnRateWariPro: 0
    };

    const snapshotValues = {
        clientesActivos100: null,
        clientesActivos50: null,
        cxc: null,
        formasLeads: null,
        inversionTotal: null,
        // === NUEVOS SNAPSHOTS ===
        npsSemanal: null,
        tiempoPromedioOnboarding: null,
        cicloVentaTotal: null,
        grossMargin: null,
        csatScore: null,
        uptimeAri: null,
        errorRateAri: null,
        healthScorePromedio: null
    };
    const snapshotProvided = {
        clientesActivos100: false,
        clientesActivos50: false,
        cxc: false,
        formasLeads: false,
        inversionTotal: false,
        // === NUEVOS SNAPSHOTS ===
        npsSemanal: false,
        tiempoPromedioOnboarding: false,
        cicloVentaTotal: false,
        grossMargin: false,
        csatScore: false,
        uptimeAri: false,
        errorRateAri: false,
        healthScorePromedio: false
    };

    const debtSnapshots = [null, null, null, null];
    const debtProvided = [false, false, false, false];
    let gastosFijosProvided = false;

    month.weeks.forEach(week => {
        if (!week) return;

        const leadsAds = week.leadsAds || 0;
        const leadsOrganico = week.leadsOrganico || 0;
        const leadsReferido = week.leadsReferido || 0;
        const convertidosAds = week.convertidosAds || 0;
        const convertidosOrganico = week.convertidosOrganico || 0;
        const convertidosReferido = week.convertidosReferido || 0;

        consolidated.leadsAds += leadsAds;
        consolidated.leadsOrganico += leadsOrganico;
        consolidated.leadsReferido += leadsReferido;
        consolidated.convertidosAds += convertidosAds;
        consolidated.convertidosOrganico += convertidosOrganico;
        consolidated.convertidosReferido += convertidosReferido;

        const weekLeadsRecibidos = week.leadsRecibidos != null
            ? week.leadsRecibidos
            : leadsAds + leadsOrganico + leadsReferido;
        const weekLeadsConvertidos = week.leadsConvertidos != null
            ? week.leadsConvertidos
            : convertidosAds + convertidosOrganico + convertidosReferido;

        consolidated.leadsRecibidos += weekLeadsRecibidos;
        consolidated.leadsConvertidos += weekLeadsConvertidos;

        consolidated.leadsCalificados += week.leadsCalificados || 0;
        consolidated.demosRealizados += week.demosRealizados || 0;
        consolidated.demosExitosos += week.demosExitosos || 0;
        consolidated.cobranzaUSD += week.cobranzaUSD || 0;
        consolidated.cobranzaBCV += week.cobranzaBCV || 0;
        consolidated.inversionAds += week.inversionAds || 0;
        consolidated.clientesMorosos += week.clientesMorosos || 0;
        consolidated.clientesPerdidos += week.clientesPerdidos || 0;

        const weekConversaciones = week.conversacionesGeneradas != null
            ? week.conversacionesGeneradas
            : Math.floor(weekLeadsRecibidos * 1.5);
        consolidated.conversacionesGeneradas += weekConversaciones;

        const weekInfluvideos = week.influvideosVendidos != null
            ? week.influvideosVendidos
            : Math.floor((week.demosExitosos || 0) * 0.1);
        consolidated.influvideosVendidos += weekInfluvideos;

        const weekDemosInfluvideos = week.demosInfluvideos != null
            ? week.demosInfluvideos
            : Math.floor((week.demosRealizados || 0) * 0.2);
        consolidated.demosInfluvideos += weekDemosInfluvideos;

        // === ACUMULAR NUEVOS CAMPOS TOP 10 ===
        consolidated.influvideosEnCola += week.influvideosEnCola || 0;
        consolidated.influvideosEntregados += week.influvideosEntregados || 0;
        consolidated.conversacionesAri += week.conversacionesAri || 0;
        consolidated.mrrMini += week.mrrMini || 0;
        consolidated.mrrPro += week.mrrPro || 0;
        consolidated.mrrMax += week.mrrMax || 0;
        consolidated.mrrWariMini += week.mrrWariMini || 0;
        consolidated.mrrWariPro += week.mrrWariPro || 0;
        consolidated.clientesNuevosActivados += week.clientesNuevosActivados || 0;
        consolidated.churnSemanal += week.churnSemanal || 0;
        
        // === ACUMULAR NUEVOS CAMPOS AVANZADOS ===
        consolidated.expansionMRR += week.expansionMRR || 0;
        consolidated.contractionMRR += week.contractionMRR || 0;
        consolidated.inversionFacebook += week.inversionFacebook || 0;
        consolidated.inversionInstagram += week.inversionInstagram || 0;
        consolidated.inversionTikTok += week.inversionTikTok || 0;
        consolidated.ticketsAbiertos += week.ticketsAbiertos || 0;
        consolidated.ticketsResueltos += week.ticketsResueltos || 0;

        if (week.clientesActivos100 != null) {
            snapshotValues.clientesActivos100 = week.clientesActivos100;
            snapshotProvided.clientesActivos100 = true;
        }
        if (week.clientesActivos50 != null) {
            snapshotValues.clientesActivos50 = week.clientesActivos50;
            snapshotProvided.clientesActivos50 = true;
        }
        if (week.cxc != null) {
            snapshotValues.cxc = week.cxc;
            snapshotProvided.cxc = true;
        }
        if (week.formasLeads != null) {
            snapshotValues.formasLeads = week.formasLeads;
            snapshotProvided.formasLeads = true;
        }
        if (week.inversionTotal != null) {
            snapshotValues.inversionTotal = week.inversionTotal;
            snapshotProvided.inversionTotal = true;
        }

        // === SNAPSHOTS NUEVOS ===
        if (week.npsSemanal != null) {
            snapshotValues.npsSemanal = week.npsSemanal;
            snapshotProvided.npsSemanal = true;
        }
        if (week.tiempoPromedioOnboarding != null) {
            snapshotValues.tiempoPromedioOnboarding = week.tiempoPromedioOnboarding;
            snapshotProvided.tiempoPromedioOnboarding = true;
        }
        if (week.cicloVentaTotal != null) {
            snapshotValues.cicloVentaTotal = week.cicloVentaTotal;
            snapshotProvided.cicloVentaTotal = true;
        }
        if (week.grossMargin != null) {
            snapshotValues.grossMargin = week.grossMargin;
            snapshotProvided.grossMargin = true;
        }
        if (week.csatScore != null) {
            snapshotValues.csatScore = week.csatScore;
            snapshotProvided.csatScore = true;
        }
        if (week.uptimeAri != null) {
            snapshotValues.uptimeAri = week.uptimeAri;
            snapshotProvided.uptimeAri = true;
        }
        if (week.errorRateAri != null) {
            snapshotValues.errorRateAri = week.errorRateAri;
            snapshotProvided.errorRateAri = true;
        }
        if (week.healthScorePromedio != null) {
            snapshotValues.healthScorePromedio = week.healthScorePromedio;
            snapshotProvided.healthScorePromedio = true;
        }

        if (Array.isArray(week.deudasSocios)) {
            week.deudasSocios.slice(0, 4).forEach((value, idx) => {
                if (value != null) {
                    debtSnapshots[idx] = value;
                    debtProvided[idx] = true;
                }
            });
        }

        if (week.gastosFijos != null) {
            gastosFijosProvided = true;
            consolidated.gastosFijos += week.gastosFijos;
        }
    });

    if (!gastosFijosProvided) {
        consolidated.gastosFijos = mergedMeta.gastosFijos;
    }

    consolidated.formasLeads = snapshotProvided.formasLeads
        ? snapshotValues.formasLeads
        : mergedMeta.formasLeads;

    consolidated.inversionTotal = snapshotProvided.inversionTotal
        ? snapshotValues.inversionTotal
        : mergedMeta.inversionTotal;

    consolidated.deudasSociosDetalle = debtSnapshots.map((value, idx) => (
        debtProvided[idx]
            ? value
            : (mergedMeta.deudasSocios[idx] || 0)
    ));
    consolidated.deudaSocios = consolidated.deudasSociosDetalle.reduce((acc, val) => acc + (val || 0), 0);

    consolidated.clientesActivos100 = snapshotProvided.clientesActivos100
        ? snapshotValues.clientesActivos100
        : consolidated.leadsConvertidos * 3;
    consolidated.clientesActivos50 = snapshotProvided.clientesActivos50
        ? snapshotValues.clientesActivos50
        : Math.floor(consolidated.clientesActivos100 * 0.3);
    consolidated.clientesActivosTotales = consolidated.clientesActivos100 + consolidated.clientesActivos50;

    consolidated.cxc = snapshotProvided.cxc
        ? snapshotValues.cxc
        : consolidated.cobranzaUSD * 0.15;

    // === ASIGNAR SNAPSHOTS NUEVOS ===
    consolidated.npsSemanal = snapshotProvided.npsSemanal
        ? snapshotValues.npsSemanal
        : 0;
    consolidated.tiempoPromedioOnboarding = snapshotProvided.tiempoPromedioOnboarding
        ? snapshotValues.tiempoPromedioOnboarding
        : 5;
    consolidated.cicloVentaTotal = snapshotProvided.cicloVentaTotal
        ? snapshotValues.cicloVentaTotal
        : 11;
    consolidated.grossMargin = snapshotProvided.grossMargin
        ? snapshotValues.grossMargin
        : 75;
    consolidated.csatScore = snapshotProvided.csatScore
        ? snapshotValues.csatScore
        : 4.5;
    consolidated.uptimeAri = snapshotProvided.uptimeAri
        ? snapshotValues.uptimeAri
        : 99.5;
    consolidated.errorRateAri = snapshotProvided.errorRateAri
        ? snapshotValues.errorRateAri
        : 0.2;
    consolidated.healthScorePromedio = snapshotProvided.healthScorePromedio
        ? snapshotValues.healthScorePromedio
        : 85;

    // === CALCULAR MÉTRICAS DERIVADAS ===
    consolidated.mrrTotal = consolidated.mrrMini + consolidated.mrrPro + consolidated.mrrMax + 
                           consolidated.mrrWariMini + consolidated.mrrWariPro;
    consolidated.arr = consolidated.mrrTotal * 12;
    
    // Churn Rate (considerando clientes activos del inicio del mes)
    const clientesActivosInicioMes = consolidated.clientesActivosTotales > 0 
        ? consolidated.clientesActivosTotales 
        : (consolidated.clientesActivos100 + consolidated.clientesActivos50);
    consolidated.churnRate = safeDivide(consolidated.churnSemanal, clientesActivosInicioMes) * 100;
    
    // === NUEVAS MÉTRICAS ESTRATÉGICAS ===
    
    // 1. LTV (Lifetime Value) = (MRR promedio × Gross Margin %) / Churn Rate mensual
    const mrrPromedioPorCliente = safeDivide(consolidated.mrrTotal, consolidated.clientesActivosTotales);
    const churnRateMensual = consolidated.churnRate / 100;
    consolidated.ltv = churnRateMensual > 0 
        ? (mrrPromedioPorCliente * (consolidated.grossMargin / 100)) / churnRateMensual
        : 0;
    
    // 2. CAC Payback Period = CAC / (MRR promedio × Gross Margin %)
    const mrrConMargen = mrrPromedioPorCliente * (consolidated.grossMargin / 100);
    consolidated.cacPaybackPeriod = mrrConMargen > 0 
        ? safeDivide(consolidated.costoPorAdquisicion, mrrConMargen) 
        : 0;
    
    // 3. NRR (Net Revenue Retention) = ((MRR fin - MRR nuevos) / MRR inicio) × 100
    // Asumiendo MRR inicio = MRR total - MRR de nuevos clientes
    const mrrNuevosClientes = consolidated.clientesNuevosActivados * mrrPromedioPorCliente;
    const mrrInicio = consolidated.mrrTotal - mrrNuevosClientes;
    const mrrFin = consolidated.mrrTotal + consolidated.expansionMRR - consolidated.contractionMRR;
    consolidated.nrr = mrrInicio > 0
        ? ((mrrFin - mrrNuevosClientes) / mrrInicio) * 100
        : 100;
    
    // 4. Quick Ratio = (Nuevos MRR + Expansion MRR) / (Churn MRR + Contraction MRR)
    const churnMRR = (consolidated.churnSemanal * mrrPromedioPorCliente);
    const denominadorQuickRatio = churnMRR + consolidated.contractionMRR;
    consolidated.quickRatio = denominadorQuickRatio > 0
        ? (mrrNuevosClientes + consolidated.expansionMRR) / denominadorQuickRatio
        : 0;
    
    // 5. LTV:CAC Ratio
    consolidated.ltvCacRatio = consolidated.costoPorAdquisicion > 0
        ? consolidated.ltv / consolidated.costoPorAdquisicion
        : 0;
    
    // 6. Rule of 40 = Growth Rate % + Profit Margin %
    // Growth Rate aproximado basado en MRR growth (simplificado)
    const profitMargin = safeDivide(consolidated.margenNeto, consolidated.cobranzaUSD) * 100;
    const mrrGrowthRate = safeDivide(consolidated.expansionMRR - consolidated.contractionMRR, consolidated.mrrTotal) * 100;
    consolidated.ruleOf40 = mrrGrowthRate + profitMargin;
    
    // 7. CAC por canal
    consolidated.cacFacebook = safeDivide(consolidated.inversionFacebook, consolidated.convertidosAds * 0.4);
    consolidated.cacInstagram = safeDivide(consolidated.inversionInstagram, consolidated.convertidosAds * 0.35);
    consolidated.cacTikTok = safeDivide(consolidated.inversionTikTok, consolidated.convertidosAds * 0.25);
    
    // 8. Churn Rate por plan (placeholder - requiere data segmentada)
    consolidated.churnRateMini = consolidated.churnRate * 0.3;
    consolidated.churnRatePro = consolidated.churnRate * 0.25;
    consolidated.churnRateMax = consolidated.churnRate * 0.15;
    consolidated.churnRateWariMini = consolidated.churnRate * 0.2;
    consolidated.churnRateWariPro = consolidated.churnRate * 0.1;

    consolidated.tasaConversionCalificados = safeDivide(consolidated.leadsCalificados, consolidated.leadsRecibidos) * 100;
    consolidated.tasaConversionCierre = safeDivide(consolidated.leadsConvertidos, consolidated.leadsCalificados) * 100;
    consolidated.costoPorLead = safeDivide(consolidated.inversionAds, consolidated.leadsRecibidos);
    consolidated.costoPorAdquisicion = safeDivide(consolidated.inversionAds, consolidated.leadsConvertidos);
    consolidated.margenNeto = consolidated.cobranzaUSD - consolidated.gastosFijos - consolidated.inversionAds;
    consolidated.tasaExitoDemos = safeDivide(consolidated.demosExitosos, consolidated.demosRealizados) * 100;
    consolidated.aov = safeDivide(consolidated.cobranzaUSD, consolidated.leadsConvertidos);

    consolidated.cpaAds = safeDivide(consolidated.inversionAds, consolidated.convertidosAds);
    consolidated.cpaOrganico = 0;
    consolidated.cpaReferido = 0;

    return consolidated;
}

function recalculateYearConsolidated() {
    const yearData = {
        leadsCalificados: 0, demosRealizados: 0, demosExitosos: 0,
        cobranzaUSD: 0, cobranzaBCV: 0, inversionAds: 0,
        clientesMorosos: 0, clientesPerdidos: 0,
        gastosFijos: 0, conversacionesGeneradas: 0,
        influvideosVendidos: 0, demosInfluvideos: 0,
        leadsAds: 0, leadsOrganico: 0, leadsReferido: 0,
        convertidosAds: 0, convertidosOrganico: 0, convertidosReferido: 0,
        leadsRecibidos: 0, leadsConvertidos: 0,
        clientesActivos100: 0, clientesActivos50: 0, cxc: 0,
        formasLeads: 5, deudaSocios: 0, deudaSociosDetalle: [0, 0, 0, 0], inversionTotal: 1250000,
        tasaConversionCalificados: 0, tasaConversionCierre: 0,
        costoPorLead: 0, costoPorAdquisicion: 0, margenNeto: 0,
        tasaExitoDemos: 0, clientesActivosTotales: 0, aov: 0,
        cpaAds: 0,
        // === NUEVOS CAMPOS TOP 10 ===
        influvideosEnCola: 0,
        influvideosEntregados: 0,
        conversacionesAri: 0,
        mrrMini: 0,
        mrrPro: 0,
        mrrMax: 0,
        mrrWariMini: 0,
        mrrWariPro: 0,
        mrrTotal: 0,
        arr: 0,
        clientesNuevosActivados: 0,
        churnSemanal: 0,
        churnRate: 0,
        npsSemanal: 0,
        tiempoPromedioOnboarding: 0,
        cicloVentaTotal: 0,
        // === NUEVOS CAMPOS AVANZADOS ===
        grossMargin: 0,
        expansionMRR: 0,
        contractionMRR: 0,
        inversionFacebook: 0,
        inversionInstagram: 0,
        inversionTikTok: 0,
        ticketsAbiertos: 0,
        ticketsResueltos: 0,
        csatScore: 0,
        uptimeAri: 0,
        errorRateAri: 0,
        healthScorePromedio: 0,
        ltv: 0,
        cacPaybackPeriod: 0,
        nrr: 0,
        quickRatio: 0,
        ltvCacRatio: 0,
        ruleOf40: 0,
        cacFacebook: 0,
        cacInstagram: 0,
        cacTikTok: 0,
        churnRateMini: 0,
        churnRatePro: 0,
        churnRateMax: 0,
        churnRateWariMini: 0,
        churnRateWariPro: 0
    };

    let lastMonth = {};
    for (const monthName in dashboardData) {
        const month = dashboardData[monthName].consolidated;
        if (month.leadsCalificados > 0) {
            yearData.leadsCalificados += month.leadsCalificados;
            yearData.demosRealizados += month.demosRealizados;
            yearData.demosExitosos += month.demosExitosos;
            yearData.cobranzaUSD += month.cobranzaUSD;
            yearData.cobranzaBCV += month.cobranzaBCV;
            yearData.inversionAds += month.inversionAds;
            yearData.clientesMorosos += month.clientesMorosos;
            yearData.clientesPerdidos += month.clientesPerdidos;
            yearData.gastosFijos += month.gastosFijos;
            yearData.conversacionesGeneradas += month.conversacionesGeneradas;
            yearData.influvideosVendidos += month.influvideosVendidos;
            yearData.demosInfluvideos += month.demosInfluvideos;
            yearData.margenNeto += month.margenNeto;
            yearData.leadsAds += month.leadsAds;
            yearData.leadsOrganico += month.leadsOrganico;
            yearData.leadsReferido += month.leadsReferido;
            yearData.convertidosAds += month.convertidosAds;
            yearData.convertidosOrganico += month.convertidosOrganico;
            yearData.convertidosReferido += month.convertidosReferido;
            yearData.leadsRecibidos += month.leadsRecibidos;
            yearData.leadsConvertidos += month.leadsConvertidos;

            // === ACUMULAR NUEVOS CAMPOS ===
            yearData.influvideosEnCola += month.influvideosEnCola;
            yearData.influvideosEntregados += month.influvideosEntregados;
            yearData.conversacionesAri += month.conversacionesAri;
            yearData.mrrMini += month.mrrMini;
            yearData.mrrPro += month.mrrPro;
            yearData.mrrMax += month.mrrMax;
            yearData.mrrWariMini += month.mrrWariMini;
            yearData.mrrWariPro += month.mrrWariPro;
            yearData.clientesNuevosActivados += month.clientesNuevosActivados;
            yearData.churnSemanal += month.churnSemanal;
            
            // === ACUMULAR NUEVOS CAMPOS AVANZADOS ===
            yearData.expansionMRR += month.expansionMRR || 0;
            yearData.contractionMRR += month.contractionMRR || 0;
            yearData.inversionFacebook += month.inversionFacebook || 0;
            yearData.inversionInstagram += month.inversionInstagram || 0;
            yearData.inversionTikTok += month.inversionTikTok || 0;
            yearData.ticketsAbiertos += month.ticketsAbiertos || 0;
            yearData.ticketsResueltos += month.ticketsResueltos || 0;

            lastMonth = month;
        }
    }

    yearData.clientesActivos100 = lastMonth.clientesActivos100 ?? 0;
    yearData.clientesActivos50 = lastMonth.clientesActivos50 ?? 0;
    yearData.cxc = lastMonth.cxc ?? 0;
    yearData.formasLeads = lastMonth.formasLeads ?? 5;
    yearData.deudaSocios = lastMonth.deudaSocios ?? 0;
    yearData.deudaSociosDetalle = Array.isArray(lastMonth.deudasSociosDetalle) ? lastMonth.deudasSociosDetalle : [0, 0, 0, 0];
    yearData.inversionTotal = lastMonth.inversionTotal ?? 1250000;
    yearData.clientesActivosTotales = lastMonth.clientesActivosTotales ?? 0;

    // === ASIGNAR SNAPSHOTS NUEVOS ===
    yearData.npsSemanal = lastMonth.npsSemanal ?? 0;
    yearData.tiempoPromedioOnboarding = lastMonth.tiempoPromedioOnboarding ?? 5;
    yearData.cicloVentaTotal = lastMonth.cicloVentaTotal ?? 11;
    yearData.grossMargin = lastMonth.grossMargin ?? 75;
    yearData.csatScore = lastMonth.csatScore ?? 4.5;
    yearData.uptimeAri = lastMonth.uptimeAri ?? 99.5;
    yearData.errorRateAri = lastMonth.errorRateAri ?? 0.2;
    yearData.healthScorePromedio = lastMonth.healthScorePromedio ?? 85;

    if (yearData.leadsRecibidos === 0) {
        yearData.leadsRecibidos = yearData.leadsAds + yearData.leadsOrganico + yearData.leadsReferido;
    }
    if (yearData.leadsConvertidos === 0) {
        yearData.leadsConvertidos = yearData.convertidosAds + yearData.convertidosOrganico + yearData.convertidosReferido;
    }

    yearData.tasaConversionCalificados = safeDivide(yearData.leadsCalificados, yearData.leadsRecibidos) * 100;
    yearData.tasaConversionCierre = safeDivide(yearData.leadsConvertidos, yearData.leadsCalificados) * 100;
    yearData.costoPorLead = safeDivide(yearData.inversionAds, yearData.leadsRecibidos);
    yearData.costoPorAdquisicion = safeDivide(yearData.inversionAds, yearData.leadsConvertidos);
    yearData.tasaExitoDemos = safeDivide(yearData.demosExitosos, yearData.demosRealizados) * 100;
    yearData.aov = safeDivide(yearData.cobranzaUSD, yearData.leadsConvertidos);
    yearData.cpaAds = safeDivide(yearData.inversionAds, yearData.convertidosAds);

    // === CALCULAR MÉTRICAS DERIVADAS ANUALES ===
    yearData.mrrTotal = yearData.mrrMini + yearData.mrrPro + yearData.mrrMax + 
                       yearData.mrrWariMini + yearData.mrrWariPro;
    yearData.arr = yearData.mrrTotal * 12;
    yearData.churnRate = safeDivide(yearData.churnSemanal, yearData.clientesActivosTotales) * 100;
    
    // Calcular métricas estratégicas anuales (misma lógica que mensual)
    const mrrPromedioPorCliente = safeDivide(yearData.mrrTotal, yearData.clientesActivosTotales);
    const churnRateMensual = yearData.churnRate / 100;
    
    yearData.ltv = churnRateMensual > 0 
        ? (mrrPromedioPorCliente * (yearData.grossMargin / 100)) / churnRateMensual
        : 0;
    
    const mrrConMargen = mrrPromedioPorCliente * (yearData.grossMargin / 100);
    yearData.cacPaybackPeriod = mrrConMargen > 0 
        ? safeDivide(yearData.costoPorAdquisicion, mrrConMargen) 
        : 0;
    
    const mrrNuevosClientes = yearData.clientesNuevosActivados * mrrPromedioPorCliente;
    const mrrInicio = yearData.mrrTotal - mrrNuevosClientes;
    const mrrFin = yearData.mrrTotal + yearData.expansionMRR - yearData.contractionMRR;
    yearData.nrr = mrrInicio > 0
        ? ((mrrFin - mrrNuevosClientes) / mrrInicio) * 100
        : 100;
    
    const churnMRR = (yearData.churnSemanal * mrrPromedioPorCliente);
    const denominadorQuickRatio = churnMRR + yearData.contractionMRR;
    yearData.quickRatio = denominadorQuickRatio > 0
        ? (mrrNuevosClientes + yearData.expansionMRR) / denominadorQuickRatio
        : 0;
    
    yearData.ltvCacRatio = yearData.costoPorAdquisicion > 0
        ? yearData.ltv / yearData.costoPorAdquisicion
        : 0;
    
    const profitMargin = safeDivide(yearData.margenNeto, yearData.cobranzaUSD) * 100;
    const mrrGrowthRate = safeDivide(yearData.expansionMRR - yearData.contractionMRR, yearData.mrrTotal) * 100;
    yearData.ruleOf40 = mrrGrowthRate + profitMargin;
    
    yearData.cacFacebook = safeDivide(yearData.inversionFacebook, yearData.convertidosAds * 0.4);
    yearData.cacInstagram = safeDivide(yearData.inversionInstagram, yearData.convertidosAds * 0.35);
    yearData.cacTikTok = safeDivide(yearData.inversionTikTok, yearData.convertidosAds * 0.25);
    
    yearData.churnRateMini = yearData.churnRate * 0.3;
    yearData.churnRatePro = yearData.churnRate * 0.25;
    yearData.churnRateMax = yearData.churnRate * 0.15;
    yearData.churnRateWariMini = yearData.churnRate * 0.2;
    yearData.churnRateWariPro = yearData.churnRate * 0.1;

    return yearData;
}

// --- LÓGICA DE RENDERIZADO ---
function populateMasterFilter() {
    const filter = document.getElementById('master-filter');
    const currentVal = filter.value;
    filter.innerHTML = '';

    filter.add(new Option('Consolidado Año', 'Consolidado Año'));

    Object.keys(dashboardData).forEach(monthName => {
        filter.add(new Option(monthName, monthName));
    });

    filter.value = currentVal && filter.querySelector(`option[value="${currentVal}"]`) ? currentVal : 'Consolidado Año';
}

function handleFilterChange(event) {
    const selectedPeriod = event.target.value;
    renderAllKPIs(selectedPeriod);
}

function renderAllKPIs(period) {
    let data, previousData;
    const monthNames = Object.keys(dashboardData);

    if (period === 'Consolidado Año') {
        data = yearConsolidated;
        previousData = {};
        for (const key in data) {
            previousData[key] = data[key] * 0.8;
        }
    } else {
        data = dashboardData[period].consolidated;
        const currentMonthIndex = monthNames.indexOf(period);
        previousData = (currentMonthIndex > 0) ? dashboardData[monthNames[currentMonthIndex - 1]].consolidated : {};
    }

    const formatCurrency = (val, currency = '$') => {
        if (currency === '$') {
            return `$${(val || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
        return `Bs. ${(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    renderKPI('clientes-100', data.clientesActivos100, previousData.clientesActivos100, false, (val) => val.toLocaleString());
    renderKPI('clientes-50', data.clientesActivos50, previousData.clientesActivos50, false, (val) => val.toLocaleString());
    renderKPI('clientes-morosos', data.clientesMorosos, previousData.clientesMorosos, true, (val) => val.toLocaleString());
    renderKPI('clientes-perdidos', data.clientesPerdidos, previousData.clientesPerdidos, true, (val) => val.toLocaleString());

    renderKPI('leads-recibidos', data.leadsRecibidos, previousData.leadsRecibidos, false, (val) => val.toLocaleString());
    renderKPI('leads-calificados', data.leadsCalificados, previousData.leadsCalificados, false, (val) => val.toLocaleString());
    renderKPI('leads-convertidos', data.leadsConvertidos, previousData.leadsConvertidos, false, (val) => val.toLocaleString());
    const conversationRate = safeDivide(data.conversacionesGeneradas, data.leadsRecibidos) * 100;
    const previousConversationRate = (previousData && (previousData.conversacionesGeneradas || previousData.leadsRecibidos))
        ? safeDivide(previousData.conversacionesGeneradas || 0, previousData.leadsRecibidos || 0) * 100
        : null;
    renderKPI('conversaciones-leads', conversationRate, previousConversationRate, false, (val) => `${(val || 0).toFixed(0)}%`);

    renderKPI('demos-realizados', data.demosRealizados, previousData.demosRealizados, false, (val) => val.toLocaleString());
    renderKPI('demos-exitosos', data.demosExitosos, previousData.demosExitosos, false, (val) => val.toLocaleString());
    renderKPI('influvideos-vendidos', data.influvideosVendidos, previousData.influvideosVendidos, false, (val) => val.toLocaleString());
    renderKPI('demos-influvideos', data.demosInfluvideos, previousData.demosInfluvideos, false, (val) => val.toLocaleString());

    renderKPI('cobranza-usd', data.cobranzaUSD, previousData.cobranzaUSD, false, (val) => formatCurrency(val, '$'));
    renderKPI('cobranza-bcv', data.cobranzaBCV, previousData.cobranzaBCV, false, (val) => formatCurrency(val, 'Bs'));
    renderKPI('cxc', data.cxc, previousData.cxc, true, (val) => formatCurrency(val, '$'));
    renderKPI('inversion-ads', data.inversionAds, previousData.inversionAds, true, (val) => formatCurrency(val, '$'));
    renderKPI('gastos-fijos', data.gastosFijos, previousData.gastosFijos, true, (val) => formatCurrency(val, '$'));
    renderKPI('deuda-socios', data.deudaSocios, previousData.deudaSocios, true, (val) => formatCurrency(val, '$'));

    renderKPI('formas-leads', data.formasLeads, previousData.formasLeads, false, (val) => val.toLocaleString());
    renderKPI('inversion-total', data.inversionTotal, null, false, (val) => formatCurrency(val, '$'));

    // === RENDERIZAR NUEVOS KPIs TOP 10 ===
    
    // Producción y Entrega
    renderKPI('influvideos-cola', data.influvideosEnCola, previousData.influvideosEnCola, true, (val) => val.toLocaleString());
    renderKPI('influvideos-entregados', data.influvideosEntregados, previousData.influvideosEntregados, false, (val) => val.toLocaleString());
    renderKPI('conversaciones-ari', data.conversacionesAri, previousData.conversacionesAri, false, (val) => val.toLocaleString());
    renderKPI('tiempo-onboarding', data.tiempoPromedioOnboarding, previousData.tiempoPromedioOnboarding, true, (val) => `${val.toFixed(1)} días`);
    
    // Rentabilidad por Producto
    renderKPI('mrr-total', data.mrrTotal, previousData.mrrTotal, false, (val) => formatCurrency(val, '$'));
    renderKPI('arr', data.arr, previousData.arr, false, (val) => formatCurrency(val, '$'));
    renderKPI('mrr-pro', data.mrrPro, previousData.mrrPro, false, (val) => formatCurrency(val, '$'));
    renderKPI('mrr-max', data.mrrMax, previousData.mrrMax, false, (val) => formatCurrency(val, '$'));
    
    // Ciclo de Vida del Cliente
    renderKPI('clientes-nuevos', data.clientesNuevosActivados, previousData.clientesNuevosActivados, false, (val) => val.toLocaleString());
    renderKPI('churn-semanal', data.churnSemanal, previousData.churnSemanal, true, (val) => val.toLocaleString());
    renderKPI('churn-rate', data.churnRate, previousData.churnRate, true, (val) => `${(val || 0).toFixed(1)}%`);
    renderKPI('ciclo-venta', data.cicloVentaTotal, previousData.cicloVentaTotal, true, (val) => `${val.toFixed(1)} días`);
    
    // Calidad y Experiencia
    renderKPI('nps', data.npsSemanal, previousData.npsSemanal, false, (val) => val.toFixed(0));
    renderKPI('health-score', data.healthScorePromedio, previousData.healthScorePromedio, false, (val) => val.toFixed(0));
    renderKPI('csat', data.csatScore, previousData.csatScore, false, (val) => val.toFixed(1));
    renderKPI('uptime', data.uptimeAri, previousData.uptimeAri, false, (val) => `${val.toFixed(1)}%`);
    
    // Métricas Estratégicas (Unit Economics)
    renderKPI('ltv', data.ltv, previousData.ltv, false, (val) => formatCurrency(val, '$'));
    renderKPI('ltv-cac-ratio', data.ltvCacRatio, previousData.ltvCacRatio, false, (val) => `${val.toFixed(1)}x`);
    renderKPI('cac-payback', data.cacPaybackPeriod, previousData.cacPaybackPeriod, true, (val) => val.toFixed(1));
    renderKPI('gross-margin', data.grossMargin, previousData.grossMargin, false, (val) => `${val.toFixed(0)}%`);
    renderKPI('nrr', data.nrr, previousData.nrr, false, (val) => `${val.toFixed(0)}%`);
    renderKPI('quick-ratio', data.quickRatio, previousData.quickRatio, false, (val) => `${val.toFixed(1)}x`);
    renderKPI('rule-of-40', data.ruleOf40, previousData.ruleOf40, false, (val) => `${val.toFixed(0)}%`);
    renderKPI('cac-facebook', data.cacFacebook, previousData.cacFacebook, true, (val) => formatCurrency(val, '$'));
    
    // Soporte y Operaciones
    renderKPI('tickets-abiertos', data.ticketsAbiertos, previousData.ticketsAbiertos, false, (val) => val.toLocaleString());
    renderKPI('tickets-resueltos', data.ticketsResueltos, previousData.ticketsResueltos, false, (val) => val.toLocaleString());
    const tasaResolucion = safeDivide(data.ticketsResueltos, data.ticketsAbiertos) * 100;
    const previousTasaResolucion = (previousData && previousData.ticketsAbiertos)
        ? safeDivide(previousData.ticketsResueltos || 0, previousData.ticketsAbiertos || 0) * 100
        : null;
    renderKPI('tasa-resolucion', tasaResolucion, previousTasaResolucion, false, (val) => `${(val || 0).toFixed(0)}%`);
    renderKPI('error-rate', data.errorRateAri, previousData.errorRateAri, true, (val) => `${val.toFixed(1)}%`);
}

function renderKPI(id, value, previousValue, lessIsBetter = false, formatFn) {
    const valueEl = document.getElementById(`kpi-${id}`);
    const contextEl = document.getElementById(`kpi-${id}-context`);
    
    // Obtener el elemento card parent
    const cardEl = valueEl ? valueEl.closest('.kpi-card') : null;

    if (valueEl) valueEl.textContent = formatFn(value || 0);

    if (contextEl) {
        const { text, className } = getContextString(value, previousValue, lessIsBetter);
        contextEl.textContent = text;
        contextEl.className = `kpi-context ${className}`;
    }
    
    // === APLICAR SISTEMA DE ALERTAS VISUALES ===
    if (cardEl) {
        // Remover clases de estado previas
        cardEl.classList.remove('status-excellent', 'status-good', 'status-warning', 'status-critical', 'status-neutral');
        
        // Determinar estado basado en el KPI
        const status = getKPIStatus(id, value);
        cardEl.classList.add(`status-${status}`);
        
        // Añadir badge de target si existe
        const targetProgress = getTargetProgress(id, value);
        if (targetProgress) {
            let targetBadge = cardEl.querySelector('.kpi-target');
            if (!targetBadge) {
                targetBadge = document.createElement('div');
                targetBadge.className = 'kpi-target';
                cardEl.appendChild(targetBadge);
            }
            
            targetBadge.textContent = `${targetProgress.percentage}%`;
            targetBadge.classList.remove('target-achieved', 'target-close', 'target-missed');
            
            if (targetProgress.achieved) {
                targetBadge.classList.add('target-achieved');
            } else if (targetProgress.close) {
                targetBadge.classList.add('target-close');
            } else {
                targetBadge.classList.add('target-missed');
            }
        }
    }
}

function getContextString(current, previous, lessIsBetter = false) {
    if (previous === null || previous === undefined || previous === 0) {
        if (current > 0) return { text: 'Nuevos datos', className: 'kpi-context-neutral' };
        return { text: 'Sin datos previos', className: 'kpi-context-neutral' };
    }
    if (current === previous) {
        return { text: 'Sin cambios', className: 'kpi-context-neutral' };
    }

    const diff = current - previous;
    const percentChange = safeDivide(diff, previous) * 100;
    const absPercent = Math.abs(percentChange).toFixed(0);

    let isPositive = diff > 0;
    if (lessIsBetter) isPositive = !isPositive;

    const arrow = diff > 0 ? '↑' : '↓';
    const vsPeriod = document.getElementById('master-filter').value === 'Consolidado Año' ? 'vs. año ant.' : 'vs. mes ant.';

    return {
        text: `${arrow} ${absPercent}% ${vsPeriod}`,
        className: isPositive ? 'kpi-context-positive' : 'kpi-context-negative'
    };
}

// --- LÓGICA DE GRÁFICOS ---
function initializeCharts() {
    const monthLabels = Object.keys(dashboardData);
    const consolidatedData = monthLabels.map(month => dashboardData[month].consolidated);

    const colors = {
        primary: 'rgba(37, 99, 235, 1)',
        primary_light: 'rgba(96, 165, 250, 1)',
        secondary: 'rgba(147, 51, 234, 1)',
        success: 'rgba(34, 197, 94, 1)',
        success_light: 'rgba(134, 239, 172, 1)',
        warning: 'rgba(234, 179, 8, 1)',
        danger: 'rgba(239, 68, 68, 1)',
        danger_light: 'rgba(252, 165, 165, 1)',
        neutral: 'rgba(156, 163, 175, 1)',
    };

    const leadFunnelCtx = document.getElementById('leadFunnelChart').getContext('2d');
    leadFunnelChart = new Chart(leadFunnelCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Recibidos', data: consolidatedData.map(d => d.leadsRecibidos), backgroundColor: colors.primary },
                { label: 'Calificados', data: consolidatedData.map(d => d.leadsCalificados), backgroundColor: colors.primary_light },
                { label: 'Convertidos', data: consolidatedData.map(d => d.leadsConvertidos), backgroundColor: colors.success }
            ]
        },
        options: { responsive: true, scales: { x: { stacked: false }, y: { beginAtZero: true, stacked: false } } }
    });

    const profitCtx = document.getElementById('profitabilityChart').getContext('2d');
    profitabilityChart = new Chart(profitCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Margen Neto ($)',
                    data: consolidatedData.map(d => d.margenNeto),
                    backgroundColor: consolidatedData.map(d => d.margenNeto >= 0 ? colors.success_light : colors.danger_light),
                    borderColor: consolidatedData.map(d => d.margenNeto >= 0 ? colors.success : colors.danger),
                    borderWidth: 1, order: 2
                },
                {
                    label: 'Cobranza ($)',
                    data: consolidatedData.map(d => d.cobranzaUSD),
                    type: 'line', borderColor: colors.success,
                    fill: false, tension: 0.3, pointRadius: 3, order: 1
                },
                {
                    label: 'Gastos Totales ($)',
                    data: consolidatedData.map(d => d.gastosFijos + d.inversionAds),
                    type: 'line', borderColor: colors.danger,
                    fill: false, tension: 0.3, pointRadius: 3, order: 0
                }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { callback: (value) => '$' + value.toLocaleString() } } } }
    });

    const conversionCtx = document.getElementById('conversionRateChart').getContext('2d');
    conversionRateChart = new Chart(conversionCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Tasa de Calificación (Lead -> Calificado)',
                    data: consolidatedData.map(d => d.tasaConversionCalificados),
                    borderColor: colors.primary_light,
                    fill: false, tension: 0.3, pointRadius: 5, yAxisID: 'y'
                },
                {
                    label: 'Tasa de Cierre (Calificado -> Cierre)',
                    data: consolidatedData.map(d => d.tasaConversionCierre),
                    borderColor: colors.success,
                    fill: false, tension: 0.3, pointRadius: 5, yAxisID: 'y'
                }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => value.toFixed(0) + '%' } } } }
    });

    const leadsByChannelCtx = document.getElementById('leadsByChannelChart').getContext('2d');
    leadsByChannelChart = new Chart(leadsByChannelCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Leads (Ads)', data: consolidatedData.map(d => d.leadsAds), backgroundColor: colors.primary_light },
                { label: 'Leads (Orgánico)', data: consolidatedData.map(d => d.leadsOrganico), backgroundColor: colors.success },
                { label: 'Leads (Referido)', data: consolidatedData.map(d => d.leadsReferido), backgroundColor: colors.secondary }
            ]
        },
        options: { responsive: true, scales: { x: { stacked: true }, y: { beginAtZero: true, stacked: true } } }
    });

    const cpaByChannelCtx = document.getElementById('cpaByChannelChart').getContext('2d');
    cpaByChannelChart = new Chart(cpaByChannelCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'CPA (Ads)',
                    data: consolidatedData.map(d => d.cpaAds),
                    borderColor: colors.danger,
                    fill: false, tension: 0.3, pointRadius: 5
                },
                {
                    label: 'CPA (Combinado)',
                    data: consolidatedData.map(d => d.costoPorAdquisicion),
                    borderColor: colors.neutral,
                    borderDash: [5, 5],
                    fill: false, tension: 0.3, pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Costo ($)' }, ticks: { callback: (value) => '$' + value.toLocaleString() } }
            },
        }
    });

    const clientHealthCtx = document.getElementById('clientHealthChart').getContext('2d');
    clientHealthChart = new Chart(clientHealthCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Clientes Morosos', data: consolidatedData.map(d => d.clientesMorosos), borderColor: colors.warning, fill: false, tension: 0.3, pointRadius: 5 },
                { label: 'Clientes Perdidos', data: consolidatedData.map(d => d.clientesPerdidos), borderColor: colors.danger, fill: false, tension: 0.3, pointRadius: 5 }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    const demoSuccessTrendCtx = document.getElementById('demoSuccessTrendChart').getContext('2d');
    demoSuccessTrendChart = new Chart(demoSuccessTrendCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Tasa de Éxito de Demos',
                    data: consolidatedData.map(d => d.tasaExitoDemos),
                    borderColor: colors.success,
                    fill: false, tension: 0.3, pointRadius: 5
                }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => value.toFixed(0) + '%' } } } }
    });

    const clientNetGrowthCtx = document.getElementById('clientNetGrowthChart').getContext('2d');
    clientNetGrowthChart = new Chart(clientNetGrowthCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Clientes Nuevos (Convertidos)',
                    data: consolidatedData.map(d => d.leadsConvertidos),
                    backgroundColor: colors.success, order: 2
                },
                {
                    label: 'Clientes Perdidos',
                    data: consolidatedData.map(d => -d.clientesPerdidos),
                    backgroundColor: colors.danger, order: 3
                },
                {
                    label: 'Total Clientes Activos',
                    data: consolidatedData.map(d => d.clientesActivosTotales),
                    type: 'line', borderColor: colors.primary,
                    fill: false, tension: 0.3, pointRadius: 5, order: 1
                }
            ]
        },
        options: { responsive: true, scales: { x: { stacked: true }, y: { beginAtZero: true, stacked: true } } }
    });

    const aovVsCpaCtx = document.getElementById('aovVsCpaChart').getContext('2d');
    aovVsCpaChart = new Chart(aovVsCpaCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Valor Promedio de Venta (AOV)',
                    data: consolidatedData.map(d => d.aov),
                    backgroundColor: colors.success_light,
                    borderColor: colors.success,
                    borderWidth: 1, order: 2
                },
                {
                    label: 'CPA (Combinado)',
                    data: consolidatedData.map(d => d.costoPorAdquisicion),
                    type: 'line', borderColor: colors.danger,
                    fill: false, tension: 0.3, pointRadius: 5, order: 1
                }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { callback: (value) => '$' + value.toLocaleString() } } } }
    });

    // === NUEVA GRÁFICA 1: MRR por Plan ===
    const mrrByPlanCtx = document.getElementById('mrrByPlanChart').getContext('2d');
    mrrByPlanChart = new Chart(mrrByPlanCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Arizon Mini', data: consolidatedData.map(d => d.mrrMini), backgroundColor: colors.primary_light },
                { label: 'Arizon Pro', data: consolidatedData.map(d => d.mrrPro), backgroundColor: colors.primary },
                { label: 'Arizon Max', data: consolidatedData.map(d => d.mrrMax), backgroundColor: colors.secondary },
                { label: 'Wari Mini', data: consolidatedData.map(d => d.mrrWariMini), backgroundColor: colors.success_light },
                { label: 'Wari Pro', data: consolidatedData.map(d => d.mrrWariPro), backgroundColor: colors.success }
            ]
        },
        options: { 
            responsive: true, 
            scales: { 
                x: { stacked: true }, 
                y: { beginAtZero: true, stacked: true, ticks: { callback: (value) => '$' + value.toLocaleString() } } 
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        footer: function(tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(item => total += item.parsed.y);
                            return 'Total MRR: $' + total.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // === NUEVA GRÁFICA 2: Churn vs Nuevos Clientes ===
    const churnVsNewCtx = document.getElementById('churnVsNewChart').getContext('2d');
    churnVsNewChart = new Chart(churnVsNewCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Clientes Nuevos Activados',
                    data: consolidatedData.map(d => d.clientesNuevosActivados),
                    backgroundColor: colors.success,
                    order: 2
                },
                {
                    label: 'Churn (Cancelaciones)',
                    data: consolidatedData.map(d => -d.churnSemanal),
                    backgroundColor: colors.danger,
                    order: 3
                },
                {
                    label: 'Churn Rate (%)',
                    data: consolidatedData.map(d => d.churnRate),
                    type: 'line',
                    borderColor: colors.warning,
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: { 
            responsive: true, 
            scales: { 
                x: { stacked: true },
                y: { 
                    beginAtZero: true, 
                    stacked: true,
                    position: 'left',
                    title: { display: true, text: 'Clientes' }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    max: 100,
                    title: { display: true, text: 'Churn Rate (%)' },
                    ticks: { callback: (value) => value + '%' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    // === NUEVA GRÁFICA 3: Performance de Ari ===
    const ariPerformanceCtx = document.getElementById('ariPerformanceChart').getContext('2d');
    ariPerformanceChart = new Chart(ariPerformanceCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Conversaciones Atendidas',
                    data: consolidatedData.map(d => d.conversacionesAri),
                    borderColor: colors.primary,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5
                }
            ]
        },
        options: { 
            responsive: true, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Conversaciones' }
                } 
            }
        }
    });

    // === NUEVA GRÁFICA 4: Producción de InfluVideos ===
    const influvideoProductionCtx = document.getElementById('influvideoProductionChart').getContext('2d');
    influvideoProductionChart = new Chart(influvideoProductionCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Entregados',
                    data: consolidatedData.map(d => d.influvideosEntregados),
                    backgroundColor: colors.success,
                    order: 2
                },
                {
                    label: 'En Cola',
                    data: consolidatedData.map(d => d.influvideosEnCola),
                    backgroundColor: colors.warning,
                    order: 3
                },
                {
                    label: 'Total Acumulado',
                    data: consolidatedData.map((d, idx) => {
                        let total = 0;
                        for (let i = 0; i <= idx; i++) {
                            total += consolidatedData[i].influvideosEntregados || 0;
                        }
                        return total;
                    }),
                    type: 'line',
                    borderColor: colors.primary,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 5,
                    order: 1
                }
            ]
        },
        options: { 
            responsive: true, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Videos' }
                } 
            }
        }
    });

    // === NUEVA GRÁFICA 5: Evolución del NPS ===
    const npsEvolutionCtx = document.getElementById('npsEvolutionChart').getContext('2d');
    npsEvolutionChart = new Chart(npsEvolutionCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'NPS',
                    data: consolidatedData.map(d => d.npsSemanal),
                    borderColor: colors.success,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: consolidatedData.map(d => {
                        if (d.npsSemanal >= 50) return colors.success;
                        if (d.npsSemanal >= 30) return colors.warning;
                        return colors.danger;
                    })
                }
            ]
        },
        options: { 
            responsive: true, 
            scales: { 
                y: { 
                    min: -100,
                    max: 100,
                    title: { display: true, text: 'NPS Score' },
                    ticks: {
                        callback: function(value) {
                            if (value === 50) return '50 (Excelente)';
                            if (value === 30) return '30 (Bueno)';
                            if (value === 0) return '0 (Neutro)';
                            if (value === -100) return '-100 (Pésimo)';
                            return value;
                        }
                    }
                } 
            },
            plugins: {
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 50,
                            yMax: 50,
                            borderColor: colors.success,
                            borderWidth: 2,
                            borderDash: [5, 5]
                        },
                        line2: {
                            type: 'line',
                            yMin: 30,
                            yMax: 30,
                            borderColor: colors.warning,
                            borderWidth: 2,
                            borderDash: [5, 5]
                        }
                    }
                }
            }
        }
    });

    // === NUEVAS GRÁFICAS ESTRATÉGICAS ===
    
    // 1. LTV:CAC Ratio Chart
    const ltvCacRatioCtx = document.getElementById('ltvCacRatioChart').getContext('2d');
    ltvCacRatioChart = new Chart(ltvCacRatioCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'LTV:CAC Ratio',
                    data: consolidatedData.map(d => d.ltvCacRatio),
                    borderColor: colors.primary,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'Target (3:1)',
                    data: monthLabels.map(() => 3),
                    borderColor: colors.success,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Ratio' },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + 'x';
                        }
                    }
                }
            }
        }
    });

    // 2. NRR & Quick Ratio Chart
    const nrrQuickRatioCtx = document.getElementById('nrrQuickRatioChart').getContext('2d');
    nrrQuickRatioChart = new Chart(nrrQuickRatioCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'NRR (%)',
                    data: consolidatedData.map(d => d.nrr),
                    backgroundColor: colors.success_light,
                    borderColor: colors.success,
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Quick Ratio',
                    data: consolidatedData.map(d => d.quickRatio),
                    type: 'line',
                    borderColor: colors.primary,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'NRR (%)' },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Quick Ratio' },
                    grid: { drawOnChartArea: false },
                    beginAtZero: true
                }
            }
        }
    });

    // 3. Rule of 40 Chart
    const ruleOf40Ctx = document.getElementById('ruleOf40Chart').getContext('2d');
    ruleOf40Chart = new Chart(ruleOf40Ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Rule of 40 (%)',
                    data: consolidatedData.map(d => d.ruleOf40),
                    backgroundColor: consolidatedData.map(d => {
                        if (d.ruleOf40 >= 40) return colors.success_light;
                        if (d.ruleOf40 >= 30) return colors.warning;
                        return colors.danger_light;
                    }),
                    borderColor: consolidatedData.map(d => {
                        if (d.ruleOf40 >= 40) return colors.success;
                        if (d.ruleOf40 >= 30) return colors.warning;
                        return colors.danger;
                    }),
                    borderWidth: 2
                },
                {
                    label: 'Target (40%)',
                    data: monthLabels.map(() => 40),
                    type: 'line',
                    borderColor: colors.success,
                    borderWidth: 3,
                    borderDash: [10, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Rule of 40 (%)' },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += context.parsed.y.toFixed(1) + '%';
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function updateAllCharts() {
    const monthLabels = Object.keys(dashboardData);
    const consolidatedData = monthLabels.map(month => dashboardData[month].consolidated);

    leadFunnelChart.data.labels = monthLabels;
    leadFunnelChart.data.datasets[0].data = consolidatedData.map(d => d.leadsRecibidos);
    leadFunnelChart.data.datasets[1].data = consolidatedData.map(d => d.leadsCalificados);
    leadFunnelChart.data.datasets[2].data = consolidatedData.map(d => d.leadsConvertidos);

    profitabilityChart.data.labels = monthLabels;
    profitabilityChart.data.datasets[0].data = consolidatedData.map(d => d.margenNeto);
    profitabilityChart.data.datasets[0].backgroundColor = consolidatedData.map(d => d.margenNeto >= 0 ? 'rgba(134, 239, 172, 1)' : 'rgba(252, 165, 165, 1)');
    profitabilityChart.data.datasets[0].borderColor = consolidatedData.map(d => d.margenNeto >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)');
    profitabilityChart.data.datasets[1].data = consolidatedData.map(d => d.cobranzaUSD);
    profitabilityChart.data.datasets[2].data = consolidatedData.map(d => d.gastosFijos + d.inversionAds);

    conversionRateChart.data.labels = monthLabels;
    conversionRateChart.data.datasets[0].data = consolidatedData.map(d => d.tasaConversionCalificados);
    conversionRateChart.data.datasets[1].data = consolidatedData.map(d => d.tasaConversionCierre);

    clientHealthChart.data.labels = monthLabels;
    clientHealthChart.data.datasets[0].data = consolidatedData.map(d => d.clientesMorosos);
    clientHealthChart.data.datasets[1].data = consolidatedData.map(d => d.clientesPerdidos);

    demoSuccessTrendChart.data.labels = monthLabels;
    demoSuccessTrendChart.data.datasets[0].data = consolidatedData.map(d => d.tasaExitoDemos);

    clientNetGrowthChart.data.labels = monthLabels;
    clientNetGrowthChart.data.datasets[0].data = consolidatedData.map(d => d.leadsConvertidos);
    clientNetGrowthChart.data.datasets[1].data = consolidatedData.map(d => -d.clientesPerdidos);
    clientNetGrowthChart.data.datasets[2].data = consolidatedData.map(d => d.clientesActivosTotales);

    aovVsCpaChart.data.labels = monthLabels;
    aovVsCpaChart.data.datasets[0].data = consolidatedData.map(d => d.aov);
    aovVsCpaChart.data.datasets[1].data = consolidatedData.map(d => d.costoPorAdquisicion);

    leadsByChannelChart.data.labels = monthLabels;
    leadsByChannelChart.data.datasets[0].data = consolidatedData.map(d => d.leadsAds);
    leadsByChannelChart.data.datasets[1].data = consolidatedData.map(d => d.leadsOrganico);
    leadsByChannelChart.data.datasets[2].data = consolidatedData.map(d => d.leadsReferido);

    cpaByChannelChart.data.labels = monthLabels;
    cpaByChannelChart.data.datasets[0].data = consolidatedData.map(d => d.cpaAds);
    cpaByChannelChart.data.datasets[1].data = consolidatedData.map(d => d.costoPorAdquisicion);

    leadFunnelChart.update();
    profitabilityChart.update();
    conversionRateChart.update();
    clientHealthChart.update();
    demoSuccessTrendChart.update();
    clientNetGrowthChart.update();
    aovVsCpaChart.update();
    leadsByChannelChart.update();
    cpaByChannelChart.update();

    // === ACTUALIZAR NUEVAS GRÁFICAS ===
    mrrByPlanChart.data.labels = monthLabels;
    mrrByPlanChart.data.datasets[0].data = consolidatedData.map(d => d.mrrMini);
    mrrByPlanChart.data.datasets[1].data = consolidatedData.map(d => d.mrrPro);
    mrrByPlanChart.data.datasets[2].data = consolidatedData.map(d => d.mrrMax);
    mrrByPlanChart.data.datasets[3].data = consolidatedData.map(d => d.mrrWariMini);
    mrrByPlanChart.data.datasets[4].data = consolidatedData.map(d => d.mrrWariPro);
    mrrByPlanChart.update();

    churnVsNewChart.data.labels = monthLabels;
    churnVsNewChart.data.datasets[0].data = consolidatedData.map(d => d.clientesNuevosActivados);
    churnVsNewChart.data.datasets[1].data = consolidatedData.map(d => -d.churnSemanal);
    churnVsNewChart.data.datasets[2].data = consolidatedData.map(d => d.churnRate);
    churnVsNewChart.update();

    ariPerformanceChart.data.labels = monthLabels;
    ariPerformanceChart.data.datasets[0].data = consolidatedData.map(d => d.conversacionesAri);
    ariPerformanceChart.update();

    influvideoProductionChart.data.labels = monthLabels;
    influvideoProductionChart.data.datasets[0].data = consolidatedData.map(d => d.influvideosEntregados);
    influvideoProductionChart.data.datasets[1].data = consolidatedData.map(d => d.influvideosEnCola);
    influvideoProductionChart.data.datasets[2].data = consolidatedData.map((d, idx) => {
        let total = 0;
        for (let i = 0; i <= idx; i++) {
            total += consolidatedData[i].influvideosEntregados || 0;
        }
        return total;
    });
    influvideoProductionChart.update();

    npsEvolutionChart.data.labels = monthLabels;
    npsEvolutionChart.data.datasets[0].data = consolidatedData.map(d => d.npsSemanal);
    npsEvolutionChart.data.datasets[0].pointBackgroundColor = consolidatedData.map(d => {
        if (d.npsSemanal >= 50) return 'rgba(34, 197, 94, 1)';
        if (d.npsSemanal >= 30) return 'rgba(234, 179, 8, 1)';
        return 'rgba(239, 68, 68, 1)';
    });
    npsEvolutionChart.update();

    // === ACTUALIZAR NUEVAS GRÁFICAS ESTRATÉGICAS ===
    ltvCacRatioChart.data.labels = monthLabels;
    ltvCacRatioChart.data.datasets[0].data = consolidatedData.map(d => d.ltvCacRatio);
    ltvCacRatioChart.data.datasets[1].data = monthLabels.map(() => 3);
    ltvCacRatioChart.update();

    nrrQuickRatioChart.data.labels = monthLabels;
    nrrQuickRatioChart.data.datasets[0].data = consolidatedData.map(d => d.nrr);
    nrrQuickRatioChart.data.datasets[1].data = consolidatedData.map(d => d.quickRatio);
    nrrQuickRatioChart.update();

    ruleOf40Chart.data.labels = monthLabels;
    ruleOf40Chart.data.datasets[0].data = consolidatedData.map(d => d.ruleOf40);
    ruleOf40Chart.data.datasets[0].backgroundColor = consolidatedData.map(d => {
        if (d.ruleOf40 >= 40) return 'rgba(134, 239, 172, 1)';
        if (d.ruleOf40 >= 30) return 'rgba(234, 179, 8, 1)';
        return 'rgba(252, 165, 165, 1)';
    });
    ruleOf40Chart.data.datasets[0].borderColor = consolidatedData.map(d => {
        if (d.ruleOf40 >= 40) return 'rgba(34, 197, 94, 1)';
        if (d.ruleOf40 >= 30) return 'rgba(234, 179, 8, 1)';
        return 'rgba(239, 68, 68, 1)';
    });
    ruleOf40Chart.data.datasets[1].data = monthLabels.map(() => 40);
    ruleOf40Chart.update();
}

// --- ADMINISTRACIÓN DE DATOS ---

// Sistema de filtrado
let currentFilters = {
    month: '',
    week: '',
    completeness: '',
    search: ''
};

function applyDataFilters() {
    renderDataManagementView();
}

function clearDataFilters() {
    currentFilters = {
        month: '',
        week: '',
        completeness: '',
        search: ''
    };
    
    // Limpiar UI
    const filterMonth = document.getElementById('filter-month');
    const filterWeek = document.getElementById('filter-week');
    const filterCompleteness = document.getElementById('filter-completeness');
    const filterSearch = document.getElementById('filter-search');
    
    if (filterMonth) filterMonth.value = '';
    if (filterWeek) filterWeek.value = '';
    if (filterCompleteness) filterCompleteness.value = '';
    if (filterSearch) filterSearch.value = '';
    
    renderDataManagementView();
}

function shouldShowRow(monthName, weekIndex, weekData, completeness) {
    // Filtro por mes
    if (currentFilters.month && monthName !== currentFilters.month) {
        return false;
    }
    
    // Filtro por semana
    if (currentFilters.week !== '' && weekIndex !== parseInt(currentFilters.week)) {
        return false;
    }
    
    // Filtro por completitud
    if (currentFilters.completeness) {
        const [min, max] = currentFilters.completeness.split('-').map(Number);
        if (completeness < min || completeness > max) {
            return false;
        }
    }
    
    // Filtro por búsqueda de texto
    if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const weekNumber = weekIndex + 1;
        const searchString = `${monthName} semana ${weekNumber}`.toLowerCase();
        if (!searchString.includes(searchLower)) {
            return false;
        }
    }
    
    return true;
}

// --- INDICADOR DE PROGRESO GLOBAL ---
function calculateDataProgress() {
    const months = Object.keys(dashboardData);
    const totalWeeks = months.length * 4; // 12 meses × 4 semanas = 48
    let weeksWithData = 0;
    const monthlyProgress = {};

    months.forEach(monthName => {
        const weeks = dashboardData[monthName].weeks || [];
        let monthWeeksWithData = 0;

        weeks.forEach((weekData = {}) => {
            const hasData = weekData && Object.keys(weekData).some(key => key !== '_provided' && weekData[key] != null);
            if (hasData) {
                weeksWithData++;
                monthWeeksWithData++;
            }
        });

        monthlyProgress[monthName] = {
            loaded: monthWeeksWithData,
            total: 4,
            percentage: Math.round((monthWeeksWithData / 4) * 100)
        };
    });

    return {
        loaded: weeksWithData,
        total: totalWeeks,
        percentage: Math.round((weeksWithData / totalWeeks) * 100),
        monthlyBreakdown: monthlyProgress
    };
}

function updateProgressIndicator() {
    const progress = calculateDataProgress();
    
    // Actualizar texto y barra
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressBar = document.getElementById('progress-bar');
    
    if (progressText) {
        progressText.textContent = `${progress.loaded} / ${progress.total} semanas`;
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${progress.percentage}%`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${progress.percentage}%`;
        
        // Cambiar color según progreso
        if (progress.percentage >= 80) {
            progressBar.className = 'bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500';
        } else if (progress.percentage >= 50) {
            progressBar.className = 'bg-gradient-to-r from-yellow-500 to-amber-600 h-2 rounded-full transition-all duration-500';
        } else if (progress.percentage >= 25) {
            progressBar.className = 'bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-500';
        } else {
            progressBar.className = 'bg-gradient-to-r from-red-500 to-red-700 h-2 rounded-full transition-all duration-500';
        }
    }
    
    // Actualizar desglose por mes
    const breakdownContainer = document.getElementById('progress-breakdown');
    if (breakdownContainer && progress.monthlyBreakdown) {
        const months = Object.keys(progress.monthlyBreakdown);
        const breakdownHTML = months.map(monthName => {
            const data = progress.monthlyBreakdown[monthName];
            let statusIcon = '✅';
            let statusClass = 'text-green-600';
            
            if (data.percentage === 0) {
                statusIcon = '⭕';
                statusClass = 'text-gray-400';
            } else if (data.percentage < 100) {
                statusIcon = '🔄';
                statusClass = 'text-yellow-600';
            }
            
            return `
                <div class="flex items-center justify-between py-1">
                    <span class="font-medium">${statusIcon} ${monthName}</span>
                    <span class="${statusClass}">${data.loaded}/4 semanas (${data.percentage}%)</span>
                </div>
            `;
        }).join('');
        
        breakdownContainer.innerHTML = breakdownHTML;
    }
}

function toggleProgressBreakdown() {
    const breakdownContainer = document.getElementById('progress-breakdown');
    const detailsBtn = document.getElementById('progress-details-btn');
    
    if (breakdownContainer && detailsBtn) {
        const isHidden = breakdownContainer.classList.contains('hidden');
        
        if (isHidden) {
            breakdownContainer.classList.remove('hidden');
            detailsBtn.textContent = 'Ocultar detalle';
        } else {
            breakdownContainer.classList.add('hidden');
            detailsBtn.textContent = 'Ver detalle';
        }
    }
}

function renderDataManagementView() {
    const container = document.getElementById('data-management-table');
    if (!container) return;

    const months = Object.keys(dashboardData);
    const rows = [];
    let totalWeeks = 0;
    let filteredWeeks = 0;

    const formatNumber = (value) => {
        if (value === null || value === undefined) return '--';
        const numeric = Number(value);
        return Number.isNaN(numeric) ? '--' : numeric.toLocaleString('es-VE');
    };

    const formatCurrencyUSD = (value) => {
        if (value === null || value === undefined) return '--';
        const numeric = Number(value);
        return Number.isNaN(numeric)
            ? '--'
            : `$${numeric.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    };

    months.forEach(monthName => {
        const weeks = dashboardData[monthName].weeks || [];
        weeks.forEach((weekData = {}, index) => {
            totalWeeks++;
            
            const weekNumber = index + 1;
            const hasData = weekData && Object.keys(weekData).some(key => key !== '_provided' && weekData[key] != null);

            // Calcular resumen de datos cargados
            const totalFields = [
                'leadsRecibidos', 'leadsCalificados', 'leadsConvertidos', 'conversacionesGeneradas', 
                'demosRealizados', 'clientesActivos100', 'clientesActivos50', 'clientesMorosos', 
                'clientesPerdidos', 'cobranzaUSD', 'gastosFijos', 'inversionAds',
                'inversionFacebook', 'inversionInstagram', 'inversionTikTok',
                'leadsAds', 'leadsOrganico', 'leadsReferido',
                'mrrMini', 'mrrPro', 'mrrMax', 'mrrWariMini', 'mrrWariPro',
                'influvideosEnCola', 'influvideosEntregados', 'conversacionesAri',
                'ticketsAbiertos', 'ticketsResueltos', 'csatScore', 'npsSemanal',
                'uptimeAri', 'errorRateAri', 'grossMargin', 'expansionMRR', 
                'contractionMRR', 'healthScorePromedio', 'clientesNuevosActivados'
            ];
            
            const fieldsWithData = totalFields.filter(field => 
                weekData[field] !== null && 
                weekData[field] !== undefined && 
                weekData[field] !== ''
            ).length;

            // Badge de completitud
            const completeness = totalFields.length > 0 ? Math.round((fieldsWithData / totalFields.length) * 100) : 0;
            
            // Aplicar filtros
            if (!shouldShowRow(monthName, index, weekData, completeness)) {
                return; // Skip esta fila
            }
            
            filteredWeeks++;

            const leadsRecibidos = hasData
                ? (weekData.leadsRecibidos ?? ((weekData.leadsAds || 0) + (weekData.leadsOrganico || 0) + (weekData.leadsReferido || 0)))
                : null;
            const leadsCalificados = hasData ? weekData.leadsCalificados : null;
            const leadsConvertidos = hasData ? weekData.leadsConvertidos : null;
            const cobranzaUSD = hasData ? weekData.cobranzaUSD : null;
            const inversionAds = hasData ? weekData.inversionAds : null;
            const clientesMorosos = hasData ? weekData.clientesMorosos : null;
            const clientesPerdidos = hasData ? weekData.clientesPerdidos : null;
            const clientesNuevos = hasData ? weekData.clientesNuevosActivados : null;

            const stateLabel = hasData ? 'Cargado' : 'Pendiente';
            const stateClass = hasData ? 'text-green-600' : 'text-gray-400';
            
            let completenessColor = 'bg-gray-200 text-gray-700';
            if (completeness >= 80) completenessColor = 'bg-green-100 text-green-700';
            else if (completeness >= 50) completenessColor = 'bg-yellow-100 text-yellow-700';
            else if (completeness > 0) completenessColor = 'bg-orange-100 text-orange-700';

            rows.push(`
                <tr class="${hasData ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}">
                    <td class="px-4 py-3 font-medium text-gray-900">${monthName}</td>
                    <td class="px-4 py-3 text-gray-700">Semana ${weekNumber}</td>
                    <td class="px-4 py-3 text-gray-700">${formatNumber(leadsRecibidos)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatNumber(leadsCalificados)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatNumber(leadsConvertidos)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatCurrencyUSD(cobranzaUSD)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatCurrencyUSD(inversionAds)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatNumber(clientesMorosos)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatNumber(clientesPerdidos)}</td>
                    <td class="px-4 py-3 text-gray-700">${formatNumber(clientesNuevos)}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${completenessColor}">
                            ${completeness}% (${fieldsWithData}/${totalFields.length})
                        </span>
                    </td>
                    <td class="px-4 py-3 font-semibold ${stateClass}">${stateLabel}</td>
                    <td class="px-4 py-3 text-right flex gap-2">
                        <button type="button" class="btn btn-secondary management-edit" data-month="${monthName}" data-week="${index}">Editar</button>
                        <button type="button" class="btn btn-secondary management-duplicate" data-month="${monthName}" data-week="${index}">Duplicar</button>
                    </td>
                </tr>
            `);
        });
    });

    // Actualizar contador de resultados
    const filteredCountEl = document.getElementById('filtered-count');
    const totalCountEl = document.getElementById('total-count');
    if (filteredCountEl) filteredCountEl.textContent = filteredWeeks;
    if (totalCountEl) totalCountEl.textContent = totalWeeks;

    if (!rows.length) {
        container.innerHTML = `
            <div class="text-center py-10">
                <p class="text-sm text-gray-500">Aún no hay semanas registradas.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div>
                    <h4 class="text-sm font-semibold text-blue-900 mb-1">Indicador de Completitud</h4>
                    <p class="text-xs text-blue-800">La columna "Datos Cargados" muestra cuántos campos has completado de los ${Object.keys(dashboardData)[0] ? '37' : '37'} campos disponibles. Haz clic en "Editar" para completar o modificar cualquier semana.</p>
                </div>
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
                    <tr>
                        <th class="px-4 py-3 text-left">Mes</th>
                        <th class="px-4 py-3 text-left">Semana</th>
                        <th class="px-4 py-3 text-left">Leads Recibidos</th>
                        <th class="px-4 py-3 text-left">Leads Calificados</th>
                        <th class="px-4 py-3 text-left">Leads Convertidos</th>
                        <th class="px-4 py-3 text-left">Cobranza ($)</th>
                        <th class="px-4 py-3 text-left">Inversión Ads ($)</th>
                        <th class="px-4 py-3 text-left">Clientes Morosos</th>
                        <th class="px-4 py-3 text-left">Clientes Perdidos</th>
                        <th class="px-4 py-3 text-left">Clientes Nuevos</th>
                        <th class="px-4 py-3 text-left">Datos Cargados</th>
                        <th class="px-4 py-3 text-left">Estado</th>
                        <th class="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                    ${rows.join('')}
                </tbody>
            </table>
        </div>
        
        <div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 class="text-sm font-semibold text-gray-900 mb-2">💡 Tip: Completitud de datos</h4>
            <div class="flex items-center gap-4 text-xs">
                <div class="flex items-center gap-2">
                    <span class="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                    <span class="text-gray-700">≥80% = Excelente</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span class="text-gray-700">50-79% = Parcial</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
                    <span class="text-gray-700">1-49% = Incompleto</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
                    <span class="text-gray-700">0% = Vacío</span>
                </div>
            </div>
            <p class="text-xs text-gray-600 mt-2">Los 37 campos incluyen: Leads, Demos, Clientes, Finanzas, Inversión por Canal, MRR por Plan, InfluVideos, Tickets, CSAT, NPS, Ari (Uptime, Error Rate), Métricas Avanzadas (Gross Margin, Expansion/Contraction MRR, Health Score).</p>
        </div>
    `;

    attachManagementEvents();
}

function attachManagementEvents() {
    const editButtons = document.querySelectorAll('.management-edit');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const month = button.getAttribute('data-month');
            const week = parseInt(button.getAttribute('data-week'), 10);
            if (!month || Number.isNaN(week)) return;
            prefillDataForm(month, week);
            switchView('data-entry');
            showFormMessage(`Editando Semana ${week + 1} de ${month}.`, 'info');
        });
    });

    const duplicateButtons = document.querySelectorAll('.management-duplicate');
    duplicateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const month = button.getAttribute('data-month');
            const week = parseInt(button.getAttribute('data-week'), 10);
            if (!month || Number.isNaN(week)) return;
            openDuplicateWeekModal(month, week);
        });
    });
// --- MODAL DUPLICAR SEMANA ---
function openDuplicateWeekModal(sourceMonth, sourceWeek) {
    const modal = document.getElementById('duplicate-week-modal');
    const monthSelect = document.getElementById('duplicate-month-select');
    const weekSelect = document.getElementById('duplicate-week-select');
    const confirmBtn = document.getElementById('duplicate-confirm-btn');
    const cancelBtn = document.getElementById('duplicate-cancel-btn');

    // Llenar meses
    monthSelect.innerHTML = '';
    Object.keys(dashboardData).forEach(month => {
        monthSelect.add(new Option(month, month));
    });
    monthSelect.value = sourceMonth;

    // Llenar semanas
    function fillWeeks() {
        weekSelect.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            weekSelect.add(new Option(`Semana ${i + 1}`, i));
        }
        weekSelect.value = sourceWeek;
    }
    fillWeeks();
    monthSelect.addEventListener('change', fillWeeks);

    // Mostrar modal
    modal.classList.remove('hidden');

    // Confirmar duplicación
    confirmBtn.onclick = async function() {
        const destMonth = monthSelect.value;
        const destWeek = parseInt(weekSelect.value);
        if (destMonth === sourceMonth && destWeek === sourceWeek) {
            alert('No puedes duplicar en la misma semana.');
            return;
        }
        const sourceData = dashboardData[sourceMonth].weeks[sourceWeek];
        const destData = dashboardData[destMonth].weeks[destWeek];
        if (destData && Object.keys(destData).length > 0) {
            const confirmed = await showConfirmationModal({
                title: '¿Sobrescribir datos de la semana?',
                message: `La semana destino ya tiene datos. ¿Deseas sobrescribirlos?`,
                confirmText: 'Sí, sobrescribir',
                cancelText: 'Cancelar',
                type: 'danger'
            });
            if (!confirmed) return;
        }
        dashboardData[destMonth].weeks[destWeek] = JSON.parse(JSON.stringify(sourceData));
        recalculateAllData();
        renderDataManagementView();
        updateProgressIndicator();
        modal.classList.add('hidden');
        showFormMessage('Semana duplicada correctamente', 'success');
    };
    cancelBtn.onclick = function() {
        modal.classList.add('hidden');
    };
}
}

function prefillDataForm(monthName, weekIndex) {
    if (!dataFormElement) {
        setupDataForm();
    }
    if (!dataFormElement) return;

    const month = dashboardData[monthName];
    if (!month) return;

    const weekData = month.weeks && month.weeks[weekIndex] ? month.weeks[weekIndex] : {};

    suppressFormResetMessage = true;
    dataFormElement.reset();

    const monthSelect = dataFormElement.querySelector('#month-select');
    const weekSelect = dataFormElement.querySelector('#week-select');
    if (monthSelect) monthSelect.value = monthName;
    if (weekSelect) weekSelect.value = String(weekIndex);

    const fieldNames = [
        'leadsRecibidos', 'leadsCalificados', 'leadsConvertidos', 'conversacionesGeneradas', 'demosRealizados', 'demosExitosos',
        'clientesActivos100', 'clientesActivos50', 'clientesMorosos', 'clientesPerdidos',
        'cobranzaUSD', 'cobranzaBCV', 'cxc', 'inversionAds',
        'influvideosVendidos', 'demosInfluvideos',
        'leadsAds', 'leadsOrganico', 'leadsReferido',
        'convertidosAds', 'convertidosOrganico', 'convertidosReferido',
        'gastosFijos', 'formasLeads', 'inversionTotal',
        // === NUEVOS CAMPOS ===
        'influvideosEnCola', 'influvideosEntregados', 'conversacionesAri',
        'mrrMini', 'mrrPro', 'mrrMax', 'mrrWariMini', 'mrrWariPro',
        'clientesNuevosActivados', 'churnSemanal', 'npsSemanal',
        'tiempoPromedioOnboarding', 'cicloVentaTotal',
        // === NUEVOS CAMPOS AVANZADOS ===
        'grossMargin', 'expansionMRR', 'contractionMRR',
        'inversionFacebook', 'inversionInstagram', 'inversionTikTok',
        'ticketsAbiertos', 'ticketsResueltos', 'csatScore',
        'uptimeAri', 'errorRateAri', 'healthScorePromedio'
    ];

    fieldNames.forEach(name => {
        const input = dataFormElement.querySelector(`[name="${name}"]`);
        if (!input) return;
        const value = weekData && weekData[name] != null ? weekData[name] : '';
        input.value = value;
    });

    const debtInputs = [
        { name: 'deudaSocio1', index: 0 },
        { name: 'deudaSocio2', index: 1 },
        { name: 'deudaSocio3', index: 2 },
        { name: 'deudaSocio4', index: 3 }
    ];

    debtInputs.forEach(({ name, index }) => {
        const input = dataFormElement.querySelector(`[name="${name}"]`);
        if (!input) return;
        const value = Array.isArray(weekData.deudasSocios) ? weekData.deudasSocios[index] : null;
        input.value = value != null ? value : '';
    });

    editingContext = { month: monthName, week: weekIndex };

    const firstEditable = dataFormElement.querySelector('input[name="leadsRecibidos"]');
    if (firstEditable) firstEditable.focus();
}

// --- NAVEGACIÓN ENTRE VISTAS ---
let currentView = 'dashboard';

function switchView(targetView = 'dashboard') {
    currentView = targetView;

    const dashboardSection = document.getElementById('dashboard-view');
    const chartsSection = document.getElementById('charts-view');
    const guideSection = document.getElementById('guide-view');
    const dataEntrySection = document.getElementById('data-entry-view');
    const dataManagementSection = document.getElementById('data-management-view');
    const filterContainer = document.getElementById('period-filter-container');
    const viewButtons = document.querySelectorAll('.view-toggle');

    const showDashboard = targetView === 'dashboard';
    const showCharts = targetView === 'charts';
    const showGuide = targetView === 'guide';
    const showDataEntry = targetView === 'data-entry';
    const showManagement = targetView === 'management';

    if (dashboardSection) {
        dashboardSection.classList.toggle('hidden', !showDashboard);
    }
    if (chartsSection) {
        chartsSection.classList.toggle('hidden', !showCharts);
    }
    if (guideSection) {
        guideSection.classList.toggle('hidden', !showGuide);
    }
    if (dataEntrySection) {
        dataEntrySection.classList.toggle('hidden', !showDataEntry);
    }
    if (dataManagementSection) {
        dataManagementSection.classList.toggle('hidden', !showManagement);
    }
    if (filterContainer) {
        // Mostrar el filtro tanto en Dashboard como en Gráficas
        filterContainer.classList.toggle('hidden', !(showDashboard || showCharts));
    }

    if (showManagement) {
        renderDataManagementView();
    }

    viewButtons.forEach(btn => {
        const isActive = btn.dataset.viewTarget === targetView;
        btn.classList.toggle('bg-white', isActive);
        btn.classList.toggle('shadow-sm', isActive);
        btn.classList.toggle('text-gray-900', isActive);
        btn.classList.toggle('text-gray-600', !isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function setupViewSwitching() {
    const viewButtons = document.querySelectorAll('.view-toggle');
    if (viewButtons.length) {
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.viewTarget));
        });
    }

    const goToFormBtn = document.getElementById('management-go-to-form');
    if (goToFormBtn) {
        goToFormBtn.addEventListener('click', () => switchView('data-entry'));
    }

    switchView(currentView);
}

// --- FORMULARIO DE CARGA DE DATOS ---
function setupDataForm() {
    dataFormElement = document.getElementById('data-form');
    dataFormMessageEl = document.getElementById('form-message');
    if (!dataFormElement) return;

    // Interceptar el botón de reset para pedir confirmación
    const resetButton = dataFormElement.querySelector('button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (suppressFormResetMessage) {
                suppressFormResetMessage = false;
                dataFormElement.reset();
                clearFormMessage();
                editingContext = null;
                return;
            }

            // Verificar si hay datos en el formulario
            const formData = new FormData(dataFormElement);
            const hasData = Array.from(formData.values()).some(value => value && value.trim() !== '');

            if (!hasData) {
                // Si no hay datos, simplemente limpiar
                dataFormElement.reset();
                clearFormMessage();
                editingContext = null;
                return;
            }

            // Pedir confirmación si hay datos
            const confirmed = await showConfirmationModal({
                title: '¿Limpiar formulario?',
                message: 'Se perderán todos los datos que hayas ingresado y no hayas guardado.',
                confirmText: 'Sí, limpiar',
                cancelText: 'Cancelar',
                type: 'warning'
            });

            if (confirmed) {
                suppressFormResetMessage = true;
                dataFormElement.reset();
                clearFormMessage();
                editingContext = null;
                showFormMessage('Formulario limpiado', 'success');
            }
        });
    }

    dataFormElement.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(dataFormElement);
        const monthName = formData.get('month');
        const weekIndex = parseInt(formData.get('week'), 10);

        if (!monthName || Number.isNaN(weekIndex)) {
            showFormMessage('Selecciona un mes y una semana válidos.', 'error');
            return;
        }

        // === VALIDAR DATOS ANTES DE GUARDAR ===
        const validationErrors = validateFormData(formData);
        
        if (validationErrors.length > 0) {
            displayValidationErrors(validationErrors);
            showFormMessage(`❌ Se encontraron ${validationErrors.length} error(es) de validación. Por favor revisa los campos marcados.`, 'error');
            return;
        }

        // Limpiar errores si todo está correcto
        hideValidationPanel();

        // Verificar si ya existen datos para esta semana
        const existingWeek = dashboardData[monthName].weeks[weekIndex];
        const hasExistingData = existingWeek && Object.keys(existingWeek).length > 0;

        if (hasExistingData && !editingContext) {
            // Si hay datos y NO estamos en modo edición, pedir confirmación
            const confirmed = await showConfirmationModal({
                title: '⚠️ Ya existen datos para esta semana',
                message: `Ya hay datos guardados para ${monthName} - Semana ${weekIndex + 1}.\n\n¿Deseas sobrescribirlos con los nuevos datos?`,
                confirmText: 'Sí, sobrescribir',
                cancelText: 'Cancelar',
                type: 'warning'
            });

            if (!confirmed) {
                return;
            }
        }

        // Guardar estado para deshacer
        if (hasExistingData) {
            saveUndoState(monthName, weekIndex);
        }

        const parseNumber = (fieldName, { float = false } = {}) => {
            const raw = formData.get(fieldName);
            if (raw === null) return null;
            const value = String(raw).trim();
            if (value === '') return null;
            const parsed = float ? parseFloat(value) : parseInt(value, 10);
            return Number.isNaN(parsed) ? null : parsed;
        };

        const updatedWeek = {
            ...(existingWeek || {}),
            _provided: { ...((existingWeek && existingWeek._provided) || {}) }
        };

        const setWeekValue = (fieldName, weekKey, options = {}) => {
            const value = parseNumber(fieldName, options);
            if (value !== null) {
                updatedWeek[weekKey] = value;
                updatedWeek._provided[weekKey] = true;
            }
        };

        setWeekValue('leadsAds', 'leadsAds');
        setWeekValue('leadsOrganico', 'leadsOrganico');
        setWeekValue('leadsReferido', 'leadsReferido');
        setWeekValue('convertidosAds', 'convertidosAds');
        setWeekValue('convertidosOrganico', 'convertidosOrganico');
        setWeekValue('convertidosReferido', 'convertidosReferido');

        setWeekValue('leadsRecibidos', 'leadsRecibidos');
        setWeekValue('leadsCalificados', 'leadsCalificados');
        setWeekValue('leadsConvertidos', 'leadsConvertidos');
        setWeekValue('conversacionesGeneradas', 'conversacionesGeneradas');
        setWeekValue('demosRealizados', 'demosRealizados');
        setWeekValue('demosExitosos', 'demosExitosos');

        setWeekValue('cobranzaUSD', 'cobranzaUSD', { float: true });
        setWeekValue('cobranzaBCV', 'cobranzaBCV', { float: true });
        setWeekValue('cxc', 'cxc', { float: true });
        setWeekValue('inversionAds', 'inversionAds', { float: true });
        setWeekValue('clientesMorosos', 'clientesMorosos');
        setWeekValue('clientesPerdidos', 'clientesPerdidos');
        setWeekValue('clientesActivos100', 'clientesActivos100');
        setWeekValue('clientesActivos50', 'clientesActivos50');
        setWeekValue('influvideosVendidos', 'influvideosVendidos');
        setWeekValue('demosInfluvideos', 'demosInfluvideos');
        setWeekValue('gastosFijos', 'gastosFijos', { float: true });
        setWeekValue('formasLeads', 'formasLeads');
        setWeekValue('inversionTotal', 'inversionTotal', { float: true });

        // === CAPTURAR NUEVOS CAMPOS TOP 10 ===
        setWeekValue('influvideosEnCola', 'influvideosEnCola');
        setWeekValue('influvideosEntregados', 'influvideosEntregados');
        setWeekValue('conversacionesAri', 'conversacionesAri');
        setWeekValue('mrrMini', 'mrrMini', { float: true });
        setWeekValue('mrrPro', 'mrrPro', { float: true });
        setWeekValue('mrrMax', 'mrrMax', { float: true });
        setWeekValue('mrrWariMini', 'mrrWariMini', { float: true });
        setWeekValue('mrrWariPro', 'mrrWariPro', { float: true });
        setWeekValue('clientesNuevosActivados', 'clientesNuevosActivados');
        setWeekValue('churnSemanal', 'churnSemanal');
        setWeekValue('npsSemanal', 'npsSemanal');
        setWeekValue('tiempoPromedioOnboarding', 'tiempoPromedioOnboarding', { float: true });
        setWeekValue('cicloVentaTotal', 'cicloVentaTotal', { float: true });
        
        // === CAPTURAR NUEVOS CAMPOS AVANZADOS ===
        setWeekValue('grossMargin', 'grossMargin', { float: true });
        setWeekValue('expansionMRR', 'expansionMRR', { float: true });
        setWeekValue('contractionMRR', 'contractionMRR', { float: true });
        setWeekValue('inversionFacebook', 'inversionFacebook', { float: true });
        setWeekValue('inversionInstagram', 'inversionInstagram', { float: true });
        setWeekValue('inversionTikTok', 'inversionTikTok', { float: true });
        setWeekValue('ticketsAbiertos', 'ticketsAbiertos');
        setWeekValue('ticketsResueltos', 'ticketsResueltos');
        setWeekValue('csatScore', 'csatScore', { float: true });
        setWeekValue('uptimeAri', 'uptimeAri', { float: true });
        setWeekValue('errorRateAri', 'errorRateAri', { float: true });
        setWeekValue('healthScorePromedio', 'healthScorePromedio');

        const ensureDebtArray = () => {
            if (Array.isArray(updatedWeek.deudasSocios)) {
                updatedWeek.deudasSocios = updatedWeek.deudasSocios.slice(0, 4);
                while (updatedWeek.deudasSocios.length < 4) {
                    updatedWeek.deudasSocios.push(null);
                }
            } else if (Array.isArray(existingWeek.deudasSocios)) {
                updatedWeek.deudasSocios = existingWeek.deudasSocios.slice(0, 4);
                while (updatedWeek.deudasSocios.length < 4) {
                    updatedWeek.deudasSocios.push(null);
                }
            } else {
                updatedWeek.deudasSocios = [null, null, null, null];
            }
        };

        const setWeekDebt = (fieldName, index) => {
            const value = parseNumber(fieldName, { float: true });
            if (value !== null) {
                ensureDebtArray();
                updatedWeek.deudasSocios[index] = value;
                updatedWeek._provided[`deudaSocio${index + 1}`] = true;
            }
        };

        setWeekDebt('deudaSocio1', 0);
        setWeekDebt('deudaSocio2', 1);
        setWeekDebt('deudaSocio3', 2);
        setWeekDebt('deudaSocio4', 3);

        dashboardData[monthName].weeks[weekIndex] = updatedWeek;

        recalculateAllData();
        populateMasterFilter();
        const currentFilter = document.getElementById('master-filter').value;
        renderAllKPIs(currentFilter);
        updateAllCharts();
        renderDataManagementView();

        // Hacer auto-backup después de guardar datos
        autoBackup();

        // Actualizar indicador de progreso
        updateProgressIndicator();

        // Mostrar toast de deshacer si hubo modificación de datos existentes
        if (hasExistingData) {
            showUndoToast();
        }

        suppressFormResetMessage = true;
        dataFormElement.reset();

        const confirmation = editingContext
            ? `¡Semana ${editingContext.week + 1} de ${editingContext.month} actualizada!`
            : '¡Datos guardados!';
        showFormMessage(confirmation, 'success');
        editingContext = null;
    });
}
