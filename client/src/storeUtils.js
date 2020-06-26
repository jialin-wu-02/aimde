import { memo } from 'react';
import { connect } from 'react-redux';
import * as classes from './constants/classes';
import * as progressActions from './actions/progress';
import * as projectActions from './actions/hub/project';
import * as controlPanelActions from './actions/hub/controlPanel';
import * as executablesActions from './actions/hub/executables';
import * as commitActions from './actions/hub/commit';
import * as tagsActions from './actions/hub/tags';


export function getWithState(caseName, caseClass) {
  let mapState2Props;
  let mapDispatch2Props = {
    resetProgress: progressActions.resetProgress,
    incProgress: progressActions.incProgress,
    completeProgress: progressActions.completeProgress,
  };

  switch (caseName) {
    // App
    case classes.APP:
      break;
    // Wrappers
    case classes.BASE_WRAPPER:
      break;
    case classes.SITE_WRAPPER:
      break;
    case classes.HUB_WRAPPER:
      break;
    case classes.HUB_PROJECT_WRAPPER:
      mapState2Props = (state) => ({
        ...state.project,
      });
      Object.assign(mapDispatch2Props, {
        getProject: projectActions.getProject,
        resetProjectState: projectActions.resetProjectState,
      });
      break;
    // Components
    case classes.HEADER:
      mapState2Props = (state) => ({
        loadProgress: state.default.loadProgress,
      });
      break;
    case classes.SEARCH_BAR:
      mapState2Props = (state) => ({
        ...state.controlPanel,
      });
      Object.assign(mapDispatch2Props, {
        getProjectInsight: controlPanelActions.getProjectInsight,
        getCommitsByQuery: commitActions.getCommitsByQuery,
      });
      break;
    case classes.CONTROL_PANEL:
      mapState2Props = (state) => ({
        isLoading: state.controlPanel.isLoading,
        data: Object.values(state.controlPanel.data),
      });
      Object.assign(mapDispatch2Props, {
        getCommitTags: commitActions.getCommitTags,
        getCommitInfo: commitActions.getCommitInfo,
        updateCommitTag: commitActions.updateCommitTag,
        killRunningExecutable: executablesActions.killRunningExecutable,
        getTags: tagsActions.getTags,
      });
      break;
    case classes.RUNNING_EXEC_LIST:
      Object.assign(mapDispatch2Props, {
        getRunningExecutables: executablesActions.getRunningExecutables,
        killRunningExecutable: executablesActions.killRunningExecutable,
      });
    // Screens
    case classes.HUB_MAIN_SCREEN:
      mapState2Props = (state) => ({
        ...state.controlPanel,
      });
      Object.assign(mapDispatch2Props, {
        getRunningExecutables: executablesActions.getRunningExecutables,
        killRunningExecutable: executablesActions.killRunningExecutable,
      });
      break;
    case classes.HUB_PROJECT_SCREEN:
      mapState2Props = (state) => ({ ...state.project });
      break;
    case classes.HUB_PROJECT_EXECUTABLES:
      Object.assign(mapDispatch2Props, {
        executeExecutable: executablesActions.executeExecutable,
        createExecutable: executablesActions.createExecutable,
        getExecutables: executablesActions.getExecutables,
        executeExecutableTemplate: executablesActions.executeExecutableTemplate,
      });
      break;
    case classes.HUB_PROJECT_CREATE_EXECUTABLE:
      Object.assign(mapDispatch2Props, {
        executeExecutable: executablesActions.executeExecutable,
        createExecutable: executablesActions.createExecutable,
        getExecutables: executablesActions.getExecutables,
      });
      break;
    case classes.HUB_PROJECT_EXECUTABLE_DETAIL:
      Object.assign(mapDispatch2Props, {
        executeExecutable: executablesActions.executeExecutable,
        executeExecutableForm: executablesActions.executeExecutableForm,
        getExecutable: executablesActions.getExecutable,
        saveExecutable: executablesActions.saveExecutable,
      });
      break;
    case classes.HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL:
      Object.assign(mapDispatch2Props, {
        getExecutableProcess: executablesActions.getExecutableProcess,
      });
      break;
    case classes.HUB_PROJECT_TAGS:
      Object.assign(mapDispatch2Props, {
        getTags: tagsActions.getTags,
      });
      break;
    case classes.HUB_PROJECT_EDIT_TAG:
      Object.assign(mapDispatch2Props, {
        getTag: tagsActions.getTag,
        updateTag: tagsActions.updateTag,
        getRelatedRuns: tagsActions.getRelatedRuns,
      });
      break;
    case classes.HUB_PROJECT_CREATE_TAG:
      Object.assign(mapDispatch2Props, {
        postNewTag: tagsActions.postNewTag,
      });
      break;
    case classes.HUB_PROJECT_EXPERIMENT_SCREEN:
      mapState2Props = (state) => ({
        project: state.project.project,
        user_name: state.project.project.user_name,
      });
      Object.assign(mapDispatch2Props, {
        getExperiment: projectActions.getExperiment,
        getExperimentComponent: projectActions.getExperimentComponent,
      });
      break;
    default:
      break;
  }

  return connect(mapState2Props, mapDispatch2Props, null, { forwardRef: true })(memo(caseClass));
}