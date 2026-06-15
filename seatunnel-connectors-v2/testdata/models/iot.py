"""iot domain models (generated from datasets/iot/schema.sql)."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


def _coerce(v, t):
    if v is None or v == "": return None
    if t == "int": return int(v)
    if t == "float": return float(v)
    if t == "bool": return str(v).strip().lower() in ("true", "1", "t", "yes")
    return v


@dataclass
class Sites:
    id: int
    name: str
    city: str
    country: str

    _fields = {"id": "int", "name": "str", "city": "str", "country": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Sites":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Devices:
    id: int
    site_id: int
    model: str
    firmware: str
    installed_at: str

    _fields = {"id": "int", "site_id": "int", "model": "str", "firmware": "str", "installed_at": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Devices":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Sensors:
    id: int
    device_id: int
    metric: str
    unit: str

    _fields = {"id": "int", "device_id": "int", "metric": "str", "unit": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Sensors":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Readings:
    id: int
    sensor_id: int
    ts: str
    value: float

    _fields = {"id": "int", "sensor_id": "int", "ts": "str", "value": "float"}

    @classmethod
    def from_dict(cls, d: dict) -> "Readings":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})

