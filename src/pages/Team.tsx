import { useState, useEffect } from 'react';
import { getOrgMembers, inviteMember, removeMember, getMyOrganization, updateOrg, type OrgMember, type User } from '../api/client';

export function Team() {
  const [members, setMembers] = useState<(OrgMember & { user?: User })[]>([]);
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const org = await getMyOrganization();
      setOrgName(org.name);
      setOrgId(org.id);
      const { members: m, users: u } = await getOrgMembers();
      const enriched = m.map(mem => ({ ...mem, user: u.find(usr => usr.id === mem.user_id) }));
      setMembers(enriched);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(load, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setMsg('');
    try {
      const res = await inviteMember(inviteEmail, inviteRole);
      setMsg(res.message);
      setInviteEmail('');
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || '邀请失败');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('确定移除此成员？')) return;
    await removeMember(memberId);
    load();
  };

  const handleSaveOrgName = async () => {
    if (!newOrgName.trim()) return;
    await updateOrg(orgId, { name: newOrgName });
    setOrgName(newOrgName);
    setEditingName(false);
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">团队管理</h1>

      {msg && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded">{msg}</div>
      )}

      {/* Organization info */}
      <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          {editingName ? (
            <div className="flex gap-2 items-center">
              <input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} className="p-2 border rounded text-sm" />
              <button onClick={handleSaveOrgName} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">保存</button>
              <button onClick={() => setEditingName(false)} className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">取消</button>
            </div>
          ) : (
            <div>
              <div className="font-medium">{orgName}</div>
              <div className="text-xs text-gray-400">ID: {orgId}</div>
            </div>
          )}
          {!editingName && (
            <button onClick={() => { setNewOrgName(orgName); setEditingName(true); }} className="text-sm text-blue-600 hover:text-blue-800">编辑名称</button>
          )}
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-gray-50 border rounded-lg p-4 mb-6">
        <h2 className="font-medium mb-3">邀请成员</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">邮箱</label>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" className="w-full p-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">角色</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="p-2 border rounded text-sm bg-white">
              <option value="member">成员</option>
              <option value="admin">管理员</option>
              <option value="viewer">查看者</option>
            </select>
          </div>
          <button onClick={handleInvite} disabled={!inviteEmail} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">邀请</button>
        </div>
      </div>

      {/* Members list */}
      <h2 className="font-medium mb-3">成员列表 ({members.length})</h2>
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="bg-white border rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                {(m.user?.display_name || m.user?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-sm">{m.user?.display_name || m.user?.email || '未知用户'}</div>
                <div className="text-xs text-gray-500">{m.user?.email} · {m.role === 'owner' ? '所有者' : m.role === 'admin' ? '管理员' : '成员'}</div>
              </div>
            </div>
            {m.role !== 'owner' && (
              <button onClick={() => handleRemove(m.id)} className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">移除</button>
            )}
            {m.role === 'owner' && (
              <span className="text-xs text-gray-400 px-3 py-1">所有者</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
