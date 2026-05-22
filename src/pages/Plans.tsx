import { useEffect, useState } from 'react';
import { listPlans, createCheckoutSession, type Plan } from '../api/client';

export function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listPlans().then(setPlans).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: Plan, interval: 'monthly' | 'yearly') => {
    setError('');
    const priceId = interval === 'monthly' ? plan.stripe_monthly_price_id : plan.stripe_yearly_price_id;
    if (!priceId) {
      setError(`${plan.name} 暂不支持 ${interval === 'monthly' ? '月付' : '年付'}`);
      return;
    }
    try {
      const { url } = await createCheckoutSession(
        priceId,
        window.location.origin + '/subscription?success=true',
        window.location.origin + '/plans?canceled=true',
      );
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建支付会话失败');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">选择套餐</h1>
      <p className="text-gray-500 mb-8">选择适合您的渲染需求套餐</p>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-white rounded-lg shadow p-6 flex flex-col ${plan.slug === 'pro' ? 'ring-2 ring-blue-500' : ''}`}>
            {plan.slug === 'pro' && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full self-start mb-2">推荐</span>
            )}
            <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
            <div className="mb-6">
              <span className="text-3xl font-bold">¥{plan.price_monthly_cents > 0 ? (plan.price_monthly_cents / 100).toFixed(0) : '0'}</span>
              <span className="text-gray-500 text-sm">/月</span>
              {plan.price_yearly_cents > 0 && (
                <p className="text-xs text-gray-400 mt-1">年付 ¥{(plan.price_yearly_cents / 100).toFixed(0)} (省 {Math.round((1 - plan.price_yearly_cents / (plan.price_monthly_cents * 12)) * 100)}%)</p>
              )}
            </div>
            <div className="flex-1 space-y-2 mb-6">
              {Object.entries(plan.features || {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">{featureLabel(key, val)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {plan.price_monthly_cents === 0 ? (
                <button disabled className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed">
                  当前套餐
                </button>
              ) : (
                <>
                  <button onClick={() => handleSubscribe(plan, 'monthly')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                    月付订阅
                  </button>
                  <button onClick={() => handleSubscribe(plan, 'yearly')}
                    className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 text-sm">
                    年付订阅 (省更多)
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function featureLabel(key: string, val: number): string {
  const labels: Record<string, string> = {
    concurrency: '最大并发任务',
    max_resolution: '最大分辨率',
    max_samples: '最大采样数',
    max_tasks_per_month: '每月任务限额',
  };
  const label = labels[key] || key;
  if (key === 'concurrency') return `${label}: ${val}`;
  if (key === 'max_resolution') return `${label}: ${val}px`;
  if (key === 'max_samples') return `${label}: ${val}`;
  if (key === 'max_tasks_per_month') return `${label}: ${val === -1 ? '无限制' : val}`;
  return `${label}: ${val}`;
}
