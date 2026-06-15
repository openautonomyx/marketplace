"""banking domain models (generated from datasets/banking/schema.sql)."""
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
class Branches:
    id: int
    name: str
    city: str
    country: str

    _fields = {"id": "int", "name": "str", "city": "str", "country": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Branches":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Customers:
    id: int
    name: str
    email: str
    branch_id: int
    created_at: str

    _fields = {"id": "int", "name": "str", "email": "str", "branch_id": "int", "created_at": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Customers":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Accounts:
    id: int
    customer_id: int
    type: str
    currency: str
    balance: float
    opened_at: str

    _fields = {"id": "int", "customer_id": "int", "type": "str", "currency": "str", "balance": "float", "opened_at": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Accounts":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Transactions:
    id: int
    account_id: int
    ts: str
    amount: float
    kind: str
    description: Optional[str] = None

    _fields = {"id": "int", "account_id": "int", "ts": "str", "amount": "float", "kind": "str", "description": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Transactions":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})

