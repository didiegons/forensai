// Expected first-digit proportions used only to draw the chart's
// "expected" tick mark — the actual chi-square math lives on the backend.
const BENFORD_EXP = { 1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097, 5: 0.079, 6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046 };
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function BenfordTab({ results, hasData }) {
  return (
    <div className="section active" id="section-benford" role="tabpanel" aria-labelledby="tab-benford">
      <p className="section-title">Benford's Law Analysis</p>
      <p className="section-sub">
        First-digit frequency analysis per vendor. Expected distribution follows Benford's natural
        law. Chi-square p&lt;0.05 flags statistical anomaly.
      </p>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon">⚖</div>
          Load data to run Benford's analysis
        </div>
      ) : !results.length ? (
        <div className="empty-state">
          <div className="empty-icon">⚖</div>
          No vendor in this dataset has enough invoices (8+) for a reliable Benford's Law analysis.
        </div>
      ) : (
        <div className="benford-grid">
          {results.map((r) => {
            const observedPct = DIGITS.map((d) => (r.counts[d] / r.n) * 100);
            const expectedPct = DIGITS.map((d) => BENFORD_EXP[d] * 100);
            const mx = Math.max(...observedPct, ...expectedPct);
            const chiColor = r.flagged ? 'var(--high)' : 'var(--low)';

            return (
              <div className="benford-card" key={r.vendor}>
                <div className="benford-vendor">{r.vendor}</div>
                <div className="benford-meta">{r.n} invoices analyzed</div>
                <div className="benford-bars">
                  {DIGITS.map((d, i) => {
                    const obs = observedPct[i];
                    const exp = expectedPct[i];
                    const over = obs > exp * 1.5;
                    const barColor = over ? 'var(--high)' : r.flagged ? 'var(--med)' : 'var(--accent)';
                    return (
                      <div className="bbar-row" key={d}>
                        <span className="bbar-digit">{d}</span>
                        <div className="bbar-track">
                          <div
                            className="bbar-obs"
                            style={{ width: `${((obs / mx) * 100).toFixed(1)}%`, background: barColor }}
                          />
                          <div className="bbar-exp" style={{ left: `${((exp / mx) * 100).toFixed(1)}%` }} />
                        </div>
                        <span className="bbar-val" style={{ color: over ? 'var(--high)' : 'var(--muted)' }}>
                          {obs.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="benford-legend">
                  <div className="bleg-item">
                    <div className="bleg-dot" style={{ background: 'var(--accent)' }} />
                    Observed
                  </div>
                  <div className="bleg-item">
                    <div className="bleg-dot" style={{ background: 'var(--muted2)' }} />
                    Expected (Benford)
                  </div>
                </div>
                <span
                  className="chi-badge"
                  style={{
                    background: r.flagged ? 'var(--high-bg)' : 'var(--low-bg)',
                    color: chiColor,
                    border: `1px solid ${chiColor}`,
                  }}
                >
                  χ²={r.chi2.toFixed(1)} · {r.flagged ? 'FLAGGED (p<0.05)' : 'Pass'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
