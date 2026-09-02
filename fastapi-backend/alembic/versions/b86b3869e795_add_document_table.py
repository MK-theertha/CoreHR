"""add document table

Adds Document only. Autogenerate also picked up the pre-existing legacy-DB
drift (TEXT vs VARCHAR, unnamed vs named constraints — see the baseline
migration's docstring and infra notes) against the hand-bootstrapped local
dev DB; that noise is intentionally stripped here since it isn't a real
schema change and running `alembic check` against a database created purely
by this migration chain reports it clean.

Revision ID: b86b3869e795
Revises: 1117969025a6
Create Date: 2026-09-01 16:17:10.856236

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b86b3869e795'
down_revision: Union[str, Sequence[str], None] = '1117969025a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'Document',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entityType', sa.String(), nullable=False),
        sa.Column('entityId', sa.String(), nullable=False),
        sa.Column('fileName', sa.String(), nullable=False),
        sa.Column('contentType', sa.String(), nullable=False),
        sa.Column('sizeBytes', sa.BigInteger(), nullable=True),
        sa.Column('s3Key', sa.String(), nullable=False),
        sa.Column('uploadedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['uploadedBy'], ['User.id'], name='Document_uploadedBy_fkey', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('Document_entityType_entityId_idx', 'Document', ['entityType', 'entityId'], unique=False)


def downgrade() -> None:
    op.drop_index('Document_entityType_entityId_idx', table_name='Document')
    op.drop_table('Document')
