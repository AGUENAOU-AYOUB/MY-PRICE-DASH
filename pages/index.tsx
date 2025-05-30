import { useState, useEffect, useRef, ChangeEvent } from 'react'
import pricesJson from '@/data/variant_prices.json'

type Prices = Record<string, Record<string, number>>

export default function Home() {
    // ── state ──────────────────────────────────────────────
    const [prices, setPrices] = useState<Prices>({})
    const [logs, setLogs] = useState('')
    const logRef = useRef<HTMLPreElement>(null)

    // load JSON once
    useEffect(() => { setPrices(pricesJson as Prices) }, [])

    // helper: append log line
    const log = (m: string) => {
        setLogs(l => l + m + '\n')
        setTimeout(() => {
            logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
        }, 0)
    }

    // change handler – strip leading zeros
    const handleChange = (cat: string, name: string, e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/^0+(?=\d)/, '')   // kill front zeros
        e.target.value = raw                                   // show cleaned
        setPrices(cur => ({
            ...cur,
            [cat]: { ...cur[cat], [name]: parseFloat(raw) || 0 }
        }))
    }

    // save JSON
    const save = async () => {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prices)
        })
        log(`[${new Date().toLocaleTimeString()}] JSON saved.`)
    }

    // run Shopify update (SSE)
    const update = () => {
        log(`[${new Date().toLocaleTimeString()}] Launching update…`)
        const es = new EventSource('/api/update')
        es.onmessage = e => {
            log(e.data)
            if (e.data === '__CLOSE__') es.close()
        }
    }

    // ── ui ────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Header */}
            <header className="bg-brand text-white shadow-md">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Price Dash</h1>
                    <button
                        onClick={update}
                        className="px-4 py-2 rounded bg-white text-brand font-semibold shadow hover:bg-gray-100 transition"
                    >
                        Update Shopify
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
                {/* Surcharge editor */}
                {Object.entries(prices).map(([cat, variants]) => (
                    <section key={cat} className="bg-white rounded-lg shadow-card p-6">
                        <h2 className="text-xl font-semibold capitalize text-brand mb-4">
                            {cat}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {Object.entries(variants).map(([name, val]) => (
                                <div key={name} className="flex items-center justify-between">
                                    <span>{name}</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={val === 0 ? '' : val}
                                        onChange={e => handleChange(cat, name, e)}
                                        className="w-28 border rounded px-2 py-1 text-right"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {/* Action buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={save}
                        className="px-4 py-2 bg-brand text-white rounded shadow hover:bg-brand-dark transition"
                    >
                        Save&nbsp;JSON
                    </button>
                </div>

                {/* Logs */}
                <section>
                    <h2 className="text-lg font-semibold mb-2">Live Logs</h2>
                    <pre
                        ref={logRef}
                        className="bg-black text-green-300 rounded-lg p-4 h-64 overflow-y-auto text-sm"
                    >
                        {logs}
                    </pre>
                </section>
            </main>
        </div>
    )
}
