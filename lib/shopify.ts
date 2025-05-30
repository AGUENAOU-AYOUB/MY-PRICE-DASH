// lib/shopify.ts
import fetch from 'node-fetch'

const SHOP_DOMAIN = process.env.SHOP_DOMAIN!
const API_TOKEN = process.env.API_TOKEN!
const API_VER = '2024-04'
const GQL_URL = `https://${SHOP_DOMAIN}/admin/api/${API_VER}/graphql.json`

// basic GraphQL fetch helper
async function gql(query: string, variables = {}) {
  const resp = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await resp.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

export type Product = {
  id: string
  tags: string[]
  metafields: { key: string; value: string }[]
  variants: { id: string; title: string }[]
}

// Fetch products tagged CHAINE_UPDATE with their base_price & variants
export async function fetchProducts(): Promise<Product[]> {
  const all: Product[] = []
  let cursor: string | null = null

  const QUERY = `
    query fetchProducts($cursor: String) {
      products(first: 250, query: "tag:CHAINE_UPDATE", after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            tags
            metafields(first: 10, namespace: "custom") {
              edges { node { key value } }
            }
            variants(first: 100) {
              edges { node { id title } }
            }
          }
        }
      }
    }
  `

  do {
    const data: any = await gql(QUERY, { cursor })
    const block = data.products
    block.edges.forEach((e: any) => {
      const n = e.node
      all.push({
        id: n.id,
        tags: n.tags,
        metafields: n.metafields.edges.map((m: any) => m.node),
        variants: n.variants.edges.map((v: any) => v.node),
      })
    })
    cursor = block.pageInfo.hasNextPage ? block.pageInfo.endCursor : null
  } while (cursor)

  return all
}

// Bulk update variants, streaming progress to onLog()
export async function runBulk(
  priceMap: Record<string, Record<string, number>>,
  products: Product[],
  onLog: (msg: string) => void
) {
  onLog(`🔨 Preparing ${products.length} products…`)

  for (const product of products) {
    const isBracelet = product.tags.includes('bracelet')
    const isCollier = product.tags.includes('collier')
    const cat = isBracelet ? 'bracelet' : isCollier ? 'collier' : null
    if (!cat) {
      onLog(`⏭ skipping ${product.id} (no bracelet/collier tag)`)
      continue
    }

    const baseMf = product.metafields.find(m => m.key === 'base_price')
    const base = baseMf ? parseFloat(baseMf.value) : NaN
    if (isNaN(base)) {
      onLog(`⚠️ skipping ${product.id} (no base_price)`)
      continue
    }

    for (const v of product.variants) {
      const surcharge = priceMap[cat][v.title] ?? 0
      const newPrice = Math.round((base + surcharge) * 100) / 100

      // Updated mutation: $price is Money!, no wrapper
      const MUT = `
        mutation updateVariant($id: ID!, $price: Money!) {
          productVariantUpdate(input:{id:$id, price:$price}) {
            productVariant { id price }
            userErrors { field message }
          }
        }
      `
      onLog(`⏳ updating ${v.id} → ${newPrice}`)
      const resp: any = await gql(MUT, { id: v.id, price: newPrice })
      const errs = resp.productVariantUpdate.userErrors
      if (errs.length) {
        onLog(`❌ ${v.id} error: ${errs.map((e: any) => e.message).join('; ')}`)
      } else {
        onLog(`✅ ${v.id} = ${resp.productVariantUpdate.productVariant.price}`)
      }
    }
  }

  onLog(`✔️ Bulk update complete.`)
}
