import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Send, TrendingUp, Eye, Megaphone, ArrowUpDown } from 'lucide-react';
import { getCampaigns } from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

/* ── helpers ───────────────────────────────────────────────── */

function pct(n, d) {
  if (!d) return 0;
  return Number(((n / d) * 100).toFixed(1));
}

function truncate(str, len = 15) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function pctColor(val) {
  if (val >= 80) return 'text-green-600';
  if (val >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

const CHANNEL_COLORS = {
  whatsapp: '#25D366',
  sms: '#3B82F6',
  email: '#F59E0B',
  rcs: '#8B5CF6',
};

/* ── Analytics page ────────────────────────────────────────── */

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('deliveryRate');
  const [sortAsc, setSortAsc] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    getCampaigns()
      .then((res) => setCampaigns(Array.isArray(res) ? res : res.campaigns || []))
      .catch((e) => {
        console.error('Failed to load campaigns', e);
        setFetchError('Failed to load data. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── computed metrics ────────────────────────────────────── */

  const metrics = useMemo(() => {
    const getTotal = (c) => c.stats?.total ?? c.stats?.sent ?? 0;
    const withTotal = campaigns.filter((c) => getTotal(c) > 0);
    const withDelivered = campaigns.filter((c) => (c.stats?.delivered ?? 0) > 0);

    const totalSent = campaigns.reduce((sum, c) => sum + getTotal(c), 0);

    const avgDeliveryRate =
      withTotal.length > 0
        ? withTotal.reduce((sum, c) => sum + pct(c.stats?.delivered ?? 0, getTotal(c)), 0) /
          withTotal.length
        : 0;

    const avgOpenRate =
      withDelivered.length > 0
        ? withDelivered.reduce(
            (sum, c) => sum + pct(c.stats?.opened ?? 0, c.stats?.delivered ?? 0),
            0,
          ) / withDelivered.length
        : 0;

    const bestCampaign = withDelivered.length
      ? withDelivered.reduce((best, c) => {
          const rate = pct(c.stats?.opened ?? 0, c.stats?.delivered ?? 0);
          return rate > (best.rate || 0) ? { ...c, rate } : best;
        }, {})
      : null;

    // channel breakdown
    const channelMap = {};
    campaigns.forEach((c) => {
      const ch = c.channel || 'unknown';
      channelMap[ch] = (channelMap[ch] || 0) + 1;
    });
    const channelBreakdown = Object.entries(channelMap).map(([channel, count]) => ({
      channel,
      count,
    }));

    return { totalSent, avgDeliveryRate, avgOpenRate, bestCampaign, channelBreakdown };
  }, [campaigns]);

  /* ── chart data ──────────────────────────────────────────── */

  const deliveryChartData = useMemo(() => {
    return campaigns
      .filter((c) => (c.stats?.total ?? c.stats?.sent ?? 0) > 0)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map((c) => {
        const total = c.stats?.total ?? c.stats?.sent ?? 0;
        return {
          name: truncate(c.name),
          rate: pct(c.stats?.delivered ?? 0, total),
        };
      });
  }, [campaigns]);

  /* ── channel chart data with sent totals ─────────────────── */

  const channelSentData = useMemo(() => {
    const map = {};
    campaigns.forEach((c) => {
      const ch = c.channel || 'unknown';
      map[ch] = (map[ch] || 0) + (c.stats?.total ?? c.stats?.sent ?? 0);
    });
    return Object.entries(map).map(([channel, sent]) => ({ channel, sent }));
  }, [campaigns]);

  /* ── sorted table rows ───────────────────────────────────── */

  const tableRows = useMemo(() => {
    const rows = campaigns.map((c) => {
      const total = c.stats?.total ?? c.stats?.sent ?? 0;
      const delivered = c.stats?.delivered ?? 0;
      const opened = c.stats?.opened ?? 0;
      const clicked = c.stats?.clicked ?? 0;
      return {
        id: c._id || c.id,
        name: c.name,
        channel: c.channel || '—',
        status: c.status,
        sent: total,
        deliveryRate: pct(delivered, total),
        openRate: pct(opened, delivered),
        clickRate: pct(clicked, delivered),
      };
    });

    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });

    return rows;
  }, [campaigns, sortKey, sortAsc]);

  /* ── sort handler ────────────────────────────────────────── */

  function toggleSort(key) {
    if (sortKey === key) {
      setSortAsc((p) => !p);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  /* ── tooltip style ───────────────────────────────────────── */

  const tooltipStyle = {
    borderRadius: 8,
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,.1)',
    fontSize: 13,
  };

  /* ── loading ─────────────────────────────────────────────── */

  if (loading) return <LoadingSpinner size="lg" message="Crunching numbers…" />;

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">All time performance</p>
      </div>

      {/* ── Top stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Messages Sent"
          value={metrics.totalSent.toLocaleString()}
          icon={Send}
          color="#3B82F6"
        />
        <StatCard
          title="Avg Delivery Rate"
          value={`${metrics.avgDeliveryRate.toFixed(1)}%`}
          icon={TrendingUp}
          color="#22C55E"
        />
        <StatCard
          title="Avg Open Rate"
          value={`${metrics.avgOpenRate.toFixed(1)}%`}
          icon={Eye}
          color="#A855F7"
        />
        <StatCard
          title="Total Campaigns"
          value={campaigns.length}
          icon={Megaphone}
          color="#6F4E37"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Chart 1 — Delivery Rate by Campaign */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Rate by Campaign</h2>

          {deliveryChartData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No campaign data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryChartData} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val) => [`${val}%`, 'Delivery Rate']}
                />
                <Bar dataKey="rate" fill="#6F4E37" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2 — Messages by Channel (horizontal) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages by Channel</h2>

          {channelSentData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={channelSentData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis
                  dataKey="channel"
                  type="category"
                  tick={{ fontSize: 12, fill: '#6B7280', textTransform: 'capitalize' }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val) => [val.toLocaleString(), 'Messages']}
                />
                <Bar dataKey="sent" radius={[0, 4, 4, 0]} barSize={28}>
                  {channelSentData.map((entry) => (
                    <Cell
                      key={entry.channel}
                      fill={CHANNEL_COLORS[entry.channel] || '#94a3b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Performance table ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Campaigns</h2>

        {tableRows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Campaign performance data will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'channel', label: 'Channel' },
                    { key: 'sent', label: 'Sent' },
                    { key: 'deliveryRate', label: 'Delivery %' },
                    { key: 'openRate', label: 'Open %' },
                    { key: 'clickRate', label: 'Click %' },
                    { key: 'status', label: 'Status' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="pb-3 pr-4 cursor-pointer select-none hover:text-gray-600 transition-colors"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key && (
                          <ArrowUpDown size={12} className="text-brand-accent" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-brand-light/40 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900">{row.name}</td>
                    <td className="py-3 pr-4 text-gray-500 capitalize">{row.channel}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.sent.toLocaleString()}</td>
                    <td className={`py-3 pr-4 font-medium ${pctColor(row.deliveryRate)}`}>
                      {row.deliveryRate}%
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.openRate}%</td>
                    <td className="py-3 pr-4 text-gray-700">{row.clickRate}%</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
