"""add prep_items table

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prep_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("prep_type", sa.String(length=50), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_prep_items_id"), "prep_items", ["id"], unique=False)
    op.create_index(op.f("ix_prep_items_trip_id"), "prep_items", ["trip_id"], unique=False)
    op.create_index(op.f("ix_prep_items_prep_type"), "prep_items", ["prep_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_prep_items_prep_type"), table_name="prep_items")
    op.drop_index(op.f("ix_prep_items_trip_id"), table_name="prep_items")
    op.drop_index(op.f("ix_prep_items_id"), table_name="prep_items")
    op.drop_table("prep_items")
