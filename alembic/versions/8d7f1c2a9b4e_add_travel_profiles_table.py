"""add matching tables and trip discoverability

Revision ID: 8d7f1c2a9b4e
Revises: 3f8a1b9c2d4e
Create Date: 2026-04-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d7f1c2a9b4e'
down_revision: Union[str, Sequence[str], None] = '3f8a1b9c2d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'trips',
        sa.Column('is_discoverable', sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        'travel_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column(
            'travel_style',
            sa.Enum('adventure', 'relaxed', 'cultural', 'party', name='travel_style_enum', native_enum=False),
            nullable=False,
        ),
        sa.Column(
            'budget_range',
            sa.Enum('budget', 'mid_range', 'luxury', name='budget_range_enum', native_enum=False),
            nullable=False,
        ),
        sa.Column('interests', sa.JSON(), nullable=False),
        sa.Column('group_size_min', sa.Integer(), nullable=False),
        sa.Column('group_size_max', sa.Integer(), nullable=False),
        sa.Column('is_discoverable', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_travel_profiles_id'), 'travel_profiles', ['id'], unique=False)

    op.create_table(
        'match_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('receiver_id', sa.Integer(), nullable=False),
        sa.Column('trip_id', sa.Integer(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('open', 'accepted', 'closed', name='match_request_status_enum', native_enum=False),
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['receiver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id']),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_match_requests_id'), 'match_requests', ['id'], unique=False)
    op.create_index(
        'uq_match_requests_open_per_trip',
        'match_requests',
        ['sender_id', 'receiver_id', 'trip_id'],
        unique=True,
        postgresql_where=sa.text("status = 'open'"),
        sqlite_where=sa.text("status = 'open'"),
    )

    op.create_table(
        'match_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_a_id', sa.Integer(), nullable=False),
        sa.Column('request_b_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('breakdown', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['request_a_id'], ['match_requests.id']),
        sa.ForeignKeyConstraint(['request_b_id'], ['match_requests.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('request_a_id', 'request_b_id'),
    )
    op.create_index(op.f('ix_match_results_id'), 'match_results', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_match_results_id'), table_name='match_results')
    op.drop_table('match_results')

    op.drop_index('uq_match_requests_open_per_trip', table_name='match_requests')
    op.drop_index(op.f('ix_match_requests_id'), table_name='match_requests')
    op.drop_table('match_requests')

    op.drop_index(op.f('ix_travel_profiles_id'), table_name='travel_profiles')
    op.drop_table('travel_profiles')

    op.drop_column('trips', 'is_discoverable')
