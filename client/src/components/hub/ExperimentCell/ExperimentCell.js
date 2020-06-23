import './ExperimentCell.less';

import React from 'react';
import PropTypes from 'prop-types';

import { Link } from "react-router-dom";
import { classNames } from '../../../utils';
import UI from '../../../ui';


function ExperimentCell({ children, className, type, height, width, footerTitle, href, style }) {
  const compClassName = classNames({
    ExperimentCell: true,
    [className]: !!className,
    [`height_${height}`]: true,
    [`width_${width}`]: true,
  });

  if (footerTitle.length) {
    footerTitle = footerTitle[0].toUpperCase() + footerTitle.slice(1);
  } else {
    footerTitle = footerTitle.toUpperCase();
  }

  return (
    <div className={compClassName}>
      <div className='ExperimentCell__body'>
        {children}
      </div>
      <div className='ExperimentCell__footer'>
        <UI.Text overline bold type='primary'>{type}</UI.Text>
        <UI.Text caption type='grey-dark'>{footerTitle}</UI.Text>
        <Link to={href} style={{transform: "translateY(-25px)", float: "right"}}>
          <UI.Icon i='nc-link-72' scale={1} spacingRight  />
        </Link>
      </div>
    </div>
  )
}

ExperimentCell.defaultProps = {
  type: 'metric',
  footerTitle: '',
  height: 'static',
  width: 1,
};

ExperimentCell.propTypes = {
  type: PropTypes.string,
  footerTitle: PropTypes.string,
  height: PropTypes.oneOf(['static', 'auto']),
  width: PropTypes.number,
};

export default React.memo(ExperimentCell);
