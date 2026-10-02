<script setup>
import { computed } from 'vue'

const props = defineProps({
  nodes: { type: Array, required: true },
  selected: { type: String, default: '' }
})
const emit = defineEmits(['select'])

const NODE_W = [116, 128, 168]
const NODE_H = 34
const GAP = 12
const GROUP_GAP = 30
const COL_X = [0, 176, 344]

const layout = computed(() => {
  const items = []
  const edges = []
  const groups = []
  let y = 0

  for (const g of props.nodes) {
    const children = g.children || []
    const startY = y
    const kids = []
    for (const c of children) {
      const it = { id: c.id, label: c.label, depth: 2, x: COL_X[2], y }
      items.push(it)
      kids.push(it)
      y += NODE_H + GAP
    }
    if (children.length) y -= GAP
    const gi = { id: g.id, label: g.label, depth: 1, x: COL_X[1], y: (startY + y) / 2 }
    items.push(gi)
    groups.push({ gi, kids })
    y += GROUP_GAP
  }

  const rootY = groups.length
    ? (groups[0].gi.y + groups[groups.length - 1].gi.y) / 2
    : 0
  const root = { id: '__root', label: '语言模型', depth: 0, x: COL_X[0], y: rootY }
  items.push(root)

  const edge = (p, c) => {
    const px = p.x + NODE_W[p.depth]
    const py = p.y + NODE_H / 2
    const cx = c.x
    const cy = c.y + NODE_H / 2
    const mx = px + (cx - px) / 2
    return {
      id: `${p.id}>${c.id}`,
      target: c.id,
      d: `M${px} ${py} H${mx} V${cy} H${cx}`
    }
  }

  for (const { gi, kids } of groups) {
    edges.push(edge(root, gi))
    for (const k of kids) edges.push(edge(gi, k))
  }

  return {
    items,
    edges,
    height: Math.max(0, y - GROUP_GAP),
    width: COL_X[2] + NODE_W[2]
  }
})

const activeEdges = computed(() => {
  const set = new Set()
  const walk = (id) => {
    for (const e of layout.value.edges) {
      if (e.target === id) {
        set.add(e.id)
        const from = e.id.split('>')[0]
        if (from !== '__root') walk(from)
      }
    }
  }
  if (props.selected) walk(props.selected)
  return set
})
</script>

<template>
  <div
    class="mindmap"
    :style="{ width: layout.width + 'px', height: layout.height + 'px' }"
  >
    <svg
      class="mm-edges"
      :width="layout.width"
      :height="layout.height"
      aria-hidden="true"
    >
      <path
        v-for="e in layout.edges"
        :key="e.id"
        :d="e.d"
        fill="none"
        :stroke="activeEdges.has(e.id) ? 'var(--hud-accent)' : 'var(--hud-faint)'"
        stroke-width="1"
      />
    </svg>

    <button
      v-for="n in layout.items"
      :key="n.id"
      class="mm-node"
      :class="[`d${n.depth}`, { sel: selected === n.id, root: n.depth === 0 }]"
      :style="{
        left: n.x + 'px',
        top: n.y + 'px',
        width: NODE_W[n.depth] + 'px',
        height: NODE_H + 'px'
      }"
      :disabled="n.depth === 0"
      @click="emit('select', n.id)"
    >
      <span v-if="n.depth !== 0" class="mm-square" />
      {{ n.label }}
    </button>
  </div>
</template>

<style scoped>
.mindmap {
  position: relative;
}
.mm-edges {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}
.mm-node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}
.mm-node.d0 {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--hud-bg);
  font-weight: 700;
  justify-content: center;
  cursor: default;
}
.mm-node.d1 {
  border-color: var(--hud-dim);
  font-weight: 600;
}
.mm-node.d2:hover {
  border-color: var(--hud-accent);
  color: var(--hud-accent);
}
.mm-node.sel {
  border-color: var(--hud-accent);
  color: var(--hud-hot);
  border-width: 1.5px;
}
.mm-node .mm-square {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  background: var(--hud-dim);
}
.mm-node.d1 .mm-square {
  background: var(--hud-accent);
}
.mm-node.sel .mm-square {
  background: var(--hud-hot);
}
</style>
