import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Megaphone, TrendingUp, Zap } from 'lucide-react';
import { getCustomerStats, getAIRecommendations, getCampaigns } from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    Promise.all([getCustomerStats(), getAIRecommendations(), getCampaigns()])
      .then(([statsData, recsData, campaignsData]) => {
        setStats(statsData);
        // Normalise: API may return an array directly or wrap it in an object
        const recsArray = Array.isArray(recsData)
          ? recsData
          : Array.isArray(recsData?.recommendations)
            ? recsData.recommendations
            : [];
        setRecommendations(recsArray);
        setRecentCampaigns(
          [...(campaignsData || [])]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
        );
      })
      .catch((err) => {
        console.error('Dashboard load error:', err);
        setFetchError('Failed to load data. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" message="Brewing your dashboard…" />;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}
      {/* ── Section 1 — Header ──────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting} ☕</h1>
        <p className="text-sm text-gray-400 mt-1">{today}</p>
      </div>

      {/* ── Section 2 — Stats row ───────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="Total Customers"
            value={stats.total?.toLocaleString() ?? '—'}
            icon={Users}
            color="#6F4E37"
          />
          <StatCard
            title="Active Customers"
            value={stats.active?.toLocaleString() ?? '—'}
            icon={TrendingUp}
            color="#16A34A"
          />
          <StatCard
            title="Churned"
            value={stats.churned?.toLocaleString() ?? '—'}
            icon={Users}
            color="#DC2626"
          />
          <StatCard
            title="High Value"
            value={stats.high_value?.toLocaleString() ?? '—'}
            icon={Zap}
            color="#D97706"
          />
        </div>
      )}

      {/* ── Section 3 — AI Recommendations ──────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-lg font-semibold text-gray-900">AI Recommendations</h2>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
            AI Powered
          </span>
        </div>

        {/* Body */}
        {!Array.isArray(recommendations) || recommendations.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No recommendations yet"
            description="Recommendations will appear here once we have enough customer data."
          />
        ) : (
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id || rec._id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-brand-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-semibold text-gray-900 truncate">{rec.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{rec.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {rec.customer_count != null && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      {rec.customer_count} customers
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/campaigns?recommendation=${rec.id || rec._id}`)}
                    className="text-sm font-medium text-brand-primary hover:text-brand-accent transition-colors whitespace-nowrap"
                  >
                    Create Campaign →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4 — Recent Campaigns ────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
          <button
            onClick={() => navigate('/campaigns')}
            className="text-sm font-medium text-brand-primary hover:text-brand-accent transition-colors"
          >
            View all →
          </button>
        </div>

        {/* Body */}
        {recentCampaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create your first one."
            actionLabel="Create Campaign"
            onAction={() => navigate('/campaigns')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Segment</th>
                  <th className="pb-3 pr-4">Channel</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Delivered %</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentCampaigns.map((c) => {
                  const delivered =
                    c.stats?.total > 0
                      ? Math.round((c.stats.delivered / c.stats.total) * 100)
                      : 0;

                  return (
                    <tr
                      key={c._id || c.id}
                      className="hover:bg-brand-light/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/campaigns/${c._id || c.id}`)}
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">{c.name}</td>
                      <td className="py-3 pr-4 text-gray-500">{c.segment_name || '—'}</td>
                      <td className="py-3 pr-4 text-gray-500 capitalize">{c.channel || '—'}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{delivered}%</td>
                      <td className="py-3 text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
