document.addEventListener('DOMContentLoaded', () => {
    // --- CONEXIÓN AL WEBSOCKET ---
    const ws = new WebSocket("wss://sgt-ibc-api.onrender.com/ws");

    ws.onmessage = function(event) {
        if (event.data === "update") {
            console.log("¡Notificación de actualización recibida! Recargando tablero...");
            cargarTablero();
        }
    };
    ws.onopen = () => console.log("Conexión WebSocket establecida.");
    ws.onclose = () => console.log("Conexión WebSocket cerrada.");
    ws.onerror = (event) => console.error("Error en WebSocket:", event);

    // --- REFERENCIAS A ELEMENTOS HTML ---
    const API_BASE_URL = 'https://sgt-ibc-api.onrender.com';
    const colPlanta = document.getElementById('col-planta');
    const colLavadero = document.getElementById('col-lavadero');
    const colClientes = document.getElementById('col-clientes');
    const colAveriados = document.getElementById('col-averiados');
    const columnas = [colPlanta, colLavadero, colClientes, colAveriados];
    const addIbcButton = document.getElementById('add-ibc-button');

    // --- MANEJADORES DE EVENTOS ---
    addIbcButton.addEventListener('click', () => {
        const alias = prompt("Ingresa el alias para el nuevo IBC:");
        if (alias) crearNuevoIbc(alias);
    });

    // Cierra los menús si el usuario hace clic en otro lugar
    window.onclick = function(event) {
        if (!event.target.matches('.actions-menu-button')) {
            closeAllDropdowns();
        }
    }

    // --- FUNCIONES DE API ---
    function crearNuevoIbc(alias) {
        fetch(`${API_BASE_URL}/api/ibcs/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias: alias })
        })
        .then(response => { if (!response.ok) throw new Error('Error al crear'); return response.json(); })
        .catch(error => console.error('Error:', error));
    }
    
    function eliminarIbc(ibcId) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el IBC-${String(ibcId).padStart(3, '0')}?`)) return;
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`, { method: 'DELETE' })
        .catch(error => console.error('Error:', error));
    }

    function updateIbcStatus(ibcId, updateData) {
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        })
        .then(response => { if (!response.ok) throw new Error('Falló la actualización'); return response.json(); })
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
                // Actualiza los títulos con el contador
                document.querySelector('#col-planta').previousElementSibling.textContent = `✅ En Planta (${colPlanta.children.length})`;
                document.querySelector('#col-lavadero').previousElementSibling.textContent = `💧 En Lavadero (${colLavadero.children.length})`;
                document.querySelector('#col-clientes').previousElementSibling.textContent = `🚚 En Clientes (${colClientes.children.length})`;
                document.querySelector('#col-averiados').previousElementSibling.textContent = `❌ Averiados (${colAveriados.children.length})`;
            })
            .catch(error => console.error('Error al cargar el tablero:', error));
    }
    
    // --- FUNCIÓN PARA CREAR TARJETAS (CON EL NUEVO MENÚ) ---
    function crearTarjeta(ibc) {
        const div = document.createElement('div');
        div.className = 'card';
        div.setAttribute('data-id', ibc.id);
        let clienteInfo = (ibc.estado === 'En Cliente') ? `<p>Cliente: <strong>${ibc.cliente_asignado || 'N/A'}</strong></p>` : '';
        let observacionesInfo = ibc.observaciones ? `<p style="font-style: italic; color: #555;">Obs: ${ibc.observaciones}</p>` : '';

        div.innerHTML = `
            <button class="delete-btn">🗑️</button>
            <button class="actions-menu-button">...</button>
            <div class="dropdown-content"></div>
            <p class="ibc-id">IBC-${String(ibc.id).padStart(3, '0')}</p>
            <p>Alias: ${ibc.alias}</p>
            ${clienteInfo}
            ${observacionesInfo}
        `;

        const deleteButton = div.querySelector('.delete-btn');
        deleteButton.onclick = () => eliminarIbc(ibc.id);

        const menuButton = div.querySelector('.actions-menu-button');
        const dropdownContent = div.querySelector('.dropdown-content');
        menuButton.onclick = (event) => {
            event.stopPropagation();
            closeAllDropdowns();
            dropdownContent.classList.toggle("show");
        };

        const actions = [
            { text: '📝 Editar Observación', onClick: () => {
                const obsActual = ibc.observaciones || "";
                const nuevaObs = prompt("Ingresa las observaciones para este IBC:", obsActual);
                if (nuevaObs !== null) updateIbcStatus(ibc.id, { observaciones: nuevaObs });
            }},
            { text: '📖 Ver Historial', onClick: () => { window.location.href = `historial.html?id=${ibc.id}`; }}
        ];

        if (ibc.estado === 'Disponible') {
            actions.push({ text: '🚚 Enviar a Cliente', onClick: () => {
                const clientName = prompt("Ingresa el nombre del cliente:");
                if (clientName) updateIbcStatus(ibc.id, { estado: 'En Cliente', ubicacion: clientName, cliente_asignado: clientName });
            }});
        }
        if (ibc.estado === 'Disponible' || ibc.estado === 'En Cliente') {
            actions.push({ text: '💧 Enviar a Lavadero', onClick: () => updateIbcStatus(ibc.id, { estado: 'En Lavado', ubicacion: 'Lavadero Externo', cliente_asignado: null })});
        }
        if (ibc.estado === 'En Lavado') {
            actions.push({ text: '✅ Recibir en Planta (OK)', onClick: () => updateIbcStatus(ibc.id, { estado: 'Disponible', ubicacion: 'Planta Bogotá' })});
        }
        if (ibc.estado === 'En Cliente') {
            actions.push({ text: '🏠 Retornar a Planta', onClick: () => updateIbcStatus(ibc.id, { estado: 'Disponible', ubicacion: 'Planta Bogotá', cliente_asignado: null })});
        }
        if (ibc.estado !== 'Averiado') {
            actions.push({ text: '❌ Reportar Avería', className: 'btn-danger', onClick: () => updateIbcStatus(ibc.id, { estado: 'Averiado', ubicacion: 'Planta Bogotá' })});
        } else {
            actions.push({ text: '✅ Marcar como Reparado', onClick: () => updateIbcStatus(ibc.id, { estado: 'Disponible', ubicacion: 'Planta Bogotá' })});
        }

        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.text;
            if (action.className) button.classList.add(action.className);
            button.onclick = action.onClick;
            dropdownContent.appendChild(button);
        });

        return div;
    }

    function closeAllDropdowns() {
        const dropdowns = document.querySelectorAll(".dropdown-content");
        dropdowns.forEach(openDropdown => {
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        });
    }

    cargarTablero();
});