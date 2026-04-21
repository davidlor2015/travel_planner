"""add workspace last seen fields to trip_member_states

Revision ID: c7d8e9f0a1b2
Revises: b4c5d6e7f8a9
Create Date: 2026-04-21 14:25:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trip_member_states",
        sa.Column("workspace_last_seen_signature", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "trip_member_states",
        sa.Column("workspace_last_seen_snapshot", sa.Text(), nullable=True),
    )
    op.add_column(
        "trip_member_states",
        sa.Column("workspace_last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trip_member_states", "workspace_last_seen_at")
    op.drop_column("trip_member_states", "workspace_last_seen_snapshot")
    op.drop_column("trip_member_states", "workspace_last_seen_signature")
