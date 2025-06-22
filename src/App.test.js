import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Subscribe button', () => {
  render(<App />);
  const btnElement = screen.getByText(/Subscribe to Watch/i);
  expect(btnElement).toBeInTheDocument();
});
