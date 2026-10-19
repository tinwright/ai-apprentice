// What a transcript's replies cost at Anthropic's API list prices, from the tokens summarize.jq
// counts per model. On a Pro or Max plan nothing is billed per token: the figure is what the same
// work would cost through the API, and the panes show it as an estimate.

// Tokens of one model's replies, in summarize.jq's order: uncached input, cache writes kept five
// minutes, cache writes kept an hour, cache reads, output.
export type ModelTokens = [number, number, number, number, number]

// Dollars per million tokens: input, output, cache reads. Cache writes cost 1.25× input for five
// minutes and 2× for an hour, on every model.
type Price = { input: number; output: number; cacheRead: number }

const PRICES: [prefix: string, price: Price][] = [
  ['claude-fable-5-1', { input: 10, output: 50, cacheRead: 0.25 }],
  ['claude-mythos-5-1', { input: 10, output: 50, cacheRead: 0.25 }],
  ['claude-fable-5', { input: 10, output: 50, cacheRead: 1 }],
  ['claude-mythos-5', { input: 10, output: 50, cacheRead: 1 }],
  ['claude-opus-5-5', { input: 4, output: 20, cacheRead: 0.2 }],
  ['claude-opus-5', { input: 5, output: 25, cacheRead: 0.5 }],
  ['claude-opus-4-8', { input: 5, output: 25, cacheRead: 0.5 }],
  ['claude-opus-4-7', { input: 5, output: 25, cacheRead: 0.5 }],
  ['claude-opus-4-6', { input: 5, output: 25, cacheRead: 0.5 }],
  ['claude-sonnet-5-5', { input: 2, output: 10, cacheRead: 0.2 }],
  ['claude-sonnet-5', { input: 2, output: 10, cacheRead: 0.2 }],
  ['claude-sonnet-4-6', { input: 3, output: 15, cacheRead: 0.3 }],
  ['claude-haiku-4-5', { input: 1, output: 5, cacheRead: 0.1 }],
]

// The longest prefix wins, so `claude-opus-5-5` isn't priced as `claude-opus-5`. A model this table
// doesn't know (an older or newer one, or `<synthetic>`) is left out rather than guessed.
const priceOf = (model: string): Price | undefined =>
  PRICES.filter(([prefix]) => model.startsWith(prefix)).sort((a, b) => b[0].length - a[0].length)[0]?.[1]

/** The dollars a transcript's replies would cost; fast mode (`<model>/fast`) at twice the price. */
export function costOf(byModel: Record<string, ModelTokens> | undefined): number {
  let usd = 0
  for (const [key, [input, write5m, write1h, read, output]] of Object.entries(byModel ?? {})) {
    const [model = '', speed] = key.split('/')
    const price = priceOf(model)
    if (!price) continue
    const perMillion =
      input * price.input + write5m * price.input * 1.25 + write1h * price.input * 2 + read * price.cacheRead + output * price.output
    usd += (perMillion / 1_000_000) * (speed === 'fast' ? 2 : 1)
  }
  return usd
}

/** Dollars, short: $0.42, $3.10, $27, $1.2k. */
export function formatUsd(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`
  if (usd >= 10) return `$${Math.round(usd)}`
  return `$${usd.toFixed(2)}`
}
