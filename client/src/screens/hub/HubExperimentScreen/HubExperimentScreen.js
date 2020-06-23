import React from 'react';
import InsightContent from '../../../components/hub/InsightContent/InsightContent'


class HubExperimentScreen extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <InsightContent
        experiment_name={this.props.match.params.experiment_name}
        commit_id={this.props.match.params.commit_id}
        insight_name={null}
        location={this.props.location}
      />
    );
  }
}

export default HubExperimentScreen;