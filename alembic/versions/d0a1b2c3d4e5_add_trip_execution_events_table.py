"""add trip_execution_events table

Revision ID: d0a1b2c3d4e5
Revises: c7d8e9f0a1b2
Create Date: 2026-04-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_execution_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("stop_ref", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("day_date", sa.Date(), nullable=True),
        sa.Column("time", sa.String(length=50), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_trip_execution_events_id"), "trip_execution_events", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_trip_execution_events_trip_id"),
        "trip_execution_events",
        ["trip_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_trip_execution_events_created_by_user_id"),
        "trip_execution_events",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_trip_execution_events_created_at"),
        "trip_execution_events",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_trip_execution_events_kind"),
        "trip_execution_events",
        ["kind"],
        unique=False,
    )
    op.create_index(
        op.f("ix_trip_execution_events_stop_ref"),
        "trip_execution_events",
        ["stop_ref"],
        unique=False,
    )
    op.create_index(
        "ix_trip_execution_events_trip_stop_created",
        "trip_execution_events",
        ["trip_id", "stop_ref", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_trip_execution_events_trip_stop_created", table_name="trip_execution_events")
    op.drop_index(op.f("ix_trip_execution_events_stop_ref"), table_name="trip_execution_events")
    op.drop_index(op.f("ix_trip_execution_events_kind"), table_name="trip_execution_events")
    op.drop_index(op.f("ix_trip_execution_events_created_at"), table_name="trip_execution_events")
    op.drop_index(
        op.f("ix_trip_execution_events_created_by_user_id"), table_name="trip_execution_events"
    )
    op.drop_index(op.f("ix_trip_execution_events_trip_id"), table_name="trip_execution_events")
    op.drop_index(op.f("ix_trip_execution_events_id"), table_name="trip_execution_events")
    op.drop_table("trip_execution_events")
