import os
import json
import datetime
import pytz

from artifacts.artifact import Metric
from app.projects.utils import get_project_branches, read_artifact_log, \
    get_dir_size, get_branch_commits


def default_created_at():
    return datetime.datetime.utcnow().replace(tzinfo=pytz.utc)

def fetchDirInsight(obj):
    return ({
        'name': obj['name'],
        'cat': obj['cat'],
        'data': obj['data'],
        'data_path': obj['data_path'],
    })

def fetchModelInsight(obj, objects_dir_path):
    model_file_path = os.path.join(objects_dir_path,
                                    'models',
                                    '{}.aim'.format(obj['name']))
    model_file_size = os.stat(model_file_path).st_size
    return ({
        'name': obj['name'],
        'data': obj['data'],
        'size': model_file_size,
    })

def fetchMetricInsight(insight_name, obj, obj_data_file_path, records_storage):
    comp_content = []
    if obj['data_path'] == '__AIMRECORDS__':
        format = 'aimrecords'
        records_storage.open(obj['name'],
                                uncommitted_bucket_visible=True)
        for r in records_storage.read_records(obj['name'],
                                                slice(-1000, None)):
            base, metric_record = Metric.deserialize(r)
            comp_content.append(metric_record.value)
        records_storage.close(obj['name'])
    else:
        format = 'json_log'
        obj_data_content = read_artifact_log(obj_data_file_path,
                                                1000)
        comp_content = list(map(lambda x: float(x),
                                obj_data_content))
    return {
        'name': obj['name'],
        'mode': 'plot',
        'data': comp_content,
        'format': format,
    }

def fetchMetricsGroupInsight(obj, obj_data_file_path):
    try:
        obj_data_content = read_artifact_log(obj_data_file_path,
                                                1000)
        comp_content = list(map(lambda x: json.loads(x),
                                obj_data_content))
        return ({
            'name': obj['name'],
            'mode': 'group_plot',
            'data': comp_content,
            'labels': obj['data'].get('labels'),
            'range': obj['data'].get('range'),
            'meta': obj['data'].get('meta'),
        })
    except:
        pass

def fetchCorrInsight(insight_name, obj, obj_data_file_path):
    try:
        obj_data_content = read_artifact_log(obj_data_file_path,
                                            100)
        comp_content = list(map(lambda x: json.loads(x),
                                obj_data_content))
        return ({
            'name': obj['name'],
            'mode': 'heatmap',
            'data': comp_content,
            'labels': obj['data']['labels'],
        })
    except:
        pass

def fetchHyperparametersInsight(obj_data_file_path):
    try:
        params_str = read_artifact_log(obj_data_file_path, 1)
        if params_str:
            return json.loads(params_str[0])
    except:
        pass

def fetchMisclsInsight(obj, obj_data_file_path):
    # If object is of type annotation,
    # then loop over the annotated items
    # serialize annotated items path and meta information
    try:
        obj_data_content = read_artifact_log(obj_data_file_path,
                                                1000)
        comp_content = list(map(lambda x: json.loads(x),
                                obj_data_content))
        annotated_items = []
        for annotated_item in comp_content:
            annotated_items.append({
                'object_path': annotated_item['path'],
                'meta': annotated_item['data'],
            })

        # Append serialized item to items array
        return ({
            'name': obj['name'],
            'mode': 'list',
            'data': annotated_items,
        })
    except:
        pass