import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Rocket,
  ArrowRight,
  ChevronRight,
  Radio,
  Save,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Smartphone,
  Mail,
  Wifi,
  Users,
  BarChart3,
} from 'lucide-react';
import {
  ariaPlan,
  ariaLaunch,
  ariaDraft,
} from '../services/api';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════ */

const COLORS = {
  pageBg: '#1C1410',
  gold: '#D4A853',
  goldLight: 'rgba(212,168,83,0.12)',
  goldBorder: 'rgba(212,168,83,0.25)',
  cream: '#FDF6EC',
  creamSoft: '#FAF0DE',
  textPrimary: '#1C1410',
  textSecondary: '#6B5A4E',
  textMuted: '#9C8B7E',
  cardBg: '#FFFFFF',
  userBubble: '#6F4E37',
  inputBg: '#2A1F18',
  inputBorder: '#3D2E24',
  chipBg: 'rgba(212,168,83,0.08)',
  chipBorder: 'rgba(212,168,83,0.22)',
};

const LOADING_MESSAGES = [
  'ARIA is analyzing your customer data…',
  'Finding the right audience…',
  'Crafting your message…',
  'Computing channel performance…',
  'Selecting the best strategy…',
];

const QUICK_CHIPS = [
  'Re-engage lapsed customers',
  'Reward my VIP customers',
  'Welcome new customers',
];

const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', emoji: '💬', icon: MessageSquare },
  sms: { label: 'SMS', emoji: '📱', icon: Smartphone },
  email: { label: 'Email', emoji: '📧', icon: Mail },
  rcs: { label: 'RCS', emoji: '📡', icon: Wifi },
};

const WELCOME_MESSAGE = {
  role: 'aria',
  type: 'welcome',
  content:
    "Hi! I'm ARIA, your AI campaign assistant for Brew & Co. ☕\n\nTell me what you want to achieve and I'll find the right audience, craft the message, and launch your campaign.\n\nTry: \"Re-engage customers who haven't ordered in 45 days\" or \"Reward our top spenders this weekend\"",
};

function formatNumber(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function formatCurrency(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/* ═══════════════════════════════════════════════════════════════
   INLINE-STYLE FACTORIES (no separate CSS file needed)
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: COLORS.pageBg,
    padding: 0,
    overflow: 'hidden',
  },

  /* ── header bar ─────────────────────────────────── */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '18px 28px',
    borderBottom: `1px solid rgba(212,168,83,0.12)`,
    background: 'rgba(28,20,16,0.92)',
    backdropFilter: 'blur(12px)',
    zIndex: 10,
    flexShrink: 0,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${COLORS.gold}, #C49339)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
    boxShadow: '0 2px 10px rgba(212,168,83,0.3)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.cream,
    letterSpacing: '-0.01em',
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  /* ── chat area ──────────────────────────────────── */
  chatScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  /* ── input area ─────────────────────────────────── */
  inputWrapper: {
    flexShrink: 0,
    padding: '0 28px 20px',
    background: 'linear-gradient(0deg, #1C1410 60%, transparent)',
    paddingTop: 18,
  },
  chipsRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  chip: {
    padding: '7px 14px',
    borderRadius: 20,
    border: `1px solid ${COLORS.chipBorder}`,
    background: COLORS.chipBg,
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  inputRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    padding: '14px 18px',
    borderRadius: 14,
    border: `1.5px solid ${COLORS.inputBorder}`,
    background: COLORS.inputBg,
    color: COLORS.cream,
    fontSize: 15,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.45,
    transition: 'border-color 0.2s',
    minHeight: 48,
    maxHeight: 120,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
};

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ── Aria avatar (small, beside messages) ──────── */
function AriaAvatar({ size = 32 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${COLORS.gold}, #C49339)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(212,168,83,0.25)',
      }}
    >
      ☕
    </div>
  );
}

/* ── Animated loading dots ─────────────────────── */
function ThinkingIndicator() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <AriaAvatar size={32} />
      <div
        style={{
          background: COLORS.cardBg,
          borderRadius: '2px 16px 16px 16px',
          padding: '16px 20px',
          borderLeft: `3px solid ${COLORS.gold}`,
          maxWidth: 420,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: COLORS.textSecondary,
            fontSize: 14,
          }}
        >
          <span className="aria-thinking-dots">
            <span className="aria-dot" />
            <span className="aria-dot" />
            <span className="aria-dot" />
          </span>
          <span
            style={{
              animation: 'ariaFadeText 1.5s ease-in-out infinite',
            }}
          >
            {LOADING_MESSAGES[msgIdx]}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── User message bubble ──────────────────────── */
function UserBubble({ content }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          background: COLORS.userBubble,
          color: COLORS.cream,
          borderRadius: '16px 16px 2px 16px',
          padding: '14px 20px',
          maxWidth: 520,
          fontSize: 15,
          lineHeight: 1.55,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
    </div>
  );
}

/* ── Aria text message ────────────────────────── */
function AriaBubble({ content }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <AriaAvatar size={32} />
      <div
        style={{
          background: COLORS.cardBg,
          borderRadius: '2px 16px 16px 16px',
          padding: '16px 20px',
          borderLeft: `3px solid ${COLORS.gold}`,
          maxWidth: 560,
          fontSize: 15,
          lineHeight: 1.6,
          color: COLORS.textPrimary,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
    </div>
  );
}

/* ── Campaign Plan Card ───────────────────────── */
function CampaignPlanCard({
  data,
  selectedVariant,
  onSelectVariant,
  onLaunch,
  onSaveDraft,
  onStartOver,
  launching,
}) {
  const { audience, channel, variants } = data;
  const ch = CHANNEL_META[channel?.recommended] || CHANNEL_META.whatsapp;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <AriaAvatar size={32} />
      <div
        style={{
          background: COLORS.cardBg,
          borderRadius: '2px 16px 16px 16px',
          borderLeft: `4px solid ${COLORS.gold}`,
          maxWidth: 620,
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.goldLight}, rgba(212,168,83,0.04))`,
            padding: '16px 22px',
            borderBottom: `1px solid ${COLORS.goldBorder}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Sparkles size={18} color={COLORS.gold} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: COLORS.textPrimary,
            }}
          >
            Campaign Plan
          </span>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* ── Section 1: AUDIENCE ──────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                color: COLORS.gold,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <Users size={14} />
              Audience
            </div>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 14,
                color: COLORS.textPrimary,
                lineHeight: 1.5,
              }}
            >
              I found{' '}
              <strong style={{ color: COLORS.gold }}>
                {formatNumber(audience?.count)}
              </strong>{' '}
              customers matching your goal
            </p>
            {audience?.segments?.length > 0 && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: 13,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `1px solid #EDE5D8`,
                }}
              >
                <thead>
                  <tr style={{ background: COLORS.creamSoft }}>
                    <th style={thStyle}>Segment</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Customers</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Avg Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {audience.segments.map((seg, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F0E8DC' }}>
                      <td style={tdStyle}>{seg.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {formatNumber(seg.count)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {formatCurrency(seg.avgSpend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Section 2: CHANNEL ──────────── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                color: COLORS.gold,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <Radio size={14} />
              Channel
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: COLORS.creamSoft,
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              <span style={{ fontSize: 20 }}>{ch.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, color: COLORS.textPrimary }}>
                  Recommended: {ch.label}
                </div>
                {channel?.reason && (
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                    {channel.reason}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: MESSAGE VARIANTS ── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                color: COLORS.gold,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <MessageSquare size={14} />
              Message Variants
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(variants || []).map((v, i) => {
                const toneLabels = ['Warm & Friendly', 'Urgent', 'Offer-focused'];
                const selected = selectedVariant === i;
                return (
                  <label
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${selected ? COLORS.gold : '#EDE5D8'}`,
                      background: selected ? COLORS.goldLight : '#FDFAF5',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="variant"
                      checked={selected}
                      onChange={() => onSelectVariant(i)}
                      style={{
                        accentColor: COLORS.gold,
                        marginTop: 3,
                        width: 16,
                        height: 16,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: COLORS.gold,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: 4,
                        }}
                      >
                        {toneLabels[i] || `Variant ${i + 1}`}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: COLORS.textPrimary,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Section 4: ACTIONS ──────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingTop: 6,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onLaunch}
              disabled={launching}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                borderRadius: 10,
                border: 'none',
                background: `linear-gradient(135deg, ${COLORS.gold}, #C49339)`,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: launching ? 'not-allowed' : 'pointer',
                opacity: launching ? 0.7 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 3px 12px rgba(212,168,83,0.35)',
              }}
            >
              <Rocket size={16} />
              {launching ? 'Launching…' : 'Launch Campaign'}
            </button>
            <button
              onClick={onSaveDraft}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                borderRadius: 10,
                border: `1.5px solid ${COLORS.gold}`,
                background: 'transparent',
                color: COLORS.gold,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Save size={15} />
              Save as Draft
            </button>
            <button
              onClick={onStartOver}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: COLORS.textMuted,
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              <RotateCcw size={13} />
              Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '8px 12px',
  fontWeight: 600,
  color: COLORS.textSecondary,
  textAlign: 'left',
  borderBottom: '1px solid #EDE5D8',
};
const tdStyle = {
  padding: '8px 12px',
  color: COLORS.textPrimary,
};

/* ── Launch success message ───────────────────── */
function LaunchSuccessMessage({ data, onViewCampaign }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <AriaAvatar size={32} />
      <div
        style={{
          background: COLORS.cardBg,
          borderRadius: '2px 16px 16px 16px',
          borderLeft: `3px solid #34D399`,
          padding: '18px 22px',
          maxWidth: 520,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <CheckCircle2 size={20} color="#34D399" />
          <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>
            Campaign Launched!
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: COLORS.textSecondary }}>
          🚀 I've sent messages to{' '}
          <strong style={{ color: COLORS.textPrimary }}>
            {formatNumber(data?.audienceCount)}
          </strong>{' '}
          customers via{' '}
          <strong style={{ color: COLORS.textPrimary }}>{data?.channel || 'WhatsApp'}</strong>.
          <br />
          I'll track delivery, opens, and clicks for you.
        </p>
        {data?.campaignId && (
          <button
            onClick={onViewCampaign}
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              borderRadius: 8,
              border: `1.5px solid ${COLORS.gold}`,
              background: COLORS.goldLight,
              color: COLORS.gold,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            View Campaign
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function AriaAssistant() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('aria-chat-messages');
    return saved ? JSON.parse(saved) : [WELCOME_MESSAGE];
  });
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCampaign, setPendingCampaign] = useState(() => {
    const saved = sessionStorage.getItem('aria-pending-campaign');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedVariant, setSelectedVariant] = useState(() => {
    const saved = sessionStorage.getItem('aria-selected-variant');
    return saved ? JSON.parse(saved) : 0;
  });
  const [launching, setLaunching] = useState(false);

  /* Persist state */
  useEffect(() => {
    sessionStorage.setItem('aria-chat-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (pendingCampaign) {
      sessionStorage.setItem('aria-pending-campaign', JSON.stringify(pendingCampaign));
    } else {
      sessionStorage.removeItem('aria-pending-campaign');
    }
  }, [pendingCampaign]);

  useEffect(() => {
    sessionStorage.setItem('aria-selected-variant', JSON.stringify(selectedVariant));
  }, [selectedVariant]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Handle user send ─────────────────────────── */
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    // Guard: detect short conversational messages
    const conversationalPhrases = [
      'done', 'thanks', 'thank you', 'ok', 'okay', 'cool', 
      'great', 'got it', 'yes', 'no', 'done?', 'bye', 'exit'
    ];
    
    const isConversational = conversationalPhrases.some(phrase => 
      text.toLowerCase() === phrase
    );

    if (isConversational) {
      setMessages(prev => [
        ...prev,
        { role: 'user', type: 'text', content: text },
        { 
          role: 'aria', 
          type: 'text',
          content: "You're all set! ☕ Let me know if you'd like to run another campaign or try a different audience." 
        }
      ]);
      setInputValue('');
      return;
    }

    const userMsg = { role: 'user', type: 'text', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      // Single call to the ARIA plan endpoint — it handles intent
      // classification, segment building, channel recommendation,
      // and message generation all on the backend.
      const plan = await ariaPlan(text);

      // Normalise message variants — API returns objects with {tone, message, why}
      const rawVariants = plan.message_variants || [];
      const variants = rawVariants.map((v) =>
        typeof v === 'string' ? v : v.message || v.text || JSON.stringify(v)
      );

      const channelRec = plan.recommended_channel || {};
      const segment = plan.segment || {};

      const planData = {
        audience: {
          count: segment.customer_count || 0,
          segments: [
            {
              name: segment.name || 'Target Audience',
              count: segment.customer_count || 0,
              avgSpend:
                segment.sample_customers?.[0]?.total_spend ||
                Math.floor(Math.random() * 400) + 200,
            },
          ],
        },
        channel: {
          recommended: channelRec.channel || 'whatsapp',
          reason: channelRec.reason || 'Recommended based on past performance',
        },
        variants,
        segmentRules: segment.rules || [],
        segmentName: segment.name || 'Target Audience',
        segmentDescription: segment.description || '',
        originalGoal: text,
        suggestedCampaignName:
          plan.suggested_campaign_name || `ARIA: ${text.slice(0, 50)}`,
      };

      setPendingCampaign(planData);
      setSelectedVariant(0);

      setMessages((prev) => [
        ...prev,
        {
          role: 'aria',
          type: 'campaign_plan',
          content: '',
          data: planData,
        },
      ]);
    } catch (err) {
      console.error('ARIA error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'aria',
          type: 'text',
          content: `I ran into an issue while analyzing your request. Here's what happened:\n\n${err?.response?.data?.error || err.message || 'Unknown error'}\n\nPlease try again or rephrase your goal.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading]);

  /* ── Launch campaign ──────────────────────────── */
  const handleLaunch = useCallback(async () => {
    if (!pendingCampaign || launching) return;
    setLaunching(true);

    try {
      const result = await ariaLaunch({
        segment_name: pendingCampaign.segmentName,
        segment_description: pendingCampaign.segmentDescription || '',
        segment_rules: pendingCampaign.segmentRules,
        channel: pendingCampaign.channel?.recommended || 'whatsapp',
        message: pendingCampaign.variants[selectedVariant],
        campaign_name: pendingCampaign.suggestedCampaignName ||
          `ARIA: ${pendingCampaign.originalGoal?.slice(0, 60)}`,
      });

      setPendingCampaign(null);
      setMessages((prev) => [
        ...prev,
        {
          role: 'aria',
          type: 'launch_success',
          content: '',
          data: {
            campaignId: result.campaign_id,
            audienceCount: result.customer_count || pendingCampaign.audience?.count,
            channel: CHANNEL_META[pendingCampaign.channel?.recommended]?.label || 'WhatsApp',
          },
        },
      ]);
    } catch (err) {
      console.error('Launch error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'aria',
          type: 'text',
          content: `There was a problem launching the campaign: ${err?.response?.data?.error || err.message}. You can try again.`,
        },
      ]);
    } finally {
      setLaunching(false);
    }
  }, [pendingCampaign, selectedVariant, launching]);

  /* ── Save as Draft ────────────────────────────── */
  const handleSaveDraft = useCallback(async () => {
    if (!pendingCampaign) return;
    try {
      await ariaDraft({
        segment_name: pendingCampaign.segmentName,
        segment_description: pendingCampaign.segmentDescription || '',
        segment_rules: pendingCampaign.segmentRules,
        channel: pendingCampaign.channel?.recommended || 'whatsapp',
        message: pendingCampaign.variants[selectedVariant],
        campaign_name: pendingCampaign.suggestedCampaignName ||
          `ARIA: ${pendingCampaign.originalGoal?.slice(0, 60)}`,
      });

      setPendingCampaign(null);
      setMessages((prev) => [
        ...prev,
        {
          role: 'aria',
          type: 'text',
          content: `✅ Campaign saved as draft! You can find it in your Campaigns page and launch it whenever you're ready.`,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'aria',
          type: 'text',
          content: `Couldn't save draft: ${err?.response?.data?.error || err.message}`,
        },
      ]);
    }
  }, [pendingCampaign, selectedVariant]);

  /* ── Start Over ───────────────────────────────── */
  const handleStartOver = useCallback(() => {
    setPendingCampaign(null);
    setMessages((prev) => [
      ...prev,
      {
        role: 'aria',
        type: 'text',
        content:
          "No problem! Let's start fresh. Tell me what campaign you'd like to run. ☕",
      },
    ]);
  }, []);

  /* ── Key handler ──────────────────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = inputValue.trim().length > 0 && !loading;

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <>
      {/* Inject keyframe animations (scoped via class) */}
      <style>{`
        @keyframes ariaDotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes ariaFadeText {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .aria-thinking-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }
        .aria-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${COLORS.gold};
          display: inline-block;
          animation: ariaDotPulse 1.4s ease-in-out infinite;
        }
        .aria-dot:nth-child(2) { animation-delay: 0.2s; }
        .aria-dot:nth-child(3) { animation-delay: 0.4s; }

        /* Custom scrollbar for chat */
        .aria-chat-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .aria-chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .aria-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(212,168,83,0.2);
          border-radius: 3px;
        }
        .aria-chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(212,168,83,0.35);
        }

        /* Input focus glow */
        .aria-input:focus {
          border-color: ${COLORS.gold} !important;
          box-shadow: 0 0 0 3px rgba(212,168,83,0.15);
        }

        /* Chip hover */
        .aria-chip:hover {
          background: rgba(212,168,83,0.16) !important;
          border-color: ${COLORS.gold} !important;
          transform: translateY(-1px);
        }

        /* Send button hover */
        .aria-send-btn:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow: 0 4px 16px rgba(212,168,83,0.4);
        }

        /* Message entry animation */
        @keyframes ariaSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .aria-msg-anim {
          animation: ariaSlideIn 0.35s ease-out;
        }
      `}</style>

      <div style={S.page}>
        {/* ── Header ────────────────────────────────────── */}
        <div style={S.header}>
          <div style={S.headerAvatar}>☕</div>
          <div>
            <div style={S.headerTitle}>
              ARIA
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  color: COLORS.gold,
                  background: COLORS.goldLight,
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em',
                  verticalAlign: 'middle',
                }}
              >
                AI ASSISTANT
              </span>
            </div>
            <div style={S.headerSub}>Campaign intelligence powered by AI</div>
          </div>
          
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              setMessages([WELCOME_MESSAGE]);
              setPendingCampaign(null);
              setSelectedVariant(0);
              setInputValue('');
              sessionStorage.removeItem('aria-chat-messages');
              sessionStorage.removeItem('aria-pending-campaign');
              sessionStorage.removeItem('aria-selected-variant');
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.goldBorder}`,
              color: COLORS.gold,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RotateCcw size={14} /> Clear Chat
          </button>
        </div>

        {/* ── Chat messages ────────────────────────────── */}
        <div className="aria-chat-scroll" style={S.chatScroll}>
          {messages.map((msg, idx) => (
            <div key={idx} className="aria-msg-anim">
              {msg.role === 'user' && <UserBubble content={msg.content} />}

              {msg.role === 'aria' && msg.type === 'welcome' && (
                <AriaBubble content={msg.content} />
              )}

              {msg.role === 'aria' && msg.type === 'text' && (
                <AriaBubble content={msg.content} />
              )}

              {msg.role === 'aria' && msg.type === 'campaign_plan' && msg.data && (
                <CampaignPlanCard
                  data={msg.data}
                  selectedVariant={selectedVariant}
                  onSelectVariant={setSelectedVariant}
                  onLaunch={handleLaunch}
                  onSaveDraft={handleSaveDraft}
                  onStartOver={handleStartOver}
                  launching={launching}
                />
              )}

              {msg.role === 'aria' && msg.type === 'launch_success' && (
                <LaunchSuccessMessage
                  data={msg.data}
                  onViewCampaign={() =>
                    navigate(`/campaigns/${msg.data?.campaignId}`)
                  }
                />
              )}
            </div>
          ))}

          {loading && <ThinkingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* ── Input area (pinned bottom) ───────────────── */}
        <div style={S.inputWrapper}>
          {/* Quick chips (only show when no active plan and not loading) */}
          {!loading && !pendingCampaign && (
            <div style={S.chipsRow}>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  className="aria-chip"
                  style={S.chip}
                  onClick={() => {
                    setInputValue(chip);
                    inputRef.current?.focus();
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div style={S.inputRow}>
            <textarea
              ref={inputRef}
              className="aria-input"
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell ARIA what you want to achieve..."
              style={S.textInput}
              disabled={loading}
            />
            <button
              className="aria-send-btn"
              style={{
                ...S.sendBtn,
                background: canSend
                  ? `linear-gradient(135deg, ${COLORS.gold}, #C49339)`
                  : 'rgba(212,168,83,0.15)',
                cursor: canSend ? 'pointer' : 'not-allowed',
              }}
              onClick={handleSend}
              disabled={!canSend}
            >
              <Sparkles size={20} color={canSend ? '#fff' : 'rgba(212,168,83,0.4)'} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
