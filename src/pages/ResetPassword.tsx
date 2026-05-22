import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../api/client';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 8) { setMsg('密码至少 8 位'); return; }
    if (!token) { setMsg('缺少重置令牌'); return; }
    setLoading(true);
    setMsg('');
    try {
      const res = await resetPassword(token, newPassword);
      setMsg(res.message);
      setDone(true);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || '重置失败');
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white border rounded-lg p-6 shadow-sm text-center">
          <div className="text-green-600 text-lg mb-2">密码已重置</div>
          <Link to="/login" className="text-blue-600 hover:text-blue-800 text-sm">前往登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-bold mb-4">重置密码</h1>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="新密码（至少 8 位）"
          className="w-full p-2 border rounded text-sm mb-4"
        />
        {msg && <div className="mb-4 text-sm text-red-600">{msg}</div>}
        <button
          onClick={handleSubmit}
          disabled={loading || !newPassword}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >{loading ? '重置中...' : '重置密码'}</button>
      </div>
    </div>
  );
}
