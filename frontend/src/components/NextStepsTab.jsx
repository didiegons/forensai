import { useState } from 'react';
import DisclaimerBanner from './DisclaimerBanner.jsx';
import { getGuidanceForType } from '../data/investigationGuidance.js';

// Known types shown first, in the same order as the Findings tab's filters.
// Any other type present in the data is appended afterward under the
// generic fallback guidance rather than being dropped.
const KNOWN_TYPE_ORDER = ['duplicate', 'splitting', 'shell', 'benford', 'timing'];

function groupFindingsByType(findings) {
  const byType = new Map();
  findings.forEach((f) => {
    if (!byType.has(f.type)) byType.set(f.type, []);
    byType.get(f.type).push(f);
  });

  const orderedTypes = [
    ...KNOWN_TYPE_ORDER.filter((t) => byType.has(t)),
    ...[...byType.keys()].filter((t) => !KNOWN_TYPE_ORDER.includes(t)),
  ];

  return orderedTypes.map((type) => {
    const groupFindings = byType.get(type);
    const severity = groupFindings.some((f) => f.severity === 'high') ? 'high' : 'med';
    return { type, findings: groupFindings, severity, guidance: getGuidanceForType(type) };
  });
}

export default function NextStepsTab({ findings, hasData }) {
  const [openTypes, setOpenTypes] = useState(() => new Set());

  function toggle(type) {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleKeyDown(e, type) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(type);
    }
  }

  const groups = hasData ? groupFindingsByType(findings) : [];

  return (
    <div className="section active" id="section-nextsteps" role="tabpanel" aria-labelledby="tab-nextsteps">
      <p className="section-title">Investigation Next Steps</p>
      <p className="section-sub">
        Practical, evidence-focused guidance for following up on each type of fraud-risk indicator.
      </p>
      <DisclaimerBanner>
        Suggested next steps are investigative guidance only. They do not establish fraud and should
        be adapted by a qualified professional based on the facts of the engagement.
      </DisclaimerBanner>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon">🧭</div>
          Load and analyze a dataset to generate investigation next steps.
        </div>
      ) : !findings.length ? (
        <div className="empty-state">
          No fraud-risk indicators were identified. No additional investigation steps are currently
          suggested.
        </div>
      ) : (
        groups.map(({ type, findings: groupFindings, severity, guidance }) => {
          const detailId = `nextsteps-detail-${type}`;
          const isOpen = openTypes.has(type);
          return (
            <div
              key={type}
              className={`finding-card ${severity}`}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={detailId}
              onClick={() => toggle(type)}
              onKeyDown={(e) => handleKeyDown(e, type)}
            >
              <div className="finding-header">
                <div>
                  <div className="finding-title">{guidance.label}</div>
                  <div className="finding-sub">
                    {groupFindings.length} finding{groupFindings.length === 1 ? '' : 's'} of this type
                  </div>
                </div>
                <span className={`finding-type ${severity}`}>{type}</span>
              </div>

              <div id={detailId} className={`finding-detail${isOpen ? ' open' : ''}`}>
                <div className="detail-lbl">Why this requires review</div>
                <div className="detail-body">{guidance.whyReview}</div>

                <div className="detail-lbl">Suggested documents to obtain</div>
                <ul className="step-list">
                  {guidance.documents.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>

                <div className="detail-lbl">Suggested investigation questions</div>
                <ul className="step-list">
                  {guidance.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>

                <div className="detail-lbl">Suggested verification steps</div>
                <ul className="step-list">
                  {guidance.verification.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>

                <div className="detail-lbl">Findings in this group</div>
                <div className="ev-chain">
                  {groupFindings.map((f, i) => (
                    <span className="ev-chip" key={i}>
                      {f.sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
