# archivo: main.py
from fastapi import FastAPI, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from models import IBC, IBCHistory, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
import io
import csv
from fastapi.responses import StreamingResponse

app = FastAPI(title="SGT-IBC API", version="1.0.0")

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

@app.get("/api/ibcs/", response_model=List[IBC_Data], summary="Obtener lista de todos los IBCs")
def obtener_todos_los_ibcs(db: Session = Depends(get_db)):
    return db.query(IBC).all()

@app.get("/api/ibcs/{ibc_id}", response_model=IBC_Data, summary="Consultar un IBC por ID")
def obtener_ibc(ibc_id: int, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    return ibc

@app.get("/api/ibcs/{ibc_id}/history", response_model=List[IBCHistory_Data], summary="Obtener historial de un IBC")
def obtener_historial_ibc(ibc_id: int, db: Session = Depends(get_db)):
    history_records = db.query(IBCHistory).filter(IBCHistory.ibc_id == ibc_id).order_by(IBCHistory.timestamp.desc()).all()
    if not history_records:
        return []
    return history_records

@app.post("/api/ibcs/", response_model=IBC_Data, summary="Crear un nuevo IBC")
def crear_ibc(ibc: IBCCreate, db: Session = Depends(get_db)):
    nuevo_ibc = IBC(alias=ibc.alias, estado='Disponible', ubicacion='Planta Bogotá')
    db.add(nuevo_ibc)
    db.commit()
    history_entry = IBCHistory(ibc_id=nuevo_ibc.id, estado=nuevo_ibc.estado, ubicacion=nuevo_ibc.ubicacion)
    db.add(history_entry)
    db.commit()
    db.refresh(nuevo_ibc)
    return nuevo_ibc

@app.patch("/api/ibcs/{ibc_id}", response_model=IBC_Data, summary="Actualizar un IBC")
def actualizar_ibc(ibc_id: int, ibc_update: IBCUpdate, db: Session = Depends(get_db)):
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
    return ibc

@app.delete("/api/ibcs/{ibc_id}", summary="Eliminar un IBC", status_code=204)
def eliminar_ibc(ibc_id: int, db: Session = Depends(get_db)):
    ibc = db.query(IBC).filter(IBC.id == ibc_id).first()
    if ibc is None:
        raise HTTPException(status_code=404, detail="IBC no encontrado")
    db.delete(ibc)
    db.commit()
    return Response(status_code=204)
    
@app.get("/api/history/all", response_model=List[IBCHistory_Data], summary="Obtener trazabilidad global")
def obtener_trazabilidad_global(db: Session = Depends(get_db)):
    historial_completo = db.query(IBCHistory).order_by(IBCHistory.timestamp.desc()).all()
    return historial_completo

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