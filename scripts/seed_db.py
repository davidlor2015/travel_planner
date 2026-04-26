#!/usr/bin/env python3
"""
Seed the local development database with realistic sample data.

Creates one user and three trips covering the main status buckets:
  - active:   Tokyo trip, started yesterday, ends in 4 days
  - upcoming: Lisbon trip, starts in 3 weeks
  - past:     Barcelona trip, ended 2 months ago

Each trip includes a saved itinerary, one hotel reservation, one
packing item, and one budget expense so all workspace tabs have data.

Usage:
    python scripts/seed_db.py            # default credentials
    python scripts/seed_db.py --reset    # drop existing seed user first

Requires DATABASE_URL and JWT_SECRET in the environment (i.e. .env loaded).
"""

import argparse
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Allow importing the app from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Load .env before importing app modules.
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
import app.db.base  # noqa: F401 — registers all models
from app.db.base_class import Base
from app.models.budget_expense import BudgetExpense
from app.models.itinerary import ItineraryDay, ItineraryEvent
from app.models.packing_item import PackingItem
from app.models.reservation import Reservation
from app.models.trip import Trip
from app.models.trip_membership import TripMembership, TripMemberState
from app.models.user import User

SEED_EMAIL = "demo@waypoint.local"
SEED_PASSWORD = "waypoint-demo-2024"

TODAY = date.today()


def make_trip(
    db,
    owner: User,
    *,
    title: str,
    destination: str,
    start_delta_days: int,
    end_delta_days: int,
    description: str | None = None,
) -> Trip:
    start = TODAY + timedelta(days=start_delta_days)
    end = TODAY + timedelta(days=end_delta_days)

    trip = Trip(
        user_id=owner.id,
        title=title,
        destination=destination,
        description=description,
        start_date=start,
        end_date=end,
        is_discoverable=True,
    )
    db.add(trip)
    db.flush()

    membership = TripMembership(trip_id=trip.id, user_id=owner.id, role="owner")
    db.add(membership)
    db.flush()

    state = TripMemberState(membership_id=membership.id, budget_limit=2000.0)
    db.add(state)
    db.flush()

    return trip, state


def add_itinerary(db, trip: Trip, days: int) -> None:
    start = trip.start_date
    activities = [
        ("Morning", "Arrive and check in", "City Centre"),
        ("Afternoon", "Neighbourhood walk", "Old Town"),
        ("Evening", "Welcome dinner", "Local Restaurant"),
    ]
    for day_num in range(1, days + 1):
        day_date = start + timedelta(days=day_num - 1)
        day = ItineraryDay(
            trip_id=trip.id,
            day_number=day_num,
            day_date=str(day_date),
            day_title=f"Day {day_num}",
        )
        db.add(day)
        db.flush()

        for i, (time, title, location) in enumerate(activities):
            db.add(ItineraryEvent(
                day_id=day.id,
                sort_order=i,
                time=time,
                title=title,
                location=location,
            ))


def add_reservation(db, trip: Trip, *, title: str, provider: str) -> Reservation:
    start_dt = datetime.combine(trip.start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    res = Reservation(
        trip_id=trip.id,
        title=title,
        reservation_type="hotel",
        provider=provider,
        confirmation_code="SEED-001",
        start_at=start_dt,
        end_at=datetime.combine(trip.end_date, datetime.min.time()).replace(tzinfo=timezone.utc),
        location=trip.destination,
        amount=180.0,
        currency="USD",
    )
    db.add(res)
    db.flush()
    return res


def add_packing(db, state: TripMemberState, labels: list[str]) -> None:
    for label in labels:
        db.add(PackingItem(member_state_id=state.id, label=label, checked=False))


def add_expense(db, state: TripMemberState, *, label: str, amount: float, category: str = "other") -> None:
    db.add(BudgetExpense(member_state_id=state.id, label=label, amount=amount, category=category))


def seed(reset: bool = False) -> None:
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        if reset:
            existing = db.query(User).filter_by(email=SEED_EMAIL).first()
            if existing:
                db.delete(existing)
                db.commit()
                print(f"  Removed existing seed user: {SEED_EMAIL}")

        user = db.query(User).filter_by(email=SEED_EMAIL).first()
        if user:
            print(f"  Seed user already exists: {SEED_EMAIL}")
            print("  Run with --reset to recreate from scratch.")
            return

        user = User(
            email=SEED_EMAIL,
            display_name="Demo User",
            hashed_password=get_password_hash(SEED_PASSWORD),
            is_active=True,
            email_verified=True,
        )
        db.add(user)
        db.flush()
        print(f"  Created user: {SEED_EMAIL} / {SEED_PASSWORD}")

        # Active trip — started yesterday, ends in 4 days.
        tokyo, tokyo_state = make_trip(
            db, user,
            title="Tokyo Highlights",
            destination="Tokyo, Japan",
            start_delta_days=-1,
            end_delta_days=4,
        )
        add_itinerary(db, tokyo, days=5)
        add_reservation(db, tokyo, title="Shinjuku Hotel", provider="Booking.com")
        add_packing(db, tokyo_state, ["Passport", "JR Pass", "Portable charger", "Rain jacket"])
        add_expense(db, tokyo_state, label="Hotel (5 nights)", amount=900.0)
        print(f"  Created active trip: {tokyo.title} ({tokyo.start_date} – {tokyo.end_date})")

        # Upcoming trip — starts in 3 weeks.
        lisbon, lisbon_state = make_trip(
            db, user,
            title="Lisbon Long Weekend",
            destination="Lisbon, Portugal",
            start_delta_days=21,
            end_delta_days=25,
        )
        add_itinerary(db, lisbon, days=4)
        add_reservation(db, lisbon, title="Alfama Boutique Hotel", provider="Hotels.com")
        add_packing(db, lisbon_state, ["EU power adapter", "Sunscreen", "Comfortable shoes"])
        add_expense(db, lisbon_state, label="Flights (return)", amount=340.0)
        print(f"  Created upcoming trip: {lisbon.title} ({lisbon.start_date} – {lisbon.end_date})")

        # Past trip — ended 2 months ago.
        barcelona, barcelona_state = make_trip(
            db, user,
            title="Barcelona City Break",
            destination="Barcelona, Spain",
            start_delta_days=-65,
            end_delta_days=-61,
        )
        add_itinerary(db, barcelona, days=4)
        add_reservation(db, barcelona, title="Eixample Hotel", provider="Expedia")
        add_packing(db, barcelona_state, ["Guidebook", "Sunglasses"])
        add_expense(db, barcelona_state, label="Hotel (4 nights)", amount=640.0)
        print(f"  Created past trip: {barcelona.title} ({barcelona.start_date} – {barcelona.end_date})")

        db.commit()
        print("\n  Seed complete.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the Waypoint local development database.")
    parser.add_argument("--reset", action="store_true", help="Delete existing seed user before seeding.")
    args = parser.parse_args()

    print("\nSeeding database...")
    seed(reset=args.reset)
