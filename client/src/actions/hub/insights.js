import * as actionTypes from '../actionTypes';
import callApi from '../../services/api';

export function getInsights({experiment_name, commit_id, insight_name}) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Insight.getInsights', {
        experiment_name, commit_id, insight_name
      }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}