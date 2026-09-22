import { useMemo, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DisclaimerBanner from './DisclaimerBanner.jsx';
import MoneyTrailNode from './MoneyTrailNode.jsx';
import { fmt } from '../utils/format.js';

const nodeTypes = { moneyTrailNode: MoneyTrailNode };

const ENTITY_LABELS = {
  company: 'Company',
  vendor: 'Vendor',
  approver: 'Approver',
  bankAccount: 'Bank account',
  address: 'Address',
  email: 'Email',
  phone: 'Phone',
  beneficiary: 'Beneficiary',
};

const LEGEND_ITEMS = [
  { type: 'vendor', label: 'Vendor (risk-colored)', swatch: 'var(--low)' },
  { type: 'approver', label: 'Approver', swatch: 'var(--accent)' },
  { type: 'shared', label: 'Shared identifier / flagged relationship', swatch: 'var(--high)' },
  { type: 'company', label: 'Company (root)', swatch: 'var(--muted)' },
];

const DEFAULT_FILTERS = {
  highRiskOnly: false,
  suspiciousOnly: false,
  sharedBankAccount: false,
  sharedAddress: false,
  vendor: '',
  approver: '',
  search: '',
};

// Tiered layout (no layout-library dependency, kept deliberately simple):
// company on top, vendors below it, approvers below that, shared-identifier
// / beneficiary nodes on the bottom row.
const TIER = { company: 0, vendor: 1, approver: 2 };
function layoutNodes(nodes) {
  const byTier = {};
  nodes.forEach((n) => {
    const t = TIER[n.type] ?? 3;
    (byTier[t] = byTier[t] || []).push(n);
  });
  const positioned = {};
  Object.entries(byTier).forEach(([tier, tierNodes]) => {
    const y = Number(tier) * 150 + 30;
    const width = tierNodes.length * 210;
    tierNodes.forEach((n, i) => {
      positioned[n.id] = { x: i * 210 - width / 2 + 105, y };
    });
  });
  return positioned;
}

function computeVisibleGraph(nodes, edges, filters) {
  const search = filters.search.trim().toLowerCase();
  const vendorNodes = nodes.filter((n) => n.type === 'vendor');

  const vendorHasEdgeType = (vendorId, type) =>
    edges.some((e) => e.type === type && e.source === vendorId);

  const visibleVendorIds = new Set(
    vendorNodes
      .filter((n) => !filters.highRiskOnly || n.data.riskLevel === 'high')
      .filter((n) => !filters.suspiciousOnly || n.data.hasFindings)
      .filter((n) => !filters.vendor || n.data.vendor === filters.vendor)
      .filter((n) => !filters.approver || n.data.approvers.includes(filters.approver))
      .filter((n) => !filters.sharedBankAccount || vendorHasEdgeType(n.id, 'uses-bank_account'))
      .filter((n) => !filters.sharedAddress || vendorHasEdgeType(n.id, 'uses-address'))
      .filter((n) => !search || n.label.toLowerCase().includes(search))
      .map((n) => n.id)
  );

  const visibleNodeIds = new Set(visibleVendorIds);
  if (visibleVendorIds.size > 0) visibleNodeIds.add('company');
  edges.forEach((e) => {
    if (visibleVendorIds.has(e.source)) visibleNodeIds.add(e.target);
    if (visibleVendorIds.has(e.target)) visibleNodeIds.add(e.source);
  });

  return {
    visibleNodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
    visibleEdges: edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
  };
}

function FilterBar({ filters, onChange, vendorOptions, approverOptions, onReset, onFit, visibleCount, totalCount }) {
  function set(patch) {
    onChange((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="mt-filterbar" role="group" aria-label="Money Trail filters">
      <div className="mt-filter-search">
        <label htmlFor="mt-search" className="sr-only">
          Search vendor or entity name
        </label>
        <input
          id="mt-search"
          type="text"
          placeholder="Search vendor or entity…"
          className="key-input"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>

      <label className="mt-filter-toggle">
        <input type="checkbox" checked={filters.highRiskOnly} onChange={(e) => set({ highRiskOnly: e.target.checked })} />
        High-risk only
      </label>
      <label className="mt-filter-toggle">
        <input type="checkbox" checked={filters.suspiciousOnly} onChange={(e) => set({ suspiciousOnly: e.target.checked })} />
        Suspicious transactions only
      </label>
      <label className="mt-filter-toggle">
        <input type="checkbox" checked={filters.sharedBankAccount} onChange={(e) => set({ sharedBankAccount: e.target.checked })} />
        Shared bank account
      </label>
      <label className="mt-filter-toggle">
        <input type="checkbox" checked={filters.sharedAddress} onChange={(e) => set({ sharedAddress: e.target.checked })} />
        Shared address
      </label>

      <select className="key-input mt-filter-select" value={filters.vendor} onChange={(e) => set({ vendor: e.target.value })} aria-label="Filter by vendor">
        <option value="">All vendors</option>
        {vendorOptions.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <select className="key-input mt-filter-select" value={filters.approver} onChange={(e) => set({ approver: e.target.value })} aria-label="Filter by approver">
        <option value="">All approvers</option>
        {approverOptions.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <button className="btn" onClick={onReset}>Reset view</button>
      <button className="btn" onClick={onFit}>Fit graph</button>

      <span className="mt-filter-count">{visibleCount} of {totalCount} nodes shown</span>
    </div>
  );
}

function EvidencePanel({ selected, nodesById, onClose }) {
  if (!selected) {
    return (
      <div className="mt-evidence-panel mt-evidence-empty">
        Click a node or a relationship line to see its supporting evidence here.
      </div>
    );
  }

  if (selected.kind === 'node') {
    const n = selected.item;
    return (
      <div className="mt-evidence-panel">
        <div className="mt-evidence-header">
          <span className="finding-type">{ENTITY_LABELS[n.type] || n.type}</span>
          <button className="btn" onClick={onClose} aria-label="Close evidence panel">✕</button>
        </div>
        <div className="finding-title">{n.label}</div>

        {n.type === 'vendor' && (
          <>
            <div className="detail-lbl">Total amount paid</div>
            <div className="detail-body">${fmt(n.data.totalPaid)}</div>
            <div className="detail-lbl">Number of transactions</div>
            <div className="detail-body">{n.data.txnCount}</div>
            <div className="detail-lbl">Risk score</div>
            <div className="detail-body">{n.data.riskScore}/100 ({n.data.riskLevel})</div>
            <div className="detail-lbl">Known flags</div>
            <div className="detail-body">{n.data.findingTitles.length ? n.data.findingTitles.join('; ') : 'None'}</div>
            <div className="detail-lbl">Associated approvers</div>
            <div className="detail-body">{n.data.approvers.join(', ') || 'None on file'}</div>
            <div className="detail-lbl">Shared identifiers</div>
            <div className="detail-body">{n.data.sharedIdentifiers.length ? n.data.sharedIdentifiers.join('; ') : 'None detected'}</div>
            <div className="detail-lbl">Related transaction IDs</div>
            <div className="ev-chain">{n.data.txnIds.map((id) => <span className="ev-chip" key={id}>#{id}</span>)}</div>
          </>
        )}

        {n.type === 'approver' && (
          <>
            <div className="detail-lbl">Vendors approved</div>
            <div className="detail-body">{n.data.vendors.join(', ')}</div>
            <div className="detail-lbl">Why this may warrant review</div>
            <div className="detail-body">
              {n.data.vendors.length >= 3
                ? 'Common approver relationship — this approver touches an unusually high number of vendors, which may warrant review alongside other indicators.'
                : 'A single approver handling a small number of vendors is typical and not inherently notable on its own.'}
            </div>
          </>
        )}

        {['bankAccount', 'address', 'email', 'phone'].includes(n.type) && (
          <>
            <div className="detail-lbl">Value on file</div>
            <div className="detail-body">{n.data.value}</div>
            <div className="detail-lbl">Shared by</div>
            <div className="detail-body">{n.data.sharedBy.join(', ')}</div>
            <div className="detail-lbl">Why this may warrant review</div>
            <div className="detail-body">Shared {ENTITY_LABELS[n.type].toLowerCase()} detected — two or more vendors that should be independent share this value, which is a fraud-risk indicator that warrants professional review.</div>
          </>
        )}

        {n.type === 'beneficiary' && (
          <>
            <div className="detail-lbl">Beneficiary on file</div>
            <div className="detail-body">{n.data.value}</div>
            <div className="detail-lbl">Vendor(s)</div>
            <div className="detail-body">{n.data.vendors.join(', ')}</div>
            <div className="detail-lbl">Why this may warrant review</div>
            <div className="detail-body">The named beneficiary differs from the vendor name on file — worth confirming who actually receives these funds.</div>
          </>
        )}

        {n.type === 'company' && (
          <div className="detail-body" style={{ marginTop: '8px' }}>Root node representing your organization as the payer on every transaction in this dataset.</div>
        )}
      </div>
    );
  }

  const e = selected.item;
  const sourceLabel = nodesById[e.source]?.label || e.source;
  const targetLabel = nodesById[e.target]?.label || e.target;
  return (
    <div className="mt-evidence-panel">
      <div className="mt-evidence-header">
        <span className="finding-type">Relationship</span>
        <button className="btn" onClick={onClose} aria-label="Close evidence panel">✕</button>
      </div>
      <div className="finding-title">{sourceLabel} — {e.label} — {targetLabel}</div>
      <div className="detail-lbl">Entities involved</div>
      <div className="detail-body">{sourceLabel} and {targetLabel}</div>
      {e.data?.supportingValue && (
        <>
          <div className="detail-lbl">Supporting value</div>
          <div className="detail-body">{e.data.supportingValue}</div>
        </>
      )}
      <div className="detail-lbl">Why this may warrant review</div>
      <div className="detail-body">{e.data?.reviewNote}</div>
      {e.data?.txnIds?.length > 0 && (
        <>
          <div className="detail-lbl">Supporting transaction IDs</div>
          <div className="ev-chain">{e.data.txnIds.map((id) => <span className="ev-chip" key={id}>#{id}</span>)}</div>
        </>
      )}
    </div>
  );
}

function MoneyTrailExplorer({ moneyTrail }) {
  const { fitView } = useReactFlow();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);

  const nodesById = useMemo(
    () => Object.fromEntries(moneyTrail.nodes.map((n) => [n.id, n])),
    [moneyTrail.nodes]
  );

  const vendorOptions = useMemo(
    () => moneyTrail.nodes.filter((n) => n.type === 'vendor').map((n) => n.label).sort(),
    [moneyTrail.nodes]
  );
  const approverOptions = useMemo(
    () => moneyTrail.nodes.filter((n) => n.type === 'approver').map((n) => n.label).sort(),
    [moneyTrail.nodes]
  );

  const { visibleNodes, visibleEdges } = useMemo(
    () => computeVisibleGraph(moneyTrail.nodes, moneyTrail.edges, filters),
    [moneyTrail.nodes, moneyTrail.edges, filters]
  );

  const positions = useMemo(() => layoutNodes(moneyTrail.nodes), [moneyTrail.nodes]);

  const rfNodes = useMemo(
    () =>
      visibleNodes.map((n) => ({
        id: n.id,
        type: 'moneyTrailNode',
        position: positions[n.id] || { x: 0, y: 0 },
        data: { ...n.data, entityType: n.type, entityTypeLabel: ENTITY_LABELS[n.type] || n.type, label: n.label, emphasized: n.shared },
      })),
    [visibleNodes, positions]
  );

  const rfEdges = useMemo(
    () =>
      visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: e.label,
        labelStyle: { fill: 'var(--muted)', fontSize: 10 },
        style: e.suspicious ? { stroke: 'var(--high)', strokeWidth: 2 } : { stroke: 'var(--border)', strokeWidth: 1 },
      })),
    [visibleEdges]
  );

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
    setSelected(null);
    window.requestAnimationFrame(() => fitView({ duration: 300 }));
  }

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        vendorOptions={vendorOptions}
        approverOptions={approverOptions}
        onReset={handleReset}
        onFit={() => fitView({ duration: 300 })}
        visibleCount={visibleNodes.length}
        totalCount={moneyTrail.nodes.length}
      />

      <div className="mt-layout">
        <div
          className="mt-graph-wrap"
          aria-label="Money trail relationship graph — interactive. A full text summary of every relationship is provided below the graph."
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_evt, node) => setSelected({ kind: 'node', item: nodesById[node.id] })}
            onEdgeClick={(_evt, edge) => setSelected({ kind: 'edge', item: moneyTrail.edges.find((e) => e.id === edge.id) })}
            onPaneClick={() => setSelected(null)}
            fitView
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--border)" gap={24} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <EvidencePanel selected={selected} nodesById={nodesById} onClose={() => setSelected(null)} />
      </div>

      <div className="mt-legend" aria-hidden="false">
        {LEGEND_ITEMS.map((item) => (
          <span className="mt-legend-item" key={item.type}>
            <span className="mt-legend-swatch" style={{ background: item.swatch }} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="mt-summary">
        <p className="detail-lbl" style={{ marginTop: '20px' }}>Textual relationship summary</p>
        {moneyTrail.summary.length === 0 ? (
          <div className="detail-body">No notable shared-identifier or common-approver overlaps were detected in this dataset.</div>
        ) : (
          <ul className="step-list">
            {moneyTrail.summary.map((s, i) => (
              <li key={i}>
                <span className={`finding-type ${s.severity === 'high' ? 'high' : s.severity === 'med' ? 'med' : ''}`} style={{ marginRight: '8px' }}>
                  {s.severity}
                </span>
                {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function MoneyTrailTab({ moneyTrail, hasData }) {
  return (
    <div className="section active" id="section-moneytrail" role="tabpanel" aria-labelledby="tab-moneytrail">
      <p className="section-title">Money Trail Explorer</p>
      <p className="section-sub">
        Visualizes relationships found in the uploaded transaction data — vendors, approvers, and
        shared identifiers such as bank accounts and addresses.
      </p>
      <DisclaimerBanner>
        Connections shown here are investigative indicators, not proof of fraud. Shared identifiers
        and common-approver relationships require verification by a qualified professional before
        any conclusion is drawn.
      </DisclaimerBanner>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon">🕸️</div>
          Load and analyze a dataset to explore its money trail.
        </div>
      ) : !moneyTrail || moneyTrail.nodes.length <= 1 ? (
        <div className="empty-state">No relationships could be derived from this dataset.</div>
      ) : (
        <ReactFlowProvider>
          <MoneyTrailExplorer moneyTrail={moneyTrail} />
        </ReactFlowProvider>
      )}
    </div>
  );
}
