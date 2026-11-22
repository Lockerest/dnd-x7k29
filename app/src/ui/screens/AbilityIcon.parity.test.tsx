// @vitest-environment jsdom
// Parity for ability icons: the live page's own icon code (read from index.html)
// and the new AbilityIcon must draw the same picture for every ability.
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { keyByName, vocationBoard } from '../../logic/abilityBoard'
import { defaultBoard, type Board } from '../../logic/board'
import { NEW_CLASSES } from '../../data/classes'
import { AbilityIcon } from './Board'
// The live page itself, as text.
import page from '../../../../classic/index.html?raw'

afterEach(cleanup)

const grab = (re: RegExp) => {
  const m = page.match(re)
  if (!m) throw new Error(`Not found in index.html: ${re}`)
  return m[0]
}
// The page's icon code, unchanged: GLY, GKW, CCOL, autoIc and abIc (plus its esc helper).
const code = [
  grab(/esc=s=>String\(s\?\?""\)\.replace\([^\n]*?\}\[c\]\)\)/).replace(/^esc=/, 'const esc='),
  grab(/const GLY=\{[\s\S]*?\};\n/),
  grab(/const GKW=\[\[[\s\S]*?\]\];/),
  grab(/const CCOL=\{.*?\};/),
  grab(/const autoIc=[\s\S]*?<\/svg>`\};/),
  grab(/const abIc=[^\n]*/),
].join('\n')
const legacyIcon = new Function('board', 'ABN', 'ABI', 'aicOn', `${code}\nreturn abIc`) as (b: Board, abn: Record<string, string>, abi: Record<string, string>, on: boolean) => (n: string) => string

/** Tag, sorted attributes, text and children, so attribute order does not matter. */
type Canon = string | { t: string; a: [string, string][]; c: Canon[] }
const canon = (n: Node): Canon =>
  n.nodeType === 3
    ? n.nodeValue!
    : {
        t: (n as Element).tagName.toLowerCase(),
        a: [...(n as Element).attributes].map((x): [string, string] => [x.name.toLowerCase(), x.value]).sort(),
        c: [...n.childNodes].map(canon),
      }
const fromHtml = (h: string) => {
  const d = document.createElement('div')
  d.innerHTML = h
  return [...d.childNodes].map(canon)
}

describe('ability icons match the live page', () => {
  const board: Board = {
    ...Object.fromEntries(Object.entries(vocationBoard()).filter(([, e]) => !NEW_CLASSES.includes(e.v as string))),
    ...defaultBoard(),
    z1: { n: 'Odd Thing', v: 'warrior2', k: 'util', ic: '🦊' },
    z2: { n: 'Plain', v: 'nobody', k: 'heal' },
    z3: { n: 'Hitter', v: 'any', k: 'atk' },
  }
  const names = [...Object.values(board).map((e) => e.n), 'Missing']
  for (const mode of ['drawn', 'emoji', 'image'] as const)
    it(`${mode} (${names.length} abilities)`, () => {
      const images: Record<string, string> = mode === 'image' ? { [Object.keys(board)[3]!]: 'data:image/png;base64,QQ', z1: 'data:x' } : {}
      const theirs = legacyIcon(board, keyByName(board), images, mode !== 'emoji')
      for (const n of names) {
        const { container } = render(<AbilityIcon board={board} name={n} images={images} drawn={mode !== 'emoji'} />)
        expect([...container.childNodes].map(canon), n).toEqual(fromHtml(theirs(n)))
        cleanup()
      }
    })
})
