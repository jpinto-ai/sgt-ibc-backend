// archivo: app.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a elementos HTML ---
    const ibcIdSpan = document.getElementById('ibc-id');
    const ibcEstadoSpan = document.getElementById('ibc-estado');
    const ibcUbicacionSpan = document.getElementById('ibc-ubicacion');
    const actionButtonsDiv = document.getElementById('action-buttons');
    const inventoryBody = document.getElementById('inventoryBody');
    const clearButton = document.getElementById('clearButton');

    // --- LÓGICA DEL ESCÁNER DE QR ---
    const html5QrCode = new Html5Qrcode("qr-reader");
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        const ibcId = decodedText.split('/').pop();
        fetchIbcData(ibcId);
    };
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
        .catch(err => {
            html5QrCode.start({ }, config, qrCodeSuccessCallback)
                .catch(err => console.error("No se pudo iniciar ninguna cámara.", err));
        });

    // --- LÓGICA DEL INVENTARIO ---
    function loadInventory() {
        fetch('http://127.0.0.1:8000/api/ibcs/')
            .then(response => response.json())
            .then(data => {
                inventoryBody.innerHTML = '';
                if (data.length === 0) {
                    inventoryBody.innerHTML = '<tr><td colspan="4">No hay IBCs en el inventario.</td></tr>';
                    return;
                }
                data.forEach(ibc => {
                    let row = inventoryBody.insertRow();
                    row.insertCell(0).textContent = ibc.id;
                    row.insertCell(1).textContent = ibc.alias;
                    row.insertCell(2).textContent = ibc.estado;
                    row.insertCell(3).textContent = ibc.ubicacion;
                });
            })
            .catch(error => {
                console.error('Error al cargar el inventario:', error);
                inventoryBody.innerHTML = '<tr><td colspan="4">Error al cargar el inventario.</td></tr>';
            });
    }

    // --- LÓGICA DE BOTONES Y DATOS ---
    clearButton.addEventListener('click', clearIbcInfo);

    function clearIbcInfo() {
        ibcIdSpan.textContent = '---';
        ibcEstadoSpan.textContent = '---';
        ibcUbicacionSpan.textContent = '---';
        actionButtonsDiv.innerHTML = '';
    }

    function fetchIbcData(ibcId) {
        fetch(`http://127.0.0.1:8000/api/ibcs/${ibcId}`)
            .then(response => { if (!response.ok) { throw new Error('IBC no encontrado'); } return response.json(); })
            .then(data => {
                ibcIdSpan.textContent = data.id;
                ibcEstadoSpan.textContent = data.estado;
                ibcUbicacionSpan.textContent = data.ubicacion;
                createActionButtons(data.id, data.estado);
            })
            .catch(error => { alert(error.message); });
    }

    function updateIbcStatus(ibcId, updateData) {
        fetch(`http://127.0.0.1:8000/api/ibcs/${ibcId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(updatedIbc => {
            alert(`¡IBC ${ibcId} actualizado!`);
            clearIbcInfo();
            loadInventory();
        })
        .catch(error => console.error('Error al actualizar:', error));
    }

    function createActionButtons(ibcId, currentState) {
        actionButtonsDiv.innerHTML = '';
        if (currentState === 'Disponible') {
            const btnEnviarCliente = document.createElement('button');
            btnEnviarCliente.textContent = 'Enviar a Cliente';

            // --- ESTA ES LA LÓGICA NUEVA ---
            btnEnviarCliente.onclick = () => {
                const clientName = prompt("Por favor, ingresa el nombre del cliente:");
                if (clientName) { // Si el usuario ingresa un nombre y no cancela
                    const updateData = {
                        estado: 'En Cliente',
                        ubicacion: clientName,
                        cliente_asignado: clientName
                    };
                    updateIbcStatus(ibcId, updateData);
                }
            };
            actionButtonsDiv.appendChild(btnEnviarCliente);

        } else if (currentState === 'En Cliente' || currentState === 'Sucio') {
            const btnEnviarLavado = document.createElement('button');
            btnEnviarLavado.textContent = 'Enviar a Lavadero';
            btnEnviarLavado.onclick = () => updateIbcStatus(ibcId, { estado: 'En Lavado', ubicacion: 'Lavadero Externo', cliente_asignado: null });
            actionButtonsDiv.appendChild(btnEnviarLavado);

        } else if (currentState === 'En Lavado') {
             const btnRecibirLavado = document.createElement('button');
             btnRecibirLavado.textContent = 'Recibir de Lavadero (OK)';
             btnRecibirLavado.onclick = () => updateIbcStatus(ibcId, { estado: 'Disponible', ubicacion: 'Planta Bogotá' });
             actionButtonsDiv.appendChild(btnRecibirLavado);
        }
        
        const btnReportarAveria = document.createElement('button');
        btnReportarAveria.textContent = 'Reportar Avería';
        btnReportarAveria.style.backgroundColor = '#d9534f';
        btnReportarAveria.onclick = () => updateIbcStatus(ibcId, { estado: 'Averiado' });
        actionButtonsDiv.appendChild(btnReportarAveria);
    }
    
    loadInventory();
});