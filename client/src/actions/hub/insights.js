import * as actionTypes from '../actionTypes';
import callApi from '../../services/api';

export function getInsights({experiment_name, commit_id, insight_name}) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      console.log("asdasds")
      callApi('Insight.getInsights', {
        experiment_name, commit_id, insight_name
      }).then((data) => {
        console.log("here")
        console.log(data)
        resolve(data);
      }).catch((err) => {
        console.log(err)
        reject(err);
      });
    });
  }
}