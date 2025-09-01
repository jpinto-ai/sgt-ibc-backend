document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ibcId = params.get('id');

    const title = document.getElementById('historial-title');
    const detailsDiv = document.getElementById('ibc-details');
    const historyBody = document.getElementById('historyBody');

    if (ibcId) {
        title.textContent = `Historial del IBC-${String(ibcId).padStart(3, '0')}`;
        
        // Cargar detalles del IBC
        fetch(`https://sgt-ibc-api.onrender.com/api/ibcs/${ibcId}`)
            .then(response => response.json())
            .then(ibc => {
                detailsDiv.innerHTML = `
                    <p class="ibc-id">ID: ${ibc.id}</p>
                    <p>Alias: ${ibc.alias}</p>
                    <p>Estado Actual: <strong>${ibc.estado}</strong></p>
                    <p>Ubicación Actual: <strong>${ibc.ubicacion}</strong></p>
                `;
            });

        // Cargar historial del IBC
        fetch(`https://sgt-ibc-api.onrender.com/api/ibcs/${ibcId}/history`)
            .then(response => response.json())
            .then(historyData => {
                historyBody.innerHTML = '';
                historyData.forEach(record => {
                    let row = historyBody.insertRow();
                    // Formatear la fecha para que sea más legible
                    let formattedDate = new Date(record.timestamp).toLocaleString('es-CO');
                    
                    row.insertCell(0).textContent = formattedDate;
                    row.insertCell(1).textContent = record.estado;
                    row.insertCell(2).textContent = record.ubicacion;
                    row.insertCell(3).textContent = record.cliente_asignado || '---';
                });
            });
    } else {
        title.textContent = "Error: No se especificó un ID de IBC.";
    }
});