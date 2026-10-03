<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  frames: { type: Array, default: () => [] },
  version: { type: Number, default: 0 },
  viewing: { type: Number, default: null },
  listing: { type: Object, default: null }
})
const emit = defineEmits(['seek'])

const scroller = ref(null)

const cellsPerRow = 16

const model = computed(() => {
  void props.version
  const rows = []
  const bySeq = new Map()
  const frames = props.frames
  const total = frames.length
  for (let i = 0; i < total; i++) {
    const fr = frames[i]
    const seqAt = (s) => (s && s.valid ? s.seq : null)
    if (fr.if) {
      const row = {
        seq: fr.if.seq,
        pc: fr.if.pc,
        text: props.listing ? props.listing.get(fr.if.pc) || '' : '',
        cells: {}
      }
      rows.push(row)
      bySeq.set(row.seq, row)
    }
    const stages = {
      if: fr.if ? fr.if.seq : null,
      id: seqAt(fr.latches.ifid),
      ex: seqAt(fr.latches.idex),
      mem: seqAt(fr.latches.exmem),
      wb: seqAt(fr.latches.memwb)
    }
    for (const [st, seq] of Object.entries(stages)) {
      if (seq === null) continue
      const row = bySeq.get(seq)
      if (row) row.cells[i] = st
    }
    if (fr.signals.stall) {
      const seq = seqAt(fr.latches.ifid)
      const row = seq !== null ? bySeq.get(seq) : null
      if (row) row.cells[i] = 'stall'
    }
    if (fr.signals.flush) {
      for (const seq of [seqAt(fr.latches.ifid), fr.if ? fr.if.seq : null]) {
        const row = seq !== null ? bySeq.get(seq) : null
        if (row) row.cells[i] = 'flush'
      }
    }
  }
  return { rows, total }
})

const totalWidth = computed(() => model.value.total * cellsPerRow)

watch(
  () => props.version,
  async () => {
    await nextTick()
    if (props.viewing === null && scroller.value) {
      scroller.value.scrollLeft = scroller.value.scrollWidth
    }
  }
)

const STAGE_NAME = { if: 'IF', id: 'ID', ex: 'EX', mem: 'MEM', wb: 'WB', stall: '顿', flush: '冲' }
</script>

<template>
  <div class="timeline" data-palette="violet">
    <div class="tl-head">
      <span class="tl-title">时空图</span>
      <span class="tl-note">纵轴 = 动态指令（按取指顺序）· 横轴 = 周期 · 点格子可回看</span>
      <span class="tl-legend">
        <i class="sw if" /> IF
        <i class="sw id" /> ID
        <i class="sw ex" /> EX
        <i class="sw mem" /> MEM
        <i class="sw wb" /> WB
        <i class="sw stall" /> 停顿
        <i class="sw flush" /> 冲刷
      </span>
    </div>
    <div class="tl-scroll" ref="scroller">
      <div class="tl-inner" :style="{ width: totalWidth + 420 + 'px' }">
        <div class="tl-ruler">
          <span class="tl-instr-col ruler" />
          <span
            v-for="c in model.total"
            :key="c"
            class="tick"
            :class="{ cur: (viewing === null ? model.total - 1 : viewing) === c - 1 }"
          >{{ c % 5 === 0 ? c : '' }}</span>
        </div>
        <div v-for="row in model.rows" :key="row.seq" class="tl-row">
          <span class="tl-instr-col" :title="row.text">
            <span class="pc">0x{{ (row.pc >>> 0).toString(16).padStart(4, '0') }}</span>
            {{ row.text }}
          </span>
          <span
            v-for="c in model.total"
            :key="c"
            class="tl-cell"
            :class="[
              row.cells[c - 1] || 'none',
              { cur: (viewing === null ? model.total - 1 : viewing) === c - 1 }
            ]"
            :title="'周期 ' + c"
            @click="emit('seek', c - 1)"
          >{{ row.cells[c - 1] ? STAGE_NAME[row.cells[c - 1]] : '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  background: var(--hud-panel);
  border: 1px solid var(--hud-faint);
  padding: 12px 14px;
}
.tl-head {
  display: flex;
  align-items: baseline;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.tl-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--hud-ink);
}
.tl-note {
  font-size: 11.5px;
  color: var(--hud-dim);
}
.tl-legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  color: var(--hud-dim);
  font-family: ui-monospace, monospace;
  margin-left: auto;
}
.sw {
  width: 12px;
  height: 10px;
  display: inline-block;
  border-radius: 2px;
}
.sw.if { background: #5fd3d8; }
.sw.id { background: #8a6fe8; }
.sw.ex { background: #d9b23c; }
.sw.mem { background: #78a870; }
.sw.wb { background: #e9e0ff; }
.sw.stall { background: #6f6494; }
.sw.flush { background: #e05060; }
.tl-scroll {
  overflow: auto;
  max-height: 480px;
  border: 1px solid var(--hud-faint);
}
.tl-inner {
  min-width: 100%;
}
.tl-ruler,
.tl-row {
  display: flex;
  align-items: stretch;
}
.tl-ruler {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--hud-bg);
}
.tick {
  width: 16px;
  flex: 0 0 16px;
  font-size: 9px;
  font-family: ui-monospace, monospace;
  color: var(--hud-dim);
  text-align: center;
  border-left: 1px solid rgba(42, 36, 68, 0.5);
  line-height: 20px;
}
.tick.cur {
  color: var(--hud-hot);
  background: rgba(138, 111, 232, 0.18);
}
.tl-instr-col {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 420px;
  flex: 0 0 420px;
  background: var(--hud-panel);
  border-right: 1px solid var(--hud-faint);
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--hud-body);
  padding: 1px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 18px;
}
.pc {
  color: var(--hud-dim);
  margin-right: 8px;
}
.tl-cell {
  width: 16px;
  flex: 0 0 16px;
  height: 18px;
  font-size: 8px;
  font-family: ui-monospace, monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(6, 5, 12, 0.85);
}
.tl-cell.none {
  background: transparent;
}
.tl-cell.if { background: #5fd3d8; }
.tl-cell.id { background: #8a6fe8; }
.tl-cell.ex { background: #d9b23c; }
.tl-cell.mem { background: #78a870; }
.tl-cell.wb { background: #e9e0ff; }
.tl-cell.stall {
  background: repeating-linear-gradient(45deg, #6f6494, #6f6494 3px, #504a70 3px, #504a70 6px);
  color: var(--hud-ink);
}
.tl-cell.flush {
  background: #e05060;
  color: #fff;
}
.tl-cell.cur {
  outline: 1px solid var(--hud-hot);
  outline-offset: -1px;
}
.tl-row:nth-child(odd) .tl-instr-col {
  background: rgba(11, 9, 22, 0.85);
}
@media (max-width: 720px) {
  .tl-instr-col {
    width: 168px;
    flex: 0 0 168px;
    font-size: 10px;
  }
  .tl-scroll {
    max-height: 360px;
  }
  .tl-head {
    gap: 8px 12px;
  }
  .tl-legend {
    margin-left: 0;
  }
}
</style>
