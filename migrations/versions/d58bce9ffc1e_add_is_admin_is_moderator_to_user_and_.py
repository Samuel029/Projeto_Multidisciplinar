"""Add is_admin, is_moderator to User and parent_id, replies to Comment

Revision ID: d58bce9ffc1e
Revises: abc123
Create Date: [Sua data aqui]

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd58bce9ffc1e'
down_revision = 'abc123'
branch_labels = None
depends_on = None

def upgrade():
    # Add columns to users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('is_moderator', sa.Boolean(), nullable=False, server_default='0'))

    # Add parent_id column and named foreign key to comments table
    with op.batch_alter_table('comments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parent_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_comments_parent_id',  # Nome da chave estrangeira
            'comments',              # Tabela referenciada
            ['parent_id'],           # Coluna local
            ['id']                   # Coluna referenciada
        )

def downgrade():
    # Remove foreign key and parent_id column from comments table
    with op.batch_alter_table('comments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_comments_parent_id', type_='foreignkey')
        batch_op.drop_column('parent_id')

    # Remove columns from users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_moderator')
        batch_op.drop_column('is_admin')