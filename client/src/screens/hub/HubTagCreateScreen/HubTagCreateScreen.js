import './HubTagCreateScreen.less';

import React from 'react';

import UI from '../../../ui';
import TagSettingForm from '../../../components/hub/TagSettingForm/TagSettingForm';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import HubWrapper from '../../../wrappers/hub/HubWrapper/HubWrapper';
import * as storeUtils from '../../../storeUtils';

class HubTagCreateScreen extends React.Component {
  constructor(props) {
    super(props);
  }

  _renderContent = () => {
    return (
      <div className='HubTagCreateScreen__FormGroup__wrapper'>
        <UI.Text size={4} header divided>
          Create New Tag
        </UI.Text>
        <TagSettingForm
          updateFunction={this.props.postNewTag}
          redirectURL={screens.HUB_PROJECT_TAGS}
        />
      </div>
    );
  };

  render() {
    return (
      <HubWrapper>
        <UI.Container size='small' ref={this.contentRef}>
          {this._renderContent()}
        </UI.Container>
      </HubWrapper>
    );
  }
}

export default storeUtils.getWithState(
  classes.HUB_PROJECT_CREATE_TAG,
  HubTagCreateScreen
);
