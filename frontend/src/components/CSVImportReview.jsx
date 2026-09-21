import { useEffect, useMemo, useRef, useState } from 'react';
import { FOREN_SAI_FIELDS, autoMapColumns, buildTransactionsFromMapping } from '../utils/csvParser.js';

const PREVIEW_ROW_LIMIT = 10;

export default function CSVImportReview({ fileName, headers, rows, onCancel, onSubmit }) {
  const [mapping, setMapping] = useState(() => autoMapColumns(headers));
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleMappingChange(field, header) {
    setMapping((prev) => ({ ...prev, [field]: header || undefined }));
  }

  const missingRequired = useMemo(
    () => FOREN_SAI_FIELDS.filter((f) => f.required && !mapping[f.key]),
    [mapping]
  );

  const duplicateHeaders = useMemo(() => {
    const byHeader = new Map();
    Object.entries(mapping).forEach(([field, header]) => {
      if (!header) return;
      const label = FOREN_SAI_FIELDS.find((f) => f.key === field)?.label || field;
      if (!byHeader.has(header)) byHeader.set(header, []);
      byHeader.get(header).push(label);
    });
    return [...byHeader.entries()].filter(([, labels]) => labels.length > 1);
  }, [mapping]);

  const previewTransactions = useMemo(
    () => buildTransactionsFromMapping(headers, rows, mapping),
    [headers, rows, mapping]
  );

  const hasMissingRequired = missingRequired.length > 0;
  const hasDuplicates = duplicateHeaders.length > 0;
  const hasNoValidRows = !hasMissingRequired && !hasDuplicates && previewTransactions.length === 0;
  const canSubmit = !hasMissingRequired && !hasDuplicates && !hasNoValidRows;

  const previewRows = rows.slice(0, PREVIEW_ROW_LIMIT);

  return (
    <div className="import-review">
      <h2 className="import-review-title" ref={headingRef} tabIndex={-1}>
        CSV Import Review
      </h2>
      <div className="import-review-meta">
        <strong>{fileName}</strong> · {rows.length} row{rows.length === 1 ? '' : 's'} detected ·{' '}
        {headers.length} column{headers.length === 1 ? '' : 's'} detected
      </div>

      <div className="import-mapping-grid">
        {FOREN_SAI_FIELDS.map((field) => (
          <div className="import-mapping-row" key={field.key}>
            <label htmlFor={`map-${field.key}`} className="import-mapping-label">
              <span>{field.label}</span>
              <span className={`field-badge ${field.required ? 'required' : 'optional'}`}>
                {field.required ? 'Required' : 'Optional'}
              </span>
            </label>
            <select
              id={`map-${field.key}`}
              className="key-input"
              value={mapping[field.key] || ''}
              onChange={(e) => handleMappingChange(field.key, e.target.value)}
            >
              <option value="">— Not mapped —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {(hasMissingRequired || hasDuplicates || hasNoValidRows) && (
        <div className="import-validation" role="alert">
          {hasMissingRequired && (
            <div>Map a column for: {missingRequired.map((f) => f.label).join(', ')} before submitting.</div>
          )}
          {hasDuplicates &&
            duplicateHeaders.map(([header, labels]) => (
              <div key={header}>
                “{header}” is mapped to more than one field ({labels.join(', ')}) — each column can only be
                mapped once.
              </div>
            ))}
          {hasNoValidRows && (
            <div>None of the rows have a valid amount in the mapped Amount column — check your mapping.</div>
          )}
        </div>
      )}

      {canSubmit && (
        <div className="import-row-count">
          {previewTransactions.length} of {rows.length} rows will be included in the analysis.
        </div>
      )}

      <div className="import-preview-wrap data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>
                {headers.map((h, j) => (
                  <td key={h + j}>{row[j]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > previewRows.length && (
        <div className="import-preview-note">
          Showing the first {previewRows.length} of {rows.length} rows.
        </div>
      )}

      <div className="btn-row" style={{ marginTop: '16px' }}>
        <button className="btn" onClick={onCancel}>
          Choose Different File
        </button>
        <button className="btn primary" onClick={() => onSubmit(previewTransactions)} disabled={!canSubmit}>
          Submit for Analysis
        </button>
      </div>
    </div>
  );
}
