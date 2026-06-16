"""marketing domain models (generated from datasets/marketing/schema.sql)."""
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
class Campaigns:
    id: int
    name: str
    channel: str
    start_date: str
    end_date: str
    budget: float

    _fields = {"id": "int", "name": "str", "channel": "str", "start_date": "str", "end_date": "str", "budget": "float"}

    @classmethod
    def from_dict(cls, d: dict) -> "Campaigns":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class Leads:
    id: int
    name: str
    email: str
    source: str
    country: str
    status: str
    created_at: str

    _fields = {"id": "int", "name": "str", "email": "str", "source": "str", "country": "str", "status": "str", "created_at": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "Leads":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class EmailEvents:
    id: int
    campaign_id: int
    lead_id: int
    event_type: str
    ts: str

    _fields = {"id": "int", "campaign_id": "int", "lead_id": "int", "event_type": "str", "ts": "str"}

    @classmethod
    def from_dict(cls, d: dict) -> "EmailEvents":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class WebSessions:
    id: int
    lead_id: int
    ts: str
    source: str
    medium: str
    pageviews: int
    duration_sec: int

    _fields = {"id": "int", "lead_id": "int", "ts": "str", "source": "str", "medium": "str", "pageviews": "int", "duration_sec": "int"}

    @classmethod
    def from_dict(cls, d: dict) -> "WebSessions":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})


@dataclass
class AdSpend:
    id: int
    campaign_id: int
    spend_date: str
    impressions: int
    clicks: int
    spend: float

    _fields = {"id": "int", "campaign_id": "int", "spend_date": "str", "impressions": "int", "clicks": "int", "spend": "float"}

    @classmethod
    def from_dict(cls, d: dict) -> "AdSpend":
        return cls(**{k: _coerce(d.get(k), t) for k, t in cls._fields.items()})

