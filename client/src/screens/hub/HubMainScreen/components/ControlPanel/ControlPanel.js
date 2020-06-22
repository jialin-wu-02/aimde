import './ControlPanel.less';

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

import * as classes from '../../../../../constants/classes';
import * as storeUtils from '../../../../../storeUtils';
import UI from '../../../../../ui';
import PopUp from '../PopUp/PopUp';
import { buildUrl } from '../../../../../utils';
import { HUB_PROJECT_EXPERIMENT, HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL } from '../../../../../constants/screens';
import { classNames } from '../../../../../utils';
import moment from 'moment';

const d3 = require('d3');

const popUpDefaultWidth = 250;
const popUpDefaultHeight = 200;
const circleRadius = 4;
const circleActiveRadius = 7;

class ControlPanel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      visBox: {
        ratio: 0.5,
        margin: {
          top: 20, right: 20, bottom: 30, left: 60,
        },
        height: null,
        width: null,
      },
      plotBox: {
        height: null,
        width: null,
      },
      chart: {
        xNum: 0,
        xMax: 0,
        xSteps: [],
        xScale: null,
        yScale: null,
      },
      chartPopUp: {
        display: false,
        left: 0,
        top: 0,
        selectedTags: [],
        selectedTagsLoading: false,
        lineData: {},
        lineIndex: null,
        pointData: {},
      },
      tagPopUp: {
        display: false,
        loading: false,
        left: 0,
        top: 0,
        tags: [],
      },
      tooltipPopUp: {
        display: false,
        index: null,
        width: 220,
        height: 200,
        active: null,
      },
      commitPopUp: {
        display: false,
        left: 0,
        top: 0,
        content: null,
        processKillBtn: {
          loading: false,
          disabled: false,
        },
      },
    };

    this.parentRef = React.createRef();
    this.visRef = React.createRef();
    this.tooltipPopUpRef = React.createRef();
    this.svg = null;
    this.plot = null;
    this.bgRect = null;
    this.hoverLine = null;
    this.hoverCircles = null;
    this.isInit = false;

    this.curves =  [
      'curveLinear',
      'curveBasis',
      'curveBundle',
      'curveCardinal',
      'curveCatmullRom',
      'curveMonotoneX',
      'curveMonotoneY',
      'curveNatural',
      'curveStep',
      'curveStepAfter',
      'curveStepBefore',
      'curveBasisClosed',
    ];
  }

  componentDidMount() {
    this.initD3();
    this.draw();
    window.addEventListener('resize', () => this.resize());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => this.resize());
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data)) {
      this.draw();
    }
  }

  initD3 = () => {
    d3.selection.prototype.moveToFront = function() {
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
  };

  resize = () => {
    this.draw();
  };

  draw = () => {
    if (!this.isEmpty()) {
      // Clear panel
      if (this.isInit) {
        this.hideHoverLine();
        if (this.hoverCircles) {
          this.hoverCircles.selectAll('*.focus').remove();
        }
        this.hideActionTooltips(false, () => {
          this.initArea().then(() => this.plotData());
        });
      } else {
        this.isInit = true;
        this.initArea().then(() => this.plotData());
      }
    }
  };

  isEmpty = () => {
    return !this.props.data || !this.props.data.length;
  };

  initArea = () => {
    return new Promise((resolve) => {
      const parent = d3.select(this.parentRef.current);
      const parentWidth = parent.node().getBoundingClientRect().width;

      const visArea = d3.select(this.visRef.current);
      visArea.selectAll('*').remove();

      const { margin, ratio } = this.state.visBox;
      const width = parentWidth;
      const height = parentWidth * ratio;

      let xNum = 0, xMax = 0, xSteps = [];
      this.props.data.forEach(i => {
        if (i.num_steps > xMax) {
          xMax = i.num_steps;
        }
        if (i.data.length > xNum) {
          xNum = i.data.length;
          xSteps = i.data.map(s => s.step);
        }
      });

      // X and Y scales
      const xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([0, width - margin.left - margin.right]);

      let yMax = d3.max(this.props.data.map((i) => Math.max(...i.data.map(i => i.value))));
      let yMin = d3.min(this.props.data.map((i) => Math.min(...i.data.map(i => i.value))));
      const diff = yMax - yMin;

      yMax += diff * 0.1;
      yMin -= diff * 0.1;

      const yScale = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([height - margin.top - margin.bottom, 0]);

      this.setState({
        ...this.state,
        visBox: {
          ...this.state.visBox,
          width,
          height,
        },
        plotBox: {
          ...this.state.plotBox,
          width: width - margin.left - margin.right,
          height: height - margin.top - margin.bottom,
        },
        chart: {
          ...this.state.chart,
          xNum,
          xMax,
          xSteps,
          xScale,
          yScale,
        },
      }, () => {
        visArea.style('width', `${this.state.visBox.width}px`)
          .style('height', `${this.state.visBox.height}px`);

        const handleAreaMouseOver = this.handleAreaMouseOver;
        const handleAreaMouseMove = this.handleAreaMouseMove;
        const handleAreaMouseOut = this.handleAreaMouseOut;

        this.svg = visArea.append('svg')
          .attr('width', width)
          .attr('height', height)
          .on('mouseover', function () {
            handleAreaMouseOver();
          })
          .on('mousemove', function () {
            handleAreaMouseMove(d3.mouse(this));
          })
          .on('mouseout', function () {
            handleAreaMouseOut(d3.mouse(this));
          });

        const handleBgRectClick = this.handleBgRectClick;

        this.bgRect = this.svg.append('rect')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', width - margin.left - margin.right)
          .attr('height', height - margin.top - margin.bottom)
          .style('fill', 'transparent')
          .on('click', function () {
            handleBgRectClick();
          });

        this.plot = this.svg.append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        resolve();
      });
    });
  };

  plotData = () => {
    const data = this.props.data;

    if (!data || !data.length) {
      return;
    }

    const { height } = this.state.plotBox;

    // X and Y axis
    this.plot.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(this.state.chart.xScale));

    this.plot.append('g')
      .attr('class', 'y axis')
      .call(d3.axisLeft(this.state.chart.yScale));

    // const handleLineClick = this.handleLineClick;
    // const handlePointClick = this.handlePointClick;
    // const handleLineMouseOver = this.handleLineMouseOver;
    // const handleLineMouseOut = this.handleLineMouseOut;

    this.hoverLine = this.plot.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', height)
      .attr('class', 'HoverLine')
      .style('stroke-width', 1)
      .style('fill', 'none')
      .style('display', 'none');

    // Lines
    data.forEach((commit, i) => {
      const line = d3.line()
        .x((d, i) => this.state.chart.xScale(d.step))
        .y(d => this.state.chart.yScale(d.value))
        .curve(d3[this.curves[5]]);

      this.plot.append('path')
        .datum(commit.data)
        .attr('data-hash', commit.hash)
        .style('stroke', this.getCommitColor(commit))
        .style('fill', 'none')
        .attr('class', `PlotLine PlotLine-${i}`)
        .attr('d', line);
      // .on('click', function () {
      //   handleLineClick(d3.select(this), d3.mouse(this));
      // })
      // .on('mouseover', function () {
      //   handleLineMouseOver(d3.select(this));
      // })
      // .on('mouseout', function () {
      //   handleLineMouseOut(d3.select(this));
      // });
    });

    this.hoverCircles = this.plot.append('g');
    // /*
    //  * Glow effects (Optional)
    //  */
    // const defs = svg.append('defs');
    // const glowDeviation = '2';
    //
    // // Filter for the outside glow
    // const filter = defs.append('filter').attr('id', 'glow');
    // filter.append('feGaussianBlur')
    //   .attr('stdDeviation', glowDeviation)
    //   .attr('result', 'coloredBlur');
    //
    // const feMerge = filter.append('feMerge');
    // feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    // feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    //
    // // Add the glow!!
    // d3.selectAll('.glowed').style('filter', 'url(#glow)');
  };

  getCommitColor = (commit, alpha=1) => {
    if (commit.color) {
      return commit.color;
    }

    const index = commit.hash.split('').map((c, i) => commit.hash.charCodeAt(i)).reduce((a, b) => a + b);
    const r = 50;
    const g = ( index * 27 ) % 255;
    const b = ( index * 13 ) % 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  showHoverLine = (x) => {
    if (this.state.tooltipPopUp.display) {
      return;
    }

    this.hoverLine
      .style('display', null);
  };

  moveHoverLine = (x) => {
    const data = this.state.chart.xSteps;

    const xPoint = this.state.chart.xScale.invert(x);
    const index = d3.bisect(data, xPoint, 1);
    const a = data[index - 1];
    const b = data[index];

    const p = xPoint - a > b - xPoint ? b : a;

    const lineX = this.state.chart.xScale(p);

    if (this.state.tooltipPopUp.index === p) {
      return;
    }

    // Remove circles
    this.hoverCircles.selectAll('*:not(.focus)').remove();

    this.hoverLine
      .attr('x1', lineX)
      .attr('x2', lineX);

    this.drawHoverCircles(lineX, p);

    this.setState(prevState => ({
      ...prevState,
      tooltipPopUp: {
        ...prevState.tooltipPopUp,
        index: p,
        display: true,
        left: this.positionPopUp(
          lineX, 0, null,
          prevState.tooltipPopUp.width,
          prevState.tooltipPopUp.height).left,
      },
    }));
  };

  hideHoverLine = () => {
    if (!this.state.tooltipPopUp.display) {
      return;
    }

    this.plot.selectAll('.PlotLine').classed('active', false);

    this.hoverCircles.selectAll('*:not(.focus)').remove();

    this.hoverLine
      .style('display', 'none');
    this.setState(preState => ({
      ...preState,
      tooltipPopUp: {
        ...preState.tooltipPopUp,
        display: false,
      },
    }));
  };

  positionPopUp = (x, y, chained=null, popUpWidth=popUpDefaultWidth, popUpHeight=popUpDefaultHeight) => {
    const { margin } = this.state.visBox;
    const { width, height } = this.state.plotBox;

    const leftOverflow = x => popUpWidth + x > width;
    const topOverflow = y => popUpHeight + y > height;

    let left = 0, top = 0, chainArrow = null;

    if (chained !== null) {
      if (chained.left + 2 * popUpWidth > width) {
        left = chained.left - popUpWidth;
        chainArrow = 'right';
      } else {
        left = x;
        chainArrow = 'left';
      }
      top = chained.top;
    } else {
      if (leftOverflow(x)) {
        left = x - popUpWidth + margin.left;
      } else {
        left = x + margin.left;
      }

      if (topOverflow(y)) {
        top = y - popUpHeight + margin.top;
      } else {
        top = y + margin.top;
      }
    }

    return {
      left,
      top,
      chainArrow,
    };
  };

  hideActionTooltips = (onlySecondary=false, callback=null) => {
    this.setState(prevState => {
      const state = {
        ...prevState,
        tagPopUp: {
          ...prevState.tagPopUp,
          display: false,
        },
        commitPopUp: {
          ...prevState.tagPopUp,
          display: false,
        }
      };

      if (!onlySecondary) {
        Object.assign(state, {
          chartPopUp: {
            ...prevState.chartPopUp,
            display: false,
          },
        });
      }

      return state;
    }, () => {
      if (callback) {
        callback();
      }
    });
  };

  drawHoverCircles = (lineX, pIndex) => {
    // TODO: rerender only when pIndex is changed

    const handlePointClick = this.handlePointClick;

    // Draw circles
    for (let lineIndex in this.props.data) {
      const line = this.props.data[lineIndex];
      const lineVal = this.getLineValueByStep(line.data, pIndex);
      if (lineVal) {
        const x = lineX;
        const y = this.state.chart.yScale(lineVal);

        let focusElemExists = false;
        this.hoverCircles.select('*.focus').each(function (d) {
          const focusElem = d3.select(this);
          if (focusElem.attr('data-x') == lineX && focusElem.attr('data-y') == y) {
            focusElemExists = true;
          }
        });
        if (focusElemExists) {
          continue;
        }

        this.hoverCircles.append(`circle`)
          .attr('class', `HoverCircle HoverCircle-${pIndex}`)
          .attr('cx', lineX)
          .attr('cy', y)
          .attr('r', circleRadius)
          .attr('data-x', lineX)
          .attr('data-y', y)
          .attr('data-index', pIndex)
          .attr('data-line-index', lineIndex)
          .style('fill', this.getCommitColor(line))
          .on('click', function () {
            handlePointClick(lineIndex, x, y, pIndex, d3.select(this));
          });
      }
    }

    this.hoverCircles.selectAll('*.focus').moveToFront();
  };

  targetHoverCircle = (x, y) => {
    this.hoverCircles.selectAll('*.focus').moveToFront();

    let nearestY = null, nearestIndex = null, nearestCircle = null;

    // Find the nearest circle
    this.hoverCircles.selectAll('.HoverCircle').each(function (d) {
      const elem = d3.select(this);
      const elemY = elem.attr('data-y');
      const r = Math.abs(elemY - y);

      if (nearestY === null || r < nearestY) {
        nearestY = r;
        nearestIndex = elem.attr('data-line-index');
        nearestCircle = elem;
      }

      if (!elem.classed('focus')) {
        elem.classed('active', false).attr('r', circleRadius);
      }
    });

    if (!nearestCircle) {
      return;
    }

    // Update circle
    if (!nearestCircle.classed('focus')) {
      nearestCircle.classed('active', true).attr('r', circleActiveRadius).moveToFront();
    }

    // Update line
    this.plot.selectAll('.PlotLine')
      .classed('active', false);
    // .classed('fade', true);
    this.plot.selectAll(`.PlotLine-${nearestIndex}`)
      .classed('active', true);
    // .classed('fade', false);

    this.setState(prevState => ({
      ...prevState,
      tooltipPopUp: {
        ...prevState.tooltipPopUp,
        active: nearestIndex,
      },
    }));
  };

  getLineValueByStep = (data, step) => {
    const item = this.getLineDataByStep(data, step);
    return item ? item.value : null;
  };

  getLineDataByStep = (data, step) => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].step === step) {
        return data[i];
      } else if (data[i].step > step) {
        return null;
      }
    }

    return null;
  };

  getCommitTags = (lineData) => {
    this.props.getCommitTags(lineData.hash)
      .then((data) => {
        this.setState((prevState) => ({
          ...prevState,
          chartPopUp: {
            ...prevState.chartPopUp,
            selectedTags: data,
          },
        }));
      })
      .catch(() => {
        this.setState((prevState) => ({
          ...prevState,
          chartPopUp: {
            ...prevState.chartPopUp,
            selectedTags: [],
          },
        }));
      })
      .finally(() => {
        this.setState((prevState) => ({
          ...prevState,
          chartPopUp: {
            ...prevState.chartPopUp,
            selectedTagsLoading: false,
          },
        }));
      });
  };

  handleAreaMouseOver = () => {
  };

  handleAreaMouseMove = (mouse) => {
    const { width, height, margin } = this.state.visBox;
    const padding = 10;

    if (mouse[0] < margin.left - padding || mouse[0] > width - margin.right + padding ||
      mouse[1] < margin.top - padding || mouse[1] > height - margin.bottom + padding) {
      this.hideHoverLine();
    } else {
      this.showHoverLine(mouse[0]);
      this.moveHoverLine( mouse[0] - margin.left);
      this.targetHoverCircle(mouse[0] - margin.left, mouse[1] - margin.top)
    }
  };

  handleAreaMouseOut = (mouse) => {
    const { width, height, margin } = this.state.visBox;
    const padding = 10;

    if (mouse[0] < margin.left - padding || mouse[0] > width - margin.right + padding ||
      mouse[1] < margin.top - padding || mouse[1] > height - margin.bottom + padding) {
      this.hideHoverLine();
    }
  };

  handleBgRectClick = () => {
    this.hideActionTooltips();
    this.hoverCircles.selectAll('*.focus').remove();
  };

  handleLineMouseOver = (elem) => {
    // elem.style('stroke-width', 3);
  };

  handleLineMouseOut = (elem) => {
    // elem.style('stroke-width', 1);
  };

  handleLineClick = () => {
  };

  handleProcessKill = (pid, idx) => {
    this.setState(prevState => ({
      ...prevState,
      commitPopUp: {
        ...prevState.commitPopUp,
        processKillBtn: {
          loading: true,
          disabled: true,
        },
      },
    }));

    this.props.killRunningExecutable(pid).then((data) => {
      // this.getProcesses();
      this.handleCommitInfoClick(idx);
    });
  };

  handleCommitInfoClick = (lineIndex) => {
    const data = this.props.data;
    const lineData = data[lineIndex];

    const pos = this.positionPopUp(
      this.state.chartPopUp.left + popUpDefaultWidth,
      this.state.chartPopUp.top,
      this.state.chartPopUp);

    this.hideActionTooltips(true, () => {
      this.setState(prevState => ({
        ...prevState,
        commitPopUp: {
          ...prevState.commitPopUp,
          display: true,
          left: pos.left,
          top: pos.top,
          chainArrow: pos.chainArrow,
          processKillBtn: {
            loading: false,
            disabled: false,
          },
          content: (
            <>
              <UI.Text type='grey' center>Loading..</UI.Text>
            </>
          ),
        },
      }));

      this.props.getCommitInfo(lineData.branch, lineData.hash).then((data) => {
        const content = (
          <>
            <UI.Text type='grey' small>
              {moment.unix(lineData.date).format('HH:mm · D MMM, YY')}
            </UI.Text>
            <Link
              to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                experiment_name: lineData.branch,
                commit_id: lineData.hash,
              })}
            >
              <UI.Text type='primary'>Detailed View</UI.Text>
            </Link>
            <UI.Line />
            {(!Number.isInteger(lineData.msg) || `${lineData.msg}`.length !== 10) &&
            <>
              <UI.Text type='grey-darker' small spacing>{lineData.msg}</UI.Text>
              <UI.Line />
            </>
            }
            <UI.Text type='grey' small>Experiment: {lineData.branch}</UI.Text>
            <UI.Text type='grey' small>Hash: {lineData.hash}</UI.Text>
            {!!data.process &&
              <>
                <UI.Line />
                {!!data.process.uuid &&
                  <Link to={buildUrl(HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL, {
                    process_id: data.process.uuid
                  })}>
                    <UI.Text>Process</UI.Text>
                  </Link>
                }
                <UI.Text type='grey' small>Process status: {data.process.finish ? 'finished' : 'running'}</UI.Text>
                {!!data.start_date &&
                  <UI.Text type='grey' small>
                    Time: {Math.round((
                      data.process.finish
                        ? (data.date - data.start_date)
                        : data.process.time
                    ))}s
                  </UI.Text>
                }
                {!!data.process.pid &&
                  <div className='CommitPopUp__process'>
                    <UI.Text type='grey' small inline>PID: {data.process.pid} </UI.Text>
                    <UI.Button
                      onClick={() => this.handleProcessKill(data.process.pid, lineIndex)}
                      type='negative'
                      size='tiny'
                      inline
                      {...this.state.commitPopUp.processKillBtn}
                    >
                      Kill
                    </UI.Button>
                  </div>
                }
              </>
            }
          </>
        );

        this.setState(prevState => ({
          ...prevState,
          commitPopUp: {
            ...prevState.commitPopUp,
            content: content,
          },
        }));
      });
    });
  };

  handlePointClick = (lineIndex, x, y, pointX, pointElem) => {
    const data = this.props.data;
    const lineData = data[lineIndex];
    const pointData = this.getLineDataByStep(lineData.data, pointX);

    const pos = this.positionPopUp(x, y);

    this.hoverCircles.selectAll('*.focus').each(function (d) {
      const circle = d3.select(this);

      circle.classed('focus', false)
        .attr('r', circleRadius);

      if (circle.attr('data-x') != x) {
        circle.remove();
      }
    });

    pointElem
      .classed('focus', true)
      .classed('active', false)
      .attr('r', circleActiveRadius)
      .moveToFront();

    this.hideActionTooltips(false, () => {
      this.setState((prevState) => {
        return {
          ...prevState,
          chartPopUp: {
            left: pos.left,
            top: pos.top,
            display: true,
            selectedTags: [],
            selectedTagsLoading: true,
            lineData,
            lineIndex,
            pointData,
          },
        };
      });

      this.getCommitTags(lineData);
    });
  };

  handleTooltipClick = () => {
    // TODO: hide action tooltips on tooltip click
    // this.hideActionTooltips();
    // this.hoverCircles.selectAll('*.focus').remove();
  };

  handleTagItemClick = (lineData, tag) => {
    this.setState((prevState) => ({
      ...prevState,
      chartPopUp: {
        ...prevState.chartPopUp,
        selectedTagsLoading: true,
      },
    }));

    this.props.updateCommitTag({
      commit_hash: lineData.hash,
      tag_id: tag.id,
      experiment_name: lineData.branch,
    }).then(tagsIds => {
      this.getCommitTags(lineData);
    });
  };

  handleAttachTagClick = (lineData) => {
    const pos = this.positionPopUp(
      this.state.chartPopUp.left + popUpDefaultWidth,
      this.state.chartPopUp.top,
      this.state.chartPopUp);

    this.setState(prevState => ({
      ...prevState,
      tagPopUp: {
        ...prevState.tagPopUp,
        ...pos,
        display: true,
        isLoading: true,
      },
    }));

    this.hideActionTooltips(true, () => {
      this.props.getTags().then(data => {
        this.setState(prevState => ({
          ...prevState,
          tagPopUp: {
            ...prevState.tagPopUp,
            display: true,
            tags: data,
            isLoading: false,
          },
        }));
      });
    });
  };

  _renderContent = () => {
    return (
      <>
        <div ref={this.visRef} className='ControlPanel__svg' />
        <div className='ControlPanel__body'>
          {this.state.chartPopUp.display &&
            <PopUp
              className='ChartPopUp'
              left={this.state.chartPopUp.left}
              top={this.state.chartPopUp.top}
              xGap={true}
            >
              <div>
                <div>
                  {!this.state.chartPopUp.selectedTagsLoading
                    ? (
                      <div className='ControlPanel__popup__tags__wrapper'>
                        <UI.Text overline type='grey-darker'>tag</UI.Text>
                        <div className='ControlPanel__popup__tags'>
                          {this.state.chartPopUp.selectedTags.length
                            ? (
                              <>
                                {this.state.chartPopUp.selectedTags.map((tagItem, i) =>
                                  <UI.Label key={i} color={tagItem.color}>
                                    {tagItem.name}
                                  </UI.Label>
                                )}
                              </>
                            )
                            : <UI.Label>No attached tag</UI.Label>
                          }
                          <div
                            className='ControlPanel__popup__tags__update'
                            onClick={() => this.handleAttachTagClick(this.state.chartPopUp.lineData)}
                          >
                            <UI.Icon i='nc-pencil' />
                          </div>
                        </div>
                      </div>
                    )
                    : (
                      <UI.Text type='grey' center spacingTop>Loading..</UI.Text>
                    )
                  }
                  <UI.Line />
                </div>
                <UI.Text
                  className='link'
                  type='primary'
                  onClick={() => this.handleCommitInfoClick(this.state.chartPopUp.lineIndex)}
                >
                  Run details
                </UI.Text>
                <UI.Line />
                <UI.Text color={this.getCommitColor(this.state.chartPopUp.lineData)}>
                  {Math.round(this.state.chartPopUp.pointData.value*10e9)/10e9}
                </UI.Text>
                <UI.Text type='grey' small>Epoch {this.state.chartPopUp.pointData.epoch}</UI.Text>
                <UI.Text type='grey' small>Step {this.state.chartPopUp.pointData.step}</UI.Text>
              </div>
            </PopUp>
          }
          {this.state.tagPopUp.display &&
            <PopUp
              className='TagPopUp'
              left={this.state.tagPopUp.left}
              top={this.state.tagPopUp.top}
              chainArrow={this.state.tagPopUp.chainArrow}
              xGap={true}
            >
              {this.state.tagPopUp.isLoading
                ? (
                  <UI.Text type='grey' center>Loading..</UI.Text>
                )
                : (
                  <div className='TagPopUp__tags'>
                    <UI.Text className='TagPopUp__tags__title' type='grey'>Select tag</UI.Text>
                    <UI.Line spacing={false} />
                    <div className='TagPopUp__tags__box'>
                      {this.state.tagPopUp.tags.map((tag, tagKey) =>
                        <UI.Label
                          className={classNames({
                            TagPopUp__tags__item: true,
                            active: this.state.chartPopUp.selectedTags.map(i => i.id).includes(tag.id),
                          })}
                          key={tagKey}
                          color={tag.color}
                          onClick={() => this.handleTagItemClick(this.state.chartPopUp.lineData, tag)}
                        >
                          {tag.name}
                        </UI.Label>
                      )}
                    </div>
                  </div>
                )
              }
            </PopUp>
          }
          {this.state.commitPopUp.display &&
            <PopUp
              className='CommitPopUp'
              left={this.state.commitPopUp.left}
              top={this.state.commitPopUp.top}
              chainArrow={this.state.commitPopUp.chainArrow}
              xGap={true}
            >
              {this.state.commitPopUp.content !== null &&
                <>
                  {this.state.commitPopUp.content}
                </>
              }
            </PopUp>
          }
          {this.state.tooltipPopUp.display &&
            <PopUp
              className='TooltipPopUp'
              left={this.state.tooltipPopUp.left}
              width={this.state.tooltipPopUp.width}
              height={this.state.tooltipPopUp.height}
              top={this.state.visBox.margin.top}
              xGap={true}
              ref={this.tooltipPopUpRef}
              onClick={() => this.handleTooltipClick()}
            >
              <UI.Segment bordered={false} spacing={false}>
                {this.props.data.map((i, iKey) => (
                  i.num_steps > this.state.tooltipPopUp.index &&
                    <div
                      className={classNames({
                        TooltipPopUp__line: true,
                        active: this.state.tooltipPopUp.active == iKey,
                      })}
                      key={iKey}
                    >
                      <UI.Text color={this.getCommitColor(i)} small>
                        {i.tag ? `${i.tag}: ` : ''}
                        {Math.round(this.getLineValueByStep(i.data, this.state.tooltipPopUp.index) * 10e6)/10e6}
                      </UI.Text>
                    </div>
                ))}
              </UI.Segment>
            </PopUp>
          }
        </div>
      </>
    );
  };

  render() {
    return (
      <div className='ControlPanel' ref={this.parentRef}>
        {this.props.isLoading
          ? <UI.Text spacing spacingTop center>Loading..</UI.Text>
          : <>
            {this.isEmpty()
              ? <UI.Text spacing spacingTop center>No data</UI.Text>
              : this._renderContent()
            }
          </>
        }
      </div>
    );
  }
}

ControlPanel.propTypes = {};

export default storeUtils.getWithState(
  classes.CONTROL_PANEL,
  ControlPanel
);