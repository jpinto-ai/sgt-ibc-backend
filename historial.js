document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ibcId = params.get('id');

    const title = document.getElementById('historial-title');
    const detailsDiv = document.getElementById('ibc-details');
    const historyBody = document.getElementById('historyBody');
    const API_BASE_URL = 'https://sgt-ibc-api.onrender.com';

    if (ibcId) {
        title.textContent = `Historial del IBC-${String(ibcId).padStart(3, '0')}`;
        
        // Cargar detalles generales del IBC
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}`)
            .then(response => response.json())
            .then(ibc => {
                detailsDiv.innerHTML = `
                    <p class="ibc-id">ID: ${ibc.id}</p>
                    <p>Alias: ${ibc.alias}</p>
                    <p>Estado Actual: <strong>${ibc.estado}</strong></p>
                    <p>Ubicación Actual: <strong>${ibc.ubicacion}</strong></p>
                `;
            });

        // Cargar el historial de movimientos del IBC
        fetch(`${API_BASE_URL}/api/ibcs/${ibcId}/history`)
            .then(response => response.json())
            .then(historyData => {
                historyBody.innerHTML = '';
                if (historyData.length === 0) {
                    historyBody.innerHTML = '<tr><td colspan="3">No hay registros en el historial.</td></tr>';
                    return;
                }
                
                historyData.forEach(record => {
                    let row = historyBody.insertRow();
                    
                    let formattedDate = new Date(record.timestamp).toLocaleString('es-CO', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    });
                    
                    row.insertCell(0).textContent = formattedDate;
                    row.insertCell(1).textContent = record.estado;
                    row.insertCell(2).textContent = (record.estado === 'En Cliente') ? record.cliente_asignado : record.ubicacion;
                });
            });
    } else {
        title.textContent = "Error: No se especificó un ID de IBC.";
    }
});