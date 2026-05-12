import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ctp-text">Settings</h1>
      <p className="text-ctp-subtext1">Configure application settings.</p>
      <div className="bg-ctp-surface0 rounded-xl border border-ctp-surface1 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">Account Information</h2>
        <p className="text-ctp-subtext1">Logged in as: {user?.email || 'Unknown'}</p>
        <p className="text-ctp-subtext1">Role: {user?.role === 'admin' ? 'Administrator' : 'Viewer'}</p>
      </div>
      <div className="bg-ctp-surface0 rounded-xl border border-ctp-surface1 p-6">
        <h2 className="text-xl font-semibold mb-4 text-ctp-text">About</h2>
        <p className="text-ctp-subtext1">Serverless Repository Release Monitor v0.1.0</p>
        <p className="text-ctp-subtext1">Aggregates releases from GitHub, GitLab, Forgejo, and Gitea.</p>
      </div>
    </div>
  );
}
