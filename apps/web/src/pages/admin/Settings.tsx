import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

export default function Settings() {
  const { data: user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-gray-600">
        Configure application settings.
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <p className="text-gray-600">
          Logged in as: {user?.email || 'Unknown'}
        </p>
        <p className="text-gray-600">
          Role: {user?.role === 'admin' ? 'Administrator' : 'Viewer'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <p className="text-gray-600">
          Serverless Repository Release Monitor v0.1.0
        </p>
        <p className="text-gray-600">
          Aggregates GitHub releases and provides RSS feeds.
        </p>
      </div>
    </div>
  );
}
