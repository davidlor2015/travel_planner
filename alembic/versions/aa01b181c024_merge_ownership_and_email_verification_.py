"""merge ownership and email verification heads

Revision ID: aa01b181c024
Revises: 1a2b3c4d5e6f, e7f8a9b0c1d2
Create Date: 2026-04-21 12:27:03.413441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa01b181c024'
down_revision: Union[str, Sequence[str], None] = ('1a2b3c4d5e6f', 'e7f8a9b0c1d2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
