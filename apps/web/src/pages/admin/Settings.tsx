import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ctp-text">Settings</h1>
        <p className="text-ctp-subtext1 mt-1">Configure application settings.</p>
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">Account Information</h2>
        <div className="space-y-2">
          <p className="text-sm text-ctp-subtext1">
            Email: <span className="text-ctp-text font-medium">{user?.email || 'Unknown'}</span>
          </p>
          <p className="text-sm text-ctp-subtext1">
            Role: <span className="text-ctp-subtext1 font-medium capitalize">{user?.role || 'Unknown'}</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-surface0/40 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">About</h2>
        <div className="space-y-1">
          <p className="text-sm text-ctp-subtext1">
            Serverless Repository Release Monitor v0.1.0
          </p>
          <p className="text-sm text-ctp-overlay0">
            Aggregates releases from GitHub, GitLab, Forgejo, and Gitea.
          </p>
        </div>
      </div>
    </div>
  );
}