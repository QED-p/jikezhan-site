import katex from 'katex'

// 把采样文本切成 [普通文本 | KaTeX 公式] 的片段序列.
// 三层策略，逐层放宽：
// 1. 成对的 $$...$$ / $...$ 渲染为公式（行内内容需含 \ ^ _ { } 之一，避免把 "$5" 当公式）；
// 2. 普通文本里孤立的"裸 LaTeX 记号"（以 \ 开头、括号配平、长度受限）也渲染成公式；
// 3. 任何渲染失败的片段原样回退为普通文本，绝不抛错.
export function parseSample(text) {
  const src = String(text || '')
  const parts = []
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g
  let last = 0
  let m
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) pushPlain(parts, src.slice(last, m.index))
    const display = m[1] !== undefined
    const tex = display ? m[1] : m[2]
    const looksLikeMath = display || /[\\^_{}]/.test(tex)
    const html = looksLikeMath ? tryMath(tex, display, true) : null
    if (html) {
      parts.push({ math: true, display, html, source: m[0] })
    } else {
      pushPlain(parts, m[0])
    }
    last = m.index + m[0].length
  }
  if (last < src.length) pushPlain(parts, src.slice(last))
  return parts
}

function tryMath(tex, display, allowErrors = false) {
  try {
    return katex.renderToString(tex, {
      throwOnError: true,
      strict: false,
      displayMode: display
    })
  } catch (err) {
    if (!allowErrors) return null
    try {
      // 容错模式：非法命令用 errorColor 标出，保证成对的公式仍然走 KaTeX
      return katex.renderToString(tex, {
        throwOnError: false,
        strict: false,
        displayMode: display,
        errorColor: 'var(--hud-crit)'
      })
    } catch (e) {
      return null
    }
  }
}

function isBalanced(tok) {
  const pairs = [
    ['(', ')'],
    ['{', '}'],
    ['[', ']']
  ]
  for (const [open, close] of pairs) {
    let depth = 0
    for (const ch of tok) {
      if (ch === open) depth++
      else if (ch === close) {
        depth--
        if (depth < 0) return false
      }
    }
    if (depth !== 0) return false
  }
  return true
}

const BARE_RE = /^[A-Za-z0-9\\^_{}()[\]+=<>/|.,'!:-]+$/

// 普通文本按空白切开，尝试把孤立的 LaTeX 记号单独渲染
function pushPlain(parts, text) {
  if (!text) return
  const tokens = text.split(/(\s+)/)
  for (const tok of tokens) {
    if (!tok) continue
    const bare =
      tok.length <= 48 &&
      /^\\[A-Za-z]/.test(tok) &&
      BARE_RE.test(tok) &&
      isBalanced(tok)
    if (bare) {
      const html = tryMath(tok, false)
      if (html) {
        parts.push({ math: true, display: false, html, source: tok })
        continue
      }
    }
    const prev = parts[parts.length - 1]
    if (prev && !prev.math) prev.value += tok
    else parts.push({ math: false, value: tok })
  }
}
