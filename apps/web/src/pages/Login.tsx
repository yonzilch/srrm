import { useState } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api.auth.login();
      // 重定向到SSO提供商
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 检查是否已经登录（通过检查路由参数或自动重定向）
  // 实际应用中，这应该在路由守卫或useAuth中处理

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
