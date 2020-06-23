import './App.less';

import React from 'react';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';

import * as screens from './constants/screens';
import * as classes from './constants/classes';
import * as storeUtils from './storeUtils';
import HubExperimentScreen from './screens/hub/HubExperimentScreen/HubExperimentScreen';
import SiteNotFoundScreen from './screens/site/SiteNotFoundScreen/SiteNotFoundScreen';
import Header from './components/global/Header/Header';
import HubMainScreen from './screens/hub/HubMainScreen/HubMainScreen';
import HubExecutablesScreen from './screens/hub/HubExecutablesScreen/HubExecutablesScreen';
import HubExecutableCreateScreen from './screens/hub/HubExecutableCreateScreen/HubExecutableCreateScreen';
import HubExecutableDetailScreen from './screens/hub/HubExecutableDetailScreen/HubExecutableDetailScreen';
import HubExecutableProcessDetailScreen from './screens/hub/HubExecutableProcessDetailScreen/HubExecutableProcessDetailScreen';
import HubTagsScreen from './screens/hub/HubTagsScreen/HubTagsScreen';
import HubTagCreateScreen from './screens/hub/HubTagCreateScreen/HubTagCreateScreen';
import HubTagDetailScreen from './screens/hub/HubTagDetailScreen/HubTagDetailScreen';


class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
    };
  }

  componentWillMount() {
    this.props.resetProgress();
  }

  componentDidMount() {
    setTimeout(() => this.props.completeProgress(), 150);
  }

  render() {
    return (
      <BrowserRouter>
        <Header />
        <Switch>
          <Route exact path={screens.MAIN} component={HubMainScreen}/>
          <Route exact path={screens.HUB_PROJECT_CREATE_EXECUTABLE} component={HubExecutableCreateScreen}/>
          <Route exact path={screens.HUB_PROJECT_EXECUTABLE_DETAIL} component={HubExecutableDetailScreen}/>
          <Route exact path={screens.HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL} component={HubExecutableProcessDetailScreen}/>
          <Route exact path={screens.HUB_PROJECT_CREATE_TAG} component={HubTagCreateScreen}/>
          <Route exact path={screens.HUB_PROJECT_EDIT_TAG} component={HubTagDetailScreen}/>
          <Route exact path={screens.HUB_PROJECT_TAGS} component={HubTagsScreen}/>
          <Route exact path={screens.HUB_PROJECT_EXPERIMENT} component={HubExperimentScreen}/>
          <Route exact path={screens.HUB_PROJECT_EXECUTABLES} component={HubExecutablesScreen}/>
          <Route component={SiteNotFoundScreen}/>
        </Switch>
      </BrowserRouter>
    )
  }
}

function RedirectToDefaultExperiment() {
  return (
    <Redirect to={screens.HUB_PROJECT_EXPERIMENT_INDEX} />
  )
}

export default storeUtils.getWithState(
  classes.APP,
  App
);