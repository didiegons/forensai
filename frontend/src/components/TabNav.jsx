const TAB_LABELS = {
  about: 'About',
  data: '📂 Data',
  benford: "Benford's Law",
  findings: 'Findings',
  nextsteps: 'Next Steps',
  moneytrail: 'Money Trail',
  vendors: 'Vendor Risk',
  report: 'Report',
};

const TABS = ['about', 'data', 'benford', 'findings', 'nextsteps', 'moneytrail', 'vendors', 'report'];

function focusTab(tab) {
  document.getElementById(`tab-${tab}`)?.focus();
}

export default function TabNav({ activeTab, onChange, hasData, findingsCount }) {
  function handleKeyDown(e, tab) {
    const i = TABS.indexOf(tab);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(tab);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = TABS[(i + 1) % TABS.length];
      onChange(next);
      focusTab(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = TABS[(i - 1 + TABS.length) % TABS.length];
      onChange(prev);
      focusTab(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(TABS[0]);
      focusTab(TABS[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(TABS[TABS.length - 1]);
      focusTab(TABS[TABS.length - 1]);
    }
  }

  return (
    <div className="app-nav" role="tablist" aria-label="ForensAI sections">
      {TABS.map((tab) => (
        <div
          key={tab}
          id={`tab-${tab}`}
          role="tab"
          aria-selected={activeTab === tab}
          aria-controls={`section-${tab}`}
          tabIndex={activeTab === tab ? 0 : -1}
          className={`nav-tab${activeTab === tab ? ' active' : ''}`}
          onClick={() => onChange(tab)}
          onKeyDown={(e) => handleKeyDown(e, tab)}
        >
          {TAB_LABELS[tab]}
          {tab === 'data' && !hasData && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '99px',
                background: 'rgba(88,166,255,.15)',
                color: '#58a6ff',
                border: '1px solid #58a6ff',
                marginLeft: '6px',
                animation: 'pulse 2s infinite',
                display: 'inline-block',
              }}
            >
              Start Here
            </span>
          )}
          {tab === 'findings' && hasData && <span className="badge">{findingsCount}</span>}
        </div>
      ))}
    </div>
  );
}
