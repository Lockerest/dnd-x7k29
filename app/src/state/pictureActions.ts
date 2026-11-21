// Saving pictures (already resized by the screen): token icons, portraits, boss
// art and monster skill icons. Each picture is stored apart from the sheet, and
// the sheet (or the table's meta) gets a version stamp so every screen reloads it.
// Same paths, stamps and permissions as the live page.
import type { Db } from '../db/client'
import type { GameState } from './store'

export type PictureActions = {
  /** A token icon for "c:id" (the GM, or that player) or "e:id" (the GM). */
  setIcon: (key: string, data: string) => Promise<void>
  /** A portrait for a hero (the GM, or that player) or a monster (the GM). */
  setPortrait: (id: string, data: string) => Promise<void>
  /** A boss's cinematic art (the GM). */
  setBossArt: (id: string, data: string) => Promise<void>
  /** A monster skill's icon by its slug; null removes it (the GM). */
  setSkillIcon: (slug: string, data: string | null) => Promise<void>
  /** The GM's note on a boss move (Boss abilities list); empty removes it. */
  setSkillNote: (slug: string, text: string) => Promise<void>
}

type Get = () => GameState
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function pictureActions(get: Get, save: Save, now: () => number): PictureActions {
  const mayEdit = (id: string) => get().dm || id === get().session?.me
  return {
    setIcon: async (key, data) => {
      const en = key[0] === 'e'
      const id = key.slice(2)
      if (en ? !get().dm : !mayEdit(id)) return
      const iv = now()
      await save((d) => d.put(`icons/${id}`, { data }))
      if (en) await get().updateEnemy(id, { iv })
      else await get().patchCharacter(id, { iv })
    },

    setPortrait: async (id, data) => {
      if (!mayEdit(id)) return
      const pv = now()
      await save((d) => d.put(`portraits/${id}`, { data }))
      const t = get().tables
      if (t.enemies[id] && !t.chars[id]) await get().updateEnemy(id, { pv })
      else if (t.chars[id]) await get().patchCharacter(id, { pv })
    },

    setBossArt: async (id, data) => {
      if (!mayEdit(id)) return
      const ba = now()
      await save((d) => d.put(`bossart/${id}`, { data }))
      await get().updateEnemy(id, { ba })
      get().notice('Boss art saved.')
    },

    setSkillIcon: async (slug, data) => {
      if (!get().dm) return
      const st = now()
      await save(async (d) => {
        if (data) await d.put(`skicons/${slug}`, { data })
        else await d.del(`skicons/${slug}`)
        await d.patch('meta', { skiv: st })
      })
    },
    setSkillNote: async (slug, text) => {
      if (!get().dm) return
      const t = text.trim().slice(0, 1000)
      await save((d) => (t ? d.put(`skdesc/${slug}`, t) : d.del(`skdesc/${slug}`)))
    },
  }
}
