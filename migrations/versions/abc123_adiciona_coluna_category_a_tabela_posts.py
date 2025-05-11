"""Adiciona coluna category à tabela posts

Revision ID: abc123
Revises: 
Create Date: 2025-05-10 20:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'abc123'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Verifica se a coluna 'category' já existe na tabela 'posts'
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('posts')]

    if 'category' not in columns:
        op.add_column('posts', sa.Column('category', sa.String(50), nullable=False, server_default='Dúvidas Gerais'))

def downgrade():
    # Remove a coluna category (caso precise reverter a migração)
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('posts')]

    if 'category' in columns:
        op.drop_column('posts', 'category')
