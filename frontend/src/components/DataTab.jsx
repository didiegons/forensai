import { useRef, useState } from 'react';
import { parseCSVText } from '../utils/csvParser.js';
import { fmt } from '../utils/format.js';
import CSVImportReview from './CSVImportReview.jsx';

export default function DataTab({
  transactions,
  stats,
  flaggedTxnIds,
  findings,
  isAnalyzing,
  error,
  onLoadSample,
  onCSVLoaded,
  onLoadNewDataset,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // { fileName, headers, rows }
  const [parseError, setParseError] = useState('');
  const hasData = transactions.length > 0;

  function beginImport(file) {
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSVText(ev.target.result);
      if (!headers.length || !rows.length) {
        setParseError('This file appears to be empty or has no data rows.');
        return;
      }
      setPendingImport({ fileName: file.name, headers, rows });
    };
    reader.onerror = () => setParseError('Unable to read this file. Please try again.');
    reader.readAsText(file);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) beginImport(file);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      beginImport(file);
    } else {
      alert('Please drop a .csv file.');
    }
  }

  function handleImportSubmit(rows) {
    setPendingImport(null);
    onCSVLoaded(rows);
  }

  function handleImportCancel() {
    setPendingImport(null);
  }

  function riskFor(txnId) {
    if (!flaggedTxnIds.has(txnId)) return { cls: 'ok', text: 'Clean' };
    const match = findings.find((f) => f.txnIds.includes(txnId));
    return match?.severity === 'high' ? { cls: 'high', text: 'Flagged' } : { cls: 'med', text: 'Review' };
  }

  return (
    <div className="section active" id="section-data" role="tabpanel" aria-labelledby="tab-data">
      <p className="section-title">AP Ledger</p>
      <p className="section-sub">Upload your accounts payable export or load the sample dataset to begin analysis.</p>

      {error && (
        <div style={{ color: 'var(--high)', fontSize: '12px', marginBottom: '12px' }}>{error}</div>
      )}
      {parseError && (
        <div style={{ color: 'var(--high)', fontSize: '12px', marginBottom: '12px' }}>{parseError}</div>
      )}

      {!hasData && !pendingImport && (
        <div
          className="upload-zone"
          id="upload-zone"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDrop={handleDrop}
          style={isDragging ? { borderColor: 'var(--accent)', background: 'var(--accent-bg)' } : undefined}
        >
          <div className="upload-title">Drop AP ledger CSV here</div>
          <div className="upload-sub">Supports CSV exports from QuickBooks, Xero, Sage, or any accounting software</div>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={onLoadSample} disabled={isAnalyzing}>
              Load sample dataset (64 transactions)
            </button>
            <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
              Upload CSV
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {!hasData && pendingImport && (
        <CSVImportReview
          fileName={pendingImport.fileName}
          headers={pendingImport.headers}
          rows={pendingImport.rows}
          onCancel={handleImportCancel}
          onSubmit={handleImportSubmit}
        />
      )}

      {hasData && stats && (
        <div id="data-stats">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-n">{stats.totalTransactions}</div>
              <div className="stat-l">Total transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-n">${fmt(stats.totalValue)}</div>
              <div className="stat-l">Total AP value</div>
            </div>
            <div className="stat-card">
              <div className="stat-n">{stats.uniqueVendors}</div>
              <div className="stat-l">Unique vendors</div>
            </div>
            <div className="stat-card">
              <div className="stat-n red">{stats.flagCount}</div>
              <div className="stat-l">Flags raised</div>
            </div>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Approved by</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const r = riskFor(t.id);
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--muted)' }}>{t.date}</td>
                      <td style={{ fontWeight: 500 }}>{t.vendor}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '11px' }}>{t.invoice}</td>
                      <td className="amount-cell">${fmt(t.amount)}</td>
                      <td style={{ color: 'var(--muted)' }}>{t.category}</td>
                      <td style={{ color: 'var(--muted)' }}>{t.approved_by}</td>
                      <td><span className={`risk-pill ${r.cls}`}>{r.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button className="btn primary" onClick={onLoadNewDataset} style={{ marginTop: '4px' }} disabled={isAnalyzing}>
            Load New Dataset
          </button>
        </div>
      )}
    </div>
  );
}
