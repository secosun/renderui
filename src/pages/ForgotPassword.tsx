import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await forgotPassword(email);
      setMsg(res.message);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || '请求失败');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-bold mb-2">忘记密码</h1>
        <p className="text-sm text-gray-500 mb-4">输入邮箱地址，如果已注册将收到重置链接</p>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full p-2 border rounded text-sm mb-4"
        />
        {msg && <div className="mb-4 text-sm text-green-600">{msg}</div>}
        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >{loading ? '发送中...' : '发送重置链接'}</button>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-blue-600 hover:text-blue-800">返回登录</Link>
        </div>
      </div>
    </div>
  );
}
