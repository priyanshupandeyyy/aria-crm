import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Upload, X, ShoppingBag } from 'lucide-react';
import { getCustomers, getCustomerById } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

/* ── helpers ───────────────────────────────────────────────── */

function formatCurrency(n) {
  if (n == null) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const channelEmoji = { sms: '📱SMS', whatsapp: '💬WhatsApp', email: '📧Email' };

/* ── useDebounce ───────────────────────────────────────────── */

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── CustomerModal ─────────────────────────────────────────── */

function CustomerModal({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getCustomerById(customerId)
      .then((data) => {
        if (data.customer) {
          setCustomer({ ...data.customer, orders: data.recentOrders || [] });
        } else {
          setCustomer(data);
        }
      })
      .catch((e) => console.error('Failed to load customer', e))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-[100] flex flex-col animate-[slideIn_0.2s_ease-out]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-400" />
        </button>

        {loading ? (
          <LoadingSpinner message="Loading customer…" />
        ) : !customer ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Customer not found
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-lg mb-3">
                {(customer.name || '?')[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{customer.email}</p>
              {customer.phone && (
                <p className="text-sm text-gray-400">{customer.phone}</p>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-gray-100 border-b border-gray-100">
              {[
                ['Total Orders', customer.total_orders ?? 0],
                ['Total Spend', formatCurrency(customer.total_spend)],
                ['Avg Order', formatCurrency(customer.avg_order_value)],
                ['Last Order', customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : '—'],
              ].map(([label, val]) => (
                <div key={label} className="bg-white p-4">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {/* Extra info */}
            <div className="p-6 border-b border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <StatusBadge status={customer.is_churned ? 'churned' : 'active'} />
              </div>
              {customer.channel_preference && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Channel</span>
                  <span className="text-gray-700 capitalize">
                    {channelEmoji[customer.channel_preference] || customer.channel_preference}
                  </span>
                </div>
              )}
            </div>

            {/* Order history */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Orders</h3>

              {(!customer.orders || customer.orders.length === 0) ? (
                <p className="text-sm text-gray-400">No order history available.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-gray-100 space-y-5">
                  {customer.orders.slice(0, 10).map((order, i) => (
                    <div key={order._id || i} className="relative">
                      {/* dot */}
                      <div className="absolute -left-[1.3rem] top-1 w-2.5 h-2.5 rounded-full bg-brand-accent border-2 border-white" />

                      <p className="text-xs text-gray-400">
                        {new Date(order.ordered_at || order.date || order.created_at).toLocaleDateString()}
                      </p>

                      {order.items && order.items.length > 0 && (
                        <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                          {order.items.map((it) => it.name || it).join(', ')}
                        </p>
                      )}

                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {formatCurrency(order.total_amount || order.total || order.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Customers page ────────────────────────────────────────── */

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterChurned, setFilterChurned] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const debouncedSearch = useDebounce(search, 400);
  const limit = 25;

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    const params = { page, limit, search: debouncedSearch || undefined };
    if (filterChurned === 'churned') params.is_churned = true;
    else if (filterChurned === 'active') params.is_churned = false;

    getCustomers(params)
      .then((res) => {
        setCustomers(res.customers || res.data || []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => {
        console.error('Failed to load customers', e);
        setFetchError('Failed to load data. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, filterChurned]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterChurned]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}
      {/* ── Header row ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>

        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent">
          {total.toLocaleString()}
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40 w-64 transition"
          />
        </div>

        {/* Filter */}
        <select
          value={filterChurned}
          onChange={(e) => setFilterChurned(e.target.value)}
          className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 transition"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="churned">Churned</option>
        </select>

        {/* Import CSV (disabled) */}
        <div className="relative group">
          <button
            disabled
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            <Upload size={14} />
            Import CSV
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Coming soon
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner message="Loading customers…" />
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm">
          <EmptyState
            icon={ShoppingBag}
            title="No customers found"
            description="Try adjusting your search or filters."
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50/60">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3">Total Spend</th>
                  <th className="px-5 py-3">Last Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr
                    key={c._id || c.id}
                    className="hover:bg-brand-light/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedId(c._id || c.id)}
                  >
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-900 group-hover:text-brand-accent transition-colors text-left">
                        {c.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.email}</td>
                    <td className="px-5 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-5 py-3 text-gray-700">{c.total_orders ?? 0}</td>
                    <td className="px-5 py-3 text-gray-700">{formatCurrency(c.total_spend)}</td>
                    <td className="px-5 py-3 text-gray-400">{relativeTime(c.last_order_date)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.is_churned ? 'churned' : 'active'} />
                    </td>
                    <td className="px-5 py-3">
                      {c.channel_preference ? (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {channelEmoji[c.channel_preference] || c.channel_preference}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
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
        </div>
      )}

      {/* ── Customer detail modal ───────────────────────────── */}
      {selectedId && (
        <CustomerModal
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
