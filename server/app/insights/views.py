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

from app.utils import fetchMetricInsight, fetchMetricsGroupInsight, fetchCorrInsight, \
    fetchHyperparametersInsight, fetchMisclsInsight, fetchDirInsight, fetchModelInsight


insights_bp = Blueprint('insights', __name__)
insights_api = Api(insights_bp)


@insights_api.resource('/')
class InsightApi(Resource):
    def post(self):
        # return one insight if a name and type is given
        # return all insight related to the experiment_name / commit_id if no name and type given
        request_body = request.get_json()

        experiment_name = request_body['experiment_name']
        commit_id = request_body['commit_id']
        insight_name = request_body['insight_name']


        project = Project()

        if not project.exists():
            return make_response(jsonify({}), 404)

        dir_path = os.path.join('/store', experiment_name)

        # Check if experiment exists
        if not os.path.isdir(dir_path):
            return jsonify({
                'init': True,
                'branch_init': False,
            })

        # Get commits
        commits = get_branch_commits(dir_path)

        # Get specified commit
        commit = None
        if commit_id == 'latest':
            for commit_item, config in commits.items():
                if commit is None or config['date'] > commit['date']:
                    commit = config
        elif commit_id == 'index':
            commit = {
                'hash': 'index',
                'date': time.time(),
                'index': True,
            }
        else:
            commit = commits.get(commit_id)

        if not commit:
            return make_response(jsonify({}), 404)

        objects_dir_path = os.path.join(dir_path, commit['hash'], 'objects')
        meta_file_path = os.path.join(objects_dir_path, 'meta.json')

        # Read meta file content
        try:
            with open(meta_file_path, 'r+') as meta_file:
                meta_file_content = json.loads(meta_file.read())
        except:
            meta_file_content = {}

        if commit['hash'] == 'index' and len(meta_file_content) == 0:
            return jsonify({
                'init': True,
                'branch_init': True,
                'index_empty': True,
                'commit': commit,
                'commits': commits,
            })

        # Get all artifacts(objects) listed in the meta file
        metric_objects = []
        metric_groups_objects = []
        annotation_objects = []
        model_objects = []
        correlation_objects = []
        distribution_objects = []
        dir_objects = []
        hyperparameters = {}
        stats_objects = []

        records_storage = Storage(objects_dir_path, 'r')
        
        # Limit distributions
        for obj_key, obj in meta_file_content.items():
            if (insight_name == None or insight_name == obj['name']):
                insight_type = obj['type']
                obj_data_file_path = os.path.join(objects_dir_path,
                                                    obj['data_path'],
                                                    obj_key)
                if obj['type'] == 'dir':
                    dir_objects.append(fetchDirInsight(obj))
                elif obj['type'] == 'models':
                    model_objects.append(fetchModelInsight(obj, objects_dir_path))
                elif (obj['type'] == 'metrics' and obj['data_path'] != '__AIMRECORDS__') or \
                        obj['type'] == 'correlation' or \
                        obj['type'] == 'misclassification' or \
                        obj['type'] == 'metric_groups' or \
                        obj['type'] == 'stats' or \
                        obj['type'] == 'hyperparameters':
                        # obj['type'] == 'distribution':
                    # Incompatible version
                    if obj_key.endswith('.json'):
                        return make_response(jsonify({}), 501)

                if obj['type'] == 'metrics':
                    metric_objects.append(fetchMetricInsight(obj['name'], obj, obj_data_file_path, records_storage))
                elif obj['type'] == 'metric_groups':
                    metric_groups_objects.append(fetchMetricsGroupInsight(obj, obj_data_file_path))
                # elif obj['type'] == 'stats':
                #     try:
                #         obj_data_content = read_artifact_log(obj_data_file_path,
                #                                              100)
                #         comp_content = list(map(lambda x: json.loads(x),
                #                                 obj_data_content))
                #         stats_objects.append({
                #             'name': obj['name'],
                #             'mode': 'plot',
                #             'data': comp_content,
                #         })
                #     except:
                #         pass
                elif obj['type'] == 'correlation':
                    correlation_objects.append(fetchCorrInsight(obj['name'], obj, obj_data_file_path))
                # elif obj['type'] == 'distribution':
                #     name = '{}/{}'.format(obj['data_path'], obj['name'])
                #     distribution_objects.append({
                #         'name': re.sub('\.json$', '', name),
                #         'mode': 'plot_distribution',
                #     })
                elif obj['type'] == 'hyperparameters':
                    hyperparameters = fetchHyperparametersInsight(obj_data_file_path);
                elif obj['type'] == 'misclassification':
                    insight_type = 'annotations'
                    annotation_objects.append(fetchMisclsInsight(obj, obj_data_file_path))
            elif obj['type'] == 'models' and obj['data']['name'] == insight_name:
                insight_type = 'models'
                model_objects.append(fetchModelInsight(obj, objects_dir_path))

        records_storage.close()

        # Get diff
        diff_content = ''
        diff_file_path = os.path.join(objects_dir_path,
                                      'diff',
                                      'diff.txt')
        if os.path.isfile(diff_file_path):
            with open(diff_file_path, 'r') as diff_file:
                diff_content = str(diff_file.read())


        # Return found objects
        return jsonify({
            'init': True,
            'branch_init': True,
            'commit': commit,
            'commits': commits,
            'metrics': metric_objects,
            'metric_groups': metric_groups_objects,
            'annotations': annotation_objects,
            'models': model_objects,
            'correlations': correlation_objects,
            'distributions': distribution_objects,
            'dirs': dir_objects,
            'diff': diff_content,
            'hyperparameters': hyperparameters,
            'stats': stats_objects,
            'insight_type': insight_type,
        })