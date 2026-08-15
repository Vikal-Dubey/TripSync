import { useEffect, useState } from "react";

const COMMON_CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "THB", "NPR"];

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const value = Number(amount);
    if (!value) {
      setResult(null);
      return;
    }
    if (from === to) {
      setResult(value);
      return;
    }

    setError(null);
    const controller = new AbortController();

    fetch(`https://api.frankfurter.dev/v2/rate/${from}/${to}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((data) => setResult(data.rate * value))
      .catch((err) => {
        if (err.name !== "AbortError") setError("Couldn't fetch exchange rate");
      });

    return () => controller.abort();
  }, [amount, from, to]);

  return (
    <div className="card bg-muted-custom/40 border border-border-custom/50 p-4.5 rounded-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-sec">Conversion Value</label>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm bg-surface"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select className="input text-sm bg-surface font-semibold" value={from} onChange={(e) => setFrom(e.target.value)}>
              {COMMON_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden sm:flex justify-center text-slate-sec/40 font-bold text-lg select-none">
          →
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-sec">Target Currency</label>
          <select className="input text-sm bg-surface font-semibold w-full" value={to} onChange={(e) => setTo(e.target.value)}>
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-border-custom/60 flex items-center justify-between text-sm">
        <span className="text-xs font-semibold text-slate-sec">Converted Amount:</span>
        <span className="font-mono font-extrabold text-teal-primary text-base">
          {error ? (
            <span className="text-coral text-xs font-medium">{error}</span>
          ) : result !== null ? (
            `${result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`
          ) : (
            "..."
          )}
        </span>
      </div>
    </div>
  );
}