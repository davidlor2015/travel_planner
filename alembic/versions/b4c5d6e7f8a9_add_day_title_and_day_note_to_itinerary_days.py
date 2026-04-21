"""add day title and day note to itinerary_days

Revision ID: b4c5d6e7f8a9
Revises: aa01b181c024
Create Date: 2026-04-21 13:10:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "aa01b181c024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "itinerary_days",
        sa.Column("day_title", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "itinerary_days",
        sa.Column("day_note", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("itinerary_days", "day_note")
    op.drop_column("itinerary_days", "day_title")
