document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://sgt-ibc-api.onrender.com';

    // Referencias a los elementos KPI
    const kpiTotal = document.getElementById('kpi-total');
    const kpiPlanta = document.getElementById('kpi-planta');
    const kpiClientes = document.getElementById('kpi-clientes');
    const kpiAveriados = document.getElementById('kpi-averiados');
    const kpiLavadero = document.getElementById('kpi-lavadero'); // <-- LÍNEA NUEVA

    // Función para cargar los datos del dashboard
    function cargarDashboard() {
        fetch(`${API_BASE_URL}/api/dashboard-data`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // 1. Actualiza las tarjetas KPI
                kpiTotal.textContent = data.total_ibcs;
                kpiPlanta.textContent = data.total_planta;
                kpiClientes.textContent = data.total_clientes;
                kpiAveriados.textContent = data.total_averiados;
                kpiLavadero.textContent = data.total_lavadero; // <-- LÍNEA NUEVA

                // 2. Dibuja el gráfico de torta
                const ctx = document.getElementById('estadoPieChart').getContext('2d');
                new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: [
                            'En Planta',
                            'En Clientes',
                            'En Lavadero',
                            'Averiados'
                        ],
                        datasets: [{
                            label: 'Distribución de IBCs',
                            data: [
                                data.total_planta,
                                data.total_clientes,
                                data.total_lavadero,
                                data.total_averiados
                            ],
                            backgroundColor: [
                                'rgba(61, 139, 65, 0.8)',  // Verde
                                'rgba(242, 183, 5, 0.8)',  // Amarillo
                                'rgba(54, 162, 235, 0.8)', // Azul
                                'rgba(231, 76, 60, 0.8)'   // Rojo
                            ],
                            borderColor: [
                                'rgba(61, 139, 65, 1)',
                                'rgba(242, 183, 5, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(231, 76, 60, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error al cargar el dashboard:', error);
                document.querySelector('.chart-container').innerHTML = '<h2>Error al cargar los datos del dashboard.</h2>';
            });
    }

    // --- FUNCIÓN PARA EL GRÁFICO DE BARRAS ---
    function cargarGraficoClientes() {
        fetch(`${API_BASE_URL}/api/dashboard-clients`)
            .then(response => response.json())
            .then(data => {
                const labels = data.map(item => item.cliente_asignado);
                const counts = data.map(item => item.conteo);

                const ctx = document.getElementById('clientBarChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'N° de IBCs',
                            data: counts,
                            backgroundColor: 'rgba(242, 183, 5, 0.8)', // Amarillo corporativo
                            borderColor: 'rgba(242, 183, 5, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            })
            .catch(error => console.error('Error al cargar gráfico de clientes:', error));
    }

    // Carga inicial de los datos
    cargarDashboard();
    cargarGraficoClientes();
});