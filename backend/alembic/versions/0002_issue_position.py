"""add issues.position for manual ordering inside board columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "issues",
        sa.Column("position", sa.Float(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("issues", "position")
