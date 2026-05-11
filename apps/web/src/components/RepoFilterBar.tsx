import { useState } from 'react';

interface RepoFilterBarProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function RepoFilterBar({ options, value, onChange }: RepoFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        Filter by repository:
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
