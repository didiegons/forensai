import DisclaimerBanner from './DisclaimerBanner.jsx';
import { fmt } from '../utils/format.js';

function riskColor(score) {
  return score >= 60 ? 'var(--high)' : score >= 30 ? 'var(--med)' : 'var(--low)';
}

function riskLabel(score) {
  return score >= 60
    ? { cls: 'high', text: 'High' }
    : score >= 30
      ? { cls: 'med', text: 'Medium' }
      : { cls: 'ok', text: 'Low' };
}

export default function VendorRiskTab({ vendorRisk }) {
  const entries = Object.entries(vendorRisk).sort((a, b) => b[1].score - a[1].score);

  return (
    <div className="section active" id="section-vendors" role="tabpanel" aria-labelledby="tab-vendors">
      <p className="section-title">Vendor Risk Scores</p>
      <p className="section-sub">Composite risk scores 0–100 based on all detection signals.</p>
      <DisclaimerBanner />

      {!entries.length ? (
        <div className="empty-state">Load data to score vendors</div>
      ) : (
        <div className="vendor-table-wrap">
          <table className="vendor-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Total paid</th>
                <th>Transactions</th>
                <th>Risk score</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([vendor, r]) => {
                const color = riskColor(r.score);
                const rl = riskLabel(r.score);
                return (
                  <tr key={vendor}>
                    <td style={{ fontWeight: 500 }}>{vendor}</td>
                    <td>${fmt(r.total)}</td>
                    <td style={{ color: 'var(--muted)' }}>{r.count}</td>
                    <td>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-bg">
                          <div className="risk-bar-fill" style={{ width: `${r.score}%`, background: color }} />
                        </div>
                        <span style={{ color, fontWeight: 500, minWidth: '28px' }}>{r.score}</span>
                      </div>
                    </td>
                    <td>
                      {r.flags.length
                        ? r.flags.map((f) => (
                            <span className={`risk-pill ${rl.cls}`} style={{ marginRight: '4px' }} key={f}>
                              {f}
                            </span>
                          ))
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
