import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-blue-700">CADRender</Link>
            {user && (
              <div className="flex gap-4 text-sm">
                <Link to="/" className="text-gray-600 hover:text-gray-900">模型库</Link>
                <Link to="/my-tasks" className="text-gray-600 hover:text-gray-900">我的任务</Link>
                <Link to="/batch" className="text-gray-600 hover:text-gray-900">批量渲染</Link>
              </div>
            )}
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                {user.display_name || user.email}
                <svg className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">资料设置</Link>
                    <Link to="/gallery" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">资产库</Link>
                    <Link to="/scenes" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">场景管理</Link>
                    <Link to="/api-keys" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">API 密钥</Link>
                    <Link to="/plans" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">套餐</Link>
                    <Link to="/subscription" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">订阅</Link>
                    <Link to="/workers" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Worker</Link>
                    <Link to="/webhooks" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Webhook</Link>
                    <Link to="/team" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">团队</Link>
                    <Link to="/support" onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">客服支持</Link>
                    {user.role === 'admin' && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <Link to="/admin" onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium">管理后台</Link>
                        <Link to="/admin/templates" onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">模板管理</Link>
                        <Link to="/admin/finishes" onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">材质管理</Link>
                        <Link to="/admin/calibration" onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">材质校准</Link>
                        <Link to="/admin/tickets" onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">客服工单</Link>
                      </>
                    )}
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">退出</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto overflow-y-auto" style={{ minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}
