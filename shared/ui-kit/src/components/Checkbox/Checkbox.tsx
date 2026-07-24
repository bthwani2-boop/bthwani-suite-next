import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import './Checkbox.css';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', indeterminate = false, checked, ...props }, forwardedRef) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement, []);

    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
      <label className={`bthwani-checkbox-wrapper ${className}`}>
        <input
          type="checkbox"
          className="bthwani-checkbox-input"
          ref={inputRef}
          checked={checked}
          aria-checked={indeterminate ? 'mixed' : Boolean(checked)}
          {...props}
        />
        <span className="bthwani-checkbox-control" aria-hidden="true" />
        {label ? <span className="bthwani-checkbox-label">{label}</span> : null}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
