// Responsible-forensic-language notice — findings are indicators, not proof.
export default function DisclaimerBanner({ children }) {
  return (
    <div
      style={{
        background: 'var(--accent-bg)',
        border: '1px solid var(--accent)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        color: 'var(--text)',
        marginBottom: '16px',
        lineHeight: 1.6,
      }}
    >
      <strong>Note:</strong>{' '}
      {children || (
        <>
          ForensAI surfaces statistical fraud-risk indicators and anomalies for professional review.
          These findings are not proof of fraud and require verification by a qualified forensic
          examiner before any conclusion is drawn.
        </>
      )}
    </div>
  );
}
