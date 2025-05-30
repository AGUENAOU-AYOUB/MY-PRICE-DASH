// pages/api/save.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { promises as fs } from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
    try {
        const dataDir = path.join(process.cwd(), 'data')
        await fs.mkdir(dataDir, { recursive: true })
        const filePath = path.join(dataDir, 'variant_prices.json')
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf8')
        return res.status(200).json({ success: true })
    } catch (e: any) {
        console.error(e)
        return res.status(500).json({ success: false, error: e.message })
    }
}
