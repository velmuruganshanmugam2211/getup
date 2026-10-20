import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-text-muted', className)}>
      <ol className="flex items-center space-x-1.5">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center hover:text-text transition-colors"
            aria-label="Dashboard Home"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />
              <li>
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="hover:text-text transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn('select-none', isLast ? 'font-semibold text-text' : '')}>
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
