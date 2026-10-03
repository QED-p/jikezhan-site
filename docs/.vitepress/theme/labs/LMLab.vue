<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import HudFrame from '../components/HudFrame.vue'
import HudRule from '../components/HudRule.vue'
import TitleTab from '../components/TitleTab.vue'
import ReadoutCells from '../components/ReadoutCells.vue'
import PanelGroup from '../components/PanelGroup.vue'
import HudButton from '../components/HudButton.vue'
import HudTextarea from '../components/HudTextarea.vue'
import HudSlider from '../components/HudSlider.vue'
import HudInput from '../components/HudInput.vue'
import { UNDERFIT_CORPUS } from './lm/underfit-corpus.js'
import SampleText from '../components/SampleText.vue'
import MindMap from '../components/MindMap.vue'
import LossChart from '../components/LossChart.vue'
import MatrixHeat from '../components/MatrixHeat.vue'
import DistributionBars from '../components/DistributionBars.vue'
import ValueChips from '../components/ValueChips.vue'
import FormulaLine from '../components/FormulaLine.vue'

const CPP_SORTS = `#include <bits/stdc++.h>
using namespace std;

void bubbleSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
}

void insertionSort(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}

void selectionSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++) {
        int m = i;
        for (int j = i + 1; j < n; j++) if (a[j] < a[m]) m = j;
        swap(a[i], a[m]);
    }
}

void merge(vector<int>& a, int l, int m, int r) {
    vector<int> L(a.begin() + l, a.begin() + m + 1);
    vector<int> R(a.begin() + m + 1, a.begin() + r + 1);
    int i = 0, j = 0, k = l;
    while (i < (int)L.size() && j < (int)R.size())
        a[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
    while (i < (int)L.size()) a[k++] = L[i++];
    while (j < (int)R.size()) a[k++] = R[j++];
}

void mergeSort(vector<int>& a, int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    mergeSort(a, l, m);
    mergeSort(a, m + 1, r);
    merge(a, l, m, r);
}

int partition(vector<int>& a, int l, int r) {
    int pivot = a[r], i = l - 1;
    for (int j = l; j < r; j++)
        if (a[j] < pivot) swap(a[++i], a[j]);
    swap(a[i + 1], a[r]);
    return i + 1;
}

void quickSort(vector<int>& a, int l, int r) {
    if (l >= r) return;
    int p = partition(a, l, r);
    quickSort(a, l, p - 1);
    quickSort(a, p + 1, r);
}`

const PRESETS = [
  {
    name: 'C++ 排序',
    text: CPP_SORTS
  },
  {
    name: '欠拟合语料',
    text: UNDERFIT_CORPUS
  },
  {
    name: '中文示例',
    text:
      '极客栈是一个研究体系结构与机器学习的社团.我们写教程，做实验，把机器拆开看它是怎么跑的.' +
      '语言模型从一堆字符里学会预测下一个字符.前向传播算出预测，反向传播算出梯度.' +
      '梯度告诉参数应该往哪里走，走多快由学习率决定.训练就是把这件事重复很多很多遍.' +
      '每一次迭代，模型都会在训练语料上随机截取一段窗口，把窗口里的字符当作输入，' +
      '把下一个字符当作答案.预测错了，损失就高；损失通过反向传播变成梯度，' +
      '梯度再把每一个参数往让损失变小的方向推一点.开始的时候模型只会乱猜，' +
      '损失接近词表的自然对数；训练一段时间之后，它开始记住语料里的高频片段，' +
      '损失快速下降.语料越丰富，模型学到的东西越多；语料太少，它就会死记硬背，' +
      '训练损失很低，但遇到没见过的文本就露馅，这就是过拟合.'
  },
  {
    name: '英文示例',
    text:
      'a language model learns to predict the next character. ' +
      'the forward pass computes a prediction, the backward pass computes gradients. ' +
      'gradients tell the parameters where to go, the learning rate decides how far. ' +
      'training is just this loop, repeated many times. every iteration samples a window ' +
      'from the corpus, feeds the characters in, and treats the next character as the answer. ' +
      'early in training the model guesses randomly and the loss is high, near the natural ' +
      'log of the vocabulary size. later it memorizes frequent fragments and the loss drops. ' +
      'a small corpus makes the model memorize instead of generalize, which shows up as a ' +
      'rising validation loss while the training loss keeps falling. '
  },
  {
    name: '周期模式',
    text: 'abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc'
  }
]

const corpus = ref(PRESETS[0].text)
const lr = ref(0.003)
const samplePrompt = ref('')
const sampleLength = ref(48)
const sampleTemp = ref(1)
const sampleTopK = ref(0)
const running = ref(false)
const error = ref('')
const selected = ref('attention')
const head = ref(0)
const hover = ref(null)

const snap = reactive({
  step: 0,
  loss: null,
  val: null,
  gradNorm: 0,
  gradGroups: [],
  updateNorm: 0,
  params: 0,
  history: [],
  valHistory: [],
  sample: '',
  chars: [],
  stats: null,
  probe: null
})

let worker = null

function onMessage(e) {
  const { type, data, message } = e.data
  if (type === 'error') {
    error.value = message
    running.value = false
    return
  }
  if (type !== 'snapshot' || !data) return
  Object.assign(snap, {
    step: data.step,
    loss: data.loss,
    val: data.val,
    gradNorm: data.gradNorm,
    gradGroups: data.gradGroups || [],
    updateNorm: data.updateNorm,
    params: data.params,
    history: data.history,
    valHistory: data.valHistory,
    sample: data.sample,
    chars: data.chars,
    stats: data.stats,
    probe: data.probe
  })
}

onMounted(() => {
  worker = new Worker(new URL('./lm/lm.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = onMessage
  worker.postMessage({ type: 'init', corpus: corpus.value, lr: lr.value })
  running.value = true
})

onBeforeUnmount(() => {
  if (worker) worker.terminate()
})

function toggle() {
  if (!worker) return
  running.value = !running.value
  worker.postMessage({ type: running.value ? 'start' : 'pause' })
}

function reset() {
  if (!worker) return
  error.value = ''
  head.value = 0
  worker.postMessage({ type: 'reset', corpus: corpus.value, lr: lr.value })
  running.value = true
}

function pushSampleSettings() {
  if (worker) {
    worker.postMessage({
      type: 'sampleSettings',
      prompt: samplePrompt.value,
      length: sampleLength.value,
      temperature: sampleTemp.value,
      topK: sampleTopK.value
    })
  }
}

function onPrompt(v) {
  samplePrompt.value = v
  pushSampleSettings()
}

function onSampleLength(v) {
  sampleLength.value = Math.max(4, Math.min(200, Math.round(Number(v) || 48)))
  pushSampleSettings()
}

function onSampleTemp(v) {
  sampleTemp.value = Math.round(Number(v) * 10) / 10
  pushSampleSettings()
}

function onSampleTopK(v) {
  sampleTopK.value = Math.max(0, Math.min(50, Math.round(Number(v) || 0)))
  pushSampleSettings()
}

function sampleNow() {
  if (worker) {
    worker.postMessage({
      type: 'sampleNow',
      prompt: samplePrompt.value,
      length: sampleLength.value,
      temperature: sampleTemp.value,
      topK: sampleTopK.value
    })
  }
}

function setPreset(p) {
  corpus.value = p.text
  reset()
}

function onLr(v) {
  lr.value = v
  if (worker) worker.postMessage({ type: 'lr', value: v })
}

function onWheel(e) {
  if (!worker) return
  worker.postMessage({ type: 'setWindow', delta: e.deltaY > 0 ? 1 : -1 })
}

const fmt = (v, d = 3) => (v === null || v === undefined ? '—' : Number(v).toFixed(d))
const perplexity = computed(() =>
  snap.loss === null ? '—' : Math.exp(snap.loss).toFixed(2)
)

const readouts = computed(() => [
  { label: '步数', value: String(snap.step).padStart(4, '0') },
  { label: '训练 loss', value: fmt(snap.loss) },
  { label: '验证 loss', value: fmt(snap.val) },
  { label: '词表', value: String(snap.stats ? snap.stats.vocab : '—') },
  { label: '参数', value: String(snap.params) }
])

const nodes = [
  {
    id: 'data',
    label: '数据',
    children: [
      { id: 'corpus', label: '语料' },
      { id: 'vocab', label: '字符词表' },
      { id: 'split', label: '训练 / 验证切分' }
    ]
  },
  {
    id: 'forward',
    label: '前向传播',
    children: [
      { id: 'window', label: '输入窗口' },
      { id: 'embed', label: '词元嵌入' },
      { id: 'pos', label: '位置编码' },
      { id: 'attention', label: '自注意力' },
      { id: 'ffn', label: '前馈网络' },
      { id: 'logits', label: '输出分布' }
    ]
  },
  { id: 'loss', label: '交叉熵损失' },
  {
    id: 'backward',
    label: '反向传播',
    children: [
      { id: 'grads', label: '梯度计算' },
      { id: 'update', label: '参数更新（Adam）' }
    ]
  },
  { id: 'sample', label: '采样生成' }
]

const gradLabels = computed(() => snap.gradGroups.map((g) => g.label))
const gradValues = computed(() => snap.gradGroups.map((g) => g.value))
const topProbs = computed(() => (snap.probe ? snap.probe.top.map((t) => t.p) : []))
const topChars = computed(() => (snap.probe ? snap.probe.top.map((t) => t.ch) : []))
const vocabLine = computed(() => snap.chars.slice(0, 160).join(' '))

const headCount = computed(() => (snap.probe ? snap.probe.heads : 4))
const dh = computed(() => (snap.probe ? snap.probe.dh : 8))
const scoreOf = (r, c) => snap.probe?.scores?.[head.value]?.[r]?.[c]
const weightOf = (r, c) => snap.probe?.attn?.[head.value]?.[r]?.[c]
const scaledOf = (r, c) => {
  const raw = scoreOf(r, c)
  return raw === undefined ? undefined : raw / Math.sqrt(dh.value)
}
const hoverInfo = computed(() => {
  if (!hover.value || !snap.probe) return null
  const { r, c } = hover.value
  const masked = c > r
  return {
    r,
    c,
    masked,
    q: snap.probe.tokens[r],
    k: snap.probe.tokens[c],
    raw: scoreOf(r, c),
    scaled: scaledOf(r, c),
    weight: weightOf(r, c)
  }
})
const selCell = computed(() =>
  hover.value
    ? { r: hover.value.r, c: hover.value.c }
    : snap.probe
      ? snap.probe.attnMax[head.value]
      : null
)
const selCallout = computed(() => {
  if (hoverInfo.value && !hoverInfo.value.masked) {
    return `内积 ${Number(hoverInfo.value.raw).toFixed(2)} → softmax ${Number(hoverInfo.value.weight).toFixed(2)}`
  }
  const m = snap.probe?.attnMax?.[head.value]
  return m ? `softmax ${m.v.toFixed(2)}` : ''
})
const winStart = computed(() => (snap.probe ? snap.probe.window.start : 0))
const winEnd = computed(() => (snap.probe ? snap.probe.window.end : 0))
const winTotal = computed(() => (snap.probe ? snap.probe.window.total : 0))
const pad3 = (v) => String(v).padStart(3, '0')
</script>

<template>
  <HudFrame palette="violet">
    <header class="lm-head">
      <div>
        <div class="lm-title">
          <TitleTab text="实验 05" />
          <h2>语言模型全链路</h2>
        </div>
        <p class="lm-kicker">
          字符级 Transformer · 前向传播与反向传播都在浏览器里真实运行
        </p>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="lm-rule" :split="58" />

    <div class="lm-controls">
      <HudTextarea v-model="corpus" label="语料（改完点重置生效）" :rows="6" :maxlength="10000" />
      <div class="lm-ctrl">
        <div class="lm-presets">
          <HudButton v-for="p in PRESETS" :key="p.name" @click="setPreset(p)">
            {{ p.name }}
          </HudButton>
        </div>
        <div class="lm-buttons">
          <HudButton variant="primary" @click="toggle">
            {{ running ? '暂停' : '开始' }}
          </HudButton>
          <HudButton @click="reset">重置</HudButton>
          <HudButton @click="sampleNow">采样</HudButton>
        </div>
        <div class="lm-sample-controls">
          <HudInput
            :model-value="samplePrompt"
            label="采样提示词（词表外的字符会被忽略，留空用语料开头）"
            placeholder="例如：语言"
            @update:model-value="onPrompt"
          />
          <div class="lm-sample-row">
            <HudInput
              :model-value="sampleLength"
              label="生成长度"
              type="number"
              :min="4"
              :max="200"
              :step="4"
              suffix="字符"
              @update:model-value="onSampleLength"
            />
            <HudInput
              :model-value="sampleTopK"
              label="Top-k（0 = 关闭）"
              type="number"
              :min="0"
              :max="50"
              :step="1"
              @update:model-value="onSampleTopK"
            />
          </div>
          <HudSlider
            :model-value="sampleTemp"
            :min="0.2"
            :max="1.6"
            :step="0.1"
            :label="`温度 ${sampleTemp.toFixed(1)}（低 = 更保守，高 = 更发散）`"
            @update:model-value="onSampleTemp"
          />
        </div>
        <HudSlider
          :model-value="lr"
          :min="0.0005"
          :max="0.02"
          :step="0.0005"
          :label="`学习率 ${lr.toFixed(4)}`"
          @update:model-value="onLr"
        />
        <p v-if="error" class="lm-error">{{ error }}</p>
      </div>
    </div>

    <div class="lm-body">
      <div class="lm-map">
        <div class="lm-map-grid">
          <MindMap :nodes="nodes" :selected="selected" @select="(id) => (selected = id)" />

          <div class="lm-detail">
            <div v-if="!selected" class="lm-hint">点击左侧节点，查看这一环的实时状态.</div>

            <div v-else-if="selected === 'corpus'" class="lm-node">
              <ReadoutCells
                :items="[
                  { label: '总字符', value: String(snap.stats?.corpus ?? '—') },
                  { label: '词表', value: String(snap.stats?.vocab ?? '—') },
                  { label: '训练', value: String(snap.stats?.train ?? '—') },
                  { label: '验证', value: String(snap.stats?.val ?? '—') }
                ]"
              />
              <p class="lm-note">语料按 85 / 15 切分为训练集与验证集，验证集不参与梯度更新.</p>
            </div>

            <div v-else-if="selected === 'vocab'" class="lm-node">
              <div class="lm-chars">{{ vocabLine }}</div>
              <p class="lm-note">字符级建模：每个字符是一个词元，词表就是语料里出现过的所有字符.</p>
            </div>

            <div v-else-if="selected === 'split'" class="lm-node">
              <ReadoutCells
                :items="[
                  { label: '训练', value: String(snap.stats?.train ?? '—') },
                  { label: '验证', value: String(snap.stats?.val ?? '—') }
                ]"
              />
              <p class="lm-note">每个训练步随机截取窗口；验证集从语料中均匀抽取 16 个连续片段（不是末尾截断，保证与训练集同分布），每 25 步评估一次，构成图中的虚线.</p>
            </div>

            <div v-else-if="selected === 'window'" class="lm-node">
              <ValueChips v-if="snap.probe" label="输入" :values="snap.probe.tokens" />
              <p class="lm-note">
                当前探针窗口：位置 {{ pad3(winStart) }}–{{ pad3(winEnd) }}（共 {{ winTotal }} 个字符）.
                在「自注意力」节点里滚动鼠标滚轮可以平移这个窗口.
              </p>
            </div>

            <div v-else-if="selected === 'embed'" class="lm-node">
              <MatrixHeat
                v-if="snap.probe"
                :matrix="snap.probe.e"
                :row-labels="snap.probe.tokens"
                :show-index="false"
                :show-headers="false"
                :scan="false"
                :label-w="52"
                :cell-w="11"
                :cell-h="18"
                :gap="1"
              />
              <p class="lm-note">每行是一个位置的词元嵌入 + 位置编码，列是 32 维通道.</p>
            </div>

            <div v-else-if="selected === 'pos'" class="lm-node">
              <MatrixHeat
                v-if="snap.probe"
                :matrix="snap.probe.posEmb"
                :row-labels="snap.probe.tokens"
                :show-index="false"
                :show-headers="false"
                :scan="false"
                :label-w="52"
                :cell-w="11"
                :cell-h="18"
                :gap="1"
              />
              <p class="lm-note">位置编码叠加在词元嵌入上，让模型知道顺序.</p>
            </div>

            <div v-else-if="selected === 'attention'" class="lm-node">
              <div class="lm-tabs">
                <button
                  v-for="i in headCount"
                  :key="i"
                  class="lm-tab"
                  :class="{ on: head === i - 1 }"
                  @click="head = i - 1"
                >
                  头 {{ String(i).padStart(2, '0') }}
                </button>
                <span class="lm-win hud-num">
                  位置 {{ pad3(winStart) }}–{{ pad3(winEnd) }} / {{ winTotal }}
                </span>
              </div>
              <div class="lm-probe">
                <template v-if="hoverInfo">
                  <span class="lp-token">查询「{{ hoverInfo.q }}」</span>
                  <span class="lp-x">×</span>
                  <span class="lp-token">键「{{ hoverInfo.k }}」</span>
                  <template v-if="hoverInfo.masked">
                    <span class="lp-mask">因果掩码：这个键在当前位置不可见</span>
                  </template>
                  <template v-else>
                    <span class="lp-item">内积 <b class="hud-num">{{ hoverInfo.raw.toFixed(3) }}</b></span>
                    <span class="lp-item">缩放 <b class="hud-num">{{ hoverInfo.scaled.toFixed(3) }}</b></span>
                    <span class="lp-item lp-soft">softmax 后 <b class="hud-num">{{ hoverInfo.weight.toFixed(3) }}</b></span>
                    <span class="lp-bar"><i :style="{ width: Math.min(100, hoverInfo.weight * 100) + '%' }" /></span>
                  </template>
                </template>
                <span v-else class="lp-hint">悬停任意格子：看这一对查询与键的内积，以及它如何变成注意力权重</span>
              </div>
              <div
                class="lm-heat"
                @wheel.prevent="onWheel"
                @mouseleave="hover = null"
              >
                <MatrixHeat
                  v-if="snap.probe"
                  :matrix="snap.probe.attn[head] || []"
                  :row-labels="snap.probe.tokens"
                  :col-labels="snap.probe.tokens"
                  :selected="selCell"
                  :callout="selCallout"
                  :scan="false"
                  :label-w="52"
                  :cell-w="18"
                  :cell-h="16"
                  @cell-enter="(e) => (hover = e)"
                  @cell-leave="() => (hover = null)"
                />
              </div>
              <p class="lm-note">
                悬停格子看内积；点上方标签切换不同头；鼠标滚轮在热图上滚动，平移上下文窗口.
                内积经 &nbsp;<FormulaLine tex="1/\sqrt{d_h}" size="15px" />&nbsp; 缩放后做 softmax，就是格子的颜色.
              </p>
            </div>

            <div v-else-if="selected === 'ffn'" class="lm-node">
              <MatrixHeat
                v-if="snap.probe"
                :matrix="snap.probe.hidden"
                :row-labels="snap.probe.tokens"
                :show-index="false"
                :show-headers="false"
                :scan="false"
                :label-w="52"
                :cell-w="6"
                :cell-h="13"
                :gap="0"
              />
              <p class="lm-note">前馈层（ReLU）的激活：64 维隐层，逐位置独立计算.</p>
            </div>

            <div v-else-if="selected === 'logits'" class="lm-node">
              <DistributionBars
                v-if="snap.probe"
                :values="topProbs"
                :labels="topChars"
                :height="64"
                :show-value="false"
                caption="窗口最后一个位置的 top-8 字符概率"
              />
            </div>

            <div v-else-if="selected === 'loss'" class="lm-node">
              <ReadoutCells
                :items="[
                  { label: '训练', value: fmt(snap.loss) },
                  { label: '验证', value: fmt(snap.val) },
                  { label: '困惑度', value: perplexity }
                ]"
              />
              <p class="lm-formula">
                <FormulaLine tex="\mathcal{L}=-\frac{1}{T}\sum_{t=1}^{T}\log p_\theta(x_{t+1}\mid x_{\le t})" size="18px" />
              </p>
              <p class="lm-note">
                交叉熵损失：对每个位置，取正确字符的概率，取对数后求平均.训练损失不断下降、
                验证损失抬头，就是过拟合的信号——把语料改长一点或点重置换一段语料看看.
              </p>
              <p v-if="snap.val === null" class="lm-note">
                验证集太小（不足 4 个字符），暂时没有验证曲线：把语料加长到 30 字符以上即可.
              </p>
            </div>

            <div v-else-if="selected === 'grads'" class="lm-node">
              <DistributionBars
                :values="gradValues"
                :labels="gradLabels"
                :height="70"
                :show-value="false"
                caption="各参数组的梯度范数（当前步）"
              />
              <p class="lm-note">
                反向传播从损失出发，沿计算图把梯度传回每个参数；总梯度范数
                <span class="hud-num">{{ fmt(snap.gradNorm) }}</span>，并做梯度裁剪.
              </p>
            </div>

            <div v-else-if="selected === 'update'" class="lm-node">
              <ReadoutCells
                :items="[
                  { label: '步数', value: String(snap.step).padStart(4, '0') },
                  { label: '学习率', value: lr.toFixed(4) },
                  { label: '更新范数', value: fmt(snap.updateNorm) }
                ]"
              />
              <p class="lm-note">Adam 用一阶/二阶动量估计缩放每个参数的步长，更新后进入下一轮前向.</p>
            </div>

            <div v-else-if="selected === 'sample'" class="lm-node">
              <div class="lm-sample">
                <SampleText v-if="snap.sample" :text="snap.sample" />
                <template v-else>等待采样…</template>
              </div>
              <p class="lm-note">
                提示词「{{ samplePrompt.trim() || '语料开头两字' }}」· 长度 {{ sampleLength }} · 温度 {{ sampleTemp.toFixed(1) }} · Top-k {{ sampleTopK || '关' }}.
                从训练中的模型按概率采样；温度调低会更贴着语料，Top-k = 1 就是每步都取最可能的字符（输出确定）.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside class="lm-side">
        <PanelGroup title="训练曲线">
          <LossChart :train="snap.history" :val="snap.valHistory" :height="200" />
          <div class="lm-cur">
            <span>训练 <b class="hud-num">{{ fmt(snap.loss) }}</b></span>
            <span>验证 <b class="hud-num">{{ fmt(snap.val) }}</b></span>
            <span>困惑度 <b class="hud-num">{{ perplexity }}</b></span>
          </div>
        </PanelGroup>

        <PanelGroup title="实时采样">
          <div class="lm-sample">
            <SampleText v-if="snap.sample" :text="snap.sample" />
            <template v-else>等待采样…</template>
          </div>
          <p class="lm-note">
            提示词「{{ samplePrompt.trim() || '语料开头两字' }}」· 长度 {{ sampleLength }} · 温度 {{ sampleTemp.toFixed(1) }} · Top-k {{ sampleTopK || '关' }}.
          </p>
        </PanelGroup>

        <PanelGroup title="训练状态">
          <div class="lm-status">
            <span>步数 <b class="hud-num">{{ snap.step }}</b></span>
            <span>梯度 <b class="hud-num">{{ fmt(snap.gradNorm) }}</b></span>
            <span>学习率 <b class="hud-num">{{ lr.toFixed(4) }}</b></span>
          </div>
          <p class="lm-note">
            全部计算发生在这台设备上：不放服务器、没有后端，刷新即重置.
          </p>
        </PanelGroup>
      </aside>
    </div>
  </HudFrame>
</template>

<style scoped>
.lm-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px 40px;
}
.lm-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.lm-title h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: var(--hud-ink);
}
.lm-kicker {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--hud-dim);
}
.lm-rule {
  margin: 22px 0 26px;
}
.lm-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 32px;
  align-items: start;
}
.lm-ctrl {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lm-presets,
.lm-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.lm-sample-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lm-sample-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.lm-error {
  margin: 0;
  font-size: 13px;
  color: var(--hud-crit);
}
.lm-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 520px;
  gap: 28px;
  margin-top: 34px;
  align-items: start;
}
@container (max-width: 1560px) {
  .lm-controls,
  .lm-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .lm-side {
    max-width: 640px;
  }
}
.lm-map-grid {
  display: grid;
  grid-template-columns: minmax(0, 520px) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
@container (max-width: 1710px) {
  .lm-map-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.lm-detail {
  min-height: 220px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-tint);
  overflow-x: auto;
}
.lm-detail::-webkit-scrollbar {
  height: 8px;
}
.lm-detail::-webkit-scrollbar-thumb {
  background: var(--hud-faint);
}
.lm-hint {
  font-size: 13.5px;
  color: var(--hud-dim);
}
.lm-node {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lm-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
.lm-chars {
  font-size: 15px;
  line-height: 2.1;
  letter-spacing: 0.35em;
  color: var(--hud-ink);
  word-break: break-all;
}
.lm-formula {
  margin: 4px 0;
  font-size: 17px;
}
.lm-sample {
  font-size: 15.5px;
  line-height: 2;
  color: var(--hud-ink);
  word-break: break-all;
  white-space: pre-wrap;
}
.lm-cur,
.lm-status {
  display: flex;
  gap: 22px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--hud-dim);
}
.lm-cur b,
.lm-status b {
  color: var(--hud-ink);
}
.lm-side :deep(.panel-group) {
  margin-bottom: 20px;
}
.lm-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.lm-tab {
  padding: 3px 12px;
  background: none;
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}
.lm-tab:hover {
  border-color: var(--hud-accent);
}
.lm-tab.on {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--hud-bg);
  font-weight: 700;
}
.lm-win {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--hud-dim);
}
.lm-heat {
  cursor: ns-resize;
}
.lm-probe {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-bg);
  font-size: 13px;
}
.lp-token {
  color: var(--hud-ink);
  font-weight: 600;
}
.lp-x {
  color: var(--hud-dim);
}
.lp-item {
  color: var(--hud-dim);
}
.lp-item b {
  color: var(--hud-hot);
  margin-left: 4px;
}
.lp-mask {
  color: var(--hud-warn);
}
.lp-hint {
  color: var(--hud-dim);
}
.lp-soft {
  color: var(--hud-ink);
}
.lp-soft b {
  color: var(--hud-accent);
}
.lp-bar {
  display: inline-block;
  width: 90px;
  height: 6px;
  background: var(--hud-faint);
}
.lp-bar i {
  display: block;
  height: 100%;
  background: var(--hud-accent);
}
</style>
