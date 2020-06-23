import React from "react";
import InsightContent from "../../../components/hub/InsightContent/InsightContent";


class HubExperimentScreen extends React.Component {
  constructor(props) {
    super(props);
  }

  render () {
    return (
      <InsightContent
        experiment_name={this.props.match.params.experiment_name}
        commit_id={this.props.match.params.commit_id}
        insight_name={this.props.match.params.insight_name}
        location={this.props.match.params.location}
      />
    );
  }
}

export default HubExperimentScreen; 