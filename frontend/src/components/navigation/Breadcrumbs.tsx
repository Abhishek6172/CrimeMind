import React from 'react';
import { ChevronRightIcon } from '../icons/Icons';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <span
              onClick={item.onClick}
              style={{
                color: isLast || item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isLast || item.active ? 600 : 500,
                cursor: item.onClick ? 'pointer' : 'default',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (item.onClick) e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                if (item.onClick) e.currentTarget.style.color = isLast || item.active ? 'var(--text-primary)' : 'var(--text-secondary)';
              }}
            >
              {item.label}
            </span>
            {!isLast && <ChevronRightIcon size={12} color="var(--text-tertiary)" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
