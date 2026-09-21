import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import TabNav from './components/TabNav.jsx';
import AboutTab from './components/AboutTab.jsx';
import DataTab from './components/DataTab.jsx';
import BenfordTab from './components/BenfordTab.jsx';
import FindingsTab from './components/FindingsTab.jsx';
import NextStepsTab from './components/NextStepsTab.jsx';
import VendorRiskTab from './components/VendorRiskTab.jsx';
import ReportTab from './components/ReportTab.jsx';
import { SAMPLE } from './data/sampleData.js';
import { analyzeTransactions, generateReport } from './api/forensaiApi.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('about');

  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [findings, setFindings] = useState([]);
  const [benford, setBenford] = useState([]);
  const [vendorRisk, setVendorRisk] = useState({});
  const [analyzeError, setAnalyzeError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [reportOutput, setReportOutput] = useState('');
  const [reportError, setReportError] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const flaggedTxnIds = useMemo(
    () => new Set(findings.flatMap((f) => f.txnIds)),
    [findings]
  );

  async function runAnalysis(rows) {
    setIsAnalyzing(true);
    setAnalyzeError('');
    try {
      const result = await analyzeTransactions(rows);
      setTransactions(rows);
      setStats(result.stats);
      setFindings(result.findings);
      setBenford(result.benford);
      setVendorRisk(result.vendorRisk);
      // A previously generated report describes the old dataset — clear it
      // so nothing stale is shown next to the newly loaded findings.
      setReportOutput('');
      setReportError('');
    } catch (err) {
      setAnalyzeError(err.message || 'Failed to analyze transactions.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleLoadSample() {
    runAnalysis(SAMPLE);
  }

  function handleCSVLoaded(rows) {
    runAnalysis(rows);
  }

  function goToDataAndLoadSample() {
    setActiveTab('data');
    runAnalysis(SAMPLE);
  }

  async function handleGenerateReport() {
    if (!stats) return;
    setIsGeneratingReport(true);
    setReportError('');
    try {
      const result = await generateReport({ stats, findings });
      setReportOutput(result.report);
    } catch (err) {
      setReportError(err.message || 'Failed to generate report.');
    } finally {
      setIsGeneratingReport(false);
    }
  }

  const highCount = findings.filter((f) => f.severity === 'high').length;
  const medCount = findings.filter((f) => f.severity === 'med').length;
  const cleanCount = transactions.length - flaggedTxnIds.size;
  const hasData = transactions.length > 0;

  return (
    <>
      <nav className="portfolio-nav">
        <a href="index.html" className="pnav-brand">Dayo Portfolio</a>
        <ul className="pnav-links">
          <li><a href="index.html">Home</a></li>
          <li><a href="about.html">About</a></li>
          <li><a href="projects.html" className="active">Projects</a></li>
          <li><a href="index.html#skills">Skills</a></li>
          <li><a href="index.html#contact">Contact</a></li>
          <li>
            <a href="https://www.linkedin.com/in/dayoegonu/" target="_blank" rel="noreferrer" className="linkedin">
              LinkedIn
            </a>
          </li>
        </ul>
      </nav>

      <Header hasData={hasData} highCount={highCount} medCount={medCount} cleanCount={cleanCount} />

      <TabNav activeTab={activeTab} onChange={setActiveTab} hasData={hasData} findingsCount={findings.length} />

      <div className="app-main">
        {activeTab === 'about' && <AboutTab onRunDemo={goToDataAndLoadSample} />}

        {activeTab === 'data' && (
          <DataTab
            transactions={transactions}
            stats={stats}
            flaggedTxnIds={flaggedTxnIds}
            findings={findings}
            isAnalyzing={isAnalyzing}
            error={analyzeError}
            onLoadSample={handleLoadSample}
            onCSVLoaded={handleCSVLoaded}
          />
        )}

        {activeTab === 'benford' && <BenfordTab results={benford} hasData={hasData} />}

        {activeTab === 'findings' && <FindingsTab findings={findings} hasData={hasData} />}

        {activeTab === 'nextsteps' && <NextStepsTab findings={findings} hasData={hasData} />}

        {activeTab === 'vendors' && <VendorRiskTab vendorRisk={vendorRisk} />}

        {activeTab === 'report' && (
          <ReportTab
            hasData={hasData}
            isGenerating={isGeneratingReport}
            output={reportOutput}
            error={reportError}
            onGenerate={handleGenerateReport}
          />
        )}
      </div>
    </>
  );
}
