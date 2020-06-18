"""empty message

Revision ID: 317bc6adced3
Revises: 5b41aadf23b5
Create Date: 2020-05-22 21:21:38.305714

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '317bc6adced3'
down_revision = '5b41aadf23b5'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('CommitTag',
    sa.Column('uuid', sa.Text(), nullable=False),
    sa.Column('commit_id', sa.Text(), nullable=True),
    sa.Column('tag_id', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['commit_id'], ['commits.uuid'], ),
    sa.ForeignKeyConstraint(['tag_id'], ['tags.uuid'], ),
    sa.PrimaryKeyConstraint('uuid')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('CommitTag')
    # ### end Alembic commands ###