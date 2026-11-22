// What makes each class itself: a few rules that always apply, shown at the top
// of its page in the Reference. Rules marked gm are for the GM only.
import type { ClassId } from '../logic/types'

export type ClassRule = { name: string; text: string; gm?: boolean }

export const CLASS_RULES: Record<ClassId, ClassRule[]> = {
  fighter: [
    { name: 'Interpose', text: 'Once per round, when an ally next to you is hit, you can take the hit instead.' },
    { name: 'Steady', text: '+2 on saves against being pushed, knocked down or staggered.' },
  ],
  warrior: [
    { name: 'Stagger', text: 'Every 3rd hit you land on the same enemy staggers it: it loses its reaction and has -2 AC until its next turn.' },
    { name: 'Rage', text: 'Each time you take damage, your next attack deals +1d4, stacking up to +3d4. It resets after that attack.' },
  ],
  archer: [
    { name: 'Steady Aim', text: "If you haven't moved this turn, +2 to hit and a critical hit on 19 or 20." },
    { name: 'Long Shot', text: 'Firing at long range never gives you disadvantage.' },
  ],
  magickarcher: [
    { name: 'Lingering Sigils', text: 'Each sigil arrow leaves a glowing mark on its square for 2 rounds; an ally who starts their turn there heals 1d4. Up to 2 marks at once.' },
    { name: 'True Flight', text: 'Your healing and support arrows always hit allies, with no roll.' },
  ],
  mage: [
    { name: 'Spell Shaping', text: 'Your area spells can leave out any allies you choose.' },
    { name: 'Focus', text: 'If nothing hit you since your last turn, your next spell deals or heals +1d6.' },
  ],
  sorcerer: [
    {
      name: 'Elemental Charge',
      text: 'Each fire, ice or lightning spell gives 1 charge of that element, up to 3. At 3, your next spell of that element releases them: fire burns 1d6 a round for 2 rounds, ice slows, lightning chains to one more enemy.',
    },
    { name: 'Affinity', text: 'You resist the last element you cast until your next turn.' },
  ],
  thief: [
    { name: 'Sneak Attack', text: 'Once per turn, +2d6 damage against an enemy that is unaware, distracted or flanked by an ally (+3d6 at level 5, +4d6 at level 9).' },
    { name: 'Slippery', text: 'Moving away from enemies never gives them a free attack.' },
  ],
  trickster: [
    { name: 'Afterimages', text: 'When an attack misses you, gain an image (up to 2). The next attack against you rolls a d6: on 4 or higher it hits an image instead, which vanishes.' },
    { name: 'Showman', text: '+2 to Deception and Performance.' },
  ],
  spearhand: [
    { name: 'Weighted', text: 'Your hits make the target heavy until its next turn: -10 ft speed, no jumping or fleeing, and your pulls move it 1 extra square.' },
    { name: 'Long Reach', text: 'Your spear reaches 2 squares. Once per round, you can strike an enemy that steps into that reach.' },
  ],
  hexblade: [
    { name: 'Fed', text: 'When you hit, the blade drinks: until the end of your next turn your attacks deal +1d6 and the blade reaches 2 squares.' },
    { name: 'Blood Price', text: 'When you miss, the blade drinks from you instead: lose 1d4 HP, plus 1 for every 4 levels. It never drops you below 1 HP.' },
    { name: 'Dormant', text: 'Outside combat the blade sleeps but senses danger: +2 Perception to notice hidden enemies.' },
    {
      name: 'Hunger',
      text: 'GM only. When the Hexblade dies, the blade brings them back instead of the usual revival, and its Hunger rises by 1 for good (every Hexblade starts at Hunger 1 from the scripted death). Higher Hunger: more damage when Fed, a higher blood price. At the highest Hunger it wakes outside combat and drains slowly; then the player decides to feed it, master it or break it.',
      gm: true,
    },
  ],
  duelist: [
    { name: 'Parrying Dagger', text: '+2 on parry rolls.' },
    { name: 'Flow', text: 'Each clean parry or dodge-counter gives 1 Flow (up to 3). Each Flow adds +1d6 to your ripostes.' },
    { name: 'Off-balance', text: 'A failed parry: you take the full hit, Flow drops to 0, and you have -2 AC and no reaction until your next turn.' },
  ],
}
