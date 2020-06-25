import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import UI from '../../../ui';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import { classNames } from '../../../utils';

class TagSettingForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      buttonStatus: {
        loading: false,
        disabled: false,
      },
      redirectTags: false,
      form: {
        name: this.props.name,
        color: this.props.color,
      },
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

  handleBtnClick = (updateFunction) => {
    this.setState({
      buttonStatus: {
        loading: true,
        disabled: true,
      },
    });

    let body = {
      name: this.state.form.name,
      color: this.state.form.color,
      id: this.props.tag_id ? this.props.tag_id : null,
    };

    updateFunction(body)
      .then((data) => {
        this.setState((prevState) => ({
          ...prevState,
          shouldRedirect: true,
        }));
      })
      .catch((err) => {})
      .finally(() => {
        this.setState((prevState) => ({
          ...prevState,
          buttonStatus: {
            loading: false,
            disabled: false,
          },
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

  handleInputChange = (e, callback = null) => {
    const value = e.target.value;
    const name = e.target.name;
    this.setState(
      (prevState) => ({
        ...prevState,
        form: {
          ...prevState.form,
          [name]: value,
        },
      }),
      () => {
        if (callback) {
          callback(e);
        }
      }
    );
  };

  render() {
    if (this.state.shouldRedirect) {
      return <Redirect to={this.props.redirectURL} />;
    }

    return (
      <div>
        <UI.Input
          onChange={this.handleInputChange}
          name='name'
          value={this.state.form.name}
          label='Tag Name'
          placeholder={this.props.name || 'best-cnn'}
        />
        <div className=''>
          <UI.Input
            onChange={this.handleInputChange}
            name='color'
            value={this.state.form.color}
            label='Tag Color'
            placeholder={this.props.color || 'red'}
          />
          <div>
            {this.colors.map((color, cKey) => (
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
            ))}
          </div>
          <UI.Line />
          <UI.Buttons>
            <UI.Button
              onClick={() =>
                this.handleBtnClick(this.props.updateFunction)
              }
              type='positive'
              {...this.state.buttonStatus}
            >
              {this.props.type}
            </UI.Button>
            <Link to={screens.HUB_PROJECT_TAGS}>
              <UI.Button type='secondary'> Cancel </UI.Button>
            </Link>
          </UI.Buttons>
        </div>
      </div>
    );
  }
}

export default TagSettingForm;
