// Shared by the parity tests that compare the new store's saves with the live page's.
import type { Db } from '../../src/db/client.ts'
import { clean } from './random.ts'

export type W = [method: string, path: string, body: unknown]

/** Replaces the page's database calls: writes are recorded, reads give the page's own state. */
export const CAPTURE = `window.__w=[];api=async(p,m,b)=>{if(m&&m!=="GET"){__w.push([m,p,b===undefined?null:JSON.parse(JSON.stringify(b))]);return m==="POST"?{name:"-k"+__w.length}:null}
 return({chars,enemies,maps,cur,board:boardDB?board:null,"meta/sp":SPS,init:ini,combat,"meta/abv":abAll?1:0,"meta/aic":aicOn?1:0})[p]??null};`

/** A recording database for the new store. */
export function recDb(w: W[]): Db {
  return {
    pin: 't',
    url: () => '',
    get: async () => null,
    keys: async () => [],
    put: async (p, v) => void w.push(['PUT', p, clean(v)]),
    patch: async (p, v) => void w.push(['PATCH', p, clean(v)]),
    post: async (p, v) => (w.push(['POST', p, clean(v)]), `-k${w.length}`),
    del: async (p) => void w.push(['DELETE', p, null]),
  }
}

/** Timestamps differ between the two runs; everything else must match. */
export const noTs = (w: W[]) => w.map(([m, p, b]) => [m, p, b && typeof b === 'object' && 'ts' in b ? { ...b, ts: 0 } : b])

