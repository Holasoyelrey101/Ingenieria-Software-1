"""create delivery_requests table

Revision ID: 07df451a2a01
Revises: 
Create Date: 2025-10-03
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '07df451a2a01'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'delivery_requests',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('origin', sa.JSON(), nullable=True),
        sa.Column('destination', sa.JSON(), nullable=True),
        sa.Column('vehicle_id', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('eta', sa.Integer(), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()')),
    )
    op.create_index(op.f('ix_delivery_requests_id'), 'delivery_requests', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_delivery_requests_id'), table_name='delivery_requests')
    op.drop_table('delivery_requests')
