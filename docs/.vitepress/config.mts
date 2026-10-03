import { defineConfig } from 'vitepress'
import katexModule from '@vscode/markdown-it-katex'
import { tracks, unitsOf, urlOf } from './curriculum'

const katex = (katexModule as any).default || katexModule

const sidebar = Object.fromEntries(
  tracks.map((t) => [
    `/${t.id}/`,
    [
      {
        text: t.title,
        items: unitsOf(t.id).map((u) => ({ text: u.title, link: urlOf(u) }))
      }
    ]
  ])
)

export default defineConfig({
  lang: 'zh-CN',
  title: '极客栈',
  description: '体系结构与机器学习教程站：从人教A版出发的线性代数与矩阵分析，每个概念配一个可拖动的实验.',
  cleanUrls: true,
  sitemap: { hostname: 'https://geekstk.com' },
  vite: { build: { chunkSizeWarningLimit: 1600 } },
  appearance: 'force-dark',
  head: [
    ['meta', { name: 'theme-color', content: '#06050C' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
  ],
  markdown: {
    math: false,
    config(md) {
      md.use(katex, { throwOnError: false, errorColor: '#E05060' })
    }
  },
  themeConfig: {
    nav: [
      { text: '数学', link: '/math/linear-algebra/' },
      { text: '体系结构', link: '/arch/organization/' },
      { text: '机器学习', link: '/ml/transformer/' },
      { text: '交叉专题', link: '/cross/gemm-optimization/' },
      {
        text: '实验',
        items: [
          { text: '语言模型全链路', link: '/labs/lm' },
          { text: 'RV32I 五级流水线', link: '/labs/rv-pipeline' }
        ]
      }
    ],
    sidebar,
    outline: { level: [2, 3], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除条件',
            displayDetails: '显示详情',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '外观',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    lastUpdated: { text: '最后更新于' },
    notFound: {
      title: '信号丢失',
      quote: '这个坐标上没有内容.检查链接，或者回到已知区域.',
      linkText: '回到首页'
    }
  }
})
