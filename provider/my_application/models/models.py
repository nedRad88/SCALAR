from sqlalchemy import Column, DateTime, String, Integer, ForeignKey, func
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Competition(Base):
    
    __tablename__ = 'competitions'
    competition_id = Column(Integer, primary_key=True)
    name = Column(String)
    file_path = Column(String)
    batch_size = Column(Integer)
    time_interval = Column(Integer)
    start_date = Column(DateTime)
    end_date = Column(DateTime)

    
    
    
