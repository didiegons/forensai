export default function AboutTab({ onRunDemo }) {
  return (
    <div className="section active" id="section-about" role="tabpanel" aria-labelledby="tab-about">
      <div className="about-hero">
        <div className="about-overtitle">Applied AI · Forensic Accounting · Portfolio Project</div>
        <h1 className="about-h1">
          Forens<span>AI</span> — AP Fraud Detection
        </h1>
        <p className="about-lead">
          An AI-powered accounts payable fraud detection tool built for independent forensic
          accountants — the CFEs who currently run Benford's Law in Excel, write investigation
          reports in Word, and spend three billable days on work that should take ninety minutes.
        </p>
      </div>

      {/* Market problem */}
      <div className="about-section">
        <div className="about-lbl">The market problem — why existing tools don't work</div>
        <div className="g3">
          <div className="ac hl-red">
            <span className="atag red">Too expensive</span>
            <div className="ac-title">Enterprise platforms</div>
            <div className="ac-body">
              KPMG internal tools, Relativity, Bloomberg Law. Priced at <strong>$2,000–$10,000+/month</strong>.
              Built for Big 4 teams with full support departments, not independent CFEs billing at $250/hour.
            </div>
          </div>
          <div className="ac hl-amber">
            <span className="atag amber">Wrong focus</span>
            <div className="ac-title">Document extraction tools</div>
            <div className="ac-body">
              CounselPro, FraudFindr, Ocrolus. Excellent at OCR and bank statement parsing.{' '}
              <strong>Not built for AP ledger pattern analysis</strong> — Benford's Law, threshold
              splitting, shell company detection.
            </div>
          </div>
          <div className="ac hl-red">
            <span className="atag red">Not court-safe</span>
            <div className="ac-title">General AI (ChatGPT / Claude)</div>
            <div className="ac-body">
              Can describe patterns conversationally. <strong>No audit trail. No traceable evidence
              chain.</strong> Hallucination risk is disqualifying in any legal proceeding. No
              purpose-built tool can be replaced by a chatbot here.
            </div>
          </div>
        </div>
      </div>

      <div className="about-divider" />

      {/* Case type evaluation */}
      <div className="about-section">
        <div className="about-sh">Why AP vendor fraud — the MVP case type</div>
        <div className="about-ss">
          Five fraud types were evaluated against four criteria: standardized input data,
          mathematically provable detection patterns, value per case, and domain expertise match.
        </div>
        <div className="g3">
          <div className="ac">
            <span className="atag amber">Evaluated · Skipped</span>
            <div className="ac-title">Expense reimbursement fraud</div>
            <div className="ac-body">
              Common, but input data is messy — receipts, PDFs, unstructured attachments. Too much
              preprocessing for an MVP. Not the right first case.
            </div>
          </div>
          <div className="ac">
            <span className="atag amber">Evaluated · Skipped</span>
            <div className="ac-title">Payroll fraud</div>
            <div className="ac-body">
              Requires HR system access and employee record integration. Ghost employees and rate
              manipulation need different data models entirely. Strong v2 candidate.
            </div>
          </div>
          <div className="ac winner">
            <span className="atag green">Champion · MVP case type</span>
            <div className="ac-title">Vendor / AP fraud</div>
            <div className="ac-body">
              <strong>Standardized CSV input</strong> from any accounting software.{' '}
              <strong>Mathematically provable patterns.</strong> <strong>$100k–$500k average
              exposure.</strong> Direct match to forensic accounting expertise. The only case type
              that wins on all four criteria.
            </div>
          </div>
          <div className="ac">
            <span className="atag amber">Evaluated · Skipped</span>
            <div className="ac-title">Financial statement fraud</div>
            <div className="ac-body">
              Requires full auditor access across multiple ledgers and periods. Complexity and
              access requirements push this to v3 at the earliest.
            </div>
          </div>
          <div className="ac">
            <span className="atag amber">Evaluated · Skipped</span>
            <div className="ac-title">Embezzlement</div>
            <div className="ac-body">
              Highly variable — cash skimming, check tampering, and asset misappropriation each
              require different detection logic. Broad but shallow for a first build.
            </div>
          </div>
          <div className="ac hl-accent">
            <span className="atag accent">Decision criteria</span>
            <div className="ac-title">Four decisive factors</div>
            <div className="ac-body">
              AP fraud wins on: <strong>standardized input</strong> (AP ledger CSV),{' '}
              <strong>defensible math</strong> (chi-square, exact match), <strong>high case
              value</strong> (tool pays for itself on first finding), and{' '}
              <strong>domain expertise alignment</strong>.
            </div>
          </div>
        </div>
      </div>

      <div className="about-divider" />

      {/* Positioning reframe */}
      <div className="about-section">
        <div className="about-sh">Positioning reframe</div>
        <div className="about-ss">
          Sharpening from a broad AI pitch to a defensible niche — the move that changes who you
          sell to, how you reach them, and what they pay.
        </div>
        <div className="rf-grid">
          <div className="rf-b">
            <div className="rf-lbl">Old positioning</div>
            <div className="rf-text">"AI-powered forensic accounting assistant for fraud investigators"</div>
          </div>
          <div className="rf-arr">→</div>
          <div className="rf-a">
            <div className="rf-lbl">New positioning</div>
            <div className="rf-text">
              "The AP vendor fraud tool for independent forensic accountants who are done doing
              this in Excel"
            </div>
          </div>
        </div>
        <div className="rf-grid">
          <div className="rf-b">
            <div className="rf-lbl">Old promise</div>
            <div className="rf-text">"Detect fraud with AI"</div>
          </div>
          <div className="rf-arr">→</div>
          <div className="rf-a">
            <div className="rf-lbl">New promise</div>
            <div className="rf-text">"traceable evidence packages AP fraud findings in 90 minutes, not 3 days"</div>
          </div>
        </div>
        <div className="rf-grid">
          <div className="rf-b">
            <div className="rf-lbl">Old customer</div>
            <div className="rf-text">"Fraud investigators" — too broad to reach, too broad to close</div>
          </div>
          <div className="rf-arr">→</div>
          <div className="rf-a">
            <div className="rf-lbl">New customer</div>
            <div className="rf-text">
              Solo CFEs and small forensic firms (2–8 people), billing $200–$400/hr, 4–12 AP fraud
              cases per year
            </div>
          </div>
        </div>
      </div>

      <div className="about-divider" />

      {/* What it analyzes */}
      <div className="about-section">
        <div className="about-sh">What ForensAI analyzes</div>
        <div className="about-ss">
          Four mathematically provable detection methods. Every finding links to a specific
          transaction ID — making output traceable evidence packages, not just conversational.
        </div>
        <div className="g4">
          <div className="ac hl-accent">
            <div className="mnum">01</div>
            <div className="ac-title">Benford's Law</div>
            <div className="ac-body">
              In natural financial data, leading digit 1 appears ~30% of the time. Fabricated
              amounts distort this. ForensAI runs a chi-square test (df=8) per vendor and flags
              where p&lt;0.05.
            </div>
          </div>
          <div className="ac hl-accent">
            <div className="mnum">02</div>
            <div className="ac-title">Duplicate invoice detection</div>
            <div className="ac-body">
              Groups by vendor + exact amount. Flags any combination appearing more than once.
              Catches intentional resubmission with suffix modification (APX-7741 → APX-7741R).
            </div>
          </div>
          <div className="ac hl-accent">
            <div className="mnum">03</div>
            <div className="ac-title">Threshold splitting</div>
            <div className="ac-body">
              Detects invoices clustering within 5% below approval limits ($5k, $10k, $25k, $50k).
              Three or more invoices in this band from one vendor triggers a high-severity flag.
            </div>
          </div>
          <div className="ac hl-accent">
            <div className="mnum">04</div>
            <div className="ac-title">Shell company scoring</div>
            <div className="ac-body">
              Scores vendors 0–100 on: PO Box address (+40), missing EIN (+30), new vendor
              receiving &gt;$10k in first 90 days (+25), large total exposure (+5). Scores ≥50 are
              flagged.
            </div>
          </div>
        </div>
      </div>

      <div className="about-divider" />

      {/* ICP */}
      <div className="about-section">
        <div className="about-sh">Ideal customer profile</div>
        <div className="about-ss">
          Independent CFEs and small forensic firms currently doing AP fraud analysis in Microsoft
          Excel and writing court reports in Word.
        </div>
        <div className="icp-grid">
          <div className="icp-s">
            <div className="icp-val" style={{ color: 'var(--accent)' }}>CFE</div>
            <div className="icp-lbl">Certified Fraud Examiner credential</div>
          </div>
          <div className="icp-s">
            <div className="icp-val">1–8</div>
            <div className="icp-lbl">People in the firm</div>
          </div>
          <div className="icp-s">
            <div className="icp-val" style={{ color: 'var(--low)' }}>$250/hr</div>
            <div className="icp-lbl">Average billing rate</div>
          </div>
          <div className="icp-s">
            <div className="icp-val" style={{ color: 'var(--med)' }}>Excel</div>
            <div className="icp-lbl">Current AP analysis tool</div>
          </div>
          <div className="icp-s">
            <div className="icp-val">4–12</div>
            <div className="icp-lbl">AP fraud cases per year</div>
          </div>
          <div className="icp-s">
            <div className="icp-val" style={{ color: 'var(--med)' }}>Word</div>
            <div className="icp-lbl">Current report writing tool</div>
          </div>
        </div>
        <div className="icp-q">
          <p>
            "I spend two days building the same Benford's formula in Excel for every new client.
            Then another day writing a report that's 80% identical to the last one. That's three
            billable days I'm writing off because I can't charge a client $750/hour for Excel work."
          </p>
        </div>
      </div>

      <div className="about-divider" />

      {/* Defensible moat */}
      <div className="about-section">
        <div className="about-sh">Defensible moat</div>
        <div className="about-ss">What competitors cannot copy — and why the position holds over time.</div>
        <div className="g2">
          <div className="ac hl-green">
            <span className="atag purple">Founder insight</span>
            <div className="ac-title">You are the customer</div>
            <div className="ac-body">
              The forensic accounting and ML background gives domain credibility no generalist AI
              company can replicate. You know which columns matter, what a real Benford deviation
              looks like, how a court report needs to read. Building for yourself first is the
              strongest possible product-market fit signal.
            </div>
          </div>
          <div className="ac hl-green">
            <span className="atag accent">Technical moat</span>
            <div className="ac-title">Evidence chain by default</div>
            <div className="ac-body">
              Every finding links to a specific transaction ID from the source file. This makes
              ForensAI output usable in a legal proceeding — and impossible to produce from a
              general AI chatbot. That's the feature that converts a skeptical CFE who has been
              burned by hallucinations before.
            </div>
          </div>
          <div className="ac hl-green">
            <span className="atag green">Scope moat</span>
            <div className="ac-title">AP-only, done right</div>
            <div className="ac-body">
              "We do AP vendor fraud and we do it better than anyone" beats "we do everything" when
              a CFE is about to stake their professional reputation on a court submission. Breadth
              signals fragility. Depth signals trust. Being narrow is the moat.
            </div>
          </div>
          <div className="ac hl-green">
            <span className="atag amber">Pricing moat</span>
            <div className="ac-title">Right-sized for independents</div>
            <div className="ac-body">
              $149–$249/month sits below FraudFindr's $449 floor. For a CFE billing $250/hour,
              ForensAI pays for itself if it saves one hour per case — and it saves ten. That's a
              one-line sales pitch, not a feature list.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button className="btn primary" onClick={onRunDemo}>
          Run the demo — load sample dataset →
        </button>
        <a href="projects.html" style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--muted)' }}>
          ← Back to projects
        </a>
      </div>
    </div>
  );
}
