import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Trash2, Sparkles, Filter } from 'lucide-react';
import {
  getSegments,
  createSegment,
  deleteSegment,
  previewSegment,
  generateSegmentFromNL,
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';

/* ── field / operator config ───────────────────────────────── */

const FIELDS = [
  { value: 'total_spend', label: 'Total Spend', type: 'number' },
  { value: 'total_orders', label: 'Total Orders', type: 'number' },
  { value: 'last_order_date', label: 'Last Order Date', type: 'date' },
  { value: 'avg_order_value', label: 'Avg Order Value', type: 'number' },
  { value: 'is_churned', label: 'Is Churned', type: 'boolean' },
  { value: 'tags', label: 'Tags', type: 'string' },
];

const OPERATORS = {
  number: [
    { value: 'gt', label: 'is greater than' },
    { value: 'lt', label: 'is less than' },
    { value: 'eq', label: 'is equal to' },
    { value: 'between', label: 'is between' },
  ],
  date: [
    { value: 'in_last_days', label: 'in the last X days' },
    { value: 'more_than_days_ago', label: 'more than X days ago' },
  ],
  boolean: [
    { value: 'eq_true', label: 'is true' },
    { value: 'eq_false', label: 'is false' },
  ],
  string: [
    { value: 'eq', label: 'is equal to' },
    { value: 'contains', label: 'contains' },
  ],
};

function fieldType(fieldValue) {
  return FIELDS.find((f) => f.value === fieldValue)?.type || 'string';
}

function emptyRule() {
  return { field: 'total_spend', operator: 'gt', value: '', id: Date.now() };
}

/* ── human-readable rule text ──────────────────────────────── */

function ruleToText(r) {
  const f = FIELDS.find((f) => f.value === r.field)?.label || r.field;
  const ops = OPERATORS[fieldType(r.field)] || [];
  const o = ops.find((o) => o.value === r.operator)?.label || r.operator;
  return `${f} ${o} ${r.value ?? ''}`.trim();
}

/* ── useDebounce ───────────────────────────────────────────── */

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── Segments page ─────────────────────────────────────────── */

export default function Segments() {
  const navigate = useNavigate();

  /* list state */
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  /* drawer state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('rules');

  /* rule-builder state */
  const [rules, setRules] = useState([emptyRule()]);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /* NL state */
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState(null);
  const [nlError, setNlError] = useState(null);
  const [nlName, setNlName] = useState('');

  /* delete modal */
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ── fetch segments ──────────────────────────────────────── */

  const loadSegments = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    getSegments()
      .then((res) => setSegments(Array.isArray(res) ? res : res.segments || []))
      .catch((e) => {
        console.error('Failed to load segments', e);
        setFetchError('Failed to load data. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  /* ── live preview (debounced) ─────────────────────────────── */

  const debouncedRules = useDebounce(rules, 600);

  useEffect(() => {
    const valid = debouncedRules.filter((r) => r.field && r.operator && r.value !== '');
    if (valid.length === 0) { setPreview(null); return; }
    setPreviewLoading(true);
    previewSegment(valid)
      .then((res) => setPreview(res))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [debouncedRules]);

  /* ── rule helpers ─────────────────────────────────────────── */

  function updateRule(id, patch) {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        // reset operator+value when field type changes
        if (patch.field && fieldType(patch.field) !== fieldType(r.field)) {
          const newType = fieldType(patch.field);
          updated.operator = OPERATORS[newType]?.[0]?.value || 'eq';
          updated.value = '';
        }
        return updated;
      }),
    );
  }

  function removeRule(id) {
    setRules((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  /* ── save segment (rule builder) ─────────────────────────── */

  async function handleSave() {
    if (!segmentName.trim()) return;
    setSaving(true);
    try {
      await createSegment({
        name: segmentName.trim(),
        description: segmentDescription.trim(),
        type: 'rule_based',
        rules: rules.filter((r) => r.value !== ''),
      });
      resetDrawer();
      loadSegments();
    } catch (e) {
      console.error('Failed to create segment', e);
    } finally {
      setSaving(false);
    }
  }

  /* ── NL generate ─────────────────────────────────────────── */

  async function handleGenerate() {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    setNlError(null);
    setNlResult(null);
    try {
      const res = await generateSegmentFromNL(nlQuery.trim());
      setNlResult(res);
      setNlName(res.name || '');
    } catch (e) {
      setNlError(e.response?.data?.error || e.message || 'Generation failed');
    } finally {
      setNlLoading(false);
    }
  }

  async function handleSaveNL() {
    if (!nlResult) return;
    setSaving(true);
    try {
      await createSegment({
        name: nlName.trim() || nlResult.name,
        description: nlResult.description || '',
        type: 'ai_generated',
        rules: nlResult.rules || [],
        natural_language_query: nlQuery.trim(),
      });
      resetDrawer();
      loadSegments();
    } catch (e) {
      console.error('Failed to save NL segment', e);
    } finally {
      setSaving(false);
    }
  }

  /* ── delete ──────────────────────────────────────────────── */

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSegment(deleteTarget._id || deleteTarget.id);
      loadSegments();
    } catch (e) {
      console.error('Failed to delete segment', e);
    } finally {
      setDeleteTarget(null);
    }
  }

  /* ── reset drawer ────────────────────────────────────────── */

  function resetDrawer() {
    setDrawerOpen(false);
    setDrawerTab('rules');
    setRules([emptyRule()]);
    setSegmentName('');
    setSegmentDescription('');
    setPreview(null);
    setNlQuery('');
    setNlResult(null);
    setNlError(null);
    setNlName('');
  }

  /* ── render ──────────────────────────────────────────────── */

  if (loading) return <LoadingSpinner size="lg" message="Loading segments…" />;

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent">
          {segments.length}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Segment
        </button>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      {segments.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No segments yet"
          description="Create your first audience segment."
          actionLabel="New Segment"
          onAction={() => setDrawerOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div
              key={seg._id || seg.id}
              className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 leading-snug">{seg.name}</h3>
                  <button
                    onClick={() => setDeleteTarget(seg)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {seg.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">{seg.description}</p>
                )}

                <p className="text-2xl font-bold text-gray-900">
                  {(seg.customer_count ?? 0).toLocaleString()}
                  <span className="text-sm font-normal text-gray-400 ml-1">customers</span>
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    seg.type === 'ai_generated' || seg.type === 'ai'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {seg.type === 'ai_generated' || seg.type === 'ai' ? 'AI Generated' : 'Rule Based'}
                </span>

                <span className="text-xs text-gray-400">
                  {new Date(seg.created_at).toLocaleDateString()}
                </span>
              </div>

              <button
                onClick={() => navigate(`/campaigns?segment_id=${seg._id || seg.id}`)}
                className="mt-3 text-sm font-medium text-brand-primary hover:text-brand-accent transition-colors text-left"
              >
                Use in Campaign →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirm modal ────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Segment"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Drawer ──────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90]"
            onClick={resetDrawer}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-xl z-[100] flex flex-col animate-[slideIn_0.2s_ease-out]">
            {/* Drawer header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">New Segment</h2>
                <button
                  onClick={resetDrawer}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'rules', label: 'Rule Builder' },
                  { key: 'ai', label: 'Ask AI' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDrawerTab(t.key)}
                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                      drawerTab === t.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {drawerTab === 'rules' ? (
                /* ── TAB 1 — Rule Builder ─────────────────────── */
                <>
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Segment Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      placeholder="e.g. High Spenders"
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={segmentDescription}
                      onChange={(e) => setSegmentDescription(e.target.value)}
                      placeholder="Optional description…"
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition resize-none"
                    />
                  </div>

                  {/* Rules */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rules</label>
                    <div className="space-y-3">
                      {rules.map((rule) => {
                        const ft = fieldType(rule.field);
                        const ops = OPERATORS[ft] || [];
                        const isBool = ft === 'boolean';

                        return (
                          <div
                            key={rule.id}
                            className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100"
                          >
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              {/* field */}
                              <select
                                value={rule.field}
                                onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                                className="col-span-1 text-xs rounded-md border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                              >
                                {FIELDS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>

                              {/* operator */}
                              <select
                                value={rule.operator}
                                onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                                className="col-span-1 text-xs rounded-md border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                              >
                                {ops.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>

                              {/* value */}
                              {!isBool && (
                                <input
                                  type={ft === 'number' ? 'number' : 'text'}
                                  value={rule.value}
                                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                  placeholder={ft === 'date' ? 'days' : 'value'}
                                  className="col-span-1 text-xs rounded-md border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                                />
                              )}
                            </div>

                            <button
                              onClick={() => removeRule(rule.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setRules((prev) => [...prev, emptyRule()])}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors"
                    >
                      <Plus size={14} /> Add Rule
                    </button>
                  </div>

                  {/* Preview */}
                  {(preview || previewLoading) && (
                    <div className="rounded-lg bg-brand-light border border-brand-accent/20 p-4 text-sm">
                      {previewLoading ? (
                        <span className="text-gray-500">Counting matches…</span>
                      ) : (
                        <span className="font-medium text-gray-700">
                          ~{(preview?.count ?? 0).toLocaleString()} customers match
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* ── TAB 2 — Ask AI ───────────────────────────── */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Describe your audience in plain English
                    </label>
                    <textarea
                      rows={4}
                      value={nlQuery}
                      onChange={(e) => setNlQuery(e.target.value)}
                      placeholder="e.g. Customers who spent over ₹2000 but haven't ordered in 3 weeks"
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition resize-none"
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={nlLoading || !nlQuery.trim()}
                    className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles size={16} />
                    {nlLoading ? 'Generating…' : '✨ Generate Segment'}
                  </button>

                  {nlLoading && <LoadingSpinner size="sm" message="AI is thinking…" />}

                  {nlError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                      {nlError}
                    </div>
                  )}

                  {nlResult && (
                    <div className="rounded-xl border border-gray-200 p-5 space-y-4">
                      {/* Editable name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Segment Name
                        </label>
                        <input
                          type="text"
                          value={nlName}
                          onChange={(e) => setNlName(e.target.value)}
                          className="w-full text-sm font-semibold rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition"
                        />
                      </div>

                      {/* Description */}
                      {nlResult.description && (
                        <p className="text-sm text-gray-500">{nlResult.description}</p>
                      )}

                      {/* Rules */}
                      {nlResult.rules?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">Rules</p>
                          <ul className="space-y-1">
                            {nlResult.rules.map((r, i) => (
                              <li
                                key={i}
                                className="text-sm text-gray-700 flex items-start gap-2"
                              >
                                <span className="text-brand-accent mt-0.5">•</span>
                                {ruleToText(r)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Match count */}
                      {nlResult.count != null && (
                        <div className="rounded-lg bg-brand-light p-3 text-sm font-medium text-gray-700">
                          {nlResult.count.toLocaleString()} customers match
                        </div>
                      )}

                      {/* Sample customers */}
                      {nlResult.sample_customers?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Sample customers</p>
                          <p className="text-sm text-gray-600">
                            {nlResult.sample_customers
                              .slice(0, 3)
                              .map((c) => c.name || c)
                              .join(', ')}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleSaveNL}
                        disabled={saving}
                        className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {saving ? 'Saving…' : 'Save This Segment'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer footer — only for rule builder tab */}
            {drawerTab === 'rules' && (
              <div className="p-6 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving || !segmentName.trim()}
                  className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {saving ? 'Saving…' : 'Save Segment'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
