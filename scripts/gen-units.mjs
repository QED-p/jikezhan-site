import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { units, tracks, unitById, urlOf } from '../docs/.vitepress/curriculum.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function linkOf(id) {
  const u = unitById(id.split('/').pop())
  if (!u) return id
  return `[${u.title}](${urlOf(u)})`
}

for (const u of units) {
  const dir = resolve(root, 'docs', u.track, u.id)
  mkdirSync(dir, { recursive: true })

  const prereq =
    u.prereq.length > 0
      ? u.prereq.map((p) => `- 前置：${linkOf(p)}`).join('\n')
      : '- 前置：无，可以直接开始'
  const cross =
    u.cross.length > 0
      ? '\n' + u.cross.map((c) => `- 交叉：${linkOf(c)}`).join('\n')
      : ''

  const siblings = readdirSync(dir)
  const prefaceFile = siblings.find((f) => f.startsWith('00-') && f.endsWith('.md'))
  const prefaceRow = prefaceFile
    ? `| 00 | [前言](./${prefaceFile.replace(/\.md$/, '')}) | 已发布 |\n`
    : ''
  const chapters = u.chapters
    .map((c, i) => {
      const prefix = String(i + 1).padStart(2, '0') + '-'
      const file = siblings.find((f) => f.startsWith(prefix) && f.endsWith('.md'))
      if (file) {
        const slug = file.replace(/\.md$/, '')
        return `| ${prefix.slice(0, 2)} | [${c}](./${slug}) | 已发布 |`
      }
      return `| ${prefix.slice(0, 2)} | ${c} | 待撰写 |`
    })
    .join('\n')

  const md = `---
title: ${u.title}
track: ${u.track}
unit: ${u.id}
level: ${u.level}
prereq: [${u.prereq.join(', ')}]
cross: [${u.cross.join(', ')}]
---

# ${u.title}

${u.summary}

## 章节

| # | 章节 | 状态 |
|---|------|------|
${prefaceRow}${chapters}

## 依赖

${prereq}${cross}

> 章节随写作进度开放；状态由 \`scripts/gen-units.mjs\` 从 \`curriculum.ts\` 生成.
`
  writeFileSync(resolve(dir, 'index.md'), md, 'utf8')
}

console.log(`wrote ${units.length} unit index pages (${tracks.length} tracks)`)
