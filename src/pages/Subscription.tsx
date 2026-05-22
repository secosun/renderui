import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubscription, createPortalSession, cancelSubscription, reactivateSubscription, type Subscription as SubType } from '../api/client';

export function Subscription() {
  const [sub, setSub] = useState<SubType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const load = () => {
    setLoading(true);
    getSubscription().then(setSub).catch(() => setSub(null)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handlePortal = async () => {
    setActionLoading('portal');
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.detail || '打开管理门户失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    if (!confirm('确定取消订阅？当前周期结束后将不再续费。')) return;
    setActionLoading('cancel');
    try {
      await cancelSubscription();
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || '取消失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      await reactivateSubscription();
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || '恢复失败');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  if (!sub) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">订阅管理</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">暂无活跃订阅</p>
          <Link to="/plans" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            查看套餐
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">订阅管理</h1>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">当前订阅</h2>
          <span className={`px-3 py-1 rounded text-sm font-medium ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {sub.status === 'active' ? '活跃' : sub.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {sub.plan && (
            <>
              <div><span className="text-gray-500">套餐</span><p className="font-medium">{sub.plan.name}</p></div>
              <div><span className="text-gray-500">费用</span>
                <p className="font-medium">
                  {sub.billing_interval === 'monthly'
                    ? `¥${(sub.plan.price_monthly_cents / 100).toFixed(0)}/月`
                    : `¥${(sub.plan.price_yearly_cents / 100).toFixed(0)}/年`}
                </p>
              </div>
            </>
          )}
          <div><span className="text-gray-500">计费周期</span><p className="font-medium">{sub.billing_interval === 'monthly' ? '月付' : '年付'}</p></div>
          <div><span className="text-gray-500">周期开始</span><p className="text-xs">{sub.current_period_start ? new Date(sub.current_period_start).toLocaleString('zh-CN') : '-'}</p></div>
          <div><span className="text-gray-500">周期结束</span><p className="text-xs">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleString('zh-CN') : '-'}</p></div>
        </div>

        {sub.cancel_at_period_end && (
          <div className="mt-4 bg-yellow-50 text-yellow-800 p-3 rounded text-sm">
            订阅将在当前周期结束后取消。您仍可在此期间继续使用。
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {sub.stripe_subscription_id && (
            <button onClick={handlePortal} disabled={!!actionLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
              {actionLoading === 'portal' ? '跳转中...' : '管理支付方式'}
            </button>
          )}
          {!sub.cancel_at_period_end && (
            <button onClick={handleCancel} disabled={!!actionLoading}
              className="bg-red-50 text-red-700 px-4 py-2 rounded hover:bg-red-100 disabled:opacity-50 text-sm">
              {actionLoading === 'cancel' ? '取消中...' : '取消订阅'}
            </button>
          )}
          {sub.cancel_at_period_end && (
            <button onClick={handleReactivate} disabled={!!actionLoading}
              className="bg-green-50 text-green-700 px-4 py-2 rounded hover:bg-green-100 disabled:opacity-50 text-sm">
              {actionLoading === 'reactivate' ? '恢复中...' : '恢复订阅'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-2">需要帮助？</h2>
        <p className="text-sm text-gray-500">
          如需升级套餐或更改计费方式，可通过 "管理支付方式" 进入 Stripe 客户门户操作。
        </p>
        <Link to="/plans" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          查看所有套餐 →
        </Link>
      </div>
    </div>
  );
}
