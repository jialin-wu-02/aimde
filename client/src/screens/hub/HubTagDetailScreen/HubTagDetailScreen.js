import './HubTagDetailScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';
import { Redirect, Link } from 'react-router-dom';
import moment from 'moment';

import { buildUrl } from '../../../utils';

import TagSettingForm from '../../../components/hub/TagSettingForm/TagSettingForm';
import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import UI from '../../../ui';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';

class HubTagDetailScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'overview',
      isLoading: true,
      tag: null,
      relatedRuns: [],
      form: {
        name: '',
        color: '',
      },
    };
  }      

  componentDidMount() {
    this.getTag(this.props.match.params.tag_id);
    this.getRelatedRuns(this.props.match.params.tag_id);
  }

  getTag = (tag_id) => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

    this.props.getTag(tag_id).then((tag) => {
      this.setState({
        tag: tag,
        form: {
          name: tag.name,
          color: tag.color,
        }
      })
    }).finally(() => {
      this.setState((prevState) => ({
        ...prevState,
        isLoading: false,
      }));
    });
  };

  getRelatedRuns = (tag_id) => {
    this.props.getRelatedRuns(tag_id).then((data) => {
      this.setState({
        relatedRuns: data.data,
      });
    });
  };

  _renderOverview = () => {
    return (
      <div className='HubTagDetailScreen__container'>
        <div className='HubTagDetailScreen__items'>
          {this.state.relatedRuns.map((run) => (
            <div className='HubTagDetailScreen__item' key={run.hash}>
              <div className='HubTagDetailScreen__item__inner'> 
                <Link
                  to={buildUrl(screens.HUB_PROJECT_EXPERIMENT, {
                    experiment_name: run.experiment_name,
                    commit_id: run.hash,
                  })}
                >
                  <UI.Text inline>{run.experiment_name} 
                    {' '} / {' '} {run.hash}
                  </UI.Text>
                </Link>
              </div>
              <UI.Text type="grey" small>
                Created at {moment(run.created_at).format('HH:mm · D MMM, YY')}
              </UI.Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  _renderContent = () => {
    if (this.state.isLoading) {
      return (
        <UI.Text type='grey' center>
          Loading..
        </UI.Text>
      );
    }

    return (
      <>
        <UI.Text
          size={6}
          header
          spacing
        >
          <Link to={screens.HUB_PROJECT_TAGS}>Tags</Link>
          <UI.Text type='grey' inline>
            {' '} / {this.state.tag.name}
          </UI.Text>
        </UI.Text>
        <UI.Tabs
          leftItems={
            <>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'overview'}
                onClick={() => this.setState({ activeTab: 'overview' })}
              >
                Related Runs
              </UI.Tab>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'settings'}
                onClick={() => this.setState({ activeTab: 'settings' })}
              >
                Settings
              </UI.Tab>
            </>
          }
        />
        <div>
          {this.state.activeTab === 'overview' && this._renderOverview()}
          {this.state.activeTab === 'settings' && (
            <TagSettingForm
              name={this.state.form.name}
              color={this.state.form.color}
              tag_id={this.props.match.params.tag_id}
              updateFunction={this.props.updateTag}
              redirectURL={screens.HUB_PROJECT_TAGS}
            />
          )}
        </div>
      </>
    );
  };

  render() {
    return (
      <ProjectWrapper>
        <Helmet>
          <meta title='' content='' />
        </Helmet>

        <UI.Container size='small' ref={this.contentRef}>
          {this._renderContent()}
        </UI.Container>
      </ProjectWrapper>
    );
  }
}

export default storeUtils.getWithState(
  classes.HUB_PROJECT_EDIT_TAG,
  HubTagDetailScreen
);