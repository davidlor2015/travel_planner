"""add query performance indexes

Revision ID: 9c2d4e6f8a1b
Revises: f1a2b3c4d5e6
Create Date: 2026-04-30
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9c2d4e6f8a1b"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_trip_invites_email_status_created_at",
        "trip_invites",
        ["email", "status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_trip_invites_trip_id_email_status",
        "trip_invites",
        ["trip_id", "email", "status"],
        unique=False,
    )
    op.create_index(
        "ix_trip_execution_events_trip_kind_stop_ref_id",
        "trip_execution_events",
        ["trip_id", "kind", "stop_ref", "id"],
        unique=False,
    )
    op.create_index(
        "ix_trip_execution_events_trip_kind_day_date",
        "trip_execution_events",
        ["trip_id", "kind", "day_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_trip_execution_events_trip_kind_day_date", table_name="trip_execution_events")
    op.drop_index("ix_trip_execution_events_trip_kind_stop_ref_id", table_name="trip_execution_events")
    op.drop_index("ix_trip_invites_trip_id_email_status", table_name="trip_invites")
    op.drop_index("ix_trip_invites_email_status_created_at", table_name="trip_invites")
