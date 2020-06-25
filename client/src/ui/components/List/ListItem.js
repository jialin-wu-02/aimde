import './List.less';

import React , { useState } from 'react';
import PropTypes from 'prop-types';

import { classNames } from '../../utils';


function ListItem({ children, className, description, onHoverEffect }) {
  const compClassName = classNames({
    ListItem: true,
    [className]: !!className,
  });

  const [hoverStyle, setHoverStyle] = useState(null)

  const onMouseEnterHandler = () => {
    if (onHoverEffect) {
      setHoverStyle({
        paddingLeft: '12px',
        backgroundColor: '#f6f6f6',
      });
    }
  }
  const onMouseLeaveHandler = () => {
    setHoverStyle(null);
  }

  return (
    <li className={compClassName} onMouseEnter={onMouseEnterHandler} onMouseLeave={onMouseLeaveHandler} style={hoverStyle}>
      {children}
      {!!description &&
        <div className='ListItem__desc'>{description}</div>
      }
    </li>
  )
}

ListItem.defaultProps = {
  description: '',
};

ListItem.propTypes = {
  description: PropTypes.string,
};

export default React.memo(ListItem);