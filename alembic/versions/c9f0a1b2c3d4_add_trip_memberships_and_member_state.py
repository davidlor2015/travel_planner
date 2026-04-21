"""add trip memberships and member state

Revision ID: c9f0a1b2c3d4
Revises: b8c9d0e1f2a3
Create Date: 2026-04-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9f0a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_memberships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("added_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "user_id", name="uq_trip_memberships_trip_user"),
    )
    op.create_index(op.f("ix_trip_memberships_id"), "trip_memberships", ["id"], unique=False)
    op.create_index(op.f("ix_trip_memberships_trip_id"), "trip_memberships", ["trip_id"], unique=False)
    op.create_index(op.f("ix_trip_memberships_user_id"), "trip_memberships", ["user_id"], unique=False)

    op.create_table(
        "trip_member_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("membership_id", sa.Integer(), nullable=False),
        sa.Column("budget_limit", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["membership_id"], ["trip_memberships.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("membership_id"),
    )
    op.create_index(op.f("ix_trip_member_states_id"), "trip_member_states", ["id"], unique=False)
    op.create_index(op.f("ix_trip_member_states_membership_id"), "trip_member_states", ["membership_id"], unique=True)

    op.execute(
        """
        INSERT INTO trip_memberships (trip_id, user_id, role, added_by_user_id)
        SELECT id, user_id, 'owner', user_id
        FROM trips
        """
    )
    op.execute(
        """
        INSERT INTO trip_member_states (membership_id, budget_limit)
        SELECT tm.id, t.budget_limit
        FROM trip_memberships tm
        JOIN trips t ON t.id = tm.trip_id
        """
    )

    with op.batch_alter_table("packing_items") as batch_op:
        batch_op.add_column(sa.Column("member_state_id", sa.Integer(), nullable=True))

    with op.batch_alter_table("budget_expenses") as batch_op:
        batch_op.add_column(sa.Column("member_state_id", sa.Integer(), nullable=True))

    with op.batch_alter_table("prep_items") as batch_op:
        batch_op.add_column(sa.Column("member_state_id", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE packing_items
        SET member_state_id = (
            SELECT tms.id
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            JOIN trips t ON t.id = tm.trip_id
            WHERE t.id = packing_items.trip_id
              AND tm.user_id = t.user_id
            LIMIT 1
        )
        """
    )
    op.execute(
        """
        UPDATE budget_expenses
        SET member_state_id = (
            SELECT tms.id
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            JOIN trips t ON t.id = tm.trip_id
            WHERE t.id = budget_expenses.trip_id
              AND tm.user_id = t.user_id
            LIMIT 1
        )
        """
    )
    op.execute(
        """
        UPDATE prep_items
        SET member_state_id = (
            SELECT tms.id
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            JOIN trips t ON t.id = tm.trip_id
            WHERE t.id = prep_items.trip_id
              AND tm.user_id = t.user_id
            LIMIT 1
        )
        """
    )

    with op.batch_alter_table("packing_items") as batch_op:
        batch_op.drop_index(op.f("ix_packing_items_trip_id"))
        batch_op.create_index(op.f("ix_packing_items_member_state_id"), ["member_state_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_packing_items_member_state_id_trip_member_states",
            "trip_member_states",
            ["member_state_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.alter_column("member_state_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("trip_id")

    with op.batch_alter_table("budget_expenses") as batch_op:
        batch_op.drop_constraint("fk_budget_expenses_reservation_id_reservations", type_="foreignkey")
        batch_op.drop_index(op.f("ix_budget_expenses_trip_id"))
        batch_op.drop_index(op.f("ix_budget_expenses_reservation_id"))
        batch_op.create_index(op.f("ix_budget_expenses_member_state_id"), ["member_state_id"], unique=False)
        batch_op.create_index(op.f("ix_budget_expenses_reservation_id"), ["reservation_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_budget_expenses_member_state_id_trip_member_states",
            "trip_member_states",
            ["member_state_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "fk_budget_expenses_reservation_id_reservations",
            "reservations",
            ["reservation_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_unique_constraint(
            "uq_budget_expenses_member_state_reservation",
            ["member_state_id", "reservation_id"],
        )
        batch_op.alter_column("member_state_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("trip_id")

    with op.batch_alter_table("prep_items") as batch_op:
        batch_op.drop_index(op.f("ix_prep_items_trip_id"))
        batch_op.create_index(op.f("ix_prep_items_member_state_id"), ["member_state_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_prep_items_member_state_id_trip_member_states",
            "trip_member_states",
            ["member_state_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.alter_column("member_state_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("trip_id")

    with op.batch_alter_table("trips") as batch_op:
        batch_op.drop_column("budget_limit")


def downgrade() -> None:
    with op.batch_alter_table("trips") as batch_op:
        batch_op.add_column(sa.Column("budget_limit", sa.Float(), nullable=True))

    with op.batch_alter_table("prep_items") as batch_op:
        batch_op.add_column(sa.Column("trip_id", sa.Integer(), nullable=True))

    with op.batch_alter_table("budget_expenses") as batch_op:
        batch_op.add_column(sa.Column("trip_id", sa.Integer(), nullable=True))

    with op.batch_alter_table("packing_items") as batch_op:
        batch_op.add_column(sa.Column("trip_id", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE trips
        SET budget_limit = (
            SELECT tms.budget_limit
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            WHERE tm.trip_id = trips.id
              AND tm.role = 'owner'
            LIMIT 1
        )
        """
    )
    op.execute(
        """
        UPDATE packing_items
        SET trip_id = (
            SELECT tm.trip_id
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            WHERE tms.id = packing_items.member_state_id
            LIMIT 1
        )
        """
    )
    op.execute(
        """
        UPDATE budget_expenses
        SET trip_id = (
            SELECT tm.trip_id
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            WHERE tms.id = budget_expenses.member_state_id
            LIMIT 1
        )
        """
    )
    op.execute(
        """
        UPDATE prep_items
        SET trip_id = (
            SELECT tm.trip_id
            FROM trip_member_states tms
            JOIN trip_memberships tm ON tm.id = tms.membership_id
            WHERE tms.id = prep_items.member_state_id
            LIMIT 1
        )
        """
    )

    with op.batch_alter_table("packing_items") as batch_op:
        batch_op.drop_constraint("fk_packing_items_member_state_id_trip_member_states", type_="foreignkey")
        batch_op.drop_index(op.f("ix_packing_items_member_state_id"))
        batch_op.create_index(op.f("ix_packing_items_trip_id"), ["trip_id"], unique=False)
        batch_op.create_foreign_key(
            None,
            "trips",
            ["trip_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.alter_column("trip_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("member_state_id")

    with op.batch_alter_table("budget_expenses") as batch_op:
        batch_op.drop_constraint("uq_budget_expenses_member_state_reservation", type_="unique")
        batch_op.drop_constraint("fk_budget_expenses_member_state_id_trip_member_states", type_="foreignkey")
        batch_op.drop_constraint("fk_budget_expenses_reservation_id_reservations", type_="foreignkey")
        batch_op.drop_index(op.f("ix_budget_expenses_member_state_id"))
        batch_op.drop_index(op.f("ix_budget_expenses_reservation_id"))
        batch_op.create_index(op.f("ix_budget_expenses_trip_id"), ["trip_id"], unique=False)
        batch_op.create_index(op.f("ix_budget_expenses_reservation_id"), ["reservation_id"], unique=True)
        batch_op.create_foreign_key(
            None,
            "trips",
            ["trip_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "fk_budget_expenses_reservation_id_reservations",
            "reservations",
            ["reservation_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.alter_column("trip_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("member_state_id")

    with op.batch_alter_table("prep_items") as batch_op:
        batch_op.drop_constraint("fk_prep_items_member_state_id_trip_member_states", type_="foreignkey")
        batch_op.drop_index(op.f("ix_prep_items_member_state_id"))
        batch_op.create_index(op.f("ix_prep_items_trip_id"), ["trip_id"], unique=False)
        batch_op.create_foreign_key(
            None,
            "trips",
            ["trip_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.alter_column("trip_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("member_state_id")

    op.drop_index(op.f("ix_trip_member_states_membership_id"), table_name="trip_member_states")
    op.drop_index(op.f("ix_trip_member_states_id"), table_name="trip_member_states")
    op.drop_table("trip_member_states")

    op.drop_index(op.f("ix_trip_memberships_user_id"), table_name="trip_memberships")
    op.drop_index(op.f("ix_trip_memberships_trip_id"), table_name="trip_memberships")
    op.drop_index(op.f("ix_trip_memberships_id"), table_name="trip_memberships")
    op.drop_table("trip_memberships")
