import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Rocket,
  Check,
  ExternalLink,
  Megaphone,
} from 'lucide-react';
import {
  getCampaigns,
  getSegments,
  createCampaign,
  launchCampaign,
  generateMessage,
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

/* ── helpers ───────────────────────────────────────────────── */

function pct(n, d) {
  if (!d) return '0.0';
  return ((n / d) * 100).toFixed(1);
}

function pctColor(val) {
  const n = parseFloat(val);
  if (n >= 80) return 'text-green-600';
  if (n >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'sms', label: 'SMS', emoji: '📱' },
  { value: 'email', label: 'Email', emoji: '📧' },
  { value: 'rcs', label: 'RCS', emoji: '📡' },
];

const STEP_LABELS = ['Details', 'Audience', 'Message', 'Review'];

/* ── StepIndicator ─────────────────────────────────────────── */

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-12 h-0.5 ${
                  step <= current ? 'bg-brand-primary' : 'bg-gray-200'
                }`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-brand-primary text-white'
                    : active
                    ? 'bg-brand-primary text-white ring-4 ring-brand-primary/20'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? <Check size={14} /> : step}
              </div>
              <span
                className={`text-xs mt-1.5 ${
                  active ? 'font-semibold text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Campaigns page ────────────────────────────────────────── */

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* list state */
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  /* creation state */
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    segment_id: '',
    channel: '',
    message: '',
    ai_generated: false,
  });
  const [segments, setSegments] = useState([]);
  const [messageVariants, setMessageVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  /* ── initial fetch ───────────────────────────────────────── */

  useEffect(() => {
    setLoading(true);
    Promise.all([getCampaigns(), getSegments()])
      .then(([camRes, segRes]) => {
        setCampaigns(Array.isArray(camRes) ? camRes : camRes.campaigns || []);
        setSegments(Array.isArray(segRes) ? segRes : segRes.segments || []);
      })
      .catch((e) => {
        console.error('Failed to load data', e);
        setFetchError('Failed to load data. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, []);

  /* pre-fill from URL params */
  useEffect(() => {
    const sid = searchParams.get('segment_id');
    const rec = searchParams.get('recommendation');
    if (sid || rec) {
      setForm((f) => ({ ...f, segment_id: sid || rec || '' }));
      setShowCreate(true);
      if (sid || rec) setCreateStep(2);
    }
  }, [searchParams]);

  /* ── form helpers ────────────────────────────────────────── */

  function updateForm(patch) {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  }

  function resetCreate() {
    setShowCreate(false);
    setCreateStep(1);
    setForm({ name: '', segment_id: '', channel: '', message: '', ai_generated: false });
    setMessageVariants([]);
    setError(null);
  }

  /* step validation */
  function canNext() {
    if (createStep === 1) return form.name.trim().length >= 3;
    if (createStep === 2) return !!form.segment_id;
    if (createStep === 3) return !!form.channel && form.message.trim().length > 0;
    return true;
  }

  /* ── generate AI message ─────────────────────────────────── */

  async function handleAIDraft() {
    if (!form.segment_id) return;
    setVariantsLoading(true);
    setError(null);
    try {
      const res = await generateMessage(form.segment_id);
      setMessageVariants(res.variants || res || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate message');
    } finally {
      setVariantsLoading(false);
    }
  }

  /* ── launch campaign ─────────────────────────────────────── */

  async function handleLaunch() {
    setLaunching(true);
    setError(null);
    try {
      const { message, ...rest } = form;
      const created = await createCampaign({ ...rest, message_template: message });
      const id = created._id || created.id;
      await launchCampaign(id);
      navigate(`/campaigns/${id}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to launch campaign');
    } finally {
      setLaunching(false);
    }
  }

  /* ── refresh list after returning from creation ──────────── */

  function refreshList() {
    getCampaigns()
      .then((res) => setCampaigns(Array.isArray(res) ? res : res.campaigns || []))
      .catch(() => {});
  }

  /* ── derived ─────────────────────────────────────────────── */

  const selectedSegment = segments.find(
    (s) => (s._id || s.id) === form.segment_id,
  );

  const MSG_MAX = 160;

  /* ── loading ─────────────────────────────────────────────── */

  if (loading) return <LoadingSpinner size="lg" message="Loading campaigns…" />;

  /* ════════════════════════════════════════════════════════════
     CAMPAIGN CREATION FLOW
     ════════════════════════════════════════════════════════════ */

  if (showCreate) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        {/* Back to list */}
        <button
          onClick={resetCreate}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Campaigns
        </button>

        <StepIndicator current={createStep} />

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Step 1 — Details ─────────────────────────────── */}
        {createStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="e.g. Summer Re-engagement"
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition"
              />
              {form.name.length > 0 && form.name.trim().length < 3 && (
                <p className="text-xs text-red-400 mt-1">Name must be at least 3 characters</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2 — Audience ────────────────────────────── */}
        {createStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Select Segment</h2>
              <a
                href="/segments"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors"
              >
                Create new segment <ExternalLink size={12} />
              </a>
            </div>

            {segments.length === 0 ? (
              <EmptyState
                title="No segments available"
                description="Create a segment first to target your audience."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {segments.map((seg) => {
                  const id = seg._id || seg.id;
                  const selected = form.segment_id === id;
                  return (
                    <button
                      key={id}
                      onClick={() => updateForm({ segment_id: id })}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        selected
                          ? 'border-brand-primary bg-brand-light/50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-gray-900 text-sm">{seg.name}</p>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      {seg.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{seg.description}</p>
                      )}
                      <p className="text-xs font-medium text-brand-accent mt-2">
                        {(seg.customer_count ?? 0).toLocaleString()} customers
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3 — Message ─────────────────────────────── */}
        {createStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Compose Message</h2>

            {/* Channel selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CHANNELS.map((ch) => {
                  const selected = form.channel === ch.value;
                  return (
                    <button
                      key={ch.value}
                      onClick={() => updateForm({ channel: ch.value })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-sm transition-all ${
                        selected
                          ? 'border-brand-primary bg-brand-light/50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-2xl">{ch.emoji}</span>
                      <span className={selected ? 'font-semibold text-gray-900' : 'text-gray-500'}>
                        {ch.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Message</label>
                <span
                  className={`text-xs ${
                    form.message.length > MSG_MAX ? 'text-red-500 font-semibold' : 'text-gray-400'
                  }`}
                >
                  {form.message.length}/{MSG_MAX}
                </span>
              </div>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => updateForm({ message: e.target.value, ai_generated: false })}
                placeholder="Type your campaign message…"
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition resize-none"
              />
            </div>

            {/* AI Draft button */}
            <button
              onClick={handleAIDraft}
              disabled={variantsLoading || !form.segment_id}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles size={16} />
              {variantsLoading ? 'Generating…' : '✨ AI Draft'}
            </button>

            {variantsLoading && <LoadingSpinner size="sm" message="AI is drafting messages…" />}

            {/* Variant cards */}
            {messageVariants.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {messageVariants.slice(0, 3).map((v, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 p-4 flex flex-col justify-between hover:border-brand-accent/40 transition-colors"
                  >
                    {v.tone && (
                      <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1.5">
                        {v.tone}
                      </span>
                    )}
                    <p className="text-sm text-gray-700 flex-1">{v.message || v.text}</p>
                    {v.why && (
                      <p className="text-xs text-gray-400 mt-2 italic">"{v.why}"</p>
                    )}
                    <button
                      onClick={() =>
                        updateForm({ message: v.message || v.text, ai_generated: true })
                      }
                      className="mt-3 text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors text-left"
                    >
                      Use This →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4 — Review ──────────────────────────────── */}
        {createStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Review &amp; Launch</h2>

            <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
              {[
                ['Campaign Name', form.name],
                ['Segment', selectedSegment?.name || form.segment_id],
                [
                  'Audience Size',
                  selectedSegment
                    ? `${(selectedSegment.customer_count ?? 0).toLocaleString()} customers`
                    : '—',
                ],
                [
                  'Channel',
                  CHANNELS.find((c) => c.value === form.channel)?.emoji +
                    ' ' +
                    (CHANNELS.find((c) => c.value === form.channel)?.label || form.channel),
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-gray-900 font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Message preview */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">Message Preview</span>
                {form.ai_generated && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                    AI Generated
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {form.message}
              </div>
            </div>

            {/* Launch button */}
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-lg bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {launching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Launching…
                </>
              ) : (
                <>
                  <Rocket size={16} /> Launch Campaign
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Step nav buttons ─────────────────────────────── */}
        {createStep < 4 && (
          <div className="flex justify-between mt-6">
            {createStep > 1 ? (
              <button
                onClick={() => setCreateStep((s) => s - 1)}
                className="flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={() => setCreateStep((s) => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 text-sm font-medium px-5 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

        {createStep === 4 && (
          <div className="mt-6">
            <button
              onClick={() => setCreateStep(3)}
              className="flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     MAIN LIST VIEW
     ════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Table */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm">
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Launch your first campaign to engage customers."
            actionLabel="New Campaign"
            onAction={() => setShowCreate(true)}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50/60">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Segment</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent</th>
                  <th className="px-5 py-3">Delivered %</th>
                  <th className="px-5 py-3">Opened %</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((c) => {
                  const id = c._id || c.id;
                  const total = c.stats?.total ?? c.stats?.sent ?? 0;
                  const delivered = c.stats?.delivered ?? 0;
                  const opened = c.stats?.opened ?? 0;
                  const delPct = pct(delivered, total);
                  const openPct = pct(opened, delivered);

                  const segId = c.segment_id?._id || c.segment_id;
                  const segmentName = c.segment_id?.name || c.segment_name || segments.find(s => (s._id || s.id) === segId)?.name || '—';

                  return (
                    <tr
                      key={id}
                      className="hover:bg-amber-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/campaigns/${id}`)}
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-5 py-3 text-gray-500">{segmentName}</td>
                      <td className="px-5 py-3 text-gray-500 capitalize">{c.channel || '—'}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-700">{total.toLocaleString()}</td>
                      <td className={`px-5 py-3 font-medium ${pctColor(delPct)}`}>
                        {delPct}%
                      </td>
                      <td className="px-5 py-3 text-gray-700">{openPct}%</td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        {c.status === 'draft' ? (
                          <button
                            onClick={async () => {
                              try {
                                await launchCampaign(id);
                                refreshList();
                              } catch (err) {
                                console.error('Launch failed', err);
                              }
                            }}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity"
                          >
                            Launch
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/campaigns/${id}`)}
                            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            <ExternalLink size={12} />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
