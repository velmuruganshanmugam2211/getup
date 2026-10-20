import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/data-display/StatusBadge';

describe('UI Primitives and StatusBadge', () => {
  it('renders Button with variants and handles loading state', () => {
    const { rerender } = render(<Button variant="primary">Submit Deliverable</Button>);
    expect(screen.getByRole('button', { name: /submit deliverable/i })).toBeInTheDocument();

    rerender(<Button isLoading>Submit Deliverable</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('correctly maps status strings to consistent badges', () => {
    const { rerender } = render(<StatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();

    rerender(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    rerender(<StatusBadge status="overdue" />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});
