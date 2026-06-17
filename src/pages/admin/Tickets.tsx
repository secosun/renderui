import { useEffect, useState } from 'react';
import axios from 'axios';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

export function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await axios.get('/api/tickets/admin');
      setTickets(r.data.tickets || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    try {
      await axios.post(`/api/tickets/${ticketId}/reply`, { reply: replyText });
      setReplyText('');
      setReplyingTo(null);
      load();
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">客服工单</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">暂无工单</div>
      ) : (
        <div className="space-y-4">
          {tickets.map(t => (
            <div key={t.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t.subject}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {t.status === 'open' ? '待处理' : '已回复'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mb-2">用户 ID: {t.user_id}</p>
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{t.message}</p>

              {t.admin_reply && (
                <div className="bg-blue-50 rounded p-3 mb-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">回复：</p>
                  <p className="text-sm text-gray-700">{t.admin_reply}</p>
                </div>
              )}

              {replyingTo === t.id ? (
                <div className="space-y-2">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="输入回复内容..." rows={3} maxLength={2000}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleReply(t.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">发送回复</button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">取消</button>
                  </div>
                </div>
              ) : (
                t.status === 'open' && (
                  <button onClick={() => setReplyingTo(t.id)}
                    className="text-sm text-blue-600 hover:underline">回复</button>
                )
              )}

              <p className="text-xs text-gray-400 mt-2">{new Date(t.created_at).toLocaleString('zh-CN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
