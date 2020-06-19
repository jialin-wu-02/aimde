import './HubTagEditScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';
import { Redirect, Link } from 'react-router-dom';

import { buildUrl } from '../../../utils';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import UI from '../../../ui';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import { classNames } from '../../../utils';

class HubTagEditScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'overview',
      isLoading: true,
      tag: null,
      form: {
        name: '',
        color: '',
      },
      relatedRuns: [],
    };

    this.colors = [
      '#16A085',
      '#27AE60',
      '#2980B9',
      '#8E44AD',
      '#E67E22',
      '#F1C40F',
      '#E74C3C',
      '#B33771',
      '#BDC581',
      '#FD7272',
      '#546de5',
      '#574b90',
    ];
  }

  componentDidMount() {
    this.getTag(this.props.match.params.tag_id);
    this.getRelatedRuns(this.props.match.params.tag_id);
  }

  getTag = (tag_id) => {
    this.setState(prevState => ({
      ...prevState,
      isLoading: true,
    }));

    this.props.getTags().then((data) => data.forEach((tag) => {
      if (tag.id == tag_id) {
        this.setState({
          tag: tag,
          form: {
            name: tag.name,
            color: tag.color
          }
        });
      }
    })).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        isLoading: false,
      }));
    });
  };

  getRelatedRuns = (tag_id) => {
    console.log(tag_id)
    this.props.getRelatedRuns(tag_id).then(data => {
      console.log(data)
      this.setState({
        relatedRuns: data.data.map((data) => {
          return (
            <div> 
              <Link to={buildUrl(screens.HUB_PROJECT_EXPERIMENT, {
                // experiment_name: experimentName,
                // commit_id: commit.hash,
              })}>
                {data.hash} 
              </Link>
              <div style={{float: 'right'}}>
                {data.created_at} 
              </div>
            </div>
          )
        })
      })
    })
  }

  handleInputChange = (e, callback=null) => {
    const value = e.target.value;
    const name = e.target.name;
    this.setState((prevState) => ({
      ...prevState,
      form: {
        ...prevState.form,
        [name]: value,
      },
    }), () => {
      if (callback) {
        callback(e);
      }
    });
  };

  handleCreateBtnClick = () => {
    this.setState({
      createBtn: {
        loading: true,
        disabled: true,
      }
    });

    this.props.updateTag({
      id: this.props.match.params.tag_id,
      name: this.state.form.name,
      color: this.state.form.color,
    }).then((data) => {
      this.setState(prevState => ({
        ...prevState,
        redirectTags: true,
      }));
    }).catch((err) => {
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        createBtn: {
          loading: false,
          disabled: false,
        }
      }));
    });
  };

  handleColorClick = (color) => {
    this.setState((prevState) => ({
      ...prevState,
      form: {
        ...prevState.form,
        color,
      },
    }));
  };

  _renderOverview = () => {
    return (
      <UI.Segment type='secondary'>
        <UI.Text divided>
          Related Runs
        </UI.Text>
        {this.state.relatedRuns.map((run) => (
          <UI.Text className="HubTagEditScreen__Item">
            {run}
          </UI.Text>
        ))}
      </UI.Segment>
    )
  }

  _renderSettings = () => {
    return (
      <div>
        <UI.Input
          onChange={this.handleInputChange}
          name='name'
          value={this.state.form.name}
          label='Tag Name'
          placeholder={'best-cnn'}
        />
        <div className=''>
          <UI.Input
            onChange={this.handleInputChange}
            name='color'
            value={this.state.form.color}
            label='Tag Color'
            placeholder={'red'}
          />
          <div>
            {this.colors.map((color, cKey) =>
              <UI.Label
                className={classNames({
                  HubTagCreateScreen__colors__item: true,
                  active: this.state.form.color === color,
                })}
                color={color}
                key={cKey}
                onClick={() => this.handleColorClick(color)}
              >
                {color}
              </UI.Label>
            )}
          </div>
          <UI.Line />
          <UI.Buttons>
            <UI.Button
              onClick={() => this.handleCreateBtnClick()}
              type='positive'
              {...this.state.createBtn}
            >
              Save
            </UI.Button>
            <Link to={screens.HUB_PROJECT_TAGS}>
              <UI.Button type='secondary'> Cancel </UI.Button>
            </Link>
          </UI.Buttons>
        </div>
      </div>
    )
  }

  _renderContent = () => {
    if (this.state.isLoading) {
      return <UI.Text type='grey' center> Loading..</UI.Text>
    }

    return (
      <>
        <UI.Text className='HubExecutableDetailScreen__name' size={6} header spacing>
          <Link to={screens.HUB_PROJECT_TAGS}>
            Tags
          </Link>
          <UI.Text type='grey' inline> / {this.state.tag.name}</UI.Text>
        </UI.Text>
        <UI.Tabs
          leftItems={
            <>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'overview'}
                onClick={() => this.setState({ activeTab: 'overview' })}
              >
                Overview
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
          {this.state.activeTab === 'settings' && this._renderSettings()}
        </div>
      </>
    )
  }

  render() {
    if (this.state.redirectTags) {
      return <Redirect to={screens.HUB_PROJECT_TAGS} />
    }

    return (
      <ProjectWrapper>
        <Helmet>
          <meta title='' content='' />
        </Helmet>

        <UI.Container size='small' ref={this.contentRef}>
          {this._renderContent()}
        </UI.Container>
      </ProjectWrapper>
    )
  }
}

export default storeUtils.getWithState(
  classes.HUB_PROJECT_EDIT_TAG,
  HubTagEditScreen
);