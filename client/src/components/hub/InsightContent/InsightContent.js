import './InsightContent.less';
import './ExperimentDiff.css';

import React from 'react';
import { Redirect } from 'react-router-dom';
import ReactSVG from 'react-svg';
import { parseDiff, Diff, Hunk, Decoration } from 'react-diff-view';
import moment from 'moment';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import { Helmet } from 'react-helmet';
import ExperimentCell from '../../../components/hub/ExperimentCell/ExperimentCell';
import * as classes from '../../../constants/classes';
import * as storeUtils from '../../../storeUtils';
import UI from '../../../ui';
import { buildUrl, classNames, formatSize } from '../../../utils';
import { SERVER_HOST, SERVER_API_HOST, WS_HOST } from '../../../config';
import * as screens from '../../../constants/screens';
import CorrelationHeatmap from '../CorrelationHeatmap/CorrelationHeatmap';
import ExperimentDistributionCell from '../ExperimentDistributionCell/ExperimentDistributionCell';
import ExperimentStatisticsCell from '../ExperimentStatisticsCell/ExperimentStatisticsCell';
import ExperimentMetricGroup from '../ExperimentMetricGroup/ExperimentMetricGroup';
import CommitNavigation from '../CommitNavigation/CommitNavigation';
import IncompatibleVersion from '../al/IncompatibleVersion/IncompatibleVersion';
import CurrentRunIndicator from '../CurrentRunIndicator/CurrentRunIndicator';

class InsightContent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      insight_type: null,
      isLoading: true,
      notFound: false,
      versionError: false,
      experiment: null,
      annotations: null,
      expandCluster: {},
      selectedModel: false,
      correlationIndexes: {},
      selectBranch: null,
      distributionSelected: {},
      commits: [],
      commit: {},
      contentWidth: null,
      statSelected: {},
      metricsData: {},
    };

    this.contentRef = React.createRef();
    this.distTmp = {};

    this.WSClient = null;
  }

  componentWillMount() {
    this.props.resetProgress();
  }

  componentDidMount() {
    this.getExperiment();
    this.handleResize();
    this.experimentCenterStyle = this.props.insight_name ? {position: "absolute", left: "50%", transform: "translateX(-50%)"} : null;
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  componentWillReceiveProps(props) {
    if (props.location.pathname !== this.props.location.pathname) {
      this.WSClose();
      this.setState(
        {
          isLoading: true,
          notFound: false,
          experiment: null,
          annotations: null,
          expandCluster: {},
          selectedModel: false,
          selectBranch: null,
        },
        () => this.getExperiment()
      );
    }
  }

  _renderNavigation = () => {
    if (!this.state.experiment || !this.state.experiment.init || !this.state.experiment.branch_init) {
      return null;
    }

    const experimentName = this.props.experiment_name;

    return (
      <CommitNavigation
        commits={this.state.commits}
        active={this.state.commit.hash}
        experimentName={experimentName}
      />
    )
  };


  /*  Genearte URL for a component.
    URL Format: '/insight/:experiment_name/:commit_id/:insight_name' */
  generateExperimentCellHref = (insight_name) => {
    let experiment_name = this.props.experiment_name,
      commit_id = this.props.commit_id;
    return '/insights/'.concat(
      experiment_name,
      '/',
      commit_id,
      '/',
      insight_name
    );
  };

  onIndex = () => {
    return this.props.commit_id === 'index';
  };

  WSOpen = () => {
    if (!this.WSClient && this.onIndex()) {
      this.WSClient = new WebSocket(`${WS_HOST}/insight`);
      this.WSClient.onopen = this.WSOnOpen;
      this.WSClient.onerror = this.WSOnError;
      this.WSClient.onmessage = this.WSOnMessage;
    }
  };

  WSClose = () => {
    if (this.WSClient) {
      this.WSClient.close();
      this.WSClient = null;
    }
  };

  WSOnOpen = () => {
    // Connection is opened
  };

  WSEncodeInsight = (data) => {
    const dataComplete = Object.assign(
      {
        branch: this.props.experiment_name,
      },
      data
    );

    const dataJson = JSON.stringify(dataComplete);
    const dataHash = btoa(dataJson);
    return dataHash;
  };

  WSDecodeInsight = (dataHash) => {
    const dataJson = atob(dataHash);
    const data = JSON.parse(dataJson);
    return data;
  };

  WSOnError = () => {
    this.WSClient = null;
    setTimeout(() => this.WSOpen(), 1000);
  };

  WSSendMsg = (msg, wait = false) => {
    const jsonMsg = JSON.stringify(msg);

    if (this.WSClient && this.WSClient.readyState === WebSocket.OPEN) {
      this.WSClient.send(jsonMsg);
    } else {
      if (wait) {
        setTimeout(() => this.WSSendMsg(msg, wait), 50);
      }
    }
  };

  WSSubscribeToInsightUpdates = (insightHash) => {
    this.WSSendMsg(
      {
        event: 'subscribe',
        data: insightHash,
      },
      true
    );
  };

  WSUnsubscribeFromInsightUpdates = (insightHash) => {
    this.WSSendMsg(
      {
        event: 'unsubscribe',
        data: insightHash,
      },
      true
    );
  };

  WSOnMessage = (WSMsg) => {
    const msg = JSON.parse(WSMsg.data);

    switch (msg.event) {
      case 'insight_update':
        this.WSOnInsightUpdate(msg.header, msg.data);
        break;
    }
  };

  WSOnInsightUpdate = (header, data) => {
    header = this.WSDecodeInsight(header);

    switch (header.insight) {
      case 'stat':
        this.updateStat(header.name, JSON.parse(data));
        break;
      case 'metric':
        this.updateMetric(header.name, data);
        break;
    }
  };

  statSubscribeToUpdates = (statName, resourceName) => {
    const insightHash = this.WSEncodeInsight({
      insight: 'stat',
      name: statName,
      resource: resourceName,
      file_path: `dirs/${statName}/${resourceName}.log`,
    });

    this.WSSubscribeToInsightUpdates(insightHash);
  };

  statUnsubscribeFromUpdates = (statName, resourceName) => {
    const insightHash = this.WSEncodeInsight({
      insight: 'stat',
      name: statName,
      resource: resourceName,
      file_path: `dirs/${statName}/${resourceName}.log`,
    });

    this.WSUnsubscribeFromInsightUpdates(insightHash);
  };

  metricSubscribeToUpdates = (metricName, format) => {
    const insightHash = this.WSEncodeInsight({
      insight: 'metric',
      name: metricName,
      format: format,
      file_path: `metrics/${metricName}.log`,
    });

    this.WSSubscribeToInsightUpdates(insightHash);
  };

  metricUnsubscribeFromUpdates = (metricName) => {
    const insightHash = this.WSEncodeInsight({
      insight: 'metric',
      name: metricName,
      file_path: `metrics/${metricName}.log`,
    });

    this.WSUnsubscribeFromInsightUpdates(insightHash);
  };

  updateMetric = (metricName, data) => {
    if (isNaN(data)) {
      return;
    }

    data = parseFloat(data);

    this.setState((prevState) => {
      let { metricsData } = prevState;

      let updatedData = [];
      if (metricsData[metricName].data && metricsData[metricName].data.length) {
        updatedData = [...metricsData[metricName].data];
      }
      updatedData.push(data);

      metricsData = Object.assign({}, metricsData, {
        [metricName]: Object.assign({}, metricsData[metricName], {
          data: updatedData,
          rerender: false,
        }),
      });

      return {
        ...prevState,
        metricsData,
      };
    });
  };

  updateStat = (statName, data) => {
    this.setState((prevState) => {
      let { statSelected } = prevState;

      let updatedData = [];
      if (statSelected[statName].data && statSelected[statName].data.length) {
        updatedData = [...statSelected[statName].data];
      }
      updatedData.push(data);

      statSelected = Object.assign({}, statSelected, {
        [statName]: Object.assign({}, statSelected[statName], {
          data: updatedData,
          rerender: false,
        }),
      });

      return {
        ...prevState,
        statSelected,
      };
    });
  };

  handleResize = () => {
    if (!this.contentRef.current) {
      setTimeout(() => this.handleResize(), 50);
      return;
    }

    const width = this.contentRef.current.containerRef.current.offsetWidth;

    this.setState((prevState) => {
      return {
        ...prevState,
        contentWidth: width,
      };
    });
  };

  getExperiment = () => {
    if (this.onIndex()) {
      this.WSOpen();
    }

    this.props
      .getInsights({
        experiment_name: this.props.experiment_name,
        commit_id: this.props.commit_id,
        insight_name: this.props.insight_name,
      })
      .then((data) => {
        let annotations = {};
        if (data.annotations) {
          data.annotations.forEach((annotationItem) => {
            let annotationCluster = {};
            annotationItem.data.forEach((item) => {
              let predLabel = item.meta.label;
              if (!(predLabel in annotationCluster)) {
                annotationCluster[predLabel] = [];
              }
              annotationCluster[predLabel].push(item);
            });
            annotations[annotationItem.name] = annotationCluster;
          });
        }

        this.props.incProgress();

        this.setState(
          (prevState) => {
            return {
              ...prevState,
              experiment: data,
              annotations: annotations,
              commits: data.commits ? Object.values(data.commits) : [],
              commit: data.commit ? data.commit : null,
              selectedModel: !!data.models ? data.models[0] : false,
              insight_type: data.insight_type,
            };
          },
          () => {
            if (data.dirs) {
              data.dirs.map((item) => {
                if (
                  item &&
                  (item.name === 'weights' || item.name === 'gradients') &&
                  item.data.layers.length
                ) {
                  this.handleWeightsTypeClick(
                    item.name,
                    item.data.layers[0].name,
                    'weight'
                  );
                }
                if (item && item.cat === 'stats' && item.data.stats.length) {
                  this.handleResourceClick(
                    item.name,
                    this.sortStatResourceByKey(item.data.stats)[0]
                  );
                }
              });
            }
            if (data.metrics) {
              const metricsData = {};
              data.metrics.forEach((item) => {
                metricsData[item.name] = {
                  data: item.data,
                  rerender: true,
                };
                this.metricSubscribeToUpdates(item.name, item.format);
              });
              this.setState({ metricsData });
            }
            // if (data.metric_groups) {
            //   data.metric_groups.forEach((item) => {
            //     this.metricSubscribeToUpdates(item.name);
            //   })
            // }
          }
        );
      })
      .catch((err) => {
        if (err.status === 501) {
          this.setState({
            versionError: true,
          });
        } else if (err.status === 404 || err.status === 500) {
          this.setState({
            notFound: true,
          });
        }
      })
      .finally(() => {
        this.setState((prevState) => {
          return {
            ...prevState,
            isLoading: false,
          };
        });

        setTimeout(() => this.props.completeProgress(), 300);
      });
  };

  getDistribution = (distName, layerName, type) => {
    const expName = this.props.experiment_name,
      commHash = this.state.commit.hash,
      path = `dirs+${distName}+${layerName}__${type}`;

    const tmpKey = [expName, commHash, path].join('/');

    let selectedItem = {
      layer: layerName,
      type: type,
      isLoading: false,
      dist: [],
    };

    if (tmpKey in this.distTmp) {
      this.setState((prevState) => {
        const { distributionSelected } = prevState;
        const updatedDistributionSelected = Object.assign(
          {},
          distributionSelected,
          {
            [distName]: Object.assign({}, selectedItem, {
              dist: this.distTmp[tmpKey],
            }),
          }
        );

        return {
          ...prevState,
          distributionSelected: updatedDistributionSelected,
        };
      });
    } else {
      this.props
        .getExperimentComponent(expName, commHash, path)
        .then((distData) => {
          this.distTmp[tmpKey] = distData;

          this.setState((prevState) => {
            const { distributionSelected } = prevState;
            const updatedDistributionSelected = Object.assign(
              {},
              distributionSelected,
              {
                [distName]: Object.assign({}, selectedItem, {
                  dist: distData,
                }),
              }
            );

            return {
              ...prevState,
              distributionSelected: updatedDistributionSelected,
            };
          });
        })
        .catch(() => {
          this.setState((prevState) => {
            const { distributionSelected } = prevState;
            const updatedDistributionSelected = Object.assign(
              {},
              distributionSelected,
              {
                [distName]: selectedItem,
              }
            );

            return {
              ...prevState,
              distributionSelected: updatedDistributionSelected,
            };
          });
        });
    }
  };

  handleClusterOpen = (annotation, label) => {
    this.setState({
      expandCluster: {
        [annotation]: label,
      },
    });
  };

  handleModelOpen = (model) => {
    this.setState({
      selectedModel: model,
    });
  };

  handleBranchChange = (v, { action }) => {
    let experimentName = this.props.experiment_name;

    if (action === 'select-option' && v.value !== experimentName) {
      this.setState({
        selectBranch: v.value,
      });
    }
  };

  handleWeightsTypeClick = (distName, itemName, type) => {
    this.setState((prevState) => {
      const { distributionSelected } = prevState;
      const updatedDistributionSelected = Object.assign(
        {},
        distributionSelected,
        {
          [distName]: {
            layer: itemName,
            type: type,
            dist: null,
            isLoading: true,
          },
        }
      );

      return {
        ...prevState,
        distributionSelected: updatedDistributionSelected,
      };
    });

    this.getDistribution(distName, itemName, type);
  };

  handelCorrelationIndexUpdate = (key, index) => {
    const correlationIndexes = Object.assign(
      {},
      this.state.correlationIndexes,
      { [key]: index }
    );

    this.setState({ correlationIndexes });
  };

  handleStatHeightChange = (statName, height) => {
    this.setState((prevState) => {
      let { statSelected } = prevState;
      statSelected = Object.assign({}, statSelected, {
        [statName]: Object.assign({}, statSelected[statName], {
          height: height,
        }),
      });

      return {
        ...prevState,
        statSelected,
      };
    });
  };

  handleResourceClick = (statName, resourceName) => {
    const expName = this.props.experiment_name,
      commHash = this.state.commit.hash,
      path = `dirs+${statName}+${resourceName}`;

    this.setState((prevState) => {
      const { statSelected } = prevState;

      // Live updates
      if (this.onIndex()) {
        if (
          statSelected &&
          statSelected[statName] &&
          statSelected[statName].name
        ) {
          this.statUnsubscribeFromUpdates(
            statName,
            statSelected[statName].name
          );
        }
        this.statSubscribeToUpdates(statName, resourceName);
      }

      const updatedStatSelected = Object.assign({}, statSelected, {
        [statName]: {
          empty: false,
          isLoading: true,
          height: statSelected[statName] ? statSelected[statName].height : null,
        },
      });

      return {
        ...prevState,
        statSelected: updatedStatSelected,
      };
    });

    this.props
      .getExperimentComponent(expName, commHash, path)
      .then((data) => {
        this.setState((prevState) => {
          const { statSelected } = prevState;
          const updatedStatSelected = Object.assign({}, statSelected, {
            [statName]: {
              data: data,
              rerender: true,
              name: resourceName,
              empty: false,
              isLoading: false,
              height: statSelected[statName]
                ? statSelected[statName].height
                : null,
            },
          });

          return {
            ...prevState,
            statSelected: updatedStatSelected,
          };
        });
      })
      .catch(() => {
        this.setState((prevState) => {
          const { statSelected } = prevState;
          const updatedStatSelected = Object.assign({}, statSelected, {
            [statName]: {
              empty: true,
              isLoading: false,
            },
          });

          return {
            ...prevState,
            statSelected: updatedStatSelected,
          };
        });
      });
  };

  sortStatResourceByKey = (resources) => {
    const resourceIndex = this.getResourcePosIndex;
    const headerItems = resources.map((i) => [i, resourceIndex(i)]);
    headerItems.sort((a, b) => a[1] - b[1]);

    return headerItems.map((i) => i[0]);
  };

  getResourceMetric = (name) => {
    let metric = '';

    switch (name) {
      case 'cpu':
        metric = '%';
        break;
      case 'gpu':
        metric = '%';
        break;
      case 'temp':
        metric = '°C';
        break;
      case 'power_percent':
        metric = '%';
        break;
      case 'power_watts':
        metric = 'W';
        break;
      case 'p_memory_rss':
        metric = 'MB';
        break;
      case 'p_memory_percent':
        metric = '%';
        break;
      case 'memory_used':
        metric = 'MB';
        break;
      case 'memory_percent':
        metric = '%';
        break;
      case 'time':
        metric = 's';
        break;
      case 'disk_percent':
        metric = '%';
        break;
      case 'disk_used':
        metric = 'MB';
        break;
    }

    return metric;
  };

  getResourcePosIndex = (name) => {
    let index = 999;

    switch (name) {
      case 'cpu':
        index = 0;
        break;
      case 'gpu':
        index = 0;
        break;
      case 'power_percent':
        index = 60;
        break;
      case 'power_watts':
        index = 50;
        break;
      case 'p_memory_rss':
        index = 30;
        break;
      case 'p_memory_percent':
        index = 40;
        break;
      case 'memory_used':
        index = 10;
        break;
      case 'memory_percent':
        index = 20;
        break;
      case 'time':
        index = 1;
        break;
    }

    return index;
  };

  _formatResourceName = (name) => {
    let formattedName;

    switch (name) {
      case 'cpu':
        formattedName = 'CPU';
        break;
      case 'gpu':
        formattedName = 'GPU';
        break;
      case 'temp':
        formattedName = 'Temperature';
        break;
      case 'power_percent':
        formattedName = 'Power Percent';
        break;
      case 'power_watts':
        formattedName = 'Power';
        break;
      case 'p_memory_rss':
        formattedName = 'Process Memory (RSS)';
        break;
      case 'p_memory_percent':
        formattedName = 'Process Memory Percent';
        break;
      case 'memory_used':
        formattedName = 'Used Memory';
        break;
      case 'memory_percent':
        formattedName = 'Used Memory Percent';
        break;
      case 'time':
        formattedName = 'Execution Time';
        break;
      case 'disk_used':
        formattedName = 'Used Disk Space';
        break;
      case 'disk_percent':
        formattedName = 'Used Disk Percent';
        break;
    }

    return formattedName || name;
  };

  _formatFileSize = (size) => {
    let formatted = formatSize(size);
    return `${formatted[0]}${formatted[1]}`;
  };

  _renderLayerName = (name) => {
    const nameArr = name.split('__');
    return nameArr.map((item, index) => (
      <>
        <UI.Text inline>{item}</UI.Text>
        {index < nameArr.length - 1 && (
          <UI.Text inline bold type='grey-light'>
            {' '}
            ->{' '}
          </UI.Text>
        )}
      </>
    ));
  };

  _renderMetric = (metric, key) => {
    const data = this.state.metricsData[metric.name].data;

    return (
      <ExperimentCell
        href={this.generateExperimentCellHref(metric.name)}
        style={this.experimentCenterStyle}
        type='metric'
        footerTitle={metric.name}
        key={key * 10 + 5}
      >
        <UI.LineChart
          key={key}
          header={metric.name}
          data={data}
          rerender={this.state.metricsData[metric.name].rerender}
          xAxisFormat='step'
        />
      </ExperimentCell>
    );
  };

  _renderMetricGroup = (metricGroup, key) => {
    return (
      <ExperimentCell
        href={this.generateExperimentCellHref(metricGroup.name)}
        style={this.experimentCenterStyle}
        type='plot-group'
        footerTitle={metricGroup.name}
        key={key * 10 + 6}
        width={2}
      >
        <ExperimentMetricGroup
          data={metricGroup.data}
          labels={metricGroup.labels}
          labelsRange={metricGroup.range}
          meta={metricGroup.meta}
        />
      </ExperimentCell>
    );
  };

  _renderAnnotation = (name, annotation, key) => {
    let expName = this.props.experiment_name,
      commHash = this.state.commit.hash;

    let annotationItemsCount = 0;
    Object.keys(annotation).map((label) => {
      annotationItemsCount += annotation[label].length;
    });

    return (
      <ExperimentCell
        href={this.generateExperimentCellHref(name)}
        style={this.experimentCenterStyle}
        type='annotation'
        footerTitle={name}
        key={key * 10 + 3}
      >
        <div
          className={classNames({
            ExperimentMisClassification__block: true,
            open_sub: !!Object.keys(this.state.expandCluster).length,
          })}
        >
          <div className='ExperimentMisClassification__labels'>
            {Object.keys(annotation).map((label, labelKey) => (
              <div
                className={classNames({
                  ExperimentMisClassification__label: true,
                  open_sub: !!Object.keys(this.state.expandCluster).length,
                  active: this.state.expandCluster[name] === label,
                })}
                onClick={() => this.handleClusterOpen(name, label)}
                key={labelKey}
              >
                <div
                  className='ExperimentMisClassification__label__bg'
                  style={{
                    right: `${
                      ((annotationItemsCount - annotation[label].length) *
                        100) /
                      annotationItemsCount
                    }%`,
                  }}
                />
                <div className='ExperimentMisClassification__label__cont'>
                  <UI.Text uppercase inline>
                    label:{' '}
                  </UI.Text>
                  <UI.Text uppercase bold inline>
                    {label}
                  </UI.Text>
                </div>
              </div>
            ))}
          </div>
          <div className='ExperimentMisClassification__cluster'>
            {Object.keys(annotation).map((label, labelKey) => (
              <div
                key={labelKey}
                className={classNames({
                  ExperimentMisClassification__cluster__item: true,
                  active: this.state.expandCluster[name] === label,
                })}
              >
                {annotation[label].map((clusterItem, clusterKey) => (
                  <div
                    className='ExperimentMisClassification__cluster__cont'
                    key={clusterKey}
                  >
                    <UI.Img
                      className='ExperimentMisClassification__img'
                      src={`${SERVER_HOST}/static/${expName}/${commHash}/${clusterItem.object_path}`}
                    />
                    <div className='ExperimentMisClassification__meta'>
                      {clusterItem.meta.meta_label}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </ExperimentCell>
    );
  };

  _renderModel = (model, key) => {
    let className = classNames({
      ExperimentCheckpoint: true,
      active: this.state.selectedModel === model,
    });

    let experimentName = this.props.experiment_name;

    let commitId = this.state.commit.hash;

    return (
      <div className={className} key={key * 10 + 2}>
        <div
          className='ExperimentCheckpoint__area'
          onClick={() => this.handleModelOpen(model)}
        >
          <div className='ExperimentCheckpoint__header'>
            <UI.Text type='grey-darker' subtitle>
              {model.name}
            </UI.Text>
            <a
              href={`${SERVER_API_HOST}/projects/${experimentName}/${commitId}/models/${model.name}.aim`}
              target='_blank'
              rel='noopener noreferrer'
              download={`${model.name}`}
            >
              Download{' '}
              <UI.Text type='grey-light' small inline>
                (~{this._formatFileSize(model.size)})
              </UI.Text>
            </a>
          </div>
          <div className='ExperimentCheckpoint__body'>
            <UI.Text type='grey-light' small subtitle>
              Epoch: {model.data.epoch}
            </UI.Text>
          </div>
        </div>
      </div>
    );
  };

  _renderCorrelation = (corr, key) => {
    let d = this.state.correlationIndexes[key] || 0;

    let data = [];
    for (let i = 0; i < corr.data[d].length; i++) {
      for (let j = 0; j < corr.data[d][i].length; j++) {
        data.push([i, j, corr.data[d][i][j]]);
      }
    }

    return (
      <ExperimentCell
        href={this.generateExperimentCellHref(corr.name)}
        type='correlation'
        style={this.experimentCenterStyle}
        footerTitle={corr.name}
        key={key * 10 + 1}
      >
        <CorrelationHeatmap
          labels={corr.labels}
          data={data}
          name={corr.name}
          subtitle={`Iteration ${d}`}
        />
        <UI.RangeSlider
          min={0}
          max={corr.data.length - 1}
          value={0}
          onChange={(v) => this.handelCorrelationIndexUpdate(key, v)}
        />
      </ExperimentCell>
    );
  };

  _renderStat = (stat, key) => {
    const statState = this.state.statSelected[stat.name];
    const headerItems = this.sortStatResourceByKey(stat.data.stats);

    const bodyStyle = {};
    if (statState.height) {
      bodyStyle.height = `${statState.height}px`;
    }

    return (
      <ExperimentCell
        href={this.generateExperimentCellHref(stat.name)}
        style={this.experimentCenterStyle}
        type='statistics'
        footerTitle={stat.name}
        key={key * 10 + 4}
        width={2}
        height='auto'
      >
        <div className='ExperimentStat__head'>
          {!!headerItems.length &&
            headerItems.map((resourceKey, key) => (
              <UI.Button
                type={'primary'}
                ghost={statState && statState.name !== resourceKey}
                size='tiny'
                onClick={() => this.handleResourceClick(stat.name, resourceKey)}
                key={key}
              >
                {this._formatResourceName(resourceKey)}
              </UI.Button>
            ))}
        </div>
        <div className='ExperimentStat__body' style={bodyStyle}>
          {!!statState &&
            (statState.empty ||
            (!statState.isLoading &&
              (!statState.data || statState.data.length === 0)) ? (
                <div className='ExperimentStat__resource__empty'>
                  <UI.Text size={6} type='grey-darker'>
                    Resource not found
                  </UI.Text>
                </div>
              ) : statState.isLoading ? (
                <div className='ExperimentCell__body__loader' />
              ) : (
                <ExperimentStatisticsCell
                  data={statState.data}
                  rerender={statState.rerender}
                  name={statState.name}
                  title={this._formatResourceName(statState.name)}
                  metric={this.getResourceMetric(statState.name)}
                  onHeightUpdate={(height) =>
                    this.handleStatHeightChange(stat.name, height)
                  }
                />
              ))}
        </div>
      </ExperimentCell>
    );
  };

  _renderDistribution = (dist, key) => {
    const { layerName, layerType } = this.state.distributionSelected[dist.name];

    const name = `dirs/${dist.name}/${layerName}__${layerType}`;
    const isLoading =
      !this.state.distributionSelected[dist.name] ||
      this.state.distributionSelected[dist.name].isLoading;

    return (
      <ExperimentCell
        href={this.generateExperimentCellHref(dist.name)}
        style={this.experimentCenterStyle}
        type='distribution'
        footerTitle={dist.name}
        key={key * 10}
        width={2}
        height='auto'
      >
        <div className='ExperimentWeights'>
          <div className='ExperimentWeights__navigation'>
            <UI.Menu header='Layers' outline={false} lastChildBorder>
              {dist.data.layers.map((item, key) => (
                <UI.MenuItem
                  key={key}
                  subMenu={[
                    <UI.MenuItem
                      key={0}
                      label='Weights'
                      active={
                        this.state.distributionSelected[dist.name] &&
                        this.state.distributionSelected[dist.name].layer ===
                          item.name &&
                        this.state.distributionSelected[dist.name].type ===
                          'weight'
                      }
                      onClick={() =>
                        this.handleWeightsTypeClick(
                          dist.name,
                          item.name,
                          'weight'
                        )
                      }
                    />,
                    <UI.MenuItem
                      key={1}
                      label='Biases'
                      active={
                        this.state.distributionSelected[dist.name] &&
                        this.state.distributionSelected[dist.name].layer ===
                          item.name &&
                        this.state.distributionSelected[dist.name].type ===
                          'bias'
                      }
                      onClick={() =>
                        this.handleWeightsTypeClick(
                          dist.name,
                          item.name,
                          'bias'
                        )
                      }
                    />,
                  ]}
                  onClick={() =>
                    this.handleWeightsTypeClick(dist.name, item.name, 'weight')
                  }
                  active={
                    this.state.distributionSelected[dist.name] &&
                    this.state.distributionSelected[dist.name].layer ===
                      item.name
                  }
                >
                  {this._renderLayerName(item.name)}
                </UI.MenuItem>
              ))}
            </UI.Menu>
          </div>
          <div className='ExperimentWeights__body'>
            {isLoading ? (
              <div className='ExperimentCell__body__loader' />
            ) : !!this.state.distributionSelected[dist.name].dist.length ? (
              <ExperimentDistributionCell
                data={this.state.distributionSelected[dist.name].dist}
                name={name}
              />
            ) : (
              <div className='ExperimentWeights__nodata'>
                <div className='ExperimentWeights__nodata__layer'>
                  {this._renderLayerName(
                    this.state.distributionSelected[dist.name].layer
                  )}
                </div>
                <div>
                  <UI.Text type='grey' size={6} inline>
                    doesn't have{' '}
                  </UI.Text>
                  <UI.Text type='grey-dark' size={6} bold inline>
                    {this.state.distributionSelected[dist.name].type}
                  </UI.Text>
                </div>
              </div>
            )}
          </div>
        </div>
      </ExperimentCell>
    );
  };

  _renderDiff = () => {
    const diffText = this.state.experiment.diff;

    if (!diffText.trim()) {
      return null;
    }

    const files = parseDiff(diffText);

    const renderFile = ({ oldRevision, newRevision, type, hunks }) => (
      <Diff
        key={`${oldRevision}-${newRevision}`}
        viewType='unified'
        diffType={type}
        hunks={hunks}
      >
        {(hunks) =>
          hunks.map((hunk) => [
            <Decoration key={'decoration-' + hunk.content}>
              <p className='hunk-changes-decoration'>
                @@ --{hunk.oldStart},{hunk.oldLines} ++{hunk.newStart},
                {hunk.newLines} @@
              </p>
            </Decoration>,
            <Hunk key={'hunk-' + hunk.content} hunk={hunk} />,
          ])
        }
      </Diff>
    );

    return (
      <ExperimentCell
        href={this.generateExperimentCellHref('Code')}
        style={this.experimentCenterStyle}
        type='diff'
        footerTitle='Code'
        key={'diff'}
        width={2}
        height='auto'
        className='ExperimentDiff'
      >
        <UI.Segments className='ExperimentDiff__body'>
          {files.map((file) => (
            <UI.Segment className='ExperimentDiff__item'>
              <UI.Text type='grey' className='ExperimentDiff__item__header'>
                <UI.Icon
                  i='nc-single-folded-content'
                  scale={1.1}
                  spacingRight
                />
                a/{file.oldPath} b/{file.newPath}
              </UI.Text>
              {renderFile(file)}
            </UI.Segment>
          ))}
        </UI.Segments>
      </ExperimentCell>
    );
  };

  _renderHyperparameters = () => {
    const params = this.state.experiment.hyperparameters;

    return (
      <>
        <ExperimentCell
          href={this.generateExperimentCellHref('hyperparameters')}
          style={this.experimentCenterStyle}
          type='params'
          footerTitle='Hyper Parameters'
          key={'params'}
          width={1}
          className='ExperimentParams'
        >
          <div className='ExperimentParams__item title' key={0}>
            <div></div>
            <div>
              <UI.Text type='primary' overline bold>
                Key
              </UI.Text>
            </div>
            <div>
              <UI.Text type='primary' overline bold>
                Value
              </UI.Text>
            </div>
          </div>
          {Object.keys(params).map((item, key) => (
            <div className='ExperimentParams__item' key={key}>
              <div className='ExperimentParams__item__idx'>{key + 1}</div>
              <div>{item}</div>
              <div>{params[item]}</div>
            </div>
          ))}
        </ExperimentCell>
      </>
    );
  };

  _renderExperimentHeader = () => {
    let experimentName = this.props.experiment_name;

    return (
      <>
        {!!this.props.project.branches && !!this.props.project.branches.length && (
          <div className='InsightContent__header'>
            <UI.Dropdown
              className='InsightContent__branchSelect'
              width={200}
              options={
                this.props.project.branches &&
                this.props.project.branches.map((val) => ({
                  value: val,
                  label: `${val}`,
                }))
              }
              defaultValue={{
                value: experimentName,
                label: `Experiment: ${experimentName}`,
              }}
              onChange={this.handleBranchChange}
            />
            <div>
              {!!this.state.commit && (
                <>
                  {!this.state.commit.index ? (
                    (!Number.isInteger(this.state.commit.message) ||
                      `${this.state.commit.message}`.length !== 10) && (
                      <UI.Text type='grey-darker'>
                        {this.state.commit.message}
                      </UI.Text>
                    )
                  ) : (
                    <CurrentRunIndicator />
                  )}
                  {!this.state.commit.index && (
                    <UI.Text type='grey' small>
                      Committed on{' '}
                      {moment.unix(this.state.commit.date).format('D MMM, YY')}
                    </UI.Text>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  _renderEmptyBranch = () => {
    let experimentName = this.props.experiment_name;

    return (
      <>
        {this._renderExperimentHeader()}
        <div className='InsightContent__empty'>
          <ReactSVG
            className='InsightContent__empty__illustration'
            src={require('../../../asset/illustrations/no_data.svg')}
          />
          <UI.Text size={6} type='grey-light' center>
            Your experiment '{experimentName}' is empty
          </UI.Text>
        </div>
      </>
    );
  };

  _renderEmptyIndex = () => {
    return (
      <>
        {this._renderExperimentHeader()}
        <div className='InsightContent__empty'>
          <ReactSVG
            className='InsightContent__empty__illustration'
            src={require('../../../asset/illustrations/no_data.svg')}
          />
          <UI.Text size={6} type='grey-light' center>
            Nothing to show. Run a training to collect and visualize insights.
          </UI.Text>
        </div>
      </>
    );
  };

  _renderNavigation = () => {
    if (
      !this.state.experiment ||
      !this.state.experiment.init ||
      !this.state.experiment.branch_init
    ) {
      return null;
    }

    const experimentName = this.props.experiment_name;

    return (
      <CommitNavigation
        commits={this.state.commits}
        active={this.state.commit.hash}
        experimentName={experimentName}
      />
    );
  };

  _renderAllInsightsInner = () => {
    let selectedModel = this.state.selectedModel;

    if (this.state.versionError) {
      return <IncompatibleVersion />;
    }

    if (!this.state.experiment.branch_init) {
      return this._renderEmptyBranch();
    }

    if (this.state.experiment.index_empty) {
      return this._renderEmptyIndex();
    }

    let dirs = [...this.state.experiment.dirs];
    dirs.sort((a, b) => {
      if (a.name && b.name) {
        if (a.name < b.name) return 1;
        if (a.name > b.name) return -1;
      }
      return 0;
    });

    return (
      <div>
        {this._renderExperimentHeader()}
        <div className='InsightContent__grid'>
          <div className='InsightContent__grid__wrapper'>
            {this.state.experiment.metrics.map((item, key) =>
              this._renderMetric(item, key)
            )}
            {this.state.experiment.metric_groups.map((item, key) =>
              this._renderMetricGroup(item, key)
            )}
            {Object.keys(this.state.annotations).map((itemKey, key) =>
              this._renderAnnotation(
                itemKey,
                this.state.annotations[itemKey],
                key
              )
            )}
            {this.state.experiment.correlations.map((item, key) =>
              this._renderCorrelation(item, key)
            )}
            {dirs.map((item, key) => (
              <>
                {(item.name === 'weights' || item.name === 'gradients') &&
                  this._renderDistribution(item, key)}
              </>
            ))}
            {dirs.map((item, key) => (
              <>{item.cat === 'stats' && this._renderStat(item, key)}</>
            ))}
            {!!this.state.experiment.diff && this._renderDiff()}
            {!!Object.keys(this.state.experiment.hyperparameters).length &&
              this._renderHyperparameters()}
            {!!this.state.experiment.models.length && (
              <ExperimentCell
                href={this.generateExperimentCellHref(
                  this.state.experiment.models[0].data.name
                )}
                style={this.experimentCenterStyle}
                type='model'
                footerTitle={this.state.experiment.models[0].data.name}
                height='auto'
                width={2}
              >
                <div className='ExperimentModel__body'>
                  <div className='ExperimentModel__list'>
                    {Object.keys(
                      this.state.experiment.models
                    ).map((itemKey, key) =>
                      this._renderModel(
                        this.state.experiment.models[itemKey],
                        key
                      )
                    )}
                  </div>
                  <div className='ExperimentModel__detail'>
                    {!selectedModel && (
                      <div className='ExperimentModel__detail__default'>
                        <UI.Text type='grey-light' size={6}>
                          Select a model
                          <br />
                          from left menu
                        </UI.Text>
                      </div>
                    )}
                    {!!selectedModel && (
                      <div className='ExperimentModel__detail__item'>
                        <UI.Text type='grey-dark' divided spacing>
                          {selectedModel.name}
                        </UI.Text>
                        {!!selectedModel.data.meta && (
                          <>
                            {Object.keys(selectedModel.data.meta).map(
                              (item, key) => (
                                <UI.Text key={key} type='grey'>
                                  {item}: {selectedModel.data.meta[item]}
                                </UI.Text>
                              )
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ExperimentCell>
            )}
          </div>
        </div>
      </div>
    )
  }

  _renderAllInsights = () => {  
    return (
      <ProjectWrapper
        experimentName={this.state.experiment_name}
        navigation={this._renderNavigation()}
        contentWidth={this.state.contentWidth}
      >
        <Helmet>
          <meta title='' content='' />
        </Helmet>
        <UI.Container size='small' ref={this.contentRef}>
          {this._renderAllInsightsInner()}
        </UI.Container>
      </ProjectWrapper>
    );
  };

  _renderOneInsight(insight_type) {
    let selectedModel = this.state.selectedModel;

    if (this.state.versionError) {
      return <IncompatibleVersion />;
    }

    if (!this.state.experiment.branch_init) {
      return this._renderEmptyBranch();
    }

    if (this.state.experiment.index_empty) {
      return this._renderEmptyIndex();
    }

    let dirs = [...this.state.experiment.dirs];
    dirs.sort((a, b) => {
      if (a.name && b.name) {
        if (a.name < b.name) return 1;
        if (a.name > b.name) return -1;
      }
      return 0;
    });

    let render_content = null;
    switch (insight_type) {
      case 'metrics':
        render_content = (
          this.state.experiment.metrics.map((item, key) =>
            this._renderMetric(item, key)
          )
        );
        break;
      case 'metric_groups':
        render_content = (
          this.state.experiment.metric_groups.map((item, key) =>
            this._renderMetricGroup(item, key)
          )
        );
        break;
      case 'annotations':
        render_content = (
          Object.keys(this.state.annotations).map((itemKey, key) =>
            this._renderAnnotation(
              itemKey,
              this.state.annotations[itemKey],
              key
            )
          )
        );
        break;
      case 'correlation':
        render_content = (
          this.state.experiment.correlations.map((item, key) =>
            this._renderCorrelation(item, key)
          )
        );
        break;
      case 'dir':
        render_content = (
          dirs.map((item, key) => (
            <>
              {(item.name === 'weights' || item.name === 'gradients') &&
                this._renderDistribution(item, key)}
            </>
          ))
        );
        break;
      case 'stat':
        render_content = (
          dirs.map((item, key) => (
            <>{item.cat === 'stats' && this._renderStat(item, key)}</>
          ))
        );
        break;
      case 'hyperparameters':
        render_content = (
          !!Object.keys(this.state.experiment.hyperparameters).length &&
              this._renderHyperparameters()
        );
        break;
      case 'models':
        render_content = (
          !!this.state.experiment.models.length && (
            <ExperimentCell
              href={this.generateExperimentCellHref(
                this.state.experiment.models[0].data.name
              )}
              style={this.experimentCenterStyle}
              type='model'
              footerTitle={this.state.experiment.models[0].data.name}
              height='auto'
              width={2}
            >
              <div className='ExperimentModel__body'>
                <div className='ExperimentModel__list'>
                  {Object.keys(
                    this.state.experiment.models
                  ).map((itemKey, key) =>
                    this._renderModel(
                      this.state.experiment.models[itemKey],
                      key
                    )
                  )}
                </div>
                <div className='ExperimentModel__detail'>
                  {!selectedModel && (
                    <div className='ExperimentModel__detail__default'>
                      <UI.Text type='grey-light' size={6}>
                        Select a model
                        <br />
                        from left menu
                      </UI.Text>
                    </div>
                  )}
                  {!!selectedModel && (
                    <div className='ExperimentModel__detail__item'>
                      <UI.Text type='grey-dark' divided spacing>
                        {selectedModel.name}
                      </UI.Text>
                      {!!selectedModel.data.meta && (
                        <>
                          {Object.keys(selectedModel.data.meta).map(
                            (item, key) => (
                              <UI.Text key={key} type='grey'>
                                {item}: {selectedModel.data.meta[item]}
                              </UI.Text>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ExperimentCell>
          )
        );
        break;
    }
    return render_content;
  }

  render() {
    if (this.state.isLoading) {
      return null;
    }

    if (this.state.notFound) {
      return <Redirect to={screens.NOT_FOUND} />;
    }

    if (this.state.selectBranch) {
      return (
        <Redirect
          to={buildUrl(screens.HUB_PROJECT_EXPERIMENT, {
            experiment_name: this.state.selectBranch,
            commit_id: 'index',
          })}
        />
      );
    }

    if (this.props.insight_name == null) {
      return this._renderAllInsights();
    } else {
      return this._renderOneInsight(this.state.insight_type);
    }
  }
}

export default storeUtils.getWithState(classes.INSIGHT_CONTENT, InsightContent);