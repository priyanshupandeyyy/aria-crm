import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ChevronLeft,
  Send,
  Users,
  CheckCircle2,
  Eye,
  MousePointerClick,
  Sparkles,
  Rocket,
  MessageSquare,
} from 'lucide-react';
import {
  getCampaignById,
  getCampaignStats,
  analyzeCampaign,
  launchCampaign,
} from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

/* ── donut colors ──────────────────────────────────────────── */

const DONUT_COLORS = {
  'Delivered (unopened)': '#22c55e',
  Failed: '#ef4444',
  'Opened (unclicked)': '#a855f7',
  Clicked: '#f97316',
  'Sent (pending)': '#94a3b8',
};

/* ── helpers ───────────────────────────────────────────────── */

function pct(n, d) {
  if (!d) return '0.0';
  return ((n / d) * 100).toFixed(1);
}

const PER_PAGE = 20;

/* ── CampaignDetail ────────────────────────────────────────── */

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [launching, setLaunching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const pollRef = useRef(null);

  /* ── initial fetch ───────────────────────────────────────── */

  useEffect(() => {
    setLoading(true);
    Promise.all([getCampaignById(id), getCampaignStats(id)])
      .then(([cam, st]) => {
        setCampaign(cam);
        setStats(st);
      })
      .catch((e) => {
        console.error('Failed to load campaign', e);
        setFetchError('Failed to load data. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* ── polling ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!campaign) return;
    const shouldPoll = campaign.status === 'sending' || campaign.status === 'active';
    if (!shouldPoll) return;

    pollRef.current = setInterval(() => {
      getCampaignStats(id)
        .then(setStats)
        .catch(() => {});
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [campaign, id]);

  /* ── launch handler ──────────────────────────────────────── */

  async function handleLaunch() {
    setLaunching(true);
    try {
      await launchCampaign(id);
      const cam = await getCampaignById(id);
      setCampaign(cam);
    } catch (e) {
      console.error('Launch failed', e);
    } finally {
      setLaunching(false);
    }
  }

  /* ── AI analysis ─────────────────────────────────────────── */

  async function handleAnalyze() {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await analyzeCampaign(id);
      setInsight(res.insight || res);
    } catch (e) {
      setInsightError(e.response?.data?.error || 'Analysis failed');
    } finally {
      setInsightLoading(false);
    }
  }

  /* ── loading state ───────────────────────────────────────── */

  if (loading) return <LoadingSpinner size="lg" message="Loading campaign…" />;
  if (!campaign) {
    return (
      <EmptyState
        title="Campaign not found"
        description="It may have been deleted."
        actionLabel="Back to Campaigns"
        onAction={() => navigate('/campaigns')}
      />
    );
  }

  /* ── derived data ────────────────────────────────────────── */

  const s = stats || campaign.stats || {};
  const total = s.total ?? 0;
  const sent = s.sent ?? 0;
  const delivered = s.delivered ?? 0;
  const opened = s.opened ?? 0;
  const clicked = s.clicked ?? 0;
  const failed = s.failed ?? 0;

  const donutData = [
    { name: 'Delivered (unopened)', value: Math.max(0, delivered - opened) },
    { name: 'Opened (unclicked)', value: Math.max(0, opened - clicked) },
    { name: 'Clicked', value: clicked },
    { name: 'Failed', value: failed },
    { name: 'Sent (pending)', value: Math.max(0, sent - delivered - failed) },
  ].filter((d) => d.value > 0);

  const comms = campaign.communications || campaign.messages || [];
  const totalComms = comms.length;
  const totalPages = Math.max(1, Math.ceil(totalComms / PER_PAGE));
  const pagedComms = comms.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const channelLabel =
    { whatsapp: '💬 WhatsApp', sms: '📱 SMS', email: '📧 Email', rcs: '📡 RCS' }[
      campaign.channel
    ] || campaign.channel;

  /* ── render ──────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}
      {/* Back */}
      <button
        onClick={() => navigate('/campaigns')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft size={16} /> All Campaigns
      </button>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
        <StatusBadge status={campaign.status} />
        {channelLabel && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {channelLabel}
          </span>
        )}
        <div className="flex-1" />
        {campaign.status === 'draft' && (
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {launching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Launching…
              </>
            ) : (
              <>
                <Rocket size={16} /> Launch
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="Total" value={total.toLocaleString()} icon={Users} color="#6F4E37" />
        <StatCard
          title="Sent"
          value={sent.toLocaleString()}
          icon={Send}
          color="#3B82F6"
        />
        <StatCard
          title="Delivered"
          value={delivered.toLocaleString()}
          subtitle={`${pct(delivered, sent)}% delivery rate`}
          icon={CheckCircle2}
          color="#22C55E"
        />
        <StatCard
          title="Opened"
          value={opened.toLocaleString()}
          subtitle={`${pct(opened, delivered)}% open rate`}
          icon={Eye}
          color="#A855F7"
        />
        <StatCard
          title="Clicked"
          value={clicked.toLocaleString()}
          icon={MousePointerClick}
          color="#F97316"
        />
      </div>

      {/* ── Two-column: donut + insight ─────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: Donut chart + Live feed */}
        <div className="flex flex-col gap-4">
          {/* Donut chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>

          {donutData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={DONUT_COLORS[entry.name] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="-0.2em" fontSize="24" fontWeight="bold" fill="#111827">
                    {pct(delivered, sent)}%
                  </tspan>
                  <tspan x="50%" dy="1.4em" fontSize="12" fill="#6B7280">
                    Delivered
                  </tspan>
                </text>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                    fontSize: 13,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          </div>

          {/* Live Feed */}
          {stats?.recentCommunications && stats.recentCommunications.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Updates
              </h2>
              <div className="space-y-3">
                {stats.recentCommunications.map((comm) => (
                  <div key={comm._id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-gray-400 w-[85px] whitespace-nowrap">
                      {new Date(comm.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="font-medium text-gray-900 flex-1 truncate">
                      {comm.customer_id?.name || 'Unknown'}
                    </span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                      {comm.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Insight */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ✨ Campaign Intelligence
          </h2>

          <div className="flex-1">
            {insight ? (
              <div className="border-l-4 border-brand-accent pl-4 py-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {typeof insight === 'string' ? insight : JSON.stringify(insight, null, 2)}
              </div>
            ) : insightLoading ? (
              <LoadingSpinner size="sm" message="AI is analyzing…" />
            ) : insightError ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">
                {insightError}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative group">
                  <button
                    onClick={handleAnalyze}
                    disabled={sent === 0}
                    className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles size={16} /> Analyze with AI
                  </button>
                  {sent === 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Launch campaign first
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Get AI-powered insights about this campaign's performance
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Communications table ────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Message Log</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            {totalComms.toLocaleString()} messages
          </span>
        </div>

        {totalComms === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Messages will appear here once the campaign is launched."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 pr-4">Customer Name</th>
                    <th className="pb-3 pr-4">Channel</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Last Updated</th>
                    <th className="pb-3">Retry Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedComms.map((msg, i) => (
                    <tr
                      key={msg._id || i}
                      className="hover:bg-brand-light/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {msg.customer_name || msg.customer_id?.name || msg.customer?.name || '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 capitalize">
                        {msg.channel || campaign.channel || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        {msg.updated_at
                          ? new Date(msg.updated_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-3 text-gray-500">
                        {msg.retry_count ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
