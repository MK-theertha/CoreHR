"""add note table

Revision ID: 866356fc316d
Revises: 461b8fd7ead7
Create Date: 2026-09-18 13:43:20.170072

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '866356fc316d'
down_revision: Union[str, Sequence[str], None] = '461b8fd7ead7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'Note',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('employeeId', sa.String(), nullable=False),
        sa.Column('authorId', sa.String(), nullable=True),
        sa.Column('body', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['authorId'], ['User.id'], name='Note_authorId_fkey', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['employeeId'], ['Employee.id'], name='Note_employeeId_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('Note_employeeId_idx', 'Note', ['employeeId'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('Note_employeeId_idx', table_name='Note')
    op.drop_table('Note')
