import os

from flask import Flask, redirect, request, make_response
from flask_cors import CORS

from utils import Singleton
from app.config import config
from app.db import Db
from services.executables.manager import Executables as ExecutablesManager


class App(metaclass=Singleton):
    api = None
    executables_manager = None

    @classmethod
    def __init__(cls, test_config=None):
        api = Flask(__name__)

        api.url_map.strict_slashes = False

        @api.before_request
        def clear_trailing():
            rp = request.path
            if rp != '/' and rp.endswith('/'):
                return redirect(rp.rstrip('/'))

        CORS(api,
             origins='*',
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
             allow_headers=['Origin', 'X-Requested-With',
                            'Content-Type', 'Accept', 'Authorization'],
             supports_credentials=True,
             max_age=86400,
             vary_header=True)

        # check environment variables to see which config to load
        env = os.environ.get('FLASK_ENV', 'dev')

        # load config
        if test_config:
            api.config.from_mapping(**test_config)
        else:
            api.config.from_object(config[env])

        Db(api)

        # import and register blueprints
        from app.views import general_bp
        from app.projects.views import projects_bp
        from app.commits.views import commits_bp
        from app.executables.views import executables_bp
        from app.insights.views import insights_bp
        from app.tags.views import tags_bp

        api.register_blueprint(general_bp)
        api.register_blueprint(projects_bp, url_prefix='/api/v1/projects')
        api.register_blueprint(commits_bp, url_prefix='/api/v1/commits')
        api.register_blueprint(executables_bp, url_prefix='/api/v1/executables')
        api.register_blueprint(insights_bp, url_prefix='/api/v1/insights')
        api.register_blueprint(tags_bp, url_prefix='/api/v1/tags')

        cls.api = api

        if cls.executables_manager is not None:
            cls.executables_manager.stop()
        if cls.executables_manager is None:
            cls.executables_manager = ExecutablesManager()
        cls.executables_manager.start()
