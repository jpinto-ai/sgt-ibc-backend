# archivo: models.py
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import datetime

DATABASE_URL = "postgresql://sgt_ibc_db_user:zXl6TIGg7ygymGPDmInJmAeEFSWdlMpU@dpg-d2qh1jfdiees73d07uhg-a.oregon-postgres.render.com/sgt_ibc_db" # ¡Recuerda usar tu contraseña!

Base = declarative_base()

class IBCHistory(Base):
    __tablename__ = 'ibc_history'
    id = Column(Integer, primary_key=True, index=True)
    ibc_id = Column(Integer, ForeignKey('ibcs.id'), nullable=False)
    estado = Column(String)
    ubicacion = Column(String)
    cliente_asignado = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class IBC(Base):
    __tablename__ = 'ibcs'
    id = Column(Integer, primary_key=True, index=True)
    alias = Column(String, index=True)
    estado = Column(String, default="Disponible", nullable=False)
    ubicacion = Column(String, default="Planta Bogotá", nullable=False)
    cliente_asignado = Column(String, nullable=True)
    fecha_ultimo_movimiento = Column(DateTime(timezone=True), server_default=func.now(), onupdate=datetime.datetime.now)
    
    # Relación para acceder al historial desde un IBC
    history = relationship("IBCHistory", backref="ibc")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)