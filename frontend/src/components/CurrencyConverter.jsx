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
    <div className="card">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="input text-sm w-24"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select className="input text-sm" value={from} onChange={(e) => setFrom(e.target.value)}>
          {COMMON_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-ink/40">→</span>
        <select className="input text-sm" value={to} onChange={(e) => setTo(e.target.value)}>
          {COMMON_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="font-mono text-sm ml-auto">
          {error ? <span className="text-red-500">{error}</span> : result !== null ? `${result.toFixed(2)} ${to}` : "…"}
        </span>
      </div>
    </div>
  );
}