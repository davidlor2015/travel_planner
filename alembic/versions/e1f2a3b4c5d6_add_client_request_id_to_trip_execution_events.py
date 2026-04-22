"""add client_request_id to trip_execution_events

Revision ID: e1f2a3b4c5d6
Revises: d0a1b2c3d4e5
Create Date: 2026-04-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trip_execution_events",
        sa.Column("client_request_id", sa.String(length=64), nullable=True),
    )
    # Replays from a flaky network must collapse to the original row, but
    # legacy clients without an id must still be able to append. Partial
    # unique index on (trip_id, client_request_id) WHERE client_request_id IS
    # NOT NULL gives us both on Postgres; on SQLite the same predicate is
    # accepted via sqlite_where, and NULLs would be distinct anyway.
    op.create_index(
        "ux_trip_execution_events_trip_client_request",
        "trip_execution_events",
        ["trip_id", "client_request_id"],
        unique=True,
        postgresql_where=sa.text("client_request_id IS NOT NULL"),
        sqlite_where=sa.text("client_request_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ux_trip_execution_events_trip_client_request",
        table_name="trip_execution_events",
    )
    op.drop_column("trip_execution_events", "client_request_id")
