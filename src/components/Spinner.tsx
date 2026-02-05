import React from 'react';
import { GolfSpinner, type SpinnerType } from './GolfSpinner.js';

interface SpinnerProps {
  label?: string;
  type?: SpinnerType;
}

export function Spinner({ label = 'Loading...', type = 'default' }: SpinnerProps) {
  return <GolfSpinner type={type} label={label} />;
}
