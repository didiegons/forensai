import { Handle, Position } from '@xyflow/react';

// One parameterized node component for all entity types — styling and
// icon driven entirely by `data.entityType`, so a single component covers
// company/vendor/approver/bankAccount/address/email/phone/beneficiary
// instead of nine near-duplicate files.

const TYPE_META = {
  company: { icon: '🏢', border: 'var(--border)', bg: 'var(--surface2)' },
  vendor: { icon: '🏬' }, // border/bg driven by riskLevel below
  approver: { icon: '✍️', border: 'var(--accent)', bg: 'var(--accent-bg)' },
  bankAccount: { icon: '🏦', border: 'var(--high)', bg: 'var(--high-bg)' },
  address: { icon: '📍', border: 'var(--high)', bg: 'var(--high-bg)' },
  email: { icon: '✉️', border: 'var(--high)', bg: 'var(--high-bg)' },
  phone: { icon: '☎️', border: 'var(--high)', bg: 'var(--high-bg)' },
  beneficiary: { icon: '👤', border: 'var(--high)', bg: 'var(--high-bg)' },
};

const RISK_BORDER = { high: 'var(--high)', med: 'var(--med)', low: 'var(--low)' };
const RISK_BG = { high: 'var(--high-bg)', med: 'var(--med-bg)', low: 'var(--low-bg)' };

export default function MoneyTrailNode({ data, selected }) {
  const meta = TYPE_META[data.entityType] || TYPE_META.company;
  const isApproverEmphasized = data.entityType === 'approver' && data.emphasized;

  const border = data.entityType === 'vendor'
    ? RISK_BORDER[data.riskLevel] || 'var(--border)'
    : isApproverEmphasized
      ? 'var(--med)'
      : meta.border;
  const bg = data.entityType === 'vendor'
    ? RISK_BG[data.riskLevel] || 'var(--surface)'
    : isApproverEmphasized
      ? 'var(--med-bg)'
      : meta.bg;

  // React Flow's own node wrapper is deliberately made non-focusable
  // (nodesFocusable={false} on <ReactFlow>) so this is the single tab
  // stop per node — otherwise there'd be two nested focusable elements
  // (its role="group" wrapper and this button) fighting over Tab order.
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  }

  return (
    <div
      className="mt-node"
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${data.entityTypeLabel} node: ${data.label}${data.entityType === 'vendor' ? `, risk score ${data.riskScore}` : ''}`}
      style={{
        borderColor: border,
        background: bg,
        boxShadow: selected ? '0 0 0 2px var(--accent)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span className="mt-node-icon" aria-hidden="true">{meta.icon}</span>
      <span className="mt-node-label">{data.label}</span>
      {data.entityType === 'vendor' && (
        <span className="mt-node-sub">{data.riskScore}/100</span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
