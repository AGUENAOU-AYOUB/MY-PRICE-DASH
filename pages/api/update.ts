// pages/api/update.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchProducts, runBulk } from '@/lib/shopify'
import prices from '@/data/variant_prices.json'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Server-Sent Events headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
    })

    const send = (msg: string) => {
        res.write(`data: ${msg}\n\n`)
    }

    send(`🔔 Starting at ${new Date().toLocaleTimeString()}`)

    try {
        send('📡 Fetching products via GraphQL…')
        const products = await fetchProducts()
        send(`✅ Found ${products.length} products`)

        await runBulk(prices as any, products, send)

        send('🎉 Done! Shopify updated.')
    } catch (err: any) {
        send(`❌ ERROR: ${err.message}`)
    } finally {
        send('__CLOSE__')
        res.end()
    }
}
