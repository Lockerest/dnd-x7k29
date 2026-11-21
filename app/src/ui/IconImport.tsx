// "Import icons": the GM picks many pictures at once; each is squared like a
// single icon upload and saved for every board ability and monster skill its
// file name matches.
import { useContext, useRef, useState } from 'react'
import type { Board } from '../logic/board'
import { iconImportStatus, matchIcon } from '../logic/iconImport'
import type { Enemy } from '../logic/types'
import { readFile, squareIcon } from './images'
import { ImagesContext, kitOr } from './imageKit'

export type IconImportProps = {
  board: Board
  enemies: Record<string, Enemy>
  setAbilityIcon: (key: string, data: string) => Promise<void>
  setSkillIcon: (slug: string, data: string) => Promise<void>
}

export function IconImport({ board, enemies, setAbilityIcon, setSkillIcon }: IconImportProps) {
  const kit = kitOr(useContext(ImagesContext))
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const run = async (files: File[]) => {
    let done = 0
    const unmatched: string[] = []
    const failed: string[] = []
    for (const f of files) {
      const m = matchIcon(f.name, board, enemies)
      if (!m.board.length && !m.skill) {
        unmatched.push(f.name)
        continue
      }
      let data: string
      try {
        data = await squareIcon(kit, await readFile(f, 'dataUrl'), 96)
      } catch {
        failed.push(f.name)
        continue
      }
      for (const k of m.board) await setAbilityIcon(k, data)
      if (m.skill) await setSkillIcon(m.skill, data)
      done++
      setStatus(`${done} of ${files.length}...`)
    }
    setStatus(iconImportStatus(done, unmatched, failed))
  }
  return (
    <>
      <button onClick={() => input.current!.click()}>Import icons</button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="Icon files"
        onChange={(e) => {
          const fs = [...(e.target.files ?? [])]
          e.target.value = ''
          if (fs.length) void run(fs)
        }}
      />
      {status && <span className="sub">{status}</span>}
    </>
  )
}
