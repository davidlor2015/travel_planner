"""add itinerary anchors and ownership fields

Revision ID: 1a2b3c4d5e6f
Revises: f6a7b8c9d0e1
Create Date: 2026-04-21 00:00:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OWNERSHIP_TOKEN_START = "[ownership:"
OWNERSHIP_TOKEN_END = "]"


def _normalize(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _extract_ownership_from_notes(
    notes: str | None,
) -> tuple[str | None, str | None, str | None]:
    raw = _normalize(notes)
    if not raw:
        return None, None, None

    start = raw.rfind(OWNERSHIP_TOKEN_START)
    end = len(raw) - 1 if raw.endswith(OWNERSHIP_TOKEN_END) else -1
    if start < 0 or end <= start:
        return raw, None, None

    token_body = raw[start + len(OWNERSHIP_TOKEN_START) : end].strip()
    plain_notes = _normalize(raw[:start].strip())

    handled_by: str | None = None
    booked_by: str | None = None
    for part in token_body.split(";"):
        fragment = _normalize(part)
        if not fragment or "=" not in fragment:
            continue
        key, value = fragment.split("=", 1)
        key = key.strip()
        parsed_value = _normalize(value)
        if key == "handledBy":
            handled_by = parsed_value
        if key == "bookedBy":
            booked_by = parsed_value

    return plain_notes, handled_by, booked_by


def _normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    return normalized


def upgrade() -> None:
    op.add_column(
        "itinerary_events",
        sa.Column("handled_by_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "itinerary_events",
        sa.Column("booked_by_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "itinerary_events",
        sa.Column("handled_by_legacy", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "itinerary_events",
        sa.Column("booked_by_legacy", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "itinerary_events",
        sa.Column("status", sa.String(length=20), nullable=True),
    )
    op.create_index(
        op.f("ix_itinerary_events_handled_by_user_id"),
        "itinerary_events",
        ["handled_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_itinerary_events_booked_by_user_id"),
        "itinerary_events",
        ["booked_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_itinerary_events_handled_by_user_id",
        "itinerary_events",
        "users",
        ["handled_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_itinerary_events_booked_by_user_id",
        "itinerary_events",
        "users",
        ["booked_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "itinerary_day_anchors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("day_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("anchor_type", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("time", sa.String(length=50), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("handled_by_user_id", sa.Integer(), nullable=True),
        sa.Column("booked_by_user_id", sa.Integer(), nullable=True),
        sa.Column("handled_by_legacy", sa.String(length=255), nullable=True),
        sa.Column("booked_by_legacy", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["day_id"], ["itinerary_days.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["handled_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booked_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_itinerary_day_anchors_id"), "itinerary_day_anchors", ["id"], unique=False)
    op.create_index(op.f("ix_itinerary_day_anchors_day_id"), "itinerary_day_anchors", ["day_id"], unique=False)
    op.create_index(
        op.f("ix_itinerary_day_anchors_handled_by_user_id"),
        "itinerary_day_anchors",
        ["handled_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_itinerary_day_anchors_booked_by_user_id"),
        "itinerary_day_anchors",
        ["booked_by_user_id"],
        unique=False,
    )

    bind = op.get_bind()
    memberships = bind.execute(
        sa.text(
            """
            SELECT tm.trip_id, tm.user_id, u.email
            FROM trip_memberships tm
            JOIN users u ON u.id = tm.user_id
            """
        )
    ).fetchall()
    member_map: dict[int, dict[str, int]] = {}
    for row in memberships:
        trip_id = int(row.trip_id)
        member_map.setdefault(trip_id, {})[_normalize_email(row.email) or ""] = int(row.user_id)

    events = bind.execute(
        sa.text(
            """
            SELECT e.id, e.notes, d.trip_id
            FROM itinerary_events e
            JOIN itinerary_days d ON d.id = e.day_id
            """
        )
    ).fetchall()

    for row in events:
        plain_notes, handled_by, booked_by = _extract_ownership_from_notes(row.notes)
        trip_members = member_map.get(int(row.trip_id), {})
        handled_user_id = trip_members.get(_normalize_email(handled_by) or "")
        booked_user_id = trip_members.get(_normalize_email(booked_by) or "")
        handled_legacy = None if handled_user_id else handled_by
        booked_legacy = None if booked_user_id else booked_by

        bind.execute(
            sa.text(
                """
                UPDATE itinerary_events
                SET notes = :notes,
                    handled_by_user_id = :handled_by_user_id,
                    booked_by_user_id = :booked_by_user_id,
                    handled_by_legacy = :handled_by_legacy,
                    booked_by_legacy = :booked_by_legacy
                WHERE id = :event_id
                """
            ),
            {
                "notes": plain_notes,
                "handled_by_user_id": handled_user_id,
                "booked_by_user_id": booked_user_id,
                "handled_by_legacy": handled_legacy,
                "booked_by_legacy": booked_legacy,
                "event_id": int(row.id),
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_itinerary_day_anchors_booked_by_user_id"), table_name="itinerary_day_anchors")
    op.drop_index(op.f("ix_itinerary_day_anchors_handled_by_user_id"), table_name="itinerary_day_anchors")
    op.drop_index(op.f("ix_itinerary_day_anchors_day_id"), table_name="itinerary_day_anchors")
    op.drop_index(op.f("ix_itinerary_day_anchors_id"), table_name="itinerary_day_anchors")
    op.drop_table("itinerary_day_anchors")

    op.drop_constraint("fk_itinerary_events_booked_by_user_id", "itinerary_events", type_="foreignkey")
    op.drop_constraint("fk_itinerary_events_handled_by_user_id", "itinerary_events", type_="foreignkey")
    op.drop_index(op.f("ix_itinerary_events_booked_by_user_id"), table_name="itinerary_events")
    op.drop_index(op.f("ix_itinerary_events_handled_by_user_id"), table_name="itinerary_events")
    op.drop_column("itinerary_events", "booked_by_legacy")
    op.drop_column("itinerary_events", "handled_by_legacy")
    op.drop_column("itinerary_events", "status")
    op.drop_column("itinerary_events", "booked_by_user_id")
    op.drop_column("itinerary_events", "handled_by_user_id")
