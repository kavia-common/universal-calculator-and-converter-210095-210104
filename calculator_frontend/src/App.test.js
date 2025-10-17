import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /Universal Calculator & Converter/i });
  expect(heading).toBeInTheDocument();
});

test('renders calculator and converter panel titles', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /Calculator/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Unit Converter/i })).toBeInTheDocument();
});
