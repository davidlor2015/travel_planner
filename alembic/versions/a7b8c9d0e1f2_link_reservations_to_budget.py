"""link reservations to budget expenses

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("budget_expenses", sa.Column("reservation_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_budget_expenses_reservation_id"), "budget_expenses", ["reservation_id"], unique=True)
    op.create_foreign_key(
        "fk_budget_expenses_reservation_id_reservations",
        "budget_expenses",
        "reservations",
        ["reservation_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_budget_expenses_reservation_id_reservations", "budget_expenses", type_="foreignkey")
    op.drop_index(op.f("ix_budget_expenses_reservation_id"), table_name="budget_expenses")
    op.drop_column("budget_expenses", "reservation_id")
