# archivo: main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Importaciones de models
from models import IBC, IBCHistory, SessionLocal

app = FastAPI(title="SGT-IBC API", version="1.0.0")

# ... (Configuración de CORS - no cambia) ...
from fastapi.middleware.cors import CORSMiddleware
origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Modelos de Datos Pydantic ---
class IBCCreate(BaseModel):
    alias: str

class IBCUpdate(BaseModel):
    estado: Optional[str] = None
    ubicacion: Optional[str] = None
    cliente_asignado: Optional[str] = None

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
    history: List[IBCHistory_Data] = []
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
@app.get("/")
def read_root():
    return {"Proyecto": "SGT-IBC API", "Status": "Operacional"}

# ... (Endpoint GET para /api/ibcs/ - no cambia) ...
@app.get("/api/ibcs/", response_model=List[IBC_Data], summary="Obtener lista de todos los IBCs")
def obtener_todos_los_ibcs(db: Session = Depends(get_db)):
    return db.query(IBC).all()

# ... (Endpoint GET para /api/ibcs/{ibc_id} - no cambia) ...
@app.get("/api/ibcs/{ibc_id}", response_model=IBC_Data, summary="Consultar un IBC por ID")
def obtener_ibc(ibc_id: int, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    return ibc

# --- NUEVO ENDPOINT PARA OBTENER SOLO EL HISTORIAL ---
@app.get("/api/ibcs/{ibc_id}/history", response_model=List[IBCHistory_Data], summary="Obtener historial de un IBC")
def obtener_historial_ibc(ibc_id: int, db: Session = Depends(get_db)):
    history_records = db.query(IBCHistory).filter(IBCHistory.ibc_id == ibc_id).order_by(IBCHistory.timestamp.desc()).all()
    if not history_records:
        raise HTTPException(status_code=404, detail="No se encontró historial para este IBC")
    return history_records

# ... (Endpoint POST para crear - no cambia) ...
@app.post("/api/ibcs/", response_model=IBC_Data, summary="Crear un nuevo IBC")
def crear_ibc(ibc: IBCCreate, db: Session = Depends(get_db)):
    nuevo_ibc = IBC(alias=ibc.alias, estado='Disponible', ubicacion='Planta Bogotá')
    db.add(nuevo_ibc)
    db.commit()
    # Creamos el primer registro en el historial
    history_entry = IBCHistory(ibc_id=nuevo_ibc.id, estado=nuevo_ibc.estado, ubicacion=nuevo_ibc.ubicacion)
    db.add(history_entry)
    db.commit()
    db.refresh(nuevo_ibc)
    return nuevo_ibc

# --- ENDPOINT PATCH MODIFICADO PARA GUARDAR HISTORIAL ---
@app.patch("/api/ibcs/{ibc_id}", response_model=IBC_Data, summary="Actualizar un IBC")
def actualizar_ibc(ibc_id: int, ibc_update: IBCUpdate, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")

    update_data = ibc_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ibc, key, value)
    
    # Creamos el nuevo registro en el historial
    history_entry = IBCHistory(
        ibc_id=ibc.id, 
        estado=ibc.estado, 
        ubicacion=ibc.ubicacion, 
        cliente_asignado=ibc.cliente_asignado
    )
    db.add(history_entry)
    
    db.commit()
    db.refresh(ibc)
    return ibc