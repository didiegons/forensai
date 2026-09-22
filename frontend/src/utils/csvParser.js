// CSV parsing is split into two stages so the app can show the user a
// review/mapping step between "file selected" and "analysis runs":
//   1. parseCSVText     — structural parse only (headers + raw rows)
//   2. buildTransactionsFromMapping — turns raw rows into ForensAI
//      transaction objects once the user has confirmed a column mapping

// Splits one CSV line on commas that are outside "quoted" fields, so a
// field like "123 Main St, Suite 4" doesn't shift every later column.
// Handles doubled "" as an escaped quote inside a quoted field.
function splitCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// Structural-only parse: returns the detected header row and every raw
// data row as arrays of strings. No field-name assumptions are made here.
export function parseCSVText(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => splitCSVLine(line));
  return { headers, rows };
}

export const FOREN_SAI_FIELDS = [
  { key: 'vendor', label: 'Vendor', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'date', label: 'Date', required: true },
  { key: 'invoice', label: 'Invoice', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'approved_by', label: 'Approved by', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'ein', label: 'EIN', required: false },
  // Optional relationship fields for the Money Trail Explorer — omitting
  // any of these from a CSV is fine, the graph simply won't draw the
  // relationships that field would have supported.
  { key: 'bank_account', label: 'Bank account', required: false },
  { key: 'beneficiary', label: 'Beneficiary', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
];

const FIELD_SYNONYMS = {
  vendor: ['vendor', 'vendor name', 'supplier', 'supplier name', 'payee', 'company'],
  invoice: ['invoice', 'invoice number', 'invoice no', 'invoice #', 'inv number', 'inv #'],
  amount: ['amount', 'total amount', 'total', 'invoice amount', 'amt', 'transaction amount'],
  date: ['date', 'transaction date', 'invoice date', 'txn date', 'payment date'],
  category: ['category', 'expense category', 'type', 'expense type'],
  approved_by: ['approved_by', 'approved by', 'approver', 'approved'],
  address: ['address', 'vendor address', 'supplier address', 'mailing address'],
  ein: ['ein', 'tax id', 'tax id number', 'employer id', 'employer id number'],
  bank_account: ['bank account', 'bank_account', 'account number', 'account no', 'routing account'],
  beneficiary: ['beneficiary', 'beneficiary name', 'payee name', 'beneficial owner'],
  email: ['email', 'vendor email', 'contact email', 'email address'],
  phone: ['phone', 'phone number', 'vendor phone', 'contact phone', 'telephone'],
};

function normalize(s) {
  return String(s || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

// Guesses a mapping from ForensAI field -> detected header, using a small
// synonym table. Returns undefined for a field when nothing matches.
export function autoMapColumns(headers) {
  const mapping = {};
  const claimed = new Set();

  FOREN_SAI_FIELDS.forEach(({ key }) => {
    const synonyms = FIELD_SYNONYMS[key];
    const match = headers.find((h) => !claimed.has(h) && synonyms.includes(normalize(h)));
    if (match) {
      mapping[key] = match;
      claimed.add(match);
    }
  });

  return mapping;
}

// Coerces a raw amount string the same way the app always has:
// strip currency symbols/thousands separators, default to 0 on failure.
function coerceAmount(raw) {
  return parseFloat(String(raw ?? '').replace(/[$,]/g, '')) || 0;
}

// Turns the raw parsed rows into ForensAI transaction objects using a
// confirmed field -> header mapping. Rows with no usable amount are
// dropped, exactly as the original single-step parser always did.
export function buildTransactionsFromMapping(headers, rows, mapping) {
  const colIndex = {};
  Object.entries(mapping).forEach(([field, header]) => {
    if (header) colIndex[field] = headers.indexOf(header);
  });

  return rows
    .map((vals, i) => {
      const obj = { id: i + 1 };
      FOREN_SAI_FIELDS.forEach(({ key }) => {
        const idx = colIndex[key];
        obj[key] = idx != null && idx >= 0 ? vals[idx] || '' : '';
      });
      obj.amount = coerceAmount(obj.amount);
      return obj;
    })
    .filter((r) => r.amount > 0);
}
