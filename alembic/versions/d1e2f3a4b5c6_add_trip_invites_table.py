"""add trip invites table

Revision ID: d1e2f3a4b5c6
Revises: c9f0a1b2c3d4
Create Date: 2026-04-18 19:35:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c9f0a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), nullable=False),
        sa.Column("accepted_by_user_id", sa.Integer(), nullable=True),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["accepted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_trip_invites_token_hash"),
    )
    op.create_index(op.f("ix_trip_invites_email"), "trip_invites", ["email"], unique=False)
    op.create_index(op.f("ix_trip_invites_id"), "trip_invites", ["id"], unique=False)
    op.create_index(op.f("ix_trip_invites_trip_id"), "trip_invites", ["trip_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_trip_invites_trip_id"), table_name="trip_invites")
    op.drop_index(op.f("ix_trip_invites_id"), table_name="trip_invites")
    op.drop_index(op.f("ix_trip_invites_email"), table_name="trip_invites")
    op.drop_table("trip_invites")
