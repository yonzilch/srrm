import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = () => {
    setLoading(true);
    setError(null);
    // 跳转到 Hono 的 /api/auth/login 路由，由服务端重定向到 SSO 提供商
    // SSO 回调完成后会在 Cookie 中写入 JWT
    window.location.href = '/api/auth/login';
  };

  // 检查是否从 SSO 回调返回（Cookie 已写入）
  const handleCheckAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated) {
        navigate('/');
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Serverless Release Monitor</h2>
          <p className="text-gray-600">
            Sign in to manage your repository releases
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in with SSO'}
        </button>

        <p className="text-xs text-gray-500">
          This demo uses a simulated SSO flow. In production, this would
          redirect to your identity provider.
        </p>
      </div>
    </div>
  );
}