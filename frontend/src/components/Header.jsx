export default function Header({ hasData, highCount, medCount, cleanCount }) {
  return (
    <div className="app-header">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6V10M6 8H10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="logo-name">
          Forens<span>AI</span>
        </span>
      </div>
      <div className="header-badges">
        {hasData ? (
          <>
            <span className="hbadge red">{highCount} high severity</span>
            <span className="hbadge amber">{medCount} medium</span>
            <span className="hbadge green">{cleanCount} clean</span>
          </>
        ) : (
          <span className="hbadge">No data loaded</span>
        )}
      </div>
    </div>
  );
}
