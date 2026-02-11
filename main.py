from fastapi import FastAPI, Depends, HTTPException, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import IBC, IBCHistory, SessionLocal # Asegúrate que models.py tenga la relación 'historial'
from fastapi.middleware.cors import CORSMiddleware
import io
import csv
from fastapi.responses import StreamingResponse

app = FastAPI(title="SGT-IBC API", version="1.0.0")

# --- CONFIGURACIÓN DE CORS ---
origins = [
    "https://sgt-ibc-alianzateam.web.app",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de Datos Pydantic ---

class IBCHistory_Data(BaseModel):
    id: int
    estado: str
    ubicacion: str
    cliente_asignado: Optional[str] = "-"
    timestamp: datetime
    class Config:
        from_attributes = True

class IBC_Data(BaseModel):
    id: int
    alias: Optional[str] = "-"
    estado: Optional[str] = "En Planta"
    ubicacion: Optional[str] = "-"
    centro: Optional[str] = "Planta Bogotá"
    cliente_asignado: Optional[str] = "-"
    observaciones: Optional[str] = "-"
    # Esta línea es la que traerá el historial automáticamente si está configurada en models.py
    historial: List[IBCHistory_Data] = [] 

    class Config:
        from_attributes = True

# Modelos auxiliares para creación y Dashboard
class IBCCreate(BaseModel):
    alias: str
    centro: Optional[str] = "Planta Bogotá"

class IBCUpdate(BaseModel):
    estado: Optional[str] = None
    ubicacion: Optional[str] = None
    cliente_asignado: Optional[str] = None
    observaciones: Optional[str] = None

class ClientData(BaseModel):
    cliente_asignado: str
    conteo: int

class DashboardData(BaseModel):
    total_ibcs: int
    total_planta: int
    total_lavadero: int
    total_clientes: int
    total_averiados: int

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Endpoints de la API ---

@app.get("/")
def read_root():
    return {"Proyecto": "SGT-IBC API", "Status": "Operacional"}

@app.get("/api/ibcs/", response_model=List[IBC_Data])
def obtener_todos_los_ibcs(db: Session = Depends(get_db)):
    # Traemos los IBCs. Si en models.py definiste relationship("IBCHistory"), traerá el historial.
    return db.query(IBC).all()

@app.get("/api/ibcs/{ibc_id}", response_model=IBC_Data)
def obtener_ibc(ibc_id: int, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    return ibc

@app.post("/api/ibcs/", response_model=IBC_Data)
async def crear_ibc(ibc: IBCCreate, db: Session = Depends(get_db)):
    nuevo_ibc = IBC(alias=ibc.alias, estado='En Planta', ubicacion='Planta Bogotá', centro=ibc.centro)
    db.add(nuevo_ibc)
    db.commit()
    db.refresh(nuevo_ibc)
    # Registrar primer historial
    history_entry = IBCHistory(ibc_id=nuevo_ibc.id, estado=nuevo_ibc.estado, ubicacion=nuevo_ibc.ubicacion)
    db.add(history_entry)
    db.commit()
    await manager.broadcast("update")
    return nuevo_ibc

@app.patch("/api/ibcs/{ibc_id}", response_model=IBC_Data)
async def actualizar_ibc(ibc_id: int, ibc_update: IBCUpdate, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if not ibc:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    
    for key, value in ibc_update.dict(exclude_unset=True).items():
        setattr(ibc, key, value)
    
    history_entry = IBCHistory(ibc_id=ibc.id, estado=ibc.estado, ubicacion=ibc.ubicacion, cliente_asignado=ibc.cliente_asignado)
    db.add(history_entry)
    db.commit()
    db.refresh(ibc)
    await manager.broadcast("update")
    return ibc

@app.get("/api/dashboard-data", response_model=DashboardData)
def get_dashboard_data(db: Session = Depends(get_db)):
    ibcs = db.query(IBC).all()
    return DashboardData(
        total_ibcs=len(ibcs),
        total_planta=len([i for i in ibcs if i.estado == 'En Planta']),
        total_lavadero=len([i for i in ibcs if i.estado == 'En Lavadero']),
        total_clientes=len([i for i in ibcs if i.estado == 'En Clientes']),
        total_averiados=len([i for i in ibcs if i.estado == 'Averiados'])
    )

# El resto de tus rutas (Exportar CSV, etc) pueden seguir igual...