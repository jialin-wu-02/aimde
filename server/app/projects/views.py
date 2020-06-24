import json
import os
import time
from aimrecords import Storage

from flask import Blueprint, jsonify, request, \
    abort, make_response, send_from_directory
from flask_restful import Api, Resource

from app.db import db
from app.projects.utils import get_project_branches, read_artifact_log, \
    get_dir_size, get_branch_commits
from app.projects.project import Project
from artifacts.artifact import Metric
from app.commits.utils import get_commits


projects_bp = Blueprint('projects', __name__)
projects_api = Api(projects_bp)


@projects_api.resource('/')
class ProjectApi(Resource):
    def get(self):
        project = Project()

        if not project.exists():
            return make_response(jsonify({}), 404)

        # Get project branches list
        project_path = '/store'
        project_branches = get_project_branches(project_path)

        return jsonify({
            'name': project.name,
            'description': project.description,
            'branches': project_branches,
        })


@projects_api.resource('/<exp_name>/<commit>/models/<model_name>')
class ExperimentModelApi(Resource):
    def get(self, exp_name, commit, model_name):
        dir_path = os.path.join('/store', exp_name, commit)
        objects_dir_path = os.path.join(dir_path, 'objects')
        models_dir_path = os.path.join(objects_dir_path, 'models')

        return send_from_directory(directory=models_dir_path,
                                   filename=model_name)


@projects_api.resource('/insight/<insight_name>')
class ProjectInsightApi(Resource):
    def get(self, insight_name):
        project = Project()
        if not project.exists():
            return make_response(jsonify({}), 404)

        commits = get_commits(insight_name)

        return jsonify(commits)


@projects_api.resource('/<experiment_name>/<commit_id>/<file_path>')
class ProjectExperimentFileApi(Resource):
    def get(self, experiment_name,
            commit_id, file_path):
        project = Project()

        if not project.exists():
            return make_response(jsonify({}), 404)

        objects_dir_path = os.path.join('/store',
                                        experiment_name,
                                        commit_id,
                                        'objects')

        file_path = os.path.join(*file_path.split('+')) + '.log'
        dist_abs_path = os.path.join(objects_dir_path,
                                     file_path)

        if not os.path.isfile(dist_abs_path):
            return make_response(jsonify({}), 404)

        # Read file specified by found path
        try:
            obj_data_content = read_artifact_log(dist_abs_path, 500)
            comp_content = list(map(lambda x: json.loads(x),
                                    obj_data_content))
            return comp_content
        except:
            return []
