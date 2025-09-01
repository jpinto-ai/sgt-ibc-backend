document.addEventListener('DOMContentLoaded', () => {
    console.log('Página cargada. Iniciando la lógica del tablero.');

    // ... (el resto de las referencias a elementos no cambia)
    const colPlanta = document.getElementById('col-planta');
    const colLavadero = document.getElementById('col-lavadero');
    const colClientes = document.getElementById('col-clientes');
    const colAveriados = document.getElementById('col-averiados');
    const columnas = [colPlanta, colLavadero, colClientes, colAveriados];
    const addIbcButton = document.getElementById('add-ibc-button');

    addIbcButton.addEventListener('click', () => {
        const alias = prompt("Ingresa el alias para el nuevo IBC:");
        if (alias) {
            crearNuevoIbc(alias);
        }
    });

    function crearNuevoIbc(alias) {
        console.log(`Creando nuevo IBC con alias: ${alias}`);
        fetch('https://sgt-ibc-api.onrender.com/api/ibcs/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias: alias })
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al crear el IBC');
            return response.json();
        })
        .then(nuevoIbc => {
            console.log('Creación exitosa. Recargando tablero...');
            cargarTablero();
        })
        .catch(error => console.error('Error en crearNuevoIbc:', error));
    }
    
    // ... (la función eliminarIbc no cambia) ...
    function eliminarIbc(ibcId) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el IBC-${String(ibcId).padStart(3, '0')}?`)) return;
        console.log(`Eliminando IBC con ID: ${ibcId}`);
        fetch(`https://sgt-ibc-api.onrender.com/api/ibcs/${ibcId}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) throw new Error('Error al eliminar el IBC');
            console.log(`IBC ${ibcId} eliminado. Recargando tablero...`);
            cargarTablero();
        })
        .catch(error => console.error('Error en eliminarIbc:', error));
    }

    // ... (la función updateIbcStatus no cambia) ...
    function updateIbcStatus(ibcId, updateData) {
        console.log(`Actualizando IBC ${ibcId} con datos:`, updateData);
        fetch(`https://sgt-ibc-api.onrender.com/api/ibcs/${ibcId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        })
        .then(response => {
            if (!response.ok) throw new Error('Falló la actualización');
            return response.json();
        })
        .then(data => {
            console.log('Actualización exitosa. Recargando tablero...');
            cargarTablero();
        })
        .catch(error => console.error('Error en updateIbcStatus:', error));
    }

    function cargarTablero() {
        console.log('Iniciando carga del tablero...');
        fetch('https://sgt-ibc-api.onrender.com/api/ibcs/')
            .then(response => {
                console.log('Respuesta de la API recibida.');
                return response.json();
            })
            .then(data => {
                console.log(`Recibidos ${data.length} IBCs. Limpiando y dibujando tarjetas...`);
                columnas.forEach(col => col.innerHTML = '');
                data.forEach(ibc => {
                    const card = crearTarjeta(ibc);
                    if (ibc.estado === 'Averiado') {
                        colAveriados.appendChild(card);
                    } else if (ibc.estado === 'En Lavado') {
                        colLavadero.appendChild(card);
                    } else if (ibc.estado === 'En Cliente') {
                        colClientes.appendChild(card);
                    } else {
                        colPlanta.appendChild(card);
                    }
                });
                console.log('Tablero dibujado con éxito.');
            })
            .catch(error => console.error('Error fatal al cargar el tablero:', error));
    }

    // ... (la función crearTarjeta no cambia) ...
    function crearTarjeta(ibc) {
        const div = document.createElement('div');
        div.className = 'card';
        div.setAttribute('data-id', ibc.id);
        let clienteInfo = (ibc.estado === 'En Cliente') ? `<p>Cliente: <strong>${ibc.cliente_asignado || 'N/A'}</strong></p>` : '';
        div.innerHTML = `
            <button class="delete-btn">🗑️</button>
            <p class="ibc-id">IBC-${String(ibc.id).padStart(3, '0')}</p>
            <p>Alias: ${ibc.alias}</p>
            ${clienteInfo}
            <div class="card-actions"></div>
        `;
        const deleteButton = div.querySelector('.delete-btn');
        deleteButton.onclick = () => { eliminarIbc(ibc.id); };
        const actionsContainer = div.querySelector('.card-actions');
        const btnHistorial = document.createElement('button');
        btnHistorial.textContent = '📖 Ver Historial';
        btnHistorial.onclick = () => { window.location.href = `historial.html?id=${ibc.id}`; };
        actionsContainer.appendChild(btnHistorial);
        if (ibc.estado === 'Disponible') {
            const btnCliente = document.createElement('button');
            btnCliente.textContent = '🚚 Enviar a Cliente';
            btnCliente.onclick = () => {
                const clientName = prompt("Por favor, ingresa el nombre del cliente:");
                if (clientName) {
                    updateIbcStatus(ibc.id, { estado: 'En Cliente', ubicacion: clientName, cliente_asignado: clientName });
                }
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
    
    // Carga inicial del tablero
    cargarTablero();
});