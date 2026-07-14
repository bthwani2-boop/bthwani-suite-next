import React, { forwardRef } from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`bthwani-checkbox-wrapper ${className}`}>
        <input type="checkbox" className="bthwani-checkbox-input" ref={ref} {...props} />
        <span className="bthwani-checkbox-control"></span>
        {label && <span className="bthwani-checkbox-label">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
