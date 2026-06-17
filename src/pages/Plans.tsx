import { useEffect, useState } from 'react';
import { listPlans, createCheckoutSession, type Plan } from '../api/client';

type PaymentMethod = 'alipay' | 'wechat' | '';

export function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribeTarget, setSubscribeTarget] = useState<{ plan: Plan; interval: 'monthly' | 'yearly' } | null>(null);

  useEffect(() => {
    listPlans().then(setPlans).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePayMethod = async (method: PaymentMethod) => {
    if (!subscribeTarget) return;
    const { plan, interval } = subscribeTarget;
    setError('');
    setSubscribeTarget(null);

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
        method,
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

      {/* Payment Method Dialog */}
      {subscribeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSubscribeTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">选择支付方式</h3>
            <p className="text-sm text-gray-500 mb-4">
              {subscribeTarget.plan.name} · {subscribeTarget.interval === 'monthly' ? '月付' : '年付'}
            </p>
            <div className="space-y-3">
              <button onClick={() => handlePayMethod('alipay')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.422 15.358c-3.22-1.386-6.847-2.408-10.345-2.928-.855 2.354-1.727 4.725-2.69 7.062-.361.876-.773 1.732-1.422 2.455-.308.343-.72.564-1.158.548-.772-.028-1.318-.704-1.544-1.422-.546-1.576-.556-3.286-.176-4.904.425-1.798 1.276-3.464 2.176-5.066-2.462-.521-4.852-1.32-6.86-2.682-.439-.298-.317-.98.154-1.094 2.534-.614 5.14-.913 7.728-1.039 1.124-.055 2.249-.067 3.374-.06.783-.004 1.565.011 2.346.052 1.082.057 2.95-.084 3.912.582.42.29.61.82.502 1.34-.164.79-.92 1.114-1.622 1.312-2.114.594-4.258.876-6.387 1.202-.366.056-.73.122-1.093.189l.035-.002c.308.984.614 1.968 1.036 2.905 3.604.654 7.194 1.878 10.184 3.888.468.315.595.964.298 1.435-.296.471-.895.568-1.41.388z"/>
                </svg>
                <span className="font-medium text-gray-700">支付宝支付</span>
              </button>
              <button onClick={() => handlePayMethod('wechat')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045.246.246 0 0 0 .241-.245c0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 0 1 .178-.553C23.028 18.333 24 16.592 24 14.628c0-3.299-3.063-5.77-7.062-5.77zm-2.18 2.433c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.36 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
                <span className="font-medium text-gray-700">微信支付</span>
              </button>
            </div>
            <button onClick={() => setSubscribeTarget(null)}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2">取消</button>
          </div>
        </div>
      )}

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
                <p className="text-xs text-gray-400 mt-1">年付 ¥{(plan.price_yearly_cents / 100).toFixed(0)}</p>
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
                  <button onClick={() => setSubscribeTarget({ plan, interval: 'monthly' })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                    月付订阅
                  </button>
                  <button onClick={() => setSubscribeTarget({ plan, interval: 'yearly' })}
                    className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 text-sm">
                    年付订阅
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
