import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  FileDown, 
  Plus, 
  CheckCircle, 
  Droplets, 
  Truck, 
  XCircle,
  MapPin,
  Factory,
  LogOut,
  History,
  Trash2,
  Edit2,
  Wrench,
  X,
  Clock
} from 'lucide-react';

/**
 * COMPONENTE PRINCIPAL: Sistema de Control de IBC's Alianza Team
 * Vistas: 'selection', 'dashboard', 'analytics', 'history'
 */
export default function App() {
  const [vista, setVista] = useState('selection');
  const [sedeActual, setSedeActual] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Modales
  const [showNewModal, setShowNewModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estados para inputs y selección
  const [newAlias, setNewAlias] = useState('');
  const [clientName, setClientName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [selectedIbcId, setSelectedIbcId] = useState(null);
  const [ibcEnHistorial, setIbcEnHistorial] = useState(null);
  // --- BLOQUE DE CARGA DE DATOS REALES ---
useEffect(() => {
const cargarDatosDesdeRender = async () => {
  try {
    const respuesta = await fetch('https://sgt-ibc-api.onrender.com/api/ibcs/');
    
    if (!respuesta.ok) {
      throw new Error('No se pudo conectar con el servidor de datos');
    }

    const datosReales = await respuesta.json();

    const datosAdaptados = datosReales.map(ibc => ({
      ...ibc,
      // Usamos 'identificación' de Supabase para el ID visual si 'alias' falla
      id: ibc.alias || ibc.identificación || `ID-${ibc.id}`, 
      
      // Mapeo de Sede: Asegúrate de que en Supabase diga "Planta Bogotá" exactamente
      centro: ibc.centro || 'Sin Sede',

      // Traducción de Estado para las columnas del tablero
      estado: ibc.estado === 'En Cliente' ? 'En Clientes' : ibc.estado,

      // IMPORTANTE: Si la API no envía el historial anidado, 
      // aquí es donde deberíamos unirlo. Por ahora, evitamos el error:
      historial: ibc.historial || [] 
    }));

    setIbcs(datosAdaptados);
  } catch (error) {
    console.error("Error:", error);
  }
};

    cargarDatosDesdeRender();
}, []); // Los corchetes vacíos [] significan que esto solo se hace una vez al abrir la página
// ----------------------------------------

  // URL del logo
  const LOGO_URL = "https://i.imgur.com/iL0SuKk.jpeg";

  // Datos iniciales de ejemplo
  const [ibcs, setIbcs] = useState([]);

  const entrarAlTablero = (nombreSede) => {
    setSedeActual(nombreSede);
    setVista('dashboard');
  };

  const ibcsSede = useMemo(() => {
    return ibcs.filter(ibc => ibc.centro === sedeActual);
  }, [ibcs, sedeActual]);

  const ibcsFiltrados = useMemo(() => {
    return ibcsSede.filter(ibc => 
      ibc.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (ibc.alias || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ibc.cliente || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ibcsSede, searchTerm]);

  const eliminarIBC = (id) => {
    setIbcs(prev => prev.filter(ibc => ibc.id !== id));
  };

  const handleEditIbcId = (e) => {
    e.preventDefault();
    if (!editValue || !selectedIbcId) return;
    
    setIbcs(prev => prev.map(ibc => 
      ibc.id === selectedIbcId ? { ...ibc, id: editValue.toUpperCase() } : ibc
    ));
    
    setEditValue('');
    setSelectedIbcId(null);
    setShowEditModal(false);
  };

  const exportarCSV = () => {
    const headers = ["ID IBC", "Alias/Observaciones", "Cliente", "Estado", "Centro"];
    const rows = ibcsSede.map(ibc => [ibc.id, ibc.alias || '', ibc.cliente || 'N/A', ibc.estado, ibc.centro]);
    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_IBCs_${sedeActual}_${new Date().toLocaleDateString()}.csv`);
    link.click();
  };

  const moverIBC = (id, nuevoEstado, dataAdicional = {}) => {
    const ahora = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(new Date());

    setIbcs(prev => prev.map(ibc => {
      if (ibc.id === id) {
        const nuevaUbicacion = dataAdicional.cliente || (nuevoEstado === 'En Lavadero' ? 'Lavadero Externo' : ibc.centro);
        const nuevoRegistro = { fecha: ahora, estado: nuevoEstado, ubicacion: nuevaUbicacion };
        return { 
          ...ibc, 
          estado: nuevoEstado, 
          ubicacionActual: nuevaUbicacion,
          historial: [nuevoRegistro, ...(ibc.historial || [])],
          ...dataAdicional 
        };
      }
      return ibc;
    }));
  };

  const handleAddIBC = (e) => {
    e.preventDefault();
    if (!newAlias) return;
    const nuevo = {
      id: newAlias.toUpperCase(),
      alias: '',
      estado: 'En Lavadero',
      centro: sedeActual,
      ubicacionActual: 'Lavadero Externo',
      historial: [{ fecha: new Date().toLocaleString(), estado: 'En Lavadero', ubicacion: 'Lavadero Externo' }]
    };
    setIbcs([nuevo, ...ibcs]);
    setNewAlias('');
    setShowNewModal(false);
  };

  const handleAssignClient = (e) => {
    e.preventDefault();
    if (!clientName || !selectedIbcId) return;
    moverIBC(selectedIbcId, 'En Clientes', { cliente: clientName.toUpperCase(), alias: '' });
    setClientName('');
    setSelectedIbcId(null);
    setShowClientModal(false);
  };

  const verHistorial = (ibc) => {
    setIbcEnHistorial(ibc);
    setVista('history');
  };

  // ──────────────────────────────────────────────
  // VISTA 1: SELECCIÓN DE SEDE
  // ──────────────────────────────────────────────
  if (vista === 'selection') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="mb-20">
          <img src={LOGO_URL} alt="Alianza Team" className="h-24 object-contain" />
        </div>
        <div className="text-center mb-16 px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2D8B3C] mb-4">Bienvenido a la plataforma Control de IBC´S</h1>
          <p className="text-gray-400 text-lg">Por favor, selecciona tu ubicación para continuar</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4">
          {['Planta Bogotá', 'Planta Buga', 'Planta Barranquilla'].map((nombre) => (
            <button 
              key={nombre} 
              onClick={() => entrarAlTablero(nombre)} 
              className="bg-white border-2 border-transparent rounded-3xl p-12 flex flex-col items-center justify-center shadow-lg hover:shadow-2xl hover:border-[#2D8B3C]/30 transition-all group"
            >
              <div className="mb-8 text-slate-300 group-hover:text-slate-400 transition-colors">
                <Factory size={100} strokeWidth={1} />
              </div>
              <span className="text-2xl font-bold text-slate-700">{nombre}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // VISTA: ANALYTICS (Dashboard estadístico)
  // ──────────────────────────────────────────────
  if (vista === 'analytics') {
    const totalSede = ibcsSede.length;
    const nPlanta    = ibcsSede.filter(i => i.estado === 'En Planta').length;
    const nLavadero  = ibcsSede.filter(i => i.estado === 'En Lavadero').length;
    const nClientes  = ibcsSede.filter(i => i.estado === 'En Clientes').length;
    const nAveriados = ibcsSede.filter(i => i.estado === 'Averiados').length;

    const totalCalc = totalSede || 1;
    const pPlanta    = (nPlanta    / totalCalc) * 100;
    const pLavadero  = (nLavadero  / totalCalc) * 100;
    const pClientes  = (nClientes  / totalCalc) * 100;
    const pAveriados = (nAveriados / totalCalc) * 100;

    const clientesAgrupados = {};
    ibcsSede.filter(i => i.estado === 'En Clientes').forEach(i => {
      clientesAgrupados[i.cliente] = (clientesAgrupados[i.cliente] || 0) + 1;
    });

    return (
      <div className="min-h-screen bg-[#f8f9fa] font-sans pb-10">
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="h-10 object-contain" />
            <h1 className="text-xl font-bold text-[#1a4a1d]">Dashboard de Control</h1>
          </div>
          <button onClick={() => setVista('dashboard')} className="bg-[#f0ad4e] hover:bg-[#eea236] text-white px-5 py-2 rounded-md text-sm font-bold transition-colors shadow-sm">
            Volver al Tablero
          </button>
        </header>

        <main className="max-w-[1600px] mx-auto p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Total de IBCs</p>
              <p className="text-5xl font-bold text-[#1a4a1d]">{totalSede}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">En Planta</p>
              <p className="text-5xl font-bold text-[#1a4a1d]">{nPlanta}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">En Lavadero</p>
              <p className="text-5xl font-bold text-[#1a4a1d]">{nLavadero}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">En Clientes</p>
              <p className="text-5xl font-bold text-[#1a4a1d]">{nClientes}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Averiados</p>
              <p className="text-5xl font-bold text-[#1a4a1d]">{nAveriados}</p>
            </div>
          </div>

          {/* Gráfico circular */}
          <div className="flex justify-center">
            <div className="bg-white p-10 rounded-2xl border border-gray-200 shadow-sm w-full max-w-xl flex flex-col items-center">
              <h3 className="font-bold text-slate-800 text-lg mb-6">Distribución de Estados</h3>
              <div className="flex flex-wrap justify-center gap-4 mb-8 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#2D8B3C]"></div> En Planta</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#e6ad00]"></div> En Clientes</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#4e96db]"></div> En Lavadero</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#d9534f]"></div> Averiados</div>
              </div>
              <div className="w-64 h-64 relative rounded-full overflow-hidden">
                <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90">
                  <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#2D8B3C" strokeWidth="32" strokeDasharray={`${pPlanta} 100`} strokeDashoffset="0" />
                  <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#4e96db" strokeWidth="32" strokeDasharray={`${pLavadero} 100`} strokeDashoffset={`-${pPlanta}`} />
                  <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#e6ad00" strokeWidth="32" strokeDasharray={`${pClientes} 100`} strokeDashoffset={`-${pPlanta + pLavadero}`} />
                  <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#d9534f" strokeWidth="32" strokeDasharray={`${pAveriados} 100`} strokeDashoffset={`-${pPlanta + pLavadero + pClientes}`} />
                </svg>
              </div>
            </div>
          </div>

          {/* Barras por cliente */}
          <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm w-full">
            <h3 className="font-bold text-slate-800 text-lg mb-10">IBCs por Cliente</h3>
            <div className="h-96 flex items-end justify-between gap-6 px-4 border-b border-gray-200">
              {Object.entries(clientesAgrupados).slice(0, 14).map(([name, count]) => (
                <div key={name} className="flex-1 flex flex-col items-center group relative max-w-[100px]">
                  <div className="w-full bg-[#e6ad00] hover:bg-[#c99700] transition-all rounded-t-sm" style={{ height: `${Math.max((count / totalCalc) * 350, 20)}px` }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-xl">
                      {count} IBCs
                    </div>
                  </div>
                  <div className="h-32 w-full flex items-start mt-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase rotate-[30deg] origin-top-left whitespace-nowrap block w-full text-left" title={name}>
                      {name.length > 22 ? name.substring(0, 22) + '...' : name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // VISTA: HISTORIAL
  // ──────────────────────────────────────────────
  if (vista === 'history' && ibcEnHistorial) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] font-sans animate-in fade-in duration-300">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shadow-sm">
          <img src={LOGO_URL} alt="Logo" className="h-10 object-contain" />
          <h1 className="text-2xl font-bold text-[#1a4a1d]">Historial del {ibcEnHistorial.id}</h1>
        </header>
        <main className="max-w-[1200px] mx-auto p-8">
          <button onClick={() => setVista('dashboard')} className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mb-8 transition-colors">
            ← Volver al Tablero
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm mb-10">
            <div className="space-y-2">
              <p className="text-xl font-bold text-[#2D8B3C]">ID: {ibcEnHistorial.id.replace('IBC-', '')}</p>
              <p className="text-slate-700 font-medium">Estado Actual: <span className="font-bold">{ibcEnHistorial.estado}</span></p>
              <p className="text-slate-700 font-medium">Ubicación Actual: <span className="font-bold">{ibcEnHistorial.ubicacionActual || 'No definida'}</span></p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Trazabilidad de Movimientos</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-600 font-bold">
                  <th className="px-8 py-4 text-center">Fecha y Hora</th>
                  <th className="px-8 py-4 text-center">Estado</th>
                  <th className="px-8 py-4 text-center">Ubicación / Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(ibcEnHistorial.historial || []).map((mov, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-5 text-slate-600 text-center">{mov.fecha}</td>
                    <td className="px-8 py-5 text-slate-600 text-center">{mov.estado}</td>
                    <td className="px-8 py-5 text-slate-600 text-center">{mov.ubicacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // VISTA PRINCIPAL: TABLERO KANBAN
  // ──────────────────────────────────────────────
  const columnas = [
    { id: 'En Planta',    icon: <CheckCircle size={20} className="text-[#2D8B3C]" />, bgColor: 'bg-[#eaefea]' },
    { id: 'En Lavadero',  icon: <Droplets   size={20} className="text-[#4e96db]" />, bgColor: 'bg-[#e9f1f8]' },
    { id: 'En Clientes',  icon: <Truck      size={20} className="text-[#e6ad00]" />, bgColor: 'bg-[#fdf7e9]' },
    { id: 'Averiados',    icon: <XCircle    size={20} className="text-[#d9534f]" />, bgColor: 'bg-[#f9ebeb]' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 flex flex-col lg:flex-row items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} alt="Alianza Team" className="h-10 object-contain" />
          <h1 className="text-2xl font-bold text-[#1a4a1d] border-l pl-4 border-gray-200">Tablero de Control IBC's</h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar por ID o Alias..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-4 pr-10 py-2 border border-gray-300 rounded-md text-sm w-64 lg:w-80 outline-none focus:ring-1 focus:ring-[#2D8B3C]" 
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
          <button onClick={() => setVista('analytics')} className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-5 py-2 rounded text-sm font-bold transition-colors">
            Ver Dashboard
          </button>
          <button onClick={exportarCSV} className="bg-[#f0ad4e] hover:bg-[#eea236] text-white px-5 py-2 rounded text-sm font-bold transition-colors">
            Exportar a CSV
          </button>
          <button onClick={() => setShowNewModal(true)} className="bg-[#2D8B3C] hover:bg-[#236b2e] text-white px-5 py-2 rounded text-sm font-bold transition-colors">
            + Añadir Nuevo IBC
          </button>
          <button onClick={() => setVista('selection')} className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1800px] mx-auto">
        <div className="mb-4 flex items-center gap-2 text-slate-500">
          <MapPin size={16} className="text-[#2D8B3C]" />
          <span className="font-bold">{sedeActual}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columnas.map((col) => {
            const list = ibcsFiltrados.filter(i => i.estado === col.id);
            return (
              <div key={col.id} className={`${col.bgColor} rounded-lg p-4 min-h-[75vh] border border-gray-200 shadow-sm`}>
                <div className="flex items-center gap-2 mb-6 px-1 text-slate-700">
                  <span className="bg-white/50 p-1.5 rounded-md">{col.icon}</span>
                  <h2 className="text-lg font-bold">{col.id} ({list.length})</h2>
                </div>

                <div className="space-y-4">
                  {list.map((ibc) => (
                    <div key={ibc.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-black text-[#1a4a1d]">{ibc.id}</h3>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setSelectedIbcId(ibc.id);
                              setEditValue(ibc.id);
                              setShowEditModal(true);
                            }}
                            className="text-orange-300 hover:text-orange-500 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => eliminarIBC(ibc.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {ibc.alias && <p className="text-xs text-gray-400 italic mb-2">Obs: {ibc.alias}</p>}

                      {ibc.cliente && (
                        <div className="mb-4">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cliente:</p>
                          <p className="text-sm font-black text-slate-700 leading-tight uppercase">{ibc.cliente}</p>
                        </div>
                      )}

                      <div className="space-y-2 mt-4">
                        <button 
                          onClick={() => verHistorial(ibc)} 
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-gray-50 text-slate-600 border border-gray-200 hover:bg-gray-100"
                        >
                          <History size={12} /> Ver Historial
                        </button>

                        {ibc.estado === 'En Lavadero' && (
                          <>
                            <button onClick={() => moverIBC(ibc.id, 'En Planta')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#f2faf3] text-[#2D8B3C] border border-[#2D8B3C]/20 hover:bg-[#e4f3e6]">
                              <CheckCircle size={12} /> Recibir en Planta (OK)
                            </button>
                            <button onClick={() => moverIBC(ibc.id, 'Averiados')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#fef2f2] text-[#d9534f] border border-[#d9534f]/20 hover:bg-[#fee2e2]">
                              <XCircle size={12} /> Reportar Avería
                            </button>
                          </>
                        )}

                        {ibc.estado === 'En Planta' && (
                          <>
                            <button onClick={() => { setSelectedIbcId(ibc.id); setShowClientModal(true); }} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#fffbeb] text-[#d97706] border border-[#d97706]/20 hover:bg-[#fef3c7]">
                              <Truck size={12} /> Enviar a Cliente
                            </button>
                            <button onClick={() => moverIBC(ibc.id, 'En Lavadero')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#eff6ff] text-[#2563eb] border border-[#2563eb]/20 hover:bg-[#dbeafe]">
                              <Droplets size={12} /> Enviar a Lavadero
                            </button>
                            <button onClick={() => moverIBC(ibc.id, 'Averiados')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#fef2f2] text-[#d9534f] border border-[#d9534f]/20 hover:bg-[#fee2e2]">
                              <XCircle size={12} /> Reportar Avería
                            </button>
                          </>
                        )}

                        {ibc.estado === 'En Clientes' && (
                          <>
                            <button onClick={() => moverIBC(ibc.id, 'En Lavadero', { cliente: null })} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#eff6ff] text-[#2563eb] border border-[#2563eb]/20 hover:bg-[#dbeafe]">
                              <Droplets size={12} /> Enviar a Lavadero
                            </button>
                            <button onClick={() => moverIBC(ibc.id, 'En Planta')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#f8fafc] text-slate-600 border border-slate-200 hover:bg-slate-100">
                              <Factory size={12} /> Retornar a Planta
                            </button>
                            <button onClick={() => moverIBC(ibc.id, 'Averiados')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#fef2f2] text-[#d9534f] border border-[#d9534f]/20 hover:bg-[#fee2e2]">
                              <XCircle size={12} /> Reportar Avería
                            </button>
                          </>
                        )}

                        {ibc.estado === 'Averiados' && (
                          <button onClick={() => moverIBC(ibc.id, 'En Planta')} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm bg-[#f2faf3] text-[#2D8B3C] border border-[#2D8B3C]/20 hover:bg-[#e4f3e6]">
                            <Wrench size={12} /> Marcar como Reparado
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ──────────────────────────────────────────────
          MODALES
      ────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div className="px-8 pt-10 pb-6">
              <p className="text-gray-400 text-sm mb-1 font-medium">sgt-ibc-alianzateam.web.app dice</p>
              <h2 className="text-xl font-bold text-slate-800 mb-8 leading-tight">Ingresa el alias para el nuevo IBC:</h2>
              <input 
                autoFocus 
                type="text" 
                value={newAlias} 
                onChange={(e) => setNewAlias(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddIBC(e)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-4 text-xl outline-none focus:border-[#2D8B3C] transition-colors bg-slate-50" 
              />
            </div>
            <div className="flex border-t border-slate-100 h-16">
              <button onClick={() => setShowNewModal(false)} className="flex-1 text-[#4e96db] font-bold text-lg hover:bg-slate-50 transition-colors border-r border-slate-100">
                Cancelar
              </button>
              <button onClick={handleAddIBC} className="flex-1 text-[#008080] font-bold text-lg hover:bg-slate-50 transition-colors">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {showClientModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div className="px-8 pt-10 pb-6">
              <p className="text-gray-400 text-sm mb-1 font-medium">sgt-ibc-alianzateam.web.app dice</p>
              <h2 className="text-xl font-bold text-slate-800 mb-8 leading-tight">Ingresa el nombre del cliente:</h2>
              <input 
                autoFocus 
                type="text" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAssignClient(e)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-4 text-xl outline-none focus:border-[#2D8B3C] transition-colors bg-slate-50" 
              />
            </div>
            <div className="flex border-t border-slate-100 h-16">
              <button onClick={() => { setShowClientModal(false); setClientName(''); setSelectedIbcId(null); }} className="flex-1 text-[#4e96db] font-bold text-lg hover:bg-slate-50 transition-colors border-r border-slate-100">
                Cancelar
              </button>
              <button onClick={handleAssignClient} className="flex-1 text-[#008080] font-bold text-lg hover:bg-slate-50 transition-colors">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div className="px-8 pt-10 pb-6">
              <p className="text-gray-400 text-sm mb-1 font-medium">sgt-ibc-alianzateam.web.app dice</p>
              <h2 className="text-xl font-bold text-slate-800 mb-8 leading-tight">Edita el número o identificador del IBC:</h2>
              <input 
                autoFocus 
                type="text" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleEditIbcId(e)}
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-4 text-xl outline-none focus:border-[#2D8B3C] transition-colors bg-slate-50" 
              />
            </div>
            <div className="flex border-t border-slate-100 h-16">
              <button onClick={() => { setShowEditModal(false); setEditValue(''); setSelectedIbcId(null); }} className="flex-1 text-[#4e96db] font-bold text-lg hover:bg-slate-50 transition-colors border-r border-slate-100">
                Cancelar
              </button>
              <button onClick={handleEditIbcId} className="flex-1 text-[#008080] font-bold text-lg hover:bg-slate-50 transition-colors">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}