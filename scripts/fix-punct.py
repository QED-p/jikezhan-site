#!/usr/bin/env python3
"""站内文章标点规则：句号一律用半角 `.`

- 跳过代码块（``` 围栏）与行内代码（反引号包裹）
- 只动句号，`，；：？！` 保持全角

用法：
    python3 scripts/fix-punct.py            # 默认扫描 docs/、scripts/gen-units.mjs、CONTRIBUTING.md
    python3 scripts/fix-punct.py <path> ... # 也可以指定文件或目录
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTS = {'.md', '.mts', '.ts', '.vue', '.js', '.mjs'}
SKIP_PARTS = {'dist', 'node_modules', 'cache'}


def convert(text: str) -> str:
    out = []
    in_fence = False
    for line in text.split('\n'):
        if line.lstrip().startswith('```'):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue
        parts = line.split('`')
        for i in range(0, len(parts), 2):
            parts[i] = parts[i].replace('。', '.')
        out.append('`'.join(parts))
    return '\n'.join(out)


def iter_files(paths):
    for p in paths:
        if p.is_file():
            yield p
        elif p.is_dir():
            for f in sorted(p.rglob('*')):
                if f.suffix in EXTS and not (set(f.parts) & SKIP_PARTS):
                    yield f


def main():
    args = sys.argv[1:]
    paths = [Path(a) for a in args] or [
        ROOT / 'docs',
        ROOT / 'scripts' / 'gen-units.mjs',
        ROOT / 'CONTRIBUTING.md',
    ]
    changed = 0
    total = 0
    for f in iter_files(paths):
        src = f.read_text(encoding='utf-8')
        if '。' not in src:
            continue
        dst = convert(src)
        if dst != src:
            n = src.count('。') - dst.count('。')
            f.write_text(dst, encoding='utf-8')
            changed += 1
            total += n
            try:
                shown = f.relative_to(ROOT)
            except ValueError:
                shown = f
            print(f'{shown}  ({n})')
    print(f'--- {changed} files, {total} replacements')


if __name__ == '__main__':
    main()
