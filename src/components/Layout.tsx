import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-blue-700">CADRender</Link>
          {user && (
            <div className="flex gap-4 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900">任务</Link>
              <Link to="/new" className="text-gray-600 hover:text-gray-900">新建</Link>
              <Link to="/gallery" className="text-gray-600 hover:text-gray-900">资产库</Link>
              <Link to="/scenes" className="text-gray-600 hover:text-gray-900">场景</Link>
              <Link to="/team" className="text-gray-600 hover:text-gray-900">团队</Link>
              <Link to="/webhooks" className="text-gray-600 hover:text-gray-900">Webhook</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-gray-900 font-medium">管理</Link>
              )}
            </div>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <Link to="/plans" className="text-gray-500 hover:text-gray-700">套餐</Link>
            <Link to="/subscription" className="text-gray-500 hover:text-gray-700">订阅</Link>
            <Link to="/api-keys" className="text-gray-500 hover:text-gray-700">API</Link>
            <Link to="/workers" className="text-gray-500 hover:text-gray-700">Worker</Link>
            <Link to="/profile" className="text-gray-500 hover:text-gray-700">{user.display_name || user.email}</Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800">退出</button>
          </div>
        )}
      </nav>
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
