"""add department open_positions

Revision ID: 461b8fd7ead7
Revises: b86b3869e795
Create Date: 2026-09-18 13:35:39.709349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '461b8fd7ead7'
down_revision: Union[str, Sequence[str], None] = 'b86b3869e795'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('Department', sa.Column('openPositions', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('Department', 'openPositions')
