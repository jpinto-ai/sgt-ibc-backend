# archivo: main.py
from fastapi import FastAPI, Depends, HTTPException, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import IBC, IBCHistory, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
import io
import csv
from fastapi.responses import StreamingResponse

app = FastAPI(title="SGT-IBC API", version="1.0.0")

# --- LÓGICA PARA WEB SOCKETS ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)
manager = ConnectionManager()

# --- CONFIGURACIÓN DE CORS ---
origins = [
    "https://sgt-ibc-alianzateam.web.app",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de Datos Pydantic ---
class IBCCreate(BaseModel):
    alias: str

class IBCUpdate(BaseModel):
    estado: Optional[str] = None
    ubicacion: Optional[str] = None
    cliente_asignado: Optional[str] = None
    observaciones: Optional[str] = None # <-- ASEGÚRATE DE TENER ESTA LÍNEA

class ClientData(BaseModel):
    cliente_asignado: str
    conteo: int

class DashboardData(BaseModel):
    total_ibcs: int
    total_planta: int
    total_lavadero: int
    total_clientes: int
    total_averiados: int

class IBCHistory_Data(BaseModel):
    id: int
    estado: str
    ubicacion: str
    cliente_asignado: Optional[str] = None
    timestamp: datetime
    class Config:
        orm_mode = True

class IBC_Data(BaseModel):
    id: int
    alias: str
    estado: str
    ubicacion: str
    cliente_asignado: Optional[str] = None
    observaciones: Optional[str] = None # <-- ASEGÚRATE DE TENER ESTA LÍNEA
    class Config:
        orm_mode = True

# --- Función de Base de Datos ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Endpoints de la API ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def read_root():
    return {"Proyecto": "SGT-IBC API", "Status": "Operacional"}

@app.get("/api/ibcs/", response_model=List[IBC_Data])
def obtener_todos_los_ibcs(db: Session = Depends(get_db)):
    return db.query(IBC).all()

@app.get("/api/ibcs/{ibc_id}", response_model=IBC_Data)
def obtener_ibc(ibc_id: int, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    return ibc

@app.get("/api/ibcs/{ibc_id}/history", response_model=List[IBCHistory_Data])
def obtener_historial_ibc(ibc_id: int, db: Session = Depends(get_db)):
    history_records = db.query(IBCHistory).filter(IBCHistory.ibc_id == ibc_id).order_by(IBCHistory.timestamp.desc()).all()
    if not history_records:
        return []
    return history_records

@app.post("/api/ibcs/", response_model=IBC_Data)
async def crear_ibc(ibc: IBCCreate, db: Session = Depends(get_db)):
    nuevo_ibc = IBC(alias=ibc.alias, estado='Disponible', ubicacion='Planta Bogotá')
    db.add(nuevo_ibc)
    db.commit()
    history_entry = IBCHistory(ibc_id=nuevo_ibc.id, estado=nuevo_ibc.estado, ubicacion=nuevo_ibc.ubicacion)
    db.add(history_entry)
    db.commit()
    db.refresh(nuevo_ibc)
    await manager.broadcast("update")
    return nuevo_ibc

@app.patch("/api/ibcs/{ibc_id}", response_model=IBC_Data)
async def actualizar_ibc(ibc_id: int, ibc_update: IBCUpdate, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    update_data = ibc_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ibc, key, value)
    history_entry = IBCHistory(ibc_id=ibc.id, estado=ibc.estado, ubicacion=ibc.ubicacion, cliente_asignado=ibc.cliente_asignado)
    db.add(history_entry)
    db.commit()
    db.refresh(ibc)
    await manager.broadcast("update")
    return ibc

@app.delete("/api/ibcs/{ibc_id}", status_code=204)
async def eliminar_ibc(ibc_id: int, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    db.delete(ibc)
    db.commit()
    await manager.broadcast("update")
    return Response(status_code=204)

@app.get("/api/history/export", summary="Exportar trazabilidad global a CSV")
def exportar_trazabilidad_csv(db: Session = Depends(get_db)):
    historial = db.query(IBCHistory).order_by(IBCHistory.timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID_Registro', 'ID_IBC', 'Fecha_Hora', 'Estado', 'Ubicacion', 'Cliente_Asignado'])
    for record in historial:
        writer.writerow([
            record.id,
            record.ibc_id,
            record.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            record.estado,
            record.ubicacion,
            record.cliente_asignado
        ])
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=trazabilidad_ibc_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
    return response
# Pega este código al final de tu archivo main.py
@app.get("/api/dashboard-data", 
    response_model=DashboardData, 
    summary="Obtener datos resumidos para el Dashboard"
)
def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Calcula y devuelve los KPIs principales de la flota de IBCs.
    """
    todos_los_ibcs = db.query(IBC).all()
    
    # Hacemos los cálculos en Python para ser eficientes
    total_ibcs = len(todos_los_ibcs)
    total_planta = len([ibc for ibc in todos_los_ibcs if ibc.estado == 'Disponible'])
    total_lavadero = len([ibc for ibc in todos_los_ibcs if ibc.estado == 'En Lavado'])
    total_clientes = len([ibc for ibc in todos_los_ibcs if ibc.estado == 'En Cliente'])
    total_averiados = len([ibc for ibc in todos_los_ibcs if ibc.estado == 'Averiado'])
    
    return DashboardData(
        total_ibcs=total_ibcs,
        total_planta=total_planta,
        total_lavadero=total_lavadero,
        total_clientes=total_clientes,
        total_averiados=total_averiados
    )
@app.get("/api/dashboard-clients", response_model=List[ClientData])
def get_dashboard_clients(db: Session = Depends(get_db)):
    """Devuelve el conteo de IBCs por cliente."""
    client_data = db.query(
            IBC.cliente_asignado, 
            func.count(IBC.id).label("conteo")
        ).filter(
            IBC.estado == 'En Cliente'
        ).group_by(
            IBC.cliente_asignado
        ).all()
    
    # Convierte la respuesta a un formato JSON adecuado
    return [{"cliente_asignado": cliente, "conteo": conteo} for cliente, conteo in client_data]