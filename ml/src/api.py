"""FastAPI service. Run from ml/:  uvicorn src.api:app --host 127.0.0.1 --port 5000"""
from __future__ import annotations
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from .predictor import ModelNotTrained, Predictor

state = {"p": None}


@asynccontextmanager
async def lifespan(_app):
    state["p"] = Predictor()
    yield


app = FastAPI(title="AeroNex ML Service", version="2.0.0", lifespan=lifespan)


class PredictIn(BaseModel):
    arrival_delay_min: Optional[float] = Field(None, ge=-120, le=1440, description="Observed/reported delay of the incoming flight")
    connection_time_min: float = Field(..., ge=0, le=1440)
    gate_walk_min: Optional[float] = Field(None, ge=0, le=120)
    security_time_min: Optional[float] = Field(None, ge=0, le=240)
    immigration_time_min: Optional[float] = Field(None, ge=0, le=480)
    boarding_cutoff_min: Optional[float] = Field(None, ge=0, le=180)
    deplaning_min: Optional[float] = Field(None, ge=0, le=120)
    gate_change: Optional[int] = Field(None, ge=0, le=1)
    terminal_change: Optional[int] = Field(None, ge=0, le=1)
    weather_risk: Optional[float] = Field(None, ge=0, le=1)
    airport_congestion: Optional[float] = Field(None, ge=0, le=1)
    hour_of_day: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    connection_airport: Optional[str] = Field(None, max_length=3)
    # only used to ESTIMATE arrival delay when it is not provided and the delay model exists
    airline: Optional[str] = None
    origin_airport: Optional[str] = None
    destination_airport: Optional[str] = None
    month: Optional[int] = Field(None, ge=1, le=12)


class BatchIn(BaseModel):
    items: list[PredictIn] = Field(..., max_length=500)


def _p() -> Predictor:
    return state["p"] or Predictor()


class OperationalIn(BaseModel):
    airline: Optional[str] = "Air India"
    origin: Optional[str] = "MAA"
    destination: Optional[str] = "DEL"
    distance_km: Optional[float] = 1760.0
    hour_of_day: Optional[int] = 11
    minute_of_hour: Optional[int] = 35
    month: Optional[int] = 10
    day_of_week: Optional[int] = 2
    day_of_month: Optional[int] = 15


@app.get("/health")
def health():
    return _p().health()


@app.get("/model/info")
def model_info():
    return _p().info()


@app.post("/predict")
def predict(x: PredictIn):
    try:
        return _p().predict(x.model_dump())
    except ModelNotTrained:
        raise HTTPException(503, detail={"status": "MODEL NOT TRAINED", "detail": "Train the model first (see ml/SETUP.md)."})
    except ValueError as e:
        raise HTTPException(422, detail=str(e))


@app.post("/predict/operational")
def predict_operational(x: OperationalIn):
    try:
        return _p().predict_operational(x.model_dump())
    except Exception as e:
        raise HTTPException(500, detail=str(e))


@app.post("/batch-predict")
def batch_predict(b: BatchIn):
    try:
        return {"results": _p().predict_batch([i.model_dump() for i in b.items])}
    except ModelNotTrained:
        raise HTTPException(503, detail={"status": "MODEL NOT TRAINED"})
