"""ecommerce domain models (generated from datasets/ecommerce/schema.sql)."""
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
class Customers:
    id: int
    name: str
    email: str
    country: str
    created_at: str

    _fields = {"id": "int", "name": "str", "email": "str", "country": "str", "created_at": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Customers":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Products:
    id: int
    sku: str
    name: str
    category: str
    price: float
    in_stock: bool

    _fields = {"id": "int", "sku": "str", "name": "str", "category": "str", "price": "float", "in_stock": "bool"}

    @classmethod
    def from_dict(cls, d: dict) -> "Products":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Orders:
    id: int
    customer_id: int
    status: str
    order_date: str
    total: float

    _fields = {"id": "int", "customer_id": "int", "status": "str", "order_date": "str", "total": "float"}

    @classmethod
    def from_dict(cls, d: dict) -> "Orders":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class OrderItems:
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: float

    _fields = {"id": "int", "order_id": "int", "product_id": "int", "quantity": "int", "unit_price": "float"}

    @classmethod
    def from_dict(cls, d: dict) -> "OrderItems":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})

