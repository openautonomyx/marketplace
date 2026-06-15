"""healthcare domain models (generated from datasets/healthcare/schema.sql)."""
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
class Patients:
    id: int
    name: str
    birth_date: str
    gender: str
    country: str

    _fields = {"id": "int", "name": "str", "birth_date": "str", "gender": "str", "country": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Patients":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Providers:
    id: int
    name: str
    specialty: str

    _fields = {"id": "int", "name": "str", "specialty": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Providers":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Encounters:
    id: int
    patient_id: int
    provider_id: int
    encounter_date: str
    type: str
    status: str

    _fields = {"id": "int", "patient_id": "int", "provider_id": "int", "encounter_date": "str", "type": "str", "status": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Encounters":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Prescriptions:
    id: int
    encounter_id: int
    drug: str
    dosage: str
    days_supply: int

    _fields = {"id": "int", "encounter_id": "int", "drug": "str", "dosage": "str", "days_supply": "int"}

    @classmethod
    def from_dict(cls, d: dict) -> "Prescriptions":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})

