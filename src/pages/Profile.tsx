import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, changePassword } from '../api/client';

export function Profile() {
  const { user, login } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await updateProfile({ display_name: displayName });
      setSaveMsg('已更新');
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.detail || '更新失败');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) { setPwMsg('密码至少 8 位'); return; }
    setChangingPw(true);
    setPwMsg('');
    try {
      const res = await changePassword(oldPw, newPw);
      setPwMsg(res.message);
      setOldPw(''); setNewPw('');
    } catch (e: any) {
      setPwMsg(e?.response?.data?.detail || '修改失败');
    }
    setChangingPw(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">个人设置</h1>

      {/* Profile info */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="font-medium mb-4">基本信息</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">邮箱</label>
          <div className="text-sm text-gray-800">{user.email}</div>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">角色</label>
          <div className="text-sm text-gray-800">{user.role === 'admin' ? '管理员' : user.role === 'viewer' ? '查看者' : '用户'}</div>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">显示名称</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full p-2 border rounded text-sm" />
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">配额</label>
          <div className="text-sm text-gray-800">
            并发: {user.quota_concurrency} | 分辨率: {user.quota_max_resolution}px | 采样: {user.quota_max_samples}
          </div>
        </div>
        <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
        {saveMsg && <span className="ml-3 text-sm text-green-600">{saveMsg}</span>}
      </div>

      {/* Change password */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="font-medium mb-4">修改密码</h2>
        <div className="mb-3">
          <label className="block text-sm text-gray-500 mb-1">当前密码</label>
          <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} className="w-full p-2 border rounded text-sm" />
        </div>
        <div className="mb-3">
          <label className="block text-sm text-gray-500 mb-1">新密码</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="至少 8 位" className="w-full p-2 border rounded text-sm" />
        </div>
        <button onClick={handleChangePassword} disabled={changingPw || !oldPw || !newPw} className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 disabled:opacity-50">
          {changingPw ? '修改中...' : '修改密码'}
        </button>
        {pwMsg && <span className="ml-3 text-sm text-green-600">{pwMsg}</span>}
      </div>
    </div>
  );
}
