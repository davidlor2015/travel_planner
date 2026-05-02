"""add reservations trip/start/created index

Revision ID: ac4d8e2f7b31
Revises: 9c2d4e6f8a1b
Create Date: 2026-04-30
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "ac4d8e2f7b31"
down_revision: Union[str, Sequence[str], None] = "9c2d4e6f8a1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_reservations_trip_id_start_at_created_at",
        "reservations",
        ["trip_id", "start_at", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_reservations_trip_id_start_at_created_at", table_name="reservations")
