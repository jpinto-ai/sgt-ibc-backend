import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

# Lee la URL de la base de datos desde el entorno (Render) o usa la local.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://postgres:0714a@localhost/sgt_ibc_db"
)

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
    observaciones = Column(String, nullable=True)
    fecha_ultimo_movimiento = Column(DateTime(timezone=True), server_default=func.now(), onupdate=datetime.datetime.now)
    history = relationship("IBCHistory", backref="ibc", cascade="all, delete-orphan")

# --- LÍNEA CLAVE AÑADIDA ---
# Aseguramos que la URL de Render use 'postgresql://' que es lo que SQLAlchemy espera.
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)