// 生成"欠拟合语料"：拼接线性代数各章正文到 10000 字，供 LM 实验室做预设。
// 输出 docs/.vitepress/theme/labs/lm/underfit-corpus.js
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const FILES = [
  'docs/math/linear-algebra/00-preface.md',
  'docs/math/linear-algebra/01-from-equations-to-space.md',
  'docs/math/linear-algebra/02-vector-spaces-basis-dimension.md',
  'docs/math/linear-algebra/03-linear-maps-and-matrices.md',
  'docs/math/linear-algebra/04-inner-products-and-projection.md',
  'docs/math/linear-algebra/05-determinant-volume-and-invertibility.md'
]

const PER_FILE = 2400
const TARGET = 10000

const clean = (raw) =>
  raw
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/<script[\s\S]*?<\/script>\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/g, '')
    .trim()

let text = ''
for (const f of FILES) {
  const raw = readFileSync(resolve(root, f), 'utf8')
  text += clean(raw).slice(0, PER_FILE) + '\n\n'
}
text = text.replace(/。/g, '.').slice(0, TARGET)

const out = resolve(root, 'docs/.vitepress/theme/labs/lm/underfit-corpus.js')
const body =
  '// 由 scripts/gen-corpus.mjs 生成，请勿手改；语料来自线代各章正文。\n' +
  `export const UNDERFIT_CORPUS = ${JSON.stringify(text)}\n`
writeFileSync(out, body, 'utf8')

const vocab = new Set(Array.from(text))
console.log(`wrote ${out}`)
console.log(`length: ${text.length} | distinct chars: ${vocab.size}`)
