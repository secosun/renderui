import { useEffect, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';

interface TaskBrief {
  id: string;
  title?: string;
  status: string;
  stage_name?: string;
}

const CHECK_INTERVAL = 30000;
const STORAGE_KEY = 'task_notify_cache';

export function TaskNotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; title: string; status: string }[]>([]);
  const cacheRef = useRef<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  })();

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get('/api/tasks', { params: { limit: 20 } });
        const tasks: TaskBrief[] = res.data.tasks || [];
        const now: Record<string, string> = {};

        for (const t of tasks) {
          now[t.id] = t.status;
          const prev = cacheRef.current[t.id];
          if (!prev || prev === t.status) continue;

          const terminal = t.status === 'completed' || t.status === 'failed';
          const wasRunning = prev === 'running' || prev === 'queued';
          if (terminal && wasRunning) {
            const title = t.title || t.id.slice(0, 8);
            const body = t.status === 'completed' ? '渲染已完成' : '渲染失败';
            const toastId = `toast-${t.id}-${Date.now()}`;

            setToasts(prev => [...prev.slice(-4), { id: toastId, title, status: t.status }]);

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`CADRender: ${title}`, {
                body,
                icon: '/vite.svg',
              });
            }
          }
        }

        cacheRef.current = now;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(now));
      } catch { /* ignore */ }
    };

    check();
    const timer = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map(t => (
            <div key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white cursor-pointer transition-all ${
                t.status === 'completed' ? 'bg-green-600' : 'bg-red-600'
              }`}
              onClick={() => dismiss(t.id)}>
              <span className="text-lg">{t.status === 'completed' ? '✅' : '❌'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-white/80 text-xs">{t.status === 'completed' ? '渲染完成' : '渲染失败'}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); dismiss(t.id); }}
                className="text-white/60 hover:text-white">✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
