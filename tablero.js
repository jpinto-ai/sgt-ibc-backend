document.addEventListener('DOMContentLoaded', () => {
    // --- CONEXIÓN AL WEBSOCKET ---
    // La URL de tu API en Render, pero cambiando https por wss (WebSocket Seguro)
    const ws = new WebSocket("wss://sgt-ibc-api.onrender.com/ws");

    // Esta función se ejecuta cada vez que el servidor nos envía un mensaje
    ws.onmessage = function(event) {
        if (event.data === "update") {
            console.log("¡Notificación de actualización recibida! Recargando tablero...");
            cargarTablero(); // Si recibimos 'update', recargamos el tablero
        }
    };
    
    ws.onopen = function(event) {
        console.log("Conexión WebSocket establecida.");
    };

    ws.onclose = function(event) {
        console.log("Conexión WebSocket cerrada. Intentando reconectar en 5 segundos...");
        // Opcional: Lógica para intentar reconectar
        setTimeout(() => {
            // Lógica de reconexión aquí si se desea
        }, 5000);
    };

    ws.onerror = function(event) {
        console.error("Error en WebSocket:", event);
    };

    // --- El resto de tu código de tablero.js no cambia ---
    const API_BASE_URL = 'https://sgt-ibc-api.onrender.com';
    const colPlanta = document.getElementById('col-planta');
    const colLavadero = document.getElementById('col-lavadero');
    const colClientes = document.getElementById('col-clientes');
    const colAveriados = document.getElementById('col-averiados');
    const columnas = [colPlanta, colLavadero, colClientes, colAveriados];
    const addIbcButton = document.getElementById('add-ibc-button');

    addIbcButton.addEventListener('click', () => {
        const alias = prompt("Ingresa el alias para el nuevo IBC:");
        if (alias) crearNuevoIbc(alias);
    });

    function crearNuevoIbc(alias) {
        fetch(`${API_BASE_URL}/api/ibcs/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias: alias })
        })
        .then(response => { if (!response.ok) throw new Error('Error al crear'); return response.json(); })
        .then(nuevoIbc => cargarTablero())
        .catch(error => console.error('Error:', error));
    }
    
    function eliminarIbc(ibcId) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el IBC-${String(ibcId).padStart(3, '0')}?`)) return;
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`, { method: 'DELETE' })
        .then(response => { if (!response.ok) throw new Error('Error al eliminar'); cargarTablero(); })
        .catch(error => console.error('Error:', error));
    }

    function updateIbcStatus(ibcId, updateData) {
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        })
        .then(response => { if (!response.ok) throw new Error('Falló la actualización'); return response.json(); })
        .then(data => cargarTablero())
        .catch(error => console.error('Error al actualizar:', error));
    }
    function cargarTablero() {
        fetch(`${API_BASE_URL}/api/ibcs/`)
            .then(response => response.json())
            .then(data => {
                columnas.forEach(col => col.innerHTML = '');
                data.forEach(ibc => {
                    const card = crearTarjeta(ibc);
                    if (ibc.estado === 'Averiado') colAveriados.appendChild(card);
                    else if (ibc.estado === 'En Lavado') colLavadero.appendChild(card);
                    else if (ibc.estado === 'En Cliente') colClientes.appendChild(card);
                    else colPlanta.appendChild(card);
                });
            })
            .catch(error => console.error('Error al cargar el tablero:', error));
    }
    function crearTarjeta(ibc) {
    const div = document.createElement('div');
    div.className = 'card';
    div.setAttribute('data-id', ibc.id);
    let clienteInfo = (ibc.estado === 'En Cliente') ? `<p>Cliente: <strong>${ibc.cliente_asignado || 'N/A'}</strong></p>` : '';
    div.innerHTML = `
        <button class="delete-btn">🗑️</button>
        <p class="ibc-id">IBC-${String(ibc.id).padStart(3, '0')}</p>
        ${clienteInfo}
        <div class="card-actions"></div>
    `;
    const deleteButton = div.querySelector('.delete-btn');
    deleteButton.onclick = () => eliminarIbc(ibc.id);
    const actionsContainer = div.querySelector('.card-actions');
    // --- BOTÓN NUEVO DE HISTORIAL ---
    const btnHistorial = document.createElement('button');
    btnHistorial.textContent = '📖 Ver Historial';
    btnHistorial.onclick = () => {
        // Esta línea nos lleva a la nueva página de historial
        window.location.href = `historial.html?id=${ibc.id}`;
    };
    actionsContainer.appendChild(btnHistorial);

        if (ibc.estado === 'Disponible') {
            const btnCliente = document.createElement('button');
            btnCliente.textContent = '🚚 Enviar a Cliente';
            btnCliente.onclick = () => {
                const clientName = prompt("Ingresa el nombre del cliente:");
                if (clientName) updateIbcStatus(ibc.id, { estado: 'En Cliente', ubicacion: clientName, cliente_asignado: clientName });
            };
            actionsContainer.appendChild(btnCliente);
        }
        if (ibc.estado === 'Disponible' || ibc.estado === 'En Cliente') {
             const btnLavadero = document.createElement('button');
             btnLavadero.textContent = '💧 Enviar a Lavadero';
             btnLavadero.onclick = () => updateIbcStatus(ibc.id, { estado: 'En Lavado', ubicacion: 'Lavadero Externo', cliente_asignado: null });
             actionsContainer.appendChild(btnLavadero);
        }
        if (ibc.estado === 'En Lavado') {
            const btnPlanta = document.createElement('button');
            btnPlanta.textContent = '✅ Recibir en Planta (OK)';
            btnPlanta.onclick = () => updateIbcStatus(ibc.id, { estado: 'Disponible', ubicacion: 'Planta Bogotá' });
            actionsContainer.appendChild(btnPlanta);
        }
        if (ibc.estado === 'En Cliente') {
            const btnRetorno = document.createElement('button');
            btnRetorno.textContent = '🏠 Retornar a Planta';
            btnRetorno.onclick = () => updateIbcStatus(ibc.id, { estado: 'Disponible', ubicacion: 'Planta Bogotá', cliente_asignado: null });
            actionsContainer.appendChild(btnRetorno);
        }
        if (ibc.estado !== 'Averiado') {
            const btnAveria = document.createElement('button');
            btnAveria.textContent = '❌ Reportar Avería';
            btnAveria.className = 'btn-danger';
            btnAveria.onclick = () => updateIbcStatus(ibc.id, { estado: 'Averiado', ubicacion: 'Planta Bogotá' });
            actionsContainer.appendChild(btnAveria);
        } else {
            const btnReparado = document.createElement('button');
            btnReparado.textContent = '✅ Marcar como Reparado';
            btnReparado.onclick = () => updateIbcStatus(ibc.id, { estado: 'Disponible', ubicacion: 'Planta Bogotá' });
            actionsContainer.appendChild(btnReparado);
        }
        return div;
    }
    
    cargarTablero();
});