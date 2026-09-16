import { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  FileText,
  Info,
  LockKeyhole,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

type Issue = {
  trap_category?: string;
  severity?: string;
  clause_quote?: string;
  plain_english_risk?: string;
  counter_clause?: string;
};

type AuditResult = {
  contract_summary?: string;
  overall_risk_score?: number;
  issues_detected?: Issue[];
};

const severityStyle: Record<string, { color: string; background: string; border: string; icon: typeof CircleAlert }> = {
  critical: { color: '#a74336', background: '#fbe9e4', border: '#efc2b8', icon: ShieldAlert },
  high: { color: '#b15c3f', background: '#fdf0e7', border: '#f1d2bb', icon: AlertTriangle },
  medium: { color: '#92702c', background: '#fbf4dc', border: '#ead9a5', icon: CircleAlert },
  low: { color: '#2b766c', background: '#e5f2ee', border: '#b9dbd2', icon: CheckCircle2 },
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function severityKey(value?: string) {
  const normalized = (value || 'medium').toLowerCase();
  if (normalized.includes('critical')) return 'critical';
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('low')) return 'low';
  return 'medium';
}

function riskLabel(score: number) {
  if (score >= 75) return { label: 'High exposure', detail: 'Several clauses deserve attention before you sign.' };
  if (score >= 45) return { label: 'Worth a closer look', detail: 'A few terms could use clarification or a counter.' };
  return { label: 'Lower exposure', detail: 'No major traps surfaced in this first pass.' };
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#226960] text-[#f8f6ed] shadow-sm">
        <ShieldCheck size={20} strokeWidth={2.2} />
      </div>
      <div>
        <div className="text-[15px] font-extrabold tracking-[-0.04em] text-[#202e2d]">ClauseShield</div>
        <div className="mono text-[9px] uppercase tracking-[.16em] text-[#68807a]">Your second set of eyes</div>
      </div>
    </div>
  );
}

function Header({ onReset, hasResult }: { onReset: () => void; hasResult: boolean }) {
  return (
    <header className="content-layer mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <BrandMark />
      <div className="flex items-center gap-3">
        {hasResult && (
          <button
            type="button"
            onClick={onReset}
            data-testid="button-header-new-audit"
            className="ghost-button hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#64736e] sm:flex"
          >
            <RotateCcw size={14} /> New audit
          </button>
        )}
        <div className="hidden items-center gap-2 rounded-full border border-[#d8e3dc] bg-[#f6faf6]/70 px-3 py-2 text-[11px] font-bold text-[#4d6f67] sm:flex">
          <LockKeyhole size={13} />
          <span>Private by design</span>
        </div>
      </div>
    </header>
  );
}

function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="fade-up">
      <div className="mb-12 max-w-[720px]">
        <div className="eyebrow mb-5 flex items-center gap-2"><span className="h-px w-7 bg-[#226960]" />Contract risk audit</div>
        <h1 className="serif max-w-[680px] text-[clamp(2.85rem,7vw,5.6rem)] leading-[.98] tracking-[-.055em] text-[#213532]">
          Read the fine print<br /><em className="text-[#c96b52] not-italic">with your eyes open.</em>
        </h1>
        <p className="mt-7 max-w-[520px] text-[15px] leading-7 text-[#65736f] sm:text-[17px]">
          Upload a contract and get a plain-English read on the clauses that could cost you time, money, or control.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <UploadCard onSelect={onSelect} />
        <aside className="rounded-[22px] border border-[#deded4] bg-[#f2f1e8]/75 p-6 lg:mt-10">
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#dfece5] text-[#226960]">
            <ScanSearch size={19} />
          </div>
          <h2 className="text-[14px] font-extrabold tracking-[-.02em] text-[#2c403c]">What we look for</h2>
          <ul className="mt-5 space-y-4">
            {['Payment and late-fee traps', 'Rights you may be giving away', 'One-sided exit terms'].map((item) => (
              <li key={item} className="flex gap-3 text-[12px] leading-5 text-[#6d7975]">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#6a9b8d]" size={15} /> {item}
              </li>
            ))}
          </ul>
          <div className="mt-7 border-t border-[#dbddd3] pt-5 text-[11px] leading-5 text-[#7a837e]">
            A useful first pass — not a substitute for advice from a qualified attorney.
          </div>
        </aside>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-semibold text-[#7c8781]">
        <span className="flex items-center gap-2"><LockKeyhole size={13} className="text-[#226960]" /> Your file is used for this audit only</span>
        <span className="flex items-center gap-2"><FileText size={13} className="text-[#226960]" /> PDF files up to 20 MB</span>
      </div>
    </div>
  );
}

function UploadCard({ onSelect }: { onSelect: () => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`drop-zone relative flex min-h-[285px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#bfcfc6] bg-[#fbfbf7]/80 px-6 py-10 text-center ${dragging ? 'dragging' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onSelectWithFile(file, onSelect);
      }}
      data-testid="dropzone-contract"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        data-testid="input-contract-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelectWithFile(file, onSelect);
        }}
      />
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e3f0eb] text-[#226960]">
        <UploadCloud size={25} strokeWidth={1.8} />
      </div>
      <div className="text-[15px] font-extrabold text-[#334641]">Drop your PDF here</div>
      <div className="mt-2 text-[12px] text-[#87928d]">or choose a file from your computer</div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        data-testid="button-choose-contract"
        className="primary-button mt-6 inline-flex items-center gap-2 rounded-full bg-[#226960] px-5 py-3 text-[12px] font-extrabold text-[#f7f5ec]"
      >
        Choose PDF <ArrowRight size={15} />
      </button>
    </div>
  );
}

function onSelectWithFile(file: File, onSelect: () => void) {
  const input = document.querySelector<HTMLInputElement>('[data-testid="input-contract-file"]');
  if (input) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  }
  onSelect();
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#c6ded5] bg-[#edf6f1] px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ebe2] text-[#226960]"><FileText size={18} /></div>
        <div className="min-w-0 text-left">
          <div className="truncate text-[13px] font-extrabold text-[#304541]">{file.name}</div>
          <div className="mono mt-1 text-[10px] text-[#6c8980]">{formatBytes(file.size)} · PDF document</div>
        </div>
      </div>
      <button type="button" onClick={onRemove} data-testid="button-remove-contract" className="ghost-button rounded-full p-2 text-[#77938a]" aria-label="Remove selected contract">
        <X size={16} />
      </button>
    </div>
  );
}

function LoadingAudit({ fileName }: { fileName: string }) {
  return (
    <div className="fade-up mx-auto max-w-[700px] py-14 text-center sm:py-24">
      <div className="relative mx-auto mb-9 flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#c4ddd4] bg-[#e7f2ed] text-[#226960]">
        <ShieldCheck size={42} strokeWidth={1.4} />
        <span className="pulse-dot absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#c96b52]" />
      </div>
      <div className="eyebrow">Audit in progress</div>
      <h1 className="serif mt-4 text-4xl tracking-[-.04em] text-[#283d38] sm:text-5xl">Looking between the lines.</h1>
      <p className="mx-auto mt-4 max-w-[430px] text-sm leading-6 text-[#72807b]">
        ClauseShield is mapping the important parts of <span className="font-bold text-[#4d6760]">{fileName}</span> into a clearer picture.
      </p>
      <div className="mx-auto mt-10 max-w-[420px] overflow-hidden rounded-full bg-[#dbe7e0]">
        <div className="audit-line h-1.5 w-full bg-[#c96b52]" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#87928d]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c96b52]" /> Checking payment, ownership, exit, and liability clauses
      </div>
    </div>
  );
}

function ScoreCard({ score, issueCount }: { score: number; issueCount: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 45;
  const risk = riskLabel(safeScore);
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] bg-[#226960] px-6 py-8 text-center text-[#f5f5eb] sm:min-h-[280px]">
      <div className="relative h-[142px] w-[142px]">
        <svg viewBox="0 0 110 110" className="score-ring h-full w-full" aria-hidden="true">
          <circle cx="55" cy="55" r="45" stroke="rgba(239,245,236,.18)" strokeWidth="7" />
          <circle cx="55" cy="55" r="45" stroke="#f1b29e" strokeWidth="7" strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * safeScore) / 100} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="serif text-[43px] leading-none">{safeScore}</span>
          <span className="mono mt-1 text-[9px] uppercase tracking-[.14em] text-[#b7d4cb]">risk score</span>
        </div>
      </div>
      <div className="mt-2 text-[15px] font-extrabold">{risk.label}</div>
      <div className="mt-1 max-w-[210px] text-[11px] leading-5 text-[#c4ddd5]">{issueCount} {issueCount === 1 ? 'item' : 'items'} surfaced for your attention</div>
    </div>
  );
}

function IssueCard({ issue, index, onCopy, copied }: { issue: Issue; index: number; onCopy: (text: string, index: number) => void; copied: boolean }) {
  const severity = severityKey(issue.severity);
  const style = severityStyle[severity];
  const SeverityIcon = style.icon;
  return (
    <article className="issue-card rounded-[22px] border border-[#e0ded4] bg-[#fffefa] p-5 sm:p-6" data-testid={`card-issue-${index}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.09em]" style={{ color: style.color, background: style.background, borderColor: style.border }}>
            <SeverityIcon size={12} /> {severity}
          </span>
          <span className="rounded-full bg-[#f1f0e8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#78827d]">{issue.trap_category || 'Contract term'}</span>
        </div>
        <span className="mono text-[10px] text-[#a0a6a0]">ISSUE {String(index + 1).padStart(2, '0')}</span>
      </div>
      <blockquote className="mt-5 border-l-2 border-[#ddad9c] pl-4 text-[14px] italic leading-6 text-[#53625d]">
        “{issue.clause_quote || 'A clause in this contract needs a closer look.'}”
      </blockquote>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <div className="mono text-[9px] font-medium uppercase tracking-[.13em] text-[#a06a5b]">Why it matters</div>
          <p className="mt-2 text-[13px] leading-6 text-[#596863]">{issue.plain_english_risk || 'This wording may create an obligation or risk that is easy to miss on a quick read.'}</p>
        </div>
        <div className="rounded-2xl bg-[#edf5f0] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="mono text-[9px] font-medium uppercase tracking-[.13em] text-[#4e8074]">A fairer counter</div>
            <button
              type="button"
              onClick={() => onCopy(issue.counter_clause || '', index)}
              data-testid={`button-copy-counter-${index}`}
              className="ghost-button inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-extrabold text-[#4d7f74]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-[12px] leading-5 text-[#44655d]">{issue.counter_clause || 'Ask for language that keeps the obligation mutual, specific, and time-bound.'}</p>
        </div>
      </div>
    </article>
  );
}

function Results({ result, file, onReset }: { result: AuditResult; file: File; onReset: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const issues = Array.isArray(result.issues_detected) ? result.issues_detected : [];
  const score = Number.isFinite(Number(result.overall_risk_score)) ? Number(result.overall_risk_score) : 0;
  const copyCounter = (text: string, index: number) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(index);
      window.setTimeout(() => setCopied(null), 1800);
    }).catch(() => undefined);
  };
  return (
    <div className="fade-up">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-3 flex items-center gap-2"><span className="h-px w-7 bg-[#226960]" />Audit complete</div>
          <h1 className="serif text-[clamp(2.7rem,6vw,4.6rem)] leading-[.98] tracking-[-.055em] text-[#213532]">Here’s what stood out.</h1>
          <div className="mt-4 flex items-center gap-2 text-[12px] text-[#7a8580]"><FileText size={14} className="text-[#226960]" /> {file.name} <span className="text-[#b8bdb7]">·</span> {formatBytes(file.size)}</div>
        </div>
        <button type="button" onClick={onReset} data-testid="button-reset-audit" className="ghost-button inline-flex items-center gap-2 rounded-full border border-[#d5ddd6] bg-[#fafbf6] px-4 py-2.5 text-xs font-extrabold text-[#557069]">
          <RotateCcw size={14} /> Re-audit another contract
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <ScoreCard score={score} issueCount={issues.length} />
        <div className="soft-shadow rounded-[24px] border border-[#e0ded4] bg-[#fffefa] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[#226960]"><Sparkles size={16} /><span className="mono text-[10px] uppercase tracking-[.14em]">Plain-English summary</span></div>
          <p className="serif mt-5 max-w-[740px] text-[23px] leading-[1.35] tracking-[-.02em] text-[#384b46] sm:text-[28px]">
            {result.contract_summary || 'Your audit is ready. Review the flagged terms below and consider asking for clearer, more balanced language.'}
          </p>
          <div className="mt-7 flex items-start gap-3 border-t border-[#ece9df] pt-5 text-[11px] leading-5 text-[#7c8781]">
            <Info size={15} className="mt-0.5 shrink-0 text-[#c96b52]" />
            ClauseShield highlights patterns, not legal conclusions. Use these notes to start a better conversation.
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-end justify-between gap-4 border-b border-[#dfded5] pb-4">
        <div>
          <div className="eyebrow">Attention points</div>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-.03em] text-[#314640]">Terms to take to the table</h2>
        </div>
        <span className="mono text-[10px] text-[#8a938e]">{issues.length} FOUND</span>
      </div>

      {issues.length > 0 ? (
        <div className="mt-5 space-y-4">
          {/* Pehla Issue (Sabhi ke liye Free) */}
          {issues.slice(0, 1).map((issue, index) => (
            <IssueCard
              key={`${issue.trap_category}-${index}`}
              issue={issue}
              index={index}
              onCopy={copyCounter}
              copied={copied === index}
            />
          ))}

          {/* Baaki ke Issues: Agar isPaid true hai toh normal, warna Blurred + Paywall */}
          {issues.length > 1 && (
            isPaid ? (
              issues.slice(1).map((issue, index) => (
                <IssueCard
                  key={`${issue.trap_category}-${index + 1}`}
                  issue={issue}
                  index={index + 1}
                  onCopy={copyCounter}
                  copied={copied === index + 1}
                />
              ))
            ) : (
              <div className="relative mt-6 rounded-[22px] overflow-hidden border border-[#d8dad0] bg-[#fbfbf7]/50 p-2">
                {/* Blurred Background Teaser */}
                <div className="filter blur-md select-none pointer-events-none opacity-40 space-y-4">
                  <div className="relative mt-6">
                    <div
                      className={
                        !isPaid
                          ? "filter blur-md select-none pointer-events-none opacity-40 space-y-4"
                          : "space-y-4"
                      }
                    >
                      {issues.slice(1).map((issue, index) => (
                        <IssueCard
                          key={`locked-${index}`}
                          issue={issue}
                          index={index + 1}
                          onCopy={() => {}}
                          copied={false}
                        />
                      ))}
                    </div>

                    {!isPaid && (
                      <div className="absolute inset-0 flex items-center justify-center p-4 z-20">
                        <div className="bg-[#19231f] text-white p-6 sm:p-8 rounded-[20px] shadow-2xl text-center max-w-[460px] border border-[#2d3e38]">
                          <div className="inline-block bg-[#0f766e] text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                            Premium Analysis
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black mb-2">
                            Unlock All {issues.length} Red Flags & Counter-Clauses
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-300 mb-6 leading-relaxed">
                            Don't leave dangerous contract loopholes unchecked. Get the complete clause breakdown, legal risk translations, and copy-paste counter proposals.
                          </p>
                          <button
                            onClick={handlePayment}
              className="w-full bg-[#e07a5f] hover:bg-[#d0684e] text-white font-bold py-3.5 px-6 rounded-xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Unlock Full Audit for ₹199
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  const handlePayment = async () => {
    try {
      const res = await fetch("/api/create-order", { method: "POST" });
      const orderData = await res.json();

      if (!res.ok || !orderData.orderId) {
        alert("Unable to initiate payment. Please check server logs.");
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ClauseShield",
        description: "Unlock Full Contract Audit",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.verified) {
            setIsPaid(true);
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        theme: {
          color: "#0f172a",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed to initialize.");
    }
  };

  const selectFile = () => {
    const input = document.querySelector<HTMLInputElement>('[data-testid="input-contract-file"]');
    if (input) {
      const fileFromInput = input.files?.[0];
      if (fileFromInput) {
        setError("");
        setFile(fileFromInput);
      }
    }
  };
  const analyze = async () => {
    if (!file && !pastedText.trim()) {
      setError('Please choose a PDF file or paste contract text.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response: Response;
      if (pastedText.trim()) {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractText: pastedText }),
        });
      } else {
        const formData = new FormData();
        if (file) formData.append('contract', file);
        response = await fetch('/api/analyze', { method: 'POST', body: formData });
      }

      if (!response.ok) {
        let message = 'We could not complete this audit. Please check your API key.';
        try {
          const body = (await response.json()) as { message?: string; error?: string };
          message = body.message || body.error || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await response.json()) as AuditResult;
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Audit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f0] text-[#2c3e3a]">
      <Header onReset={reset} hasResult={Boolean(result)} />

      <main className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:px-10">
        {loading && <LoadingAudit fileName={file?.name || 'Pasted Contract'} />}

        {!loading && result && (
          <Results result={result} file={file || new File([], 'pasted-contract.txt')} onReset={reset} />
        )}

        {!loading && !result && (
          <div className="fade-up">
            <EmptyState onSelect={selectFile} />

            {file && (
              <div className="mx-auto mt-6 max-w-[500px]">
                <FilePreview file={file} onRemove={() => setFile(null)} />
              </div>
            )}

            <div className="mx-auto mt-8 max-w-[600px]">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#d8dad0]"></div>
                <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-wider text-[#8b9893]">OR PASTE CONTRACT TEXT</span>
                <div className="flex-grow border-t border-[#d8dad0]"></div>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your contract clauses or entire agreement here..."
                rows={5}
                className="mt-3 w-full rounded-2xl border border-[#c8ded5] bg-[#fffefa] p-4 text-xs font-mono text-[#2c403c] placeholder-[#95a39d] focus:border-[#226960] focus:outline-none"
              />
            </div>

            {error && (
              <div className="mx-auto mt-4 max-w-[500px] rounded-xl border border-[#f1b29e] bg-[#fdf0e7] p-3 text-center text-xs font-semibold text-[#b15c3f]">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={analyze}
                disabled={!file && !pastedText.trim()}
                className="primary-button inline-flex items-center gap-2 rounded-full bg-[#226960] px-8 py-3.5 text-sm font-extrabold text-[#f7f5ec] transition hover:bg-[#1a534c] disabled:opacity-50"
              >
                Analyze Contract <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
