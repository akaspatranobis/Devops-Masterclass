import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders subscribe button', () => {
  render(<App />);
  const button = screen.getByText(/Subscribe to Watch/i);
  expect(button).toBeInTheDocument();
});
