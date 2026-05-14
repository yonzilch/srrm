import React from 'react';

interface RepoFilterBarProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function RepoFilterBar({ options, value, onChange }: RepoFilterBarProps) {
  return (
    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-ctp-subtext1">
        <span className="text-ctp-overlay0">🔍</span>
        Filter by repository:
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ml-2 px-3 py-1.5 bg-ctp-surface1 text-ctp-text rounded-lg border border-ctp-surface2 focus:outline-none focus:ring-1 focus:ring-ctp-blue focus:border-ctp-blue text-sm cursor-pointer appearance-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23bac2de' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2rem',
          }}
        >
          <option value="">All Repositories</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}