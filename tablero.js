document.addEventListener('DOMContentLoaded', () => {
    // --- CONEXIÓN AL WEBSOCKET ---
    const ws = new WebSocket("wss://sgt-ibc-api.onrender.com/ws");
    ws.onmessage = (event) => {
        if (event.data === "update") {
            console.log("Notificación recibida! Recargando tablero...");
            cargarTablero();
        }
    };
    ws.onopen = () => console.log("WebSocket conectado.");
    ws.onclose = () => console.log("WebSocket desconectado.");
    ws.onerror = (event) => console.error("Error en WebSocket:", event);

    // --- REFERENCIAS A ELEMENTOS HTML ---
    const API_BASE_URL = 'https://sgt-ibc-api.onrender.com';
    const colPlanta = document.getElementById('col-planta');
    const colLavadero = document.getElementById('col-lavadero');
    const colClientes = document.getElementById('col-clientes');
    const colAveriados = document.getElementById('col-averiados');
    const columnas = [colPlanta, colLavadero, colClientes, colAveriados];
    const addIbcButton = document.getElementById('add-ibc-button');
    const searchInput = document.getElementById('searchInput'); // <-- NUEVA LÍNEA

    // --- LÓGICA DE BÚSQUEDA (NUEVO) ---
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const allCards = document.querySelectorAll('.card');

        allCards.forEach(card => {
            const idText = card.querySelector('.ibc-id').textContent.toLowerCase();
            // Busca también en el alias si existe
            const aliasElement = card.querySelector('p:nth-of-type(2)');
            const aliasText = aliasElement ? aliasElement.textContent.toLowerCase() : '';

            if (idText.includes(searchTerm) || aliasText.includes(searchTerm)) {
                card.style.display = 'block'; // Muestra la tarjeta
            } else {
                card.style.display = 'none'; // Oculta la tarjeta
            }
        });
    });

    addIbcButton.addEventListener('click', () => {
        const alias = prompt("Ingresa el alias para el nuevo IBC:");
        if (alias) crearNuevoIbc(alias);
    });

    // ... (Las funciones crearNuevoIbc, eliminarIbc, updateIbcStatus y cargarTablero no cambian) ...
    function crearNuevoIbc(alias) {
        fetch(`${API_BASE_URL}/api/ibcs/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alias: alias }) })
        .then(response => { if (!response.ok) throw new Error('Error al crear'); return response.json(); })
        .then(nuevoIbc => cargarTablero()).catch(error => console.error('Error:', error));
    }
    function eliminarIbc(ibcId) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el IBC-${String(ibcId).padStart(3, '0')}?`)) return;
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`, { method: 'DELETE' })
        .then(response => { if (!response.ok) throw new Error('Error al eliminar'); cargarTablero(); })
        .catch(error => console.error('Error:', error));
    }
    function updateIbcStatus(ibcId, updateData) {
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) })
        .then(response => { if (!response.ok) throw new Error('Falló la actualización'); return response.json(); })
        .then(data => cargarTablero()).catch(error => console.error('Error al actualizar:', error));
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
                document.querySelector('#col-planta').previousElementSibling.textContent = `✅ En Planta (${colPlanta.children.length})`;
                document.querySelector('#col-lavadero').previousElementSibling.textContent = `💧 En Lavadero (${colLavadero.children.length})`;
                document.querySelector('#col-clientes').previousElementSibling.textContent = `🚚 En Clientes (${colClientes.children.length})`;
                document.querySelector('#col-averiados').previousElementSibling.textContent = `❌ Averiados (${colAveriados.children.length})`;
            })
            .catch(error => console.error('Error al cargar el tablero:', error));
    }

    // --- FUNCIÓN crearTarjeta RESTAURADA Y CON EL NUEVO BOTÓN DE OBSERVACIONES ---
    function crearTarjeta(ibc) {
        const div = document.createElement('div');
        div.className = 'card';
        div.setAttribute('data-id', ibc.id);
        
        let clienteInfo = (ibc.estado === 'En Cliente') ? `<p>Cliente: <strong>${ibc.cliente_asignado || 'N/A'}</strong></p>` : '';
        let observacionesInfo = ibc.observaciones ? `<p style="font-style: italic; color: #555;">Obs: ${ibc.observaciones}</p>` : '';

        div.innerHTML = `
            <button class="delete-btn">🗑️</button>
            <button class="obs-btn">📝</button>
            <p class="ibc-id">IBC-${String(ibc.id).padStart(3, '0')}</p>
            ${clienteInfo}
            ${observacionesInfo}
            <div class="card-actions"></div>
        `;

        // Lógica para botones de la esquina
        div.querySelector('.delete-btn').onclick = () => eliminarIbc(ibc.id);
        div.querySelector('.obs-btn').onclick = () => {
            const obsActual = ibc.observaciones || "";
            const nuevaObs = prompt("Ingresa las observaciones para este IBC:", obsActual);
            if (nuevaObs !== null) {
                updateIbcStatus(ibc.id, { observaciones: nuevaObs });
            }
        };

        // Lógica para la lista de botones de acción principal
        const actionsContainer = div.querySelector('.card-actions');
        
        const btnHistorial = document.createElement('button');
        btnHistorial.textContent = '📖 Ver Historial';
        btnHistorial.onclick = () => { window.location.href = `historial.html?id=${ibc.id}`; };
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