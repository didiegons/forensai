import ReactMarkdown from 'react-markdown';
import DisclaimerBanner from './DisclaimerBanner.jsx';

export default function ReportTab({ hasData, isGenerating, output, error, onGenerate }) {
  return (
    <div className="section active" id="section-report" role="tabpanel" aria-labelledby="tab-report">
      <p className="section-title">Investigation Report</p>
      <p className="section-sub">
        AI-generated draft narrative based on findings, for professional review. Every claim links
        to a specific transaction.
      </p>
      <DisclaimerBanner />

      <div className="api-key-box">
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div className="key-label">
            Report generation runs on the ForensAI backend. No API key is entered or stored in the browser.
          </div>
        </div>
        <button className="btn primary" onClick={onGenerate} disabled={!hasData || isGenerating}>
          Generate report
        </button>
      </div>

      {!hasData && <div className="empty-state">Load data first, then generate a report from this tab.</div>}
      {error && <div style={{ color: 'var(--high)', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

      <div className={`loading-indicator${isGenerating ? ' visible' : ''}`}>
        <div className="spinner" />
        <span>Generating investigation narrative...</span>
      </div>

      <div className={`report-output${output ? ' visible' : ''}`}>
        {/* react-markdown does not execute raw HTML from the source text
            unless the rehype-raw plugin is added — it isn't here, so any
            HTML-looking text in the AI output renders as inert plain text. */}
        <ReactMarkdown>{output}</ReactMarkdown>
      </div>
    </div>
  );
}
