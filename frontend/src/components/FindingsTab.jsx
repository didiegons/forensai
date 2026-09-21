import { useState } from 'react';
import DisclaimerBanner from './DisclaimerBanner.jsx';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'duplicate', label: 'Duplicates' },
  { key: 'splitting', label: 'Threshold splitting' },
  { key: 'shell', label: 'Shell company' },
  { key: 'benford', label: 'Benford' },
  { key: 'timing', label: 'Timing' },
];

const SEVERITY_ORDER = { high: 0, med: 1, low: 2 };

export default function FindingsTab({ findings, hasData }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [openKey, setOpenKey] = useState(null);

  const filtered = (activeFilter === 'all' ? findings : findings.filter((f) => f.type === activeFilter))
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  function handleTagKeyDown(e, key) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveFilter(key);
    }
  }

  function handleCardKeyDown(e, key, isOpen) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenKey(isOpen ? null : key);
    }
  }

  return (
    <div className="section active" id="section-findings" role="tabpanel" aria-labelledby="tab-findings">
      <p className="section-title">Findings</p>
      <p className="section-sub">All flagged anomalies ranked by severity. Click any finding to expand the evidence chain.</p>
      <DisclaimerBanner />

      <div className="tags-row" role="group" aria-label="Filter findings by type">
        {FILTERS.map((f) => (
          <span
            key={f.key}
            role="button"
            tabIndex={0}
            aria-pressed={activeFilter === f.key}
            className={`ftag${activeFilter === f.key ? ' active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
            onKeyDown={(e) => handleTagKeyDown(e, f.key)}
          >
            {f.label}
          </span>
        ))}
      </div>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          Load data to run analysis
        </div>
      ) : !findings.length ? (
        <div className="empty-state">No fraud-risk indicators were found in this dataset.</div>
      ) : !filtered.length ? (
        <div className="empty-state">No findings match this filter</div>
      ) : (
        filtered.map((f, i) => {
          const key = `${f.type}-${f.title}-${i}`;
          const detailId = `finding-detail-${f.type}-${i}`;
          const isOpen = openKey === key;
          return (
            <div
              key={key}
              className={`finding-card ${f.severity}`}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={detailId}
              onClick={() => setOpenKey(isOpen ? null : key)}
              onKeyDown={(e) => handleCardKeyDown(e, key, isOpen)}
            >
              <div className="finding-header">
                <div>
                  <div className="finding-title">{f.title}</div>
                  <div className="finding-sub">{f.sub}</div>
                </div>
                <span className={`finding-type ${f.severity}`}>{f.type}</span>
              </div>
              <div id={detailId} className={`finding-detail${isOpen ? ' open' : ''}`}>
                <div className="detail-lbl">What was found</div>
                <div className="detail-body">{f.detail}</div>
                <div className="detail-lbl">Evidence chain</div>
                <div className="ev-chain">
                  {(f.evidence || []).map((e, j) => (
                    <span className="ev-chip" key={j}>{e}</span>
                  ))}
                </div>
                <div className="detail-lbl">Recommended next step</div>
                <div className="detail-body">{f.next}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
