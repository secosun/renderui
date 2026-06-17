import { useEffect, useState } from 'react';
import axios from 'axios';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

export function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/tickets').then(r => setTickets(r.data.tickets || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError('');
    try {
      await axios.post('/api/tickets', { subject, message });
      setSubject('');
      setMessage('');
      const r = await axios.get('/api/tickets');
      setTickets(r.data.tickets || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || '提交失败');
    }
    setSending(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">客服支持</h1>
      <p className="text-gray-500 mb-6">遇到问题？提交工单，我们会尽快回复</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 mb-8 space-y-4">
        <h2 className="font-semibold">提交工单</h2>
        {error && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主题</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="简要描述问题" required maxLength={200}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="请详细描述您遇到的问题或需求..." required maxLength={2000} rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <p className="text-xs text-gray-400 text-right mt-1">{message.length}/2000</p>
        </div>
        <button type="submit" disabled={sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {sending ? '提交中...' : '提交工单'}
        </button>
      </form>

      <h2 className="font-semibold mb-3">我的工单</h2>
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">暂无工单</div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{t.subject}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {t.status === 'open' ? '待处理' : '已回复'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{t.message}</p>
              {t.admin_reply && (
                <div className="bg-blue-50 rounded p-3 mt-2">
                  <p className="text-xs text-blue-600 font-medium mb-1">客服回复：</p>
                  <p className="text-sm text-gray-700">{t.admin_reply}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{new Date(t.created_at).toLocaleString('zh-CN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
