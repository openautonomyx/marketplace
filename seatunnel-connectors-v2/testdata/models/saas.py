"""saas domain models (generated from datasets/saas/schema.sql)."""
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
class Accounts:
    id: int
    name: str
    plan: str
    country: str
    created_at: str

    _fields = {"id": "int", "name": "str", "plan": "str", "country": "str", "created_at": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Accounts":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Users:
    id: int
    account_id: int
    email: str
    role: str
    active: bool

    _fields = {"id": "int", "account_id": "int", "email": "str", "role": "str", "active": "bool"}

    @classmethod
    def from_dict(cls, d: dict) -> "Users":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Subscriptions:
    id: int
    account_id: int
    plan: str
    status: str
    started_at: str
    mrr: float

    _fields = {"id": "int", "account_id": "int", "plan": "str", "status": "str", "started_at": "str", "mrr": "float"}

    @classmethod
    def from_dict(cls, d: dict) -> "Subscriptions":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Invoices:
    id: int
    subscription_id: int
    issued_at: str
    amount: float
    paid: bool

    _fields = {"id": "int", "subscription_id": "int", "issued_at": "str", "amount": "float", "paid": "bool"}

    @classmethod
    def from_dict(cls, d: dict) -> "Invoices":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})

