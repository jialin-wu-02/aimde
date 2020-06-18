"""empty message

Revision ID: 4f594a13ffea
Revises: 7ae8c2333da0
Create Date: 2020-06-09 00:20:52.478840

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4f594a13ffea'
down_revision = '7ae8c2333da0'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('executables', sa.Column('aim_experiment', sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('executables', 'aim_experiment')
    # ### end Alembic commands ###