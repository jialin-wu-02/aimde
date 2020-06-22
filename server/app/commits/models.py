import uuid
import datetime
from sqlalchemy.orm import relationship

from app.db import db
from app.utils import default_created_at


CommitTagAssociation = db.Table('commit_tag',
    db.Column('commit_id', db.Text, db.ForeignKey('commits.uuid')),
    db.Column('tag_id', db.Text, db.ForeignKey('tags.uuid')))


class Commit(db.Model):
    __tablename__ = 'commits'

    uuid = db.Column(db.Text, primary_key=True)
    hash = db.Column(db.Text)
    experiment_name = db.Column(db.Text, default='')
    tags = relationship('Tag', secondary=CommitTagAssociation)
    created_at = db.Column(db.DateTime, default=default_created_at)
    is_archived = db.Column(db.Boolean)

    def __init__(self, hash, experiment_name):
        self.uuid = str(uuid.uuid1())
        self.hash = hash
        self.experiment_name = experiment_name
        self.is_archived = False


class Tag(db.Model):
    __tablename__ = 'tags'

    uuid = db.Column(db.Text, primary_key=True)
    name = db.Column(db.Text)
    color = db.Column(db.Text)
    commits = relationship('Commit', secondary=CommitTagAssociation)
    created_at = db.Column(db.DateTime, default=default_created_at)
    is_archived = db.Column(db.Boolean)

    def __init__(self, name, color):
        self.uuid = str(uuid.uuid1())
        self.name = name
        self.color = color
        self.is_archived = False

