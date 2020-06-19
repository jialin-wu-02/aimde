import json
import os
import time

from flask import Blueprint, jsonify, request, \
    abort, make_response, send_from_directory
from flask_restful import Api, Resource

from app import App
from app.db import db
from app.commits.models import Tag


tags_bp = Blueprint('tags', __name__)
tags_api = Api(tags_bp)


@tags_api.resource('/list')
class TagListApi(Resource):
    def get(self):
        tags = Tag.query.order_by(Tag.created_at.desc()).all()

        result = []
        for t in tags:
            result.append({
                'id': t.uuid,
                'name': t.name,
                'color': t.color,
                'num_commits': len(t.commits),
            })

        return jsonify(result)


@tags_api.resource('/new')
class TagCreateApi(Resource):
    def post(self):
        command_form = request.form

        name = command_form.get('name') or ''
        name = name.strip()

        color = command_form.get('color') or ''
        color = color.strip()

        if not name or not color:
            return make_response(jsonify({}), 403)

        t = Tag(name, color)
        db.session.add(t)
        db.session.commit()

        return jsonify({
            'id': t.uuid,
        })
        
@tags_api.resource('/update')
class TagUpdateApi(Resource):
    def post(self):
        command_form = request.form

        uuid = command_form.get('id') or ''
        uuid = uuid.strip()

        name = command_form.get('name') or ''
        name = name.strip()

        color = command_form.get('color') or ''
        color = color.strip()

        if not name or not color:
            return make_response(jsonify({}), 403)

        t = Tag(name, color)
        tag = Tag.query.filter_by(uuid=uuid).first()
        tag.name = name;
        tag.color = color;
        db.session.commit()

        return jsonify({
            'id': t.uuid,
        })


@tags_api.resource('/runs/<tag_id>')
class TagGetRelatedRuns(Resource):
    def get(self, tag_id):
        tag = Tag.query.filter_by(uuid=tag_id).first()
        relatedRuns = []
        for commit in tag.commits:
            relatedRuns.append({"hash": commit.hash, "uuid": commit.uuid, "created_at": commit.created_at})
        return jsonify({
            'data': relatedRuns,
        }) 