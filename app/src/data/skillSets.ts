// Started from the live page (index.html). The parity tests check the sets the
// backup page has stay unchanged; sets added since the cutover (Nameless King, Odi'ram, Xibalba, Izat'al) are the app's own.
/** One boss skill. dice "0", "-" or "none" is a utility skill (scene and sound, no damage). target s = one hero, a = area. */
export type SkillRow = { name: string; dice: string; range: number; target: 's' | 'a'; /** What it does, for the GM's Boss abilities list. */ text?: string }

/** Presets for the "Load a skill set..." menu on enemy sheets. */
export const SKILL_SETS: Record<string, SkillRow[]> = {
  "Aethelric: first encounter (3)": [
    {
      "name": "Warden's Cut",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero: a fast frostbitten slash. Can be parried (it is a sword, not a frost spell). On a miss: nothing."
    },
    {
      "name": "Rime Guard",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "No damage, no roll. Until the start of his next turn, the next melee hit against him deals half damage and frost creeps up that weapon: the attacker can’t parry until the end of their next turn. Ends after that one hit. Ranged attacks and spells ignore it."
    },
    {
      "name": "Chain Pull",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away. On a hit: damage, and the hero is dragged to a free square next to him (no save). Can be parried (the chain is a weapon): a beaten parry means no damage and no pull. If no square next to him is free, the hero is not pulled but still takes the damage."
    }
  ],
  "Aethelric: phase 1 (all)": [
    {
      "name": "Warden's Cut",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero: a fast frostbitten slash. Can be parried (it is a sword, not a frost spell). On a miss: nothing."
    },
    {
      "name": "Rime Guard",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "No damage, no roll. Until the start of his next turn, the next melee hit against him deals half damage and frost creeps up that weapon: the attacker can’t parry until the end of their next turn. Ends after that one hit. Ranged attacks and spells ignore it."
    },
    {
      "name": "Chain Pull",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away. On a hit: damage, and the hero is dragged to a free square next to him (no save). Can be parried (the chain is a weapon): a beaten parry means no damage and no pull. If no square next to him is free, the hero is not pulled but still takes the damage."
    },
    {
      "name": "Prison Bars",
      "dice": "3d8",
      "range": 3,
      "target": "a",
      "text": "No attack roll: ice bars burst from the floor in a 2x2 area up to 3 squares away. Each hero in it makes a DEX save against the attack total: beat it = half damage and not caged; fail = full damage and restrained until the end of their next turn (bars have AC 10, 50 HP; breaking them frees everyone inside). Dodge only."
    },
    {
      "name": "Frostbite Cleave",
      "dice": "4d10",
      "range": 2,
      "target": "a",
      "text": "No attack roll: a full circle hitting every hero within 2 squares of him. DEX save for half. Frost: dodge only, can’t be parried. Allies of his are not hit."
    },
    {
      "name": "Cold Snap",
      "dice": "0",
      "range": 3,
      "target": "s",
      "text": "No damage. One hero up to 3 squares away (he prefers the one who just dodged) makes a CON save: fail = slowed (half movement, can’t Dodge Roll) until the end of their next turn. Ends early if the hero takes fire damage."
    },
    {
      "name": "Warden's Toll",
      "dice": "0",
      "range": 8,
      "target": "a",
      "text": "No damage. Every hero within 8 squares makes a WIS save: fail = staggered until the end of their next turn (only 1 action instead of 2, no reactions). Can’t be dodged or parried (it is sound). Heroes behind full cover (an ice pillar between them and him) are unaffected."
    }
  ],
  "Aethelric: phase 2 (golden)": [
    {
      "name": "Golden Slash",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero: a fast slash trailing golden frost. Can be parried. On a hit the hero also can’t regain stamina at the start of their next turn."
    },
    {
      "name": "Shattering Wave",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "No attack roll: a ring of golden ice hits every hero within 4 squares. DEX save for half. Dodge only. Heroes behind an ice pillar (full cover) are spared."
    },
    {
      "name": "Frozen Verdict",
      "dice": "6d8",
      "range": 6,
      "target": "s",
      "text": "Telegraphed (uses his action, announce it): a gold glyph marks the square of one hero up to 6 squares away. At the start of his next turn a beam strikes that exact square: whoever stands on it takes the damage, no save. Moving off the square avoids it completely; Dodge Roll halves it as usual. Can’t be parried. If he is stunned or changes phase before it lands, it fizzles."
    },
    {
      "name": "Jailer's Embrace",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero. On a hit: damage and sealed in golden ice: restrained, can’t act except a STR check (action) to break out, takes no other damage while sealed. Breaks after 2 rounds, on that STR check, or when allies deal 100 damage to the ice (AC 10). Can be parried (it is his grab): a beaten parry means no damage and no cage."
    },
    {
      "name": "Absolute Zero",
      "dice": "8d8",
      "range": 8,
      "target": "a",
      "text": "His ultimate, once per fight. Telegraphed: he announces it and the arena starts to freeze; it lands at the start of his next turn. Every hero not in full cover (behind an ice pillar, out of his line of sight) takes the damage, CON save for half. Heroes in cover take nothing. Can’t be parried; Dodge Roll only halves it (there is nowhere to roll to). Fizzles if he is stunned or killed first."
    },
    {
      "name": "Last Gasp",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Once, when he first drops below 10% HP (out of turn, no action): every crack flares gold and every hero within 1 square is knocked prone (STR save resists). No damage. Then he fights on normally. If a single hit takes him from above 10% straight to 0, it never happens."
    }
  ],
  "Arachne: phase 1 (all)": [
    {
      "name": "Thread Needle",
      "dice": "2d6",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away. On a hit: damage, and the hero is pulled 2 squares toward her (STR save: not pulled, damage stays). Can be parried (a needle): a beaten parry means no damage and no pull."
    },
    {
      "name": "Silent Contract",
      "dice": "3d8",
      "range": 6,
      "target": "s",
      "text": "No attack roll. One hero up to 6 squares away chooses at once: hand her one potion or flask (it is gone, she drinks it and heals by its amount), or take the damage as psychic (WIS save for half). A hero with no potion must take the damage. Can’t be dodged or parried: it is a choice, not an attack."
    },
    {
      "name": "Web Snare",
      "dice": "0",
      "range": 4,
      "target": "a",
      "text": "No damage. A 2x2 sheet of gold thread falls up to 4 squares away. Each hero in it makes a DEX save: fail = restrained until the end of their next turn (a STR check as an action, or 30 fire damage to the web, frees them). Dodge Roll beaten = not caught. Can’t be parried."
    },
    {
      "name": "Quiet Venom",
      "dice": "1d6",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero: a painless prick. On a hit: damage, and CON save or slowed (half movement) until the end of their next turn. Can be parried (beaten parry = no damage, no venom)."
    },
    {
      "name": "Whisper Step",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "No damage. She vanishes and reappears on a free square behind any hero up to 6 squares away. Doesn’t provoke opportunity attacks. Her next attack this turn or next has advantage against that hero. Not possible if she is restrained."
    },
    {
      "name": "Seen It Coming",
      "dice": "0",
      "range": 20,
      "target": "s",
      "text": "Passive, her reaction: when a hero uses a Golden ability she can see, she collects a toll: she heals 100 HP and the hero loses 20 stamina. Once per round. Only Golden abilities, not normal or Crimson ones."
    },
    {
      "name": "The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rule, no damage: the change to her spider form (phase 2) at 0 HP in phase 1. Every web, snare and slow from phase 1 stays. She acts at once with phase 2 moves on her next turn."
    }
  ],
  "Arachne: phase 2 (all)": [
    {
      "name": "Fang Bite",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero. On a hit: damage, and CON save or slowed (half movement, no Dodge Roll) until the end of their next turn. Can be parried."
    },
    {
      "name": "Leg Skewer",
      "dice": "3d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: a spider leg spikes down. On a hit: damage. Can be parried (a parry beaten by 1-2 still takes half)."
    },
    {
      "name": "Web Cocoon",
      "dice": "0",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: wrapped: restrained, can’t act, can’t be targeted by her other attacks. Freed when an ally deals 50 slashing or fire damage to the cocoon (AC 10) or after 2 rounds. Can be dodged, not parried (it is silk, not a blow)."
    },
    {
      "name": "Venom Mist",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a 3-square cone in front of her. Each hero in it makes a CON save: fail = slowed and can’t drink flasks until the end of their next turn. No damage. Dodge only; holding your breath doesn’t help."
    },
    {
      "name": "Ceiling Drop",
      "dice": "4d8",
      "range": 2,
      "target": "a",
      "text": "Telegraphed: she climbs out of reach (can’t be targeted by melee, ranged at disadvantage) and her shadow marks a 2-square radius. At the start of her next turn she drops: everyone in the shadow takes the damage, DEX save for half, and is knocked prone on a fail. Leaving the shadow avoids it completely."
    },
    {
      "name": "Silk Net",
      "dice": "0",
      "range": 4,
      "target": "a",
      "text": "No damage. The floor within 4 squares of her becomes webbed for the rest of the fight: difficult terrain (each square costs 2). Fire burns a 2x2 patch of it away. She and her spiders move through it freely."
    },
    {
      "name": "Final Offer",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Once, below 25% HP. Every hero within 6 squares chooses: hand over one potion (she heals by its amount) or take the damage, DEX save for half. A hero without a potion must take it. Can’t be parried."
    }
  ],
  "Kernunos: phase 1 (all)": [
    {
      "name": "Antler Gore",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero: a lunging antler stab. Can be parried. On a hit: damage."
    },
    {
      "name": "Thorn Whip",
      "dice": "2d6",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: a thorny vine lash. Can be parried. On a hit: damage."
    },
    {
      "name": "Spore Burst",
      "dice": "1d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: poison pollen bursts within 3 squares of him. Each hero makes a CON save: fail = full damage and poisoned (disadvantage on attacks) until the end of their next turn; save = half, not poisoned. Dodge only."
    },
    {
      "name": "Entangling Roots",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: roots burst in a 2x2 area up to 3 squares away. DEX save: fail = full damage and restrained until the end of their next turn (STR check as an action to break free); save = half, not held. Dodge only."
    },
    {
      "name": "Stag Charge",
      "dice": "4d10",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: he lowers his antlers and points a straight 6-square line (announce it). Next turn he charges along it: every hero in the line takes the damage and is knocked prone, DEX save for half and not prone. He stops at the end of the line or at a wall. Stepping out of the line avoids it. Can’t be parried."
    },
    {
      "name": "Heartwood Bloom",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "No damage: he heals 3d8 (x10). Fire damage of 50+ on him before his next turn destroys the bloom and cancels the heal (it heals at the start of his next turn)."
    },
    {
      "name": "Thorned Hide",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Until the start of his next turn, any hero who hits him with a melee attack takes 1d6 piercing (no roll, no save). Ranged attacks and spells are safe."
    },
    {
      "name": "The Bloom Withers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rule, no damage: the change to his rotten phase (phase 2) at 0 HP. Roots and spore clouds already on the field stay."
    }
  ],
  "Kernunos: phase 2 (all)": [
    {
      "name": "Rot Claw",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: damage, and CON save or poisoned (disadvantage on attacks) until the end of their next turn. Can be parried."
    },
    {
      "name": "Maggot Swarm",
      "dice": "5d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a 2x2 area up to 3 squares away. DEX save for half. The swarm stays 1 round: anyone who starts their turn in it takes 1d6 more. Dodge only."
    },
    {
      "name": "Bursting Pods",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "No attack roll: pods burst one after another within 4 squares of him. CON save for half. Dodge only. Allies of his are spared."
    },
    {
      "name": "Rotting Embrace",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: damage and held in his ribcage: restrained, 1d8 at the start of each of their turns, until a STR check (action) or allies deal 100 damage to him. Can be dodged, not parried."
    },
    {
      "name": "Grave Roots",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "No attack roll: dead roots erupt in a straight 6-square line from him. DEX save for half; fail also knocks prone. Dodge only. Stepping out of the line before his turn doesn’t help: it is not telegraphed."
    },
    {
      "name": "Vomit of Decay",
      "dice": "6d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a 3-square cone of rotten sludge. CON save for half; fail also means no healing (flasks and abilities) until the end of their next turn. Dodge only."
    },
    {
      "name": "Plague Bloom",
      "dice": "8d6",
      "range": 10,
      "target": "a",
      "text": "His ultimate, once per fight. Telegraphed: pods swell across the arena (announce it); next turn they burst. Every hero within 10 squares takes the damage, CON save for half. Can’t be parried. Fire damage of 150+ on him before it lands burns the pods and cancels it."
    }
  ],
  "Kernunos: phase 3 (rooted)": [
    {
      "name": "Spring Returns",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Phase 3 rule. At about 10% HP he roots himself in place (can’t move, can’t be pushed) and drains the forest: he heals back to about 20-25% HP over his next turns using Withering Drain. Destroying the roots (or the forest’s heart) stops it."
    },
    {
      "name": "Withering Drain",
      "dice": "2d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: roots drain every hero on the field. CON save for half. He heals by the total damage dealt. Heroes standing on stone, or not touching the ground, are untouched."
    },
    {
      "name": "Rot Claw",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: damage, and CON save or poisoned (disadvantage on attacks) until the end of their next turn. Can be parried."
    },
    {
      "name": "Maggot Swarm",
      "dice": "5d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a 2x2 area up to 3 squares away. DEX save for half. The swarm stays 1 round: anyone who starts their turn in it takes 1d6 more. Dodge only."
    },
    {
      "name": "Bursting Pods",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "No attack roll: pods burst one after another within 4 squares of him. CON save for half. Dodge only. Allies of his are spared."
    },
    {
      "name": "Rotting Embrace",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: damage and held in his ribcage: restrained, 1d8 at the start of each of their turns, until a STR check (action) or allies deal 100 damage to him. Can be dodged, not parried."
    },
    {
      "name": "Grave Roots",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "No attack roll: dead roots erupt in a straight 6-square line from him. DEX save for half; fail also knocks prone. Dodge only. Stepping out of the line before his turn doesn’t help: it is not telegraphed."
    },
    {
      "name": "Vomit of Decay",
      "dice": "6d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a 3-square cone of rotten sludge. CON save for half; fail also means no healing (flasks and abilities) until the end of their next turn. Dodge only."
    },
    {
      "name": "Plague Bloom",
      "dice": "8d6",
      "range": 10,
      "target": "a",
      "text": "His ultimate, once per fight. Telegraphed: pods swell across the arena (announce it); next turn they burst. Every hero within 10 squares takes the damage, CON save for half. Can’t be parried. Fire damage of 150+ on him before it lands burns the pods and cancels it."
    }
  ],
  "The Jailer (halfway)": [
    {
      "name": "Spine Lash",
      "dice": "1d6",
      "range": 3,
      "target": "s",
      "text": "His light attack: the spine whip cracks at one hero up to 3 squares away. Can be parried."
    },
    {
      "name": "Iron Knuckle",
      "dice": "2d6",
      "range": 1,
      "target": "s",
      "text": "His heavy attack: a shackled fist hammers one adjacent hero. STR save or knocked prone. Can be parried, but a parry still takes half."
    },
    {
      "name": "Shackle Snare",
      "dice": "1d6",
      "range": 4,
      "target": "s",
      "text": "The whip coils around a hero up to 4 squares away: DEX save or pulled to a square next to him and restrained until the end of their next turn (STR check to break free as an action). Sets up Into the Cage."
    },
    {
      "name": "Into the Cage",
      "dice": "1d6",
      "range": 1,
      "target": "s",
      "text": "He stuffs a restrained or prone hero next to him into his belly cage (STR save to resist). Caged: 1d6 at the start of each of their turns, can't act except a STR check to escape; allies free them by dealing 150 damage to him in one round. One prisoner at a time. If he doesn't have a target, roll again."
    },
    {
      "name": "Choir of the Caged",
      "dice": "1d6",
      "range": 3,
      "target": "a",
      "text": "The skulls in his cage scream: every hero within 3 squares takes the damage and makes a WIS save or is frightened of him until the end of their next turn (disadvantage on attacks against him, can't move closer). Can't be parried."
    },
    {
      "name": "Execution Sweep",
      "dice": "2d8",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: he spends his turn winding the whip back (announce it), then next turn sweeps a full circle 3 squares around him. DEX save for half, or Dodge. Can't be parried. He never uses it twice in a row."
    },
    {
      "name": "Warden's Keys",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Halfway boss of Calden's Keep, for a level 2 party: HP 1,500, AC 15, size 2x2. Roll a d6 for his move (1-6 in this order; a 6 right after a 6 is a Spine Lash). He carries the Keep's keys: killing him opens the cells, and the captive heroes inside (Odrig, Yorik, Otto, Yerana) can be freed."
    }
  ],
  "Remade Triumvirate (halfway)": [
    {
      "name": "Sickle Hook",
      "dice": "1d8",
      "range": 1,
      "target": "s",
      "text": "His light attack: the ghoul fused to his chest hooks one adjacent hero with its sickle. Can be parried."
    },
    {
      "name": "Leg Impale",
      "dice": "1d8",
      "range": 2,
      "target": "s",
      "text": "A spiked spider leg stabs one hero up to 2 squares away like a spear. Can be parried."
    },
    {
      "name": "Greatblade Cleave",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "His heavy attack: the greatsword sweeps an arc in front of him, hitting up to 2 heroes within 2 squares. Can be parried (a parry still takes half)."
    },
    {
      "name": "Skitter Charge",
      "dice": "1d8",
      "range": 6,
      "target": "a",
      "text": "He charges up to 6 squares in a straight line through the party: every hero in the path takes the damage and makes a STR save or is knocked prone. Dodge to avoid it."
    },
    {
      "name": "Stone Maul Crash",
      "dice": "3d6",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: he raises the stone maul for a turn (announce it and mark the target square), then crashes it down: everyone within 1 square of the mark takes the damage, DEX save for half. Can't be parried. The squares become rubble (difficult terrain). Never twice in a row."
    },
    {
      "name": "Three in One",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Halfway boss of Arachne's region, fought with the Dark Elf High Priestess, for a level 3-4 party: HP 1,500, AC 16, size 2x2. Roll a d6 (1-5 in this order; 6 = Sickle Hook). He gets one action per turn, two after her Webcrown Blessing. If the Priestess dies first, Widowed Fury: +1d6 on all his hits and +2 squares of movement for the rest of the fight."
    }
  ],
  "Dark Elf High Priestess (halfway)": [
    {
      "name": "Venom Dagger",
      "dice": "1d6",
      "range": 1,
      "target": "s",
      "text": "Her light attack: a poisoned slash at one adjacent hero. CON save or poisoned until the end of their next turn (disadvantage on attacks). Can be parried."
    },
    {
      "name": "Blinding Silk",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "Her staff sprays silk at one hero up to 6 squares away: DEX save or restrained until the end of their next turn (STR check as an action to tear free). Can't be parried."
    },
    {
      "name": "Webcrown Blessing",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "She empowers the Triumvirate: on his next turn he takes two actions instead of one (roll twice)."
    },
    {
      "name": "Mend the Remade",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "Silk stitches his wounds: the Triumvirate regains 3d8 x10 HP (about 135). Only if he's below max HP; otherwise she uses Webcrown Blessing."
    },
    {
      "name": "Silk Step",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "She melts into the webs and reappears up to 6 squares away, out of reach. She uses it whenever a hero ends their turn next to her; otherwise treat this roll as Venom Dagger."
    },
    {
      "name": "Bound by Silk",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Fights beside the Remade Triumvirate: HP 500, AC 13, size 1x1, her own turn in initiative. She stays behind him. Roll a d6: 1 Venom Dagger, 2 Blinding Silk, 3-4 Webcrown Blessing, 5 Mend the Remade, 6 Silk Step. If the Triumvirate dies first, she flees into the tunnels: catch her within 3 rounds or she escapes to warn Arachne."
    }
  ],
  "The Corrupted Idol (halfway)": [
    {
      "name": "Bone Scythe",
      "dice": "1d10",
      "range": 2,
      "target": "s",
      "text": "Her light attack: the beast's bone blade slashes one hero up to 2 squares away. Can be parried."
    },
    {
      "name": "Marrow Trample",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Her heavy attack: the skeletal beast stamps on one adjacent hero. STR save or knocked prone. Can't be parried (it's a whole leg), dodge only."
    },
    {
      "name": "Mudra of Rot",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "The statue's hands form sacred gestures and vivid green rot spills out: every hero within 3 squares takes the damage, CON save or Rotting until the end of their next turn (healing and flasks do nothing). Can't be parried."
    },
    {
      "name": "Flesh Tendrils",
      "dice": "1d10",
      "range": 3,
      "target": "a",
      "text": "Red tendrils lash out at up to 2 heroes within 3 squares: STR save or pulled next to her and restrained until the end of their next turn. Can be dodged, not parried."
    },
    {
      "name": "Threefold Gaze",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "Her three faces turn on the party: every hero who can see her within 6 squares makes a WIS save or kneels in worship, losing their movement and reaction until the end of their next turn. Looking away (disadvantage on attacks against her) avoids it."
    },
    {
      "name": "Idol's Communion",
      "dice": "3d8",
      "range": 4,
      "target": "a",
      "text": "Telegraphed: the statue raises all four arms for a turn (announce it), then rot-light bursts 4 squares around her: CON save for half. She regains 100 HP for each hero who failed. Can't be parried. Never twice in a row."
    },
    {
      "name": "False Goddess",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Halfway boss of Kernunos's forest, for a level 5 party: HP 2,200, AC 16, size 3x3. Roll a d6 (1-6 in this order; a 6 right after a 6 is Bone Scythe). She is one creature: a headless beast with the idol statue grown where its head should be. Three faces: she can't be flanked or surprised, and Sneak Attack never gets its extra dice on her. At half HP, 2 Awakened Blood crawl out of her flesh (elites, HP 300 each). Her shrine is the first sign of the forest's rot."
    }
  ],
  "Alithrax (halfway)": [
    {
      "name": "Rending Claw",
      "dice": "1d10",
      "range": 1,
      "target": "s",
      "text": "His light attack: a bony claw rakes one adjacent hero. Can be parried."
    },
    {
      "name": "Tendril Maw",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "His heavy attack: the lion-like jaws bite one hero up to 2 squares away and the tendril beard holds on: STR save or grappled, taking 1d10 at the start of each of their turns until they break free (STR check as an action) or he takes 200 damage. Can be parried (a parry still takes half)."
    },
    {
      "name": "Tattered Gale",
      "dice": "1d10",
      "range": 4,
      "target": "a",
      "text": "His wings beat a gust in a 4-square cone: everyone in it takes the damage and makes a STR save or is pushed 3 squares away. Pushed off a ledge on the peak = fall damage. Can't be parried or dodged, only resisted."
    },
    {
      "name": "Rot Breath",
      "dice": "4d6",
      "range": 5,
      "target": "a",
      "text": "Telegraphed: he rears back with a wet rattling breath for a turn (announce it), then spews black bile in a 5-square cone: CON save for half. Anyone who failed is Corroded: -1 AC for the rest of the fight (stacks up to -2). Can't be parried. Never twice in a row."
    },
    {
      "name": "Storm Dive",
      "dice": "2d10",
      "range": 8,
      "target": "a",
      "text": "He takes off into the storm (melee can't reach him; his shadow marks a square up to 8 squares away), then dives onto it at the start of his next turn: everyone within 1 square of the mark takes the damage, DEX save for half, and is knocked prone on a fail. Only while he can still fly."
    },
    {
      "name": "Writhing Mane",
      "dice": "1d8",
      "range": 1,
      "target": "a",
      "text": "The tendrils along his spine lash every hero next to him. Also a reaction once per round when a hero hits him in melee: that hero takes the damage (no roll on his turn)."
    },
    {
      "name": "Rotting Wings",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Halfway boss of the Sky region, for a level 6-7 party: HP 2,600, AC 17, size 3x3. Once a dragon, now something the rot in these mountains (Aldrich's) has eaten; black tendrils trail wherever he lands. Roll a d6 (1-6 in this order; a 4 right after a 4 is Rending Claw). At half HP his wings tear through: he can't fly any more, so Storm Dive becomes Tattered Gale, and he gets +1d6 on Rending Claw and Tendril Maw."
    }
  ],
  "The Great Yokai (halfway)": [
    {
      "name": "Fan of Bones",
      "dice": "2d6",
      "range": 1,
      "target": "s",
      "text": "His light attack: a bone fan snaps open and slashes one adjacent hero. With six arms he strikes again at another adjacent hero if there is one (roll damage twice). Can be parried."
    },
    {
      "name": "Lantern Sweep",
      "dice": "3d8",
      "range": 2,
      "target": "a",
      "text": "His heavy attack: the lantern pole sweeps everyone within 2 squares in front of him. STR save or knocked prone. A parry still takes half."
    },
    {
      "name": "Soul Harvest",
      "dice": "0",
      "range": 4,
      "target": "s",
      "text": "He pulls the soul of one hero within 4 squares into a lantern: WIS save or lose 20% of their max HP until that lantern is broken. He has 4 lanterns on his pole (AC 12, 100 HP each; hitting one is a normal attack). Breaking a lantern returns that soul. Each full lantern heals him 50 HP at the start of his turn."
    },
    {
      "name": "Funeral Bell",
      "dice": "2d6",
      "range": 6,
      "target": "a",
      "text": "He rings the bell: every hero within 6 squares takes the damage (psychic) and makes a WIS save or loses their reaction and can't drink a flask until the end of their next turn. Can't be parried or dodged."
    },
    {
      "name": "Wandering Wisps",
      "dice": "2d6",
      "range": 8,
      "target": "a",
      "text": "He lets three trapped souls loose: up to 3 different heroes within 8 squares are each hit (DEX save for half). If a lantern holds a hero's soul, that hero is hit first and takes the full damage."
    },
    {
      "name": "Final Toll",
      "dice": "5d6",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: he sheathes the red katana and goes still for a turn (announce it). Next turn he dashes up to 6 squares in a straight line, cutting everyone in the path: DEX save for half. Can't be parried. Never twice in a row."
    },
    {
      "name": "Collector of Souls",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Izat'al's right hand, halfway boss of her kingdom, for a level 9-10 party: HP 3,400, AC 18, size 2x2. He collects the souls the Golden Wave drains for her. Roll a d6 (1-6 in this order; a 6 right after a 6 is Fan of Bones). When he dies, every lantern breaks: stolen souls return and each hero heals 10% of their max HP."
    }
  ],
  "Azael: phase 1 (halfway)": [
    {
      "name": "Reaper's Arc",
      "dice": "1d8",
      "range": 2,
      "target": "s",
      "text": "His light attack: a fast crescent of the bone scythe at one hero up to 2 squares away. Can be parried."
    },
    {
      "name": "Skull Hook",
      "dice": "1d8",
      "range": 3,
      "target": "s",
      "text": "The scythe's hook catches a hero up to 3 squares away: STR save or pulled next to him (his next attack on them this turn has advantage). Can be parried."
    },
    {
      "name": "Wing Dash",
      "dice": "1d8",
      "range": 8,
      "target": "s",
      "text": "One wing beat and he's across the field: moves up to 8 squares without provoking, then strikes the hero he lands next to. Can be parried. He loves to dash onto the backline."
    },
    {
      "name": "Hellchain Bind",
      "dice": "1d6",
      "range": 2,
      "target": "a",
      "text": "The chains on his armour lash everyone within 2 squares: DEX save or restrained until the end of their next turn (STR check as an action to break free)."
    },
    {
      "name": "Harvest Cleave",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "His heavy attack: a full horizontal cleave hitting every hero within 2 squares in front of him. Can be parried (a parry still takes half). Uses both his actions this turn."
    },
    {
      "name": "Black Candles",
      "dice": "1d6",
      "range": 4,
      "target": "a",
      "text": "The black candles of his altar flare: a 2x2 area up to 4 squares away bursts into hellfire for 2 rounds. Anyone starting their turn in it takes the damage (DEX save for half)."
    },
    {
      "name": "Demon's Pace",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Halfway boss of Odi'ram's lands, for a level 8 party: phase 1 HP 1,600, AC 18, size 1x1 (barely bigger than the heroes, but devastating). Two actions per turn like the players: roll a d6 twice (1-6 in this order; Harvest Cleave takes both). He never stays still: after every action he may move up to 3 squares. At 0 HP he tears off his chains: phase 2 (Unchained Azael)."
    }
  ],
  "Azael: phase 2 (unchained)": [
    {
      "name": "Reaper's Arc",
      "dice": "1d8",
      "range": 2,
      "target": "s",
      "text": "His light attack, now trailing embers: one hero up to 2 squares away. Can be parried."
    },
    {
      "name": "Skull Hook",
      "dice": "1d8",
      "range": 3,
      "target": "s",
      "text": "The hook pulls a hero up to 3 squares away next to him: STR save. Can be parried."
    },
    {
      "name": "Wing Dash",
      "dice": "1d8",
      "range": 10,
      "target": "s",
      "text": "Now up to 10 squares without provoking, leaving a line of fire on the squares he crossed (1d6 to anyone who enters it this round)."
    },
    {
      "name": "Infernal Reap",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "His heavy attack: the scythe wreathed in hellfire. The hero hit burns for 1d6 at the start of their next 2 turns. A parry still takes half and still burns."
    },
    {
      "name": "Ruin Wings",
      "dice": "2d6",
      "range": 2,
      "target": "a",
      "text": "His wings snap open: every hero within 2 squares takes fire damage and is pushed 2 squares away (STR save: no push, half damage)."
    },
    {
      "name": "Hellfire Dive",
      "dice": "4d6",
      "range": 8,
      "target": "a",
      "text": "Telegraphed: he takes off (out of melee reach) and a burning circle marks a square up to 8 squares away; next turn he dives onto it: everyone within 2 squares of it takes the damage, DEX save for half. Can't be parried. Uses both his actions. Never twice in a row."
    },
    {
      "name": "Unchained Azael",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2: HP 1,200, AC 17. Still two actions per turn (roll a d6 twice: 1-6 in this order; Hellfire Dive takes both). His body cracks with hellfire: any hero who hits him in melee takes 1d6 fire (once per hero per round). Still moves up to 3 squares after every action."
    }
  ],
  "Yesod, the Infinite Witness (void 1)": [
    {
      "name": "Witness Gaze",
      "dice": "2d6",
      "range": 10,
      "target": "s",
      "text": "His light attack: one of his floating eyes fires a thin beam at a hero up to 10 squares away. Fired from an eye, so every living eye is a possible source; can't be parried."
    },
    {
      "name": "Tendril Grasp",
      "dice": "2d10",
      "range": 3,
      "target": "s",
      "text": "His heavy attack: tendrils burst from the floor under a hero within 3 squares: STR save or restrained until the end of their next turn. Dodge to avoid it."
    },
    {
      "name": "Thousand Eyes Open",
      "dice": "1d8",
      "range": 10,
      "target": "a",
      "text": "Every living eye fires at once: roll 1d8 for each living eye and spread the hits across the party as he likes (DEX save for half each). The more eyes the party has broken, the weaker this gets."
    },
    {
      "name": "Unblinking Mark",
      "dice": "0",
      "range": 10,
      "target": "s",
      "text": "He brands one hero with an eye sigil: until an eye is broken, all his attacks against that hero have advantage, and the mark can't be hidden or dodged out of."
    },
    {
      "name": "Monolith Stare",
      "dice": "2d8",
      "range": 5,
      "target": "a",
      "text": "The eye-covered slabs behind him glare in a 5-square cone: WIS save or frightened until the end of their next turn (can't move closer, disadvantage on attacks), half damage on a save."
    },
    {
      "name": "All-Seeing Judgement",
      "dice": "5d6",
      "range": 20,
      "target": "a",
      "text": "Telegraphed: he raises every arm and the eyes start to glow (announce it). Next turn, blinding light hits every hero that any living eye can see: WIS save for half. Breaking line of sight (behind pillars, or the eyes that see you broken) avoids it completely. Never twice in a row."
    },
    {
      "name": "Infinite Witness",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. First of the void's three experiments, for a level 9 party: HP 2,400, AC 16, size 3x3, never moves. Izat'al's first attempt: a thing that sees and remembers everything. Nothing can hide from him (no stealth, invisibility or hiding in his room). 6 eyes float around the arena (AC 14, 120 HP each): while any eye lives, his body takes half damage. One action per turn: roll a d6 (1-6 in this order; a 6 right after a 6 is Witness Gaze)."
    }
  ],
  "Tiferet, the Perfect Balance (void 2)": [
    {
      "name": "Reaching Hands",
      "dice": "2d6",
      "range": 12,
      "target": "s",
      "text": "Its light attack: one long arm reaches across the room to strike any hero within 12 squares. Can be parried."
    },
    {
      "name": "Weighing Grasp",
      "dice": "2d10",
      "range": 12,
      "target": "s",
      "text": "Its heavy attack: several arms seize a hero anywhere in the room and lift them: STR save or restrained in the air until the end of their next turn (they can still attack the arms holding them). A parry still takes half."
    },
    {
      "name": "Equalize",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "It balances the party: the hero with the highest HP percentage and the one with the lowest both go to the average of the two percentages. Generous to the weak, cruel to the strong. Can't be resisted."
    },
    {
      "name": "Rebalance",
      "dice": "2d8",
      "range": 20,
      "target": "a",
      "text": "Its two halves even out: the half with less HP heals up to match the other, and a shockwave hits every hero (CON save for half). If its halves are already within 200 HP of each other, it does nothing but the shockwave."
    },
    {
      "name": "Eyestalk Volley",
      "dice": "1d10",
      "range": 8,
      "target": "a",
      "text": "Dozens of eyestalks fire in every direction: every hero within 8 squares takes the damage, DEX save for half."
    },
    {
      "name": "Perfect Judgement",
      "dice": "5d6",
      "range": 20,
      "target": "a",
      "text": "Telegraphed: its two banners rise (announce it). Next turn they crash down on the left and right halves of the room: everyone outside the narrow center line (the 1-square-wide line through its body) takes the damage, DEX save for half. Standing in the center line is completely safe. Never twice in a row."
    },
    {
      "name": "Perfect Balance",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Second of the void's experiments, for a level 9 party: HP 3,200 as two halves of 1,600 (make two enemy sheets, Left and Right, on the same 3x3 mini). Damage goes to the half on the attacker's side of its center line (attackers on the line choose). It dies when both halves reach 0. Rooted, but its arms reach the whole room. AC 17. Counterweight: once per round, when a single hit deals 150+ damage, it strikes that hero back for 2d6. If one half is 400+ HP lower at the start of its turn, it uses Rebalance instead of rolling. Otherwise roll a d6 (1-6 in this order)."
    }
  ],
  "Zarael: phase 1 (masked, void 3)": [
    {
      "name": "Crescent Axe",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Her light attack: a heavy arc of the huge axe at one hero up to 2 squares away. Can be parried (a parry still takes half; it's a huge axe)."
    },
    {
      "name": "Regal Sweep",
      "dice": "3d8",
      "range": 2,
      "target": "a",
      "text": "Her heavy attack: the axe spins in a full circle, hitting every hero within 2 squares: STR save or knocked prone. A parry still takes half."
    },
    {
      "name": "Wingbeat",
      "dice": "1d10",
      "range": 8,
      "target": "a",
      "text": "Her wings beat once: everyone within 2 squares takes the damage and is pushed 2 squares, then she lands anywhere up to 8 squares away without provoking."
    },
    {
      "name": "Tendril Thorns",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "Clawed tendrils lash up to 2 heroes within 3 squares. Can be dodged, not parried."
    },
    {
      "name": "Queen's Decree",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "She commands: every hero within 6 squares makes a WIS save or must use their next movement to move away from her. A queen is not approached without leave."
    },
    {
      "name": "Executioner's Fall",
      "dice": "5d6",
      "range": 4,
      "target": "a",
      "text": "Telegraphed: she raises the axe and marks a 4-square line in front of her (announce it). Next turn it falls on everyone in the line: DEX save for half. Can't be parried. Never twice in a row."
    },
    {
      "name": "The Masked Queen",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Last of the void's experiments, closest to Xibalba, for a level 9 party. Phase 1 (masked): HP 2,200, AC 18, size 3x3, flies. Izat'al's attempt at a queen to rule the void; she lost her face, and herself. One action per turn: roll a d6 (1-6 in this order). At 0 HP the mask breaks: phase 2 (The Faceless Queen)."
    }
  ],
  "Zarael: phase 2 (faceless)": [
    {
      "name": "Crescent Axe",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Her light attack, now wild and fast: one hero up to 2 squares away. A parry still takes half."
    },
    {
      "name": "Regal Sweep",
      "dice": "3d8",
      "range": 2,
      "target": "a",
      "text": "Her heavy attack: a full-circle sweep on every hero within 2 squares, STR save or prone. A parry still takes half."
    },
    {
      "name": "Tendril Thorns",
      "dice": "2d6",
      "range": 4,
      "target": "a",
      "text": "The tendrils go frenzied: up to 3 heroes within 4 squares. Can be dodged, not parried."
    },
    {
      "name": "Hollow Scream",
      "dice": "2d8",
      "range": 4,
      "target": "a",
      "text": "The hole where her face was screams: every hero within 4 squares takes psychic damage and makes a WIS save or is frightened until the end of their next turn. Can't be parried or dodged."
    },
    {
      "name": "Void Hunger",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "The void opens behind her: every hero within 6 squares is pulled 2 squares toward her (STR save to resist). The first taste of what waits beyond her."
    },
    {
      "name": "Faceless Maw",
      "dice": "5d6",
      "range": 1,
      "target": "s",
      "text": "Telegraphed: her tendrils seize one adjacent hero (STR save; on a fail they're restrained, announce it). On her next turn, if they haven't broken free (STR check as an action, or allies deal 200 damage to her), the maw devours them for the damage and she heals half of it. Uses both her actions. Never twice in a row."
    },
    {
      "name": "The Faceless Queen",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2 (faceless): HP 1,800, AC 17. Two actions per turn: roll a d6 twice (1-6 in this order; Faceless Maw takes both). She can still fly. The party should leave this fight knowing something worse is ahead."
    }
  ],
  "Desidia: phase 1 (slumber, secret)": [
    {
      "name": "Sleeper's Grasp",
      "dice": "1d8",
      "range": 4,
      "target": "s",
      "text": "Her light attack: pale hands reach out of the purple smoke for one hero up to 4 squares away. Attack roll; on a hit, damage and +1 Slumber. Can be parried (beaten parry: no damage, no Slumber)."
    },
    {
      "name": "Shackle Chains",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Her heavy attack: the throne's chains lash out at one hero up to 3 squares away. Attack roll; on a hit, damage and DEX save or pulled 2 squares toward her and restrained until the end of their next turn (STR check as an action to break free). Can be parried, but a parry still takes half."
    },
    {
      "name": "Lullaby",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "No damage, no attack roll. She hums: every hero within 6 squares makes a WIS save against 10 + her attack bonus, or gains +1 Slumber. A hero who moved 2 or more squares on their last turn, or holds a lit torch, has advantage. Can't be dodged or parried (it's sound); covering your ears doesn't help."
    },
    {
      "name": "Velvet Smoke",
      "dice": "2d6",
      "range": 5,
      "target": "a",
      "text": "No attack roll: a 2x2 cloud of purple smoke up to 5 squares away. CON save for half. The cloud stays 2 rounds: a hero who starts their turn in it gains +1 Slumber (no save). Fire damage on the cloud or a lit torch waved through it (an action) clears it. Dodge only."
    },
    {
      "name": "Sweet Dreams",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "No damage. She blows a kiss at the hero with the most Slumber within 6 squares (at least 1). WIS save against 10 + her attack bonus: fail = they fall asleep now, whatever their Slumber count. Can't be dodged or parried. If no hero has Slumber, roll again."
    },
    {
      "name": "Feast of Dreams",
      "dice": "2d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll, no save: every hero who is asleep takes the damage as psychic and she heals by the total. They stay asleep. If no hero is asleep, she uses Sleeper's Grasp instead."
    },
    {
      "name": "Throne of Sleepers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Secret boss of the frozen region, for a level 3 party: HP 1,800, AC 15, size 3x3, never leaves her throne (can't be pushed, pulled or knocked prone). Roll a d6 (1-6 in this order). SLUMBER: each stack lowers that hero's stamina regen by 5. At 3 stacks they fall asleep: prone, lose their turns, can't dodge or parry, and attacks against them have advantage. A sleeper wakes (Slumber back to 0) when they take damage, or when an adjacent ally spends an action to shake them. A flask or a lit torch held at the start of their turn removes 1 stack. Holding a torch takes a hand (no shield, no two-handed weapon). FOUR SHACKLED SLEEPERS are chained to her throne (AC 12, 50 HP each): breaking one's chain wakes it screaming, and every hero within 3 squares loses all Slumber. At 0 HP she wakes: phase 2."
    }
  ],
  "Desidia: phase 2 (nightmare)": [
    {
      "name": "Rude Awakening",
      "dice": "1d10",
      "range": 2,
      "target": "s",
      "text": "Her light attack: claws rake one hero up to 2 squares away. Attack roll. Against a sleeping hero it always hits and is a critical hit (dice doubled), and wakes them. Can be parried by an awake hero."
    },
    {
      "name": "Chain Flail",
      "dice": "2d10",
      "range": 2,
      "target": "a",
      "text": "Her heavy attack, no attack roll: she whirls her broken shackles around her, hitting every hero within 2 squares. DEX save for half; fail also knocks prone. Dodge only. Sleeping heroes get no save."
    },
    {
      "name": "Night Terror",
      "dice": "2d6",
      "range": 6,
      "target": "s",
      "text": "No attack roll: one hero up to 6 squares away sees their worst dream. WIS save against 10 + her attack bonus: fail = psychic damage, frightened of her until the end of their next turn (disadvantage on attacks against her, can't move closer) and +1 Slumber; save = half damage, nothing else. A lit torch gives advantage. Can't be dodged or parried."
    },
    {
      "name": "Dream Eater's Kiss",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero. On a hit, damage and she heals half of it; against a sleeping hero she heals all of it (they still wake from the damage). Can be parried by an awake hero."
    },
    {
      "name": "Endless Night",
      "dice": "2d6",
      "range": 20,
      "target": "a",
      "text": "Telegraphed: she raises her arms and the light dims (announce it). At the start of her next turn every hero who isn't holding a lit torch or standing next to one takes the damage as cold and gains +2 Slumber, CON save for half damage (the Slumber stays). Heroes in the light are untouched. Fizzles if she is stunned or killed first. Never twice in a row."
    },
    {
      "name": "Summon Nightmare",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No damage, no roll: she calls one of the three horrors of her dream, in this order, the first time her HP drops below each mark: 75% the Dream Eater, 50% the Bogeyman, 25% the Nightmare Aberration. Each crawls out of the smoke on a free square within 3 squares of her and acts right after her. They are mini-bosses: stronger than elites, weaker than a boss (their own sheets come with the minions). A big hit that skips a mark calls every horror it passed. If this move is rolled while no mark is due, she uses Night Terror instead. Horrors attack sleeping heroes first."
    },
    {
      "name": "The Nightmare Wakes",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2: HP 1,200, AC 16, size 2x2. Nobody is supposed to stay awake in her dream: when the heroes break her, she panics for the first time in ages, rises from the throne and moves 6 squares a turn. Roll a d6 (1-6 in this order). Slumber rules from phase 1 carry over, and a sleeping hero now also takes 1d8 psychic at the start of each of their skipped turns (that damage doesn't wake them). Her three horrors arrive at 75%, 50% and 25% HP (Summon Nightmare): killing each one before the next arrives keeps the fight under control. When she dies, every horror fades and every hero wakes."
    }
  ],
  "Iniha Yunvra: phase 1 (drow queen, secret)": [
    {
      "name": "Venom Lash",
      "dice": "1d8",
      "range": 3,
      "target": "s",
      "text": "Her light attack: a whip of poisoned silk cracks at one hero up to 3 squares away. Attack roll; on a hit, damage and CON save or poisoned (disadvantage on attacks) until the end of their next turn. Can be parried (beaten parry: no damage, no poison)."
    },
    {
      "name": "Spider Spines",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "Her heavy attack: the spider legs on her back stab one adjacent hero. Attack roll. Can be parried, but a parry still takes half."
    },
    {
      "name": "Silk Puppet",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "No damage. Invisible threads seize one hero up to 6 squares away: DEX save against 10 + her attack bonus or strung. At the start of their next turn she moves them up to 3 squares (no free attacks against them) and they make one light attack against an ally of her choice in reach (if none, they just move). Then the strings fall. A STR check as an action, or an ally cutting the threads (an action, adjacent), frees them before that. Can't be parried."
    },
    {
      "name": "Drow Darkness",
      "dice": "0",
      "range": 8,
      "target": "a",
      "text": "No damage. A 3x3 cloud of magical darkness up to 8 squares away, for 2 rounds. Heroes inside are blinded (disadvantage on attacks, attacks against them have advantage) and can't see out; torches and fire don't light it. She and her spiders see through it normally and have advantage attacking anyone inside. Only one cloud at a time: a new one replaces the old."
    },
    {
      "name": "Brood Call",
      "dice": "0",
      "range": 4,
      "target": "a",
      "text": "No damage. 3 spiderlings scuttle out within 4 squares of her (AC 12, 60 HP each, speed 6, climb walls, bite 1d4 + CON save or poisoned). They act right after her. Never more than 6 at once: with 6 up, she uses Queen's Venom Bolt instead."
    },
    {
      "name": "Queen's Venom Bolt",
      "dice": "2d6",
      "range": 10,
      "target": "s",
      "text": "Attack roll vs one hero up to 10 squares away: a bolt of green-black venom. On a hit, damage and the hero can't regain HP (flasks or abilities) until the end of their next turn. Dodge only (a spell, it can't be parried)."
    },
    {
      "name": "Court of the Drow",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Secret boss of Arachne's caves, for a level 4 party: HP 2,000, AC 16, size 1x1, speed 6. She climbs walls and ceilings at full speed and can fight from them (melee heroes can't reach her up there unless they climb or she comes down). Roll a d6 (1-6 in this order). Her guardian, the Bulette, waits in the tunnel before her throne cavern. At 0 HP she tears herself open and becomes the Brood Mother: phase 2."
    }
  ],
  "Iniha Yunvra: phase 2 (brood mother)": [
    {
      "name": "Brood Fangs",
      "dice": "1d10",
      "range": 1,
      "target": "s",
      "text": "Her light attack: the giant spider bites one adjacent hero. Attack roll; on a hit, damage and CON save or poisoned until the end of their next turn. Can be parried."
    },
    {
      "name": "Brood Impale",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Her heavy attack: a leg spikes down on one hero up to 2 squares away. Attack roll. Can be parried, but a parry still takes half."
    },
    {
      "name": "Web Spray",
      "dice": "0",
      "range": 4,
      "target": "a",
      "text": "No damage, no attack roll: a 4-square cone of web. Each hero in it makes a DEX save against 10 + her attack bonus or is restrained until they break free (STR check as an action, or 30 fire or slashing damage to the web from an ally). Dodge Roll beaten = not caught. Can't be parried."
    },
    {
      "name": "Pounce",
      "dice": "2d8",
      "range": 6,
      "target": "s",
      "text": "No attack roll: she leaps up to 6 squares onto one hero (doesn't provoke free attacks). DEX save: fail = full damage and knocked prone; save = half, not prone. Dodge only. Size 3+ enemies she can't pounce on."
    },
    {
      "name": "Feeding Frenzy",
      "dice": "3d8",
      "range": 1,
      "target": "s",
      "text": "Only against an adjacent hero who is restrained or prone: attack roll with advantage. On a hit, damage and she heals half of it. A restrained hero can't Dodge Roll; a prone one can only parry. If no adjacent hero is restrained or prone, she uses Brood Fangs instead."
    },
    {
      "name": "Hatch",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No damage. 4 spiderlings burst from the egg clutch (same stats as in phase 1), on free squares next to the clutch. Never more than 6 at once. If the clutch is destroyed, she uses Web Spray instead."
    },
    {
      "name": "The Egg Clutch",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2: HP 1,800, AC 15, size 3x3, speed 8, climbs walls. Roll a d6 (1-6 in this order). Her egg clutch sits beside her (AC 10, 300 HP, doesn't move): while it stands, Hatch makes spiderlings. Destroying it ends Hatch, but she is enraged for the rest of the fight: +1 to attack and her speed becomes 10. Spiderlings still alive stay. When she dies, every spiderling flees into the dark."
    }
  ],
  "Cadmus the Exhumed: phase 1 (secret)": [
    {
      "name": "Royal Blade",
      "dice": "1d8",
      "range": 2,
      "target": "s",
      "text": "His light attack: the king's sword slashes one hero up to 2 squares away. Attack roll. Can be parried."
    },
    {
      "name": "Headsman's Axe",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "His heavy attack: the axe falls on one hero up to 2 squares away. Attack roll. Can be parried, but a parry still takes half."
    },
    {
      "name": "Kneel Before Me",
      "dice": "2d6",
      "range": 6,
      "target": "a",
      "text": "No attack roll: he roars his command at every hero within 6 squares. Each hero chooses first: kneel willingly (they drop prone, take no damage, and their turn's movement is spent standing up), or defy him and make a WIS save against 10 + his attack bonus: fail = psychic damage and knocked prone; save = half damage, still standing. Can't be dodged or parried (it's his voice)."
    },
    {
      "name": "Call the Guard",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "No damage. 2 Gravebound soldiers claw up from the floor on free squares within 6 squares of him (AC 13, 150 HP each, speed 5, spear 1d8 with reach 2). They act right after him. Never more than 4 at once: with 4 up, he uses Royal Blade instead."
    },
    {
      "name": "Royal Levy",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "No damage. He demands his tax: every hero within 6 squares makes a CON save against 10 + his attack bonus or loses 20 stamina. He heals 30 for each hero who failed. A hero with less than 20 stamina loses what they have (and still counts). Can't be dodged or parried."
    },
    {
      "name": "Wall of Shields",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "No damage. The shields of his dead close around the throne until the start of his next turn: ranged attacks and spells against him have disadvantage, and the first hit he takes in that time deals half damage. Area damage still lands normally."
    },
    {
      "name": "The Forgotten Court",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Secret boss of the forgotten kingdom in Kernunos's forest, for a level 5 party: HP 2,400, AC 16, size 3x3, never moves (can't be pushed, pulled or knocked prone). Roll a d6 (1-6 in this order). He still believes he rules: a hero who addresses him as king (\"Your Majesty\") before the fight starts earns the party one free round while he monologues about his kingdom. At 0 HP the throne wakes: phase 2."
    }
  ],
  "Cadmus the Exhumed: phase 2 (the throne wakes)": [
    {
      "name": "Greatsword Sweep",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "Greatsword Arm. No attack roll: the giant hand sweeps the greatsword in a full circle, hitting every hero within 3 squares. DEX save for half. Dodge only. Gone once the Greatsword Arm is destroyed (reroll)."
    },
    {
      "name": "Greatsword Cleave",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Greatsword Arm. Attack roll vs one hero up to 3 squares away: the greatsword comes down. Can be parried, but a parry still takes half. Gone once the Greatsword Arm is destroyed (reroll)."
    },
    {
      "name": "Grasping Hand",
      "dice": "0",
      "range": 3,
      "target": "s",
      "text": "Great Hand. No damage: the huge clawed hand grabs one hero up to 3 squares away. STR save against 10 + his attack bonus or grabbed: restrained, 1d6 at the start of each of their turns, until a STR check (action) frees them or the Great Hand is destroyed. Only one hero at a time. Dodge Roll beaten = not grabbed. Gone once the Great Hand is destroyed (reroll)."
    },
    {
      "name": "Crush",
      "dice": "3d6",
      "range": 3,
      "target": "s",
      "text": "Great Hand. The hand squeezes the hero it holds: damage, no attack roll, no save, no reaction possible. If nobody is grabbed, he uses Grasping Hand instead. Gone once the Great Hand is destroyed (reroll)."
    },
    {
      "name": "Spears of the Host",
      "dice": "1d8",
      "range": 2,
      "target": "s",
      "text": "Corpse Host. The dead soldiers fused into the throne stab: one attack roll each against up to two different heroes within 2 squares (the same hero if only one is in reach, twice). Each can be parried or dodged separately. Gone once the Corpse Host is destroyed (reroll)."
    },
    {
      "name": "Mutiny of the Dead",
      "dice": "1d8",
      "range": 1,
      "target": "s",
      "text": "The throne turns on its own king: Cadmus takes the damage (x10, no roll, no save) as his own dead claw at him, and nothing else happens this action. His tragedy, decided by the dice. Can't happen once all three parts are destroyed (he's alone then: reroll)."
    },
    {
      "name": "The Throne Wakes",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2: HP 2,000, AC 15, still never moves. Three actions per turn: roll a d6 for each, one after the other (1-6 in this order). Three breakable parts, each targeted on its own: the Greatsword Arm (AC 15, 300 HP), the Great Hand (AC 14, 250 HP) and the Corpse Host (AC 13, 300 HP). Damage to a part doesn't hurt Cadmus. A destroyed part's moves are rerolled, and each destroyed part costs him one action per turn (all three gone: 1 action, and his only move is Royal Blade from phase 1). Killing Cadmus ends everything: the throne falls still."
    }
  ],
  "Aldrich: phase 1 (devourer, secret)": [
    {
      "name": "Gilded Spear",
      "dice": "1d10",
      "range": 3,
      "target": "s",
      "text": "His light attack: the golden spear thrusts at one hero up to 3 squares away. Attack roll. Can be parried."
    },
    {
      "name": "Spear of the Devourer",
      "dice": "2d10",
      "range": 8,
      "target": "a",
      "text": "His heavy attack, no attack roll: he hurls a spear of golden light along a straight 8-square line from him. Every hero in the line makes a DEX save: half on a success. Dodge only. It returns to his hand."
    },
    {
      "name": "Rain of Gold",
      "dice": "2d8",
      "range": 10,
      "target": "a",
      "text": "Telegraphed: he raises the spear and marks three 2x2 areas within 10 squares (show them). At the start of his next turn golden arrows rain on each: everyone inside takes the damage, no save; Dodge Roll halves it. Leaving the marked areas avoids it completely. Fizzles if he is stunned or killed first. Never twice in a row."
    },
    {
      "name": "Engulf",
      "dice": "2d6",
      "range": 1,
      "target": "s",
      "text": "The ooze surges over one adjacent hero: STR save against 10 + his attack bonus or swallowed: inside him, restrained, can't be targeted, and takes the damage as acid at the start of each of their turns. They escape with a STR check (action), or are spat out when allies deal 200 damage to him in one round. Only one hero at a time. Dodge Roll beaten = not swallowed. Can't be parried."
    },
    {
      "name": "Hymn of the Choir",
      "dice": "1d8",
      "range": 20,
      "target": "a",
      "text": "No damage. His four hooded choir members sing: he heals the dice x10 for each choir member still alive. Killing the choir stops it; with none left, he uses Devour instead."
    },
    {
      "name": "Devour",
      "dice": "2d6",
      "range": 4,
      "target": "a",
      "text": "No attack roll: his hunger pulls at every hero within 4 squares. CON save for half. He heals half of the total damage dealt. Can't be dodged or parried."
    },
    {
      "name": "The Devourer's Feast",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Secret boss beneath the golden palace in the Sky mountains, for a level 7 party: HP 2,800, AC 17, size 3x3, slides 4 squares a turn (can't be pushed or pulled). Roll a d6 (1-6 in this order). Four hooded choir members stand around the arena (AC 12, 150 HP each, they don't attack): while they live, Hymn of the Choir heals him. At 0 HP the gods he devoured break through: phase 2."
    }
  ],
  "Aldrich: phase 2 (the gods break through)": [
    {
      "name": "Godflesh Lash",
      "dice": "1d10",
      "range": 3,
      "target": "s",
      "text": "His light attack: an ooze tendril full of golden hands lashes one hero up to 3 squares away. Attack roll. Can be parried."
    },
    {
      "name": "Molten Gold",
      "dice": "3d6",
      "range": 4,
      "target": "a",
      "text": "His heavy attack, no attack roll: he vomits molten gold in a 4-square cone. DEX save: fail = full damage and slowed (half speed) until the end of their next turn; save = half damage, not slowed. Dodge only."
    },
    {
      "name": "Stolen Miracle",
      "dice": "2d8",
      "range": 20,
      "target": "a",
      "text": "He calls on a god he swallowed: roll a d3. 1 Sun: every hero he can see takes the damage as radiant, DEX save for half. 2 Storm: lightning jumps across 3 heroes of his choice, 2d6 each, DEX save for half each. 3 Moon: no damage, he heals 300. Dodge only."
    },
    {
      "name": "Gorge",
      "dice": "3d8",
      "range": 1,
      "target": "s",
      "text": "Only against an adjacent hero who is slowed (Molten Gold slows) or prone: attack roll with advantage. On a hit, damage and he heals all of it. If nobody adjacent is slowed or prone, he uses Godflesh Lash instead."
    },
    {
      "name": "Golden Deluge",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "Telegraphed: the gods inside him start to shine (announce it). At the start of his next turn, every hero more than 3 squares from him takes the damage as radiant, no save; Dodge Roll halves it. Heroes within 3 squares are safe: the only shelter is next to him. Fizzles if he is stunned or killed first. Never twice in a row."
    },
    {
      "name": "Escaping Gods",
      "dice": "1d8",
      "range": 20,
      "target": "s",
      "text": "Passive, at the start of each of his turns: a golden god-hand tears out of him and strikes a random hero (roll among the living), no attack roll, no save; Dodge Roll can halve it. It's the gods fighting their way out, not him."
    },
    {
      "name": "Hunger Unending",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2: HP 2,200, AC 16, slides 4 squares. Roll a d6: 1 Godflesh Lash, 2 Molten Gold, 3 Stolen Miracle, 4 Gorge, 5 Golden Deluge, 6 Godflesh Lash. Weakness: every Golden ability deals +50% damage to him (the Golden power is stolen divinity, the thing he is choking on). Crimson abilities don't. Any swallowed hero is spat out when phase 2 begins."
    }
  ],
  "Tenjin: phase 1 (shard warden, secret)": [
    {
      "name": "Cleaver Cut",
      "dice": "1d10",
      "range": 2,
      "target": "s",
      "text": "His light attack: the great cleaver slashes one hero up to 2 squares away. Attack roll. Can be parried."
    },
    {
      "name": "Oni Cleave",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "His heavy attack: an overhead cleave on one hero up to 2 squares away. Attack roll. Can be parried, but a parry still takes half."
    },
    {
      "name": "Iai Stance",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "No damage now: he sheathes and waits. Until the start of his next turn, the first hero who attacks him in melee is cut first: they take the damage (DEX save for half) before their attack, and that attack has disadvantage. Ends after that one counter. Ranged attacks and spells don't trigger it."
    },
    {
      "name": "Thunderclap",
      "dice": "2d6",
      "range": 2,
      "target": "a",
      "text": "No attack roll: he stamps and thunder bursts around him, hitting every hero within 2 squares. CON save: fail = damage and no reaction (no Dodge Roll or Parry) until the start of their next turn; save = half damage, reaction kept. Can't be parried."
    },
    {
      "name": "Shard Bolt",
      "dice": "2d8",
      "range": 10,
      "target": "s",
      "text": "Attack roll vs one hero up to 10 squares away: red lightning from the crystal shard in his hand. On a hit, damage and the hero is marked: his next attack against them has advantage. Dodge only."
    },
    {
      "name": "Crystal Oath",
      "dice": "2d10",
      "range": 20,
      "target": "s",
      "text": "Passive reaction, once per round: when a hero touches or attacks the great red crystal, he dashes to them at once (doesn't provoke) and makes an Oni Cleave (attack roll, a parry still takes half). The crystal can't be harmed while he stands."
    },
    {
      "name": "Warden of the Shard",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Secret boss of Odi'ram's lands, guarding the red crystal, for a level 8 party: HP 2,600, AC 18, size 2x2, speed 6. Roll a d6: 1 Cleaver Cut, 2 Oni Cleave, 3 Iai Stance, 4 Thunderclap, 5 Shard Bolt, 6 Cleaver Cut. At 0 HP he crushes the shard in his hand and takes its power: phase 2."
    }
  ],
  "Tenjin: phase 2 (red thunder)": [
    {
      "name": "Thunder Cleaver",
      "dice": "1d10",
      "range": 2,
      "target": "s",
      "text": "His light attack: the cleaver crackling with red lightning, at one hero up to 2 squares away. Attack roll; on a hit, damage plus 1d6 lightning. A parry stops the steel but not the lightning: a beaten parry still takes the 1d6."
    },
    {
      "name": "Raijin Leap",
      "dice": "2d10",
      "range": 6,
      "target": "s",
      "text": "His heavy attack, no attack roll: he leaps up to 6 squares onto one hero (doesn't provoke). DEX save: fail = full damage and knocked prone; save = half, not prone. Dodge only."
    },
    {
      "name": "Crimson Chain",
      "dice": "2d6",
      "range": 6,
      "target": "a",
      "text": "No attack roll: red lightning strikes one hero up to 6 squares away, then jumps to every other hero within 2 squares of the last one hit, and on (each hero at most once). Each makes a DEX save for half. Dodge only. Spread out to stop the chain."
    },
    {
      "name": "Shard Storm",
      "dice": "1d10",
      "range": 20,
      "target": "a",
      "text": "No attack roll: the shards orbiting him fly out at 3 random heroes (the same hero can be picked more than once). Each hit is the damage, no save; Dodge Roll avoids one shard (beaten) or halves it. Can't be parried."
    },
    {
      "name": "Final Draw",
      "dice": "4d10",
      "range": 8,
      "target": "s",
      "text": "Telegraphed: he sheathes and goes completely still (announce it, and the hero it's aimed at: the one who dealt him the most damage). At the start of his next turn he draws and strikes that hero if they are within 8 squares: no attack roll, no save. Only a Dodge Roll (beaten = no damage) or a Parry (beaten = half) helps, or an ally standing in the straight line between them takes the cut instead. Fizzles if he is stunned or killed first. Never twice in a row."
    },
    {
      "name": "Red Thunder",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Phase 2: HP 2,000, AC 17, size 2x2, speed 6. Red lightning crackles over him and the crystal's fragments orbit him. Roll a d6: 1 Thunder Cleaver, 2 Raijin Leap, 3 Crimson Chain, 4 Shard Storm, 5 Final Draw, 6 Thunder Cleaver. Crystal Oath ends (the crystal is broken). His lightning is red, not gold: it is not the Golden power."
    }
  ],
  "Nameless King: phase 1 (storm rider)": [
    {
      "name": "Skyward Lance",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: a spear thrust from the dragon’s back. Can be parried."
    },
    {
      "name": "Tail Sweep",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "No attack roll: the dragon’s tail sweeps every hero within 2 squares. DEX save for half; fail also knocks prone. Dodge only."
    },
    {
      "name": "Storm Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: the dragon inhales the turn before (announce the line). Next turn: a 6-square line of lightning, DEX save for half. Leaving the line avoids it; Dodge Roll works; can’t be parried. Fizzles if the dragon is stunned first."
    },
    {
      "name": "Coiling Gale",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No damage. Every hero within 3 squares is pushed 2 squares away from him (STR save resists). A pushed hero into a wall stops. Sets up the breath: he usually breathes next."
    },
    {
      "name": "Thunder Dive",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "Telegraphed: they fly up and leave the board for a turn (no one can target them; mark their shadow). Start of their next turn: they crash down. Everyone within 4 squares of the shadow takes the damage, DEX save for half. Dodge only. Leaving the area avoids it."
    }
  ],
  "Nameless King: phase 2 (on foot)": [
    {
      "name": "King's Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: his bread-and-butter duelist thrust. Can be parried."
    },
    {
      "name": "Storm's Wager",
      "dice": "0",
      "range": 2,
      "target": "s",
      "text": "No damage now. He spins the spear; roll a d4 in the open so the players see it: 1 Thunder Lance, 2 Spear Hurl, 3 Storm Vault, 4 Crowned in Lightning. The chosen move happens on his next action. The roll is the tell: heroes get their turns to react."
    },
    {
      "name": "Wager: Thunder Lance",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Wager 1: a straight 6-square line of lightning from him. DEX save for half. Dodge only, can’t be parried."
    },
    {
      "name": "Wager: Spear Hurl",
      "dice": "2d10",
      "range": 8,
      "target": "s",
      "text": "Wager 2: attack roll vs one hero up to 8 squares away. Can be parried. The spear returns to his hand at the end of his turn; until then he has no King’s Thrust."
    },
    {
      "name": "Wager: Storm Vault",
      "dice": "3d8",
      "range": 4,
      "target": "a",
      "text": "Wager 3: he leaps up to 4 squares (doesn’t provoke) and lands; every hero within 2 squares of the landing takes the damage, DEX save for half. Dodge only."
    },
    {
      "name": "Wager: Crowned in Lightning",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Wager 4: no damage now. His next attack that hits deals +2d6 lightning, and until it hits his Lightning Reprisal strikes twice. Ends when that attack hits, or when he changes phase."
    },
    {
      "name": "Twin Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Two attack rolls, one after the other, vs the same hero up to 2 squares away (or a second hero if the first falls). Each hit is 2d8. Each is parried or dodged separately (two reactions, two stamina costs)."
    },
    {
      "name": "Sweeping Arc",
      "dice": "2d10",
      "range": 2,
      "target": "a",
      "text": "No attack roll: a full circle hitting every hero within 2 squares. DEX save for half. A parry can’t stop it (area). Punishes heroes crowding him."
    },
    {
      "name": "Lunging Pierce",
      "dice": "3d10",
      "range": 4,
      "target": "s",
      "text": "Telegraphed by a low stance (announce it). Next turn he dashes 3 squares in a straight line (doesn’t provoke), then makes an attack roll vs the hero at the end. Can be parried. Moving out of his line in between makes it miss."
    },
    {
      "name": "Sovereign's Theft",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: damage, and he steals the hero’s main element (fire, ice, poison...) for 2 rounds: the hero’s abilities lose that element’s extra effect, and his spear attacks deal +1d6 of it. A hero with no element just takes the damage. Can be parried (no damage, nothing stolen)."
    },
    {
      "name": "Lightning Reprisal",
      "dice": "2d8",
      "range": 12,
      "target": "s",
      "text": "Reaction, once per round, costs him nothing: when a hero more than 2 squares away hits him (arrow, bolt or spell), he hurls a bolt back at that hero: attack roll, 2d8 on a hit. Dodge only. Melee hits never trigger it."
    }
  ],
  "Nameless King: phase 3 (cloud dragon)": [
    {
      "name": "King's Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: his bread-and-butter duelist thrust. Can be parried."
    },
    {
      "name": "Storm's Wager",
      "dice": "0",
      "range": 2,
      "target": "s",
      "text": "No damage now. He spins the spear; roll a d4 in the open so the players see it: 1 Thunder Lance, 2 Spear Hurl, 3 Storm Vault, 4 Crowned in Lightning. The chosen move happens on his next action. The roll is the tell: heroes get their turns to react."
    },
    {
      "name": "Wager: Thunder Lance",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Wager 1: a straight 6-square line of lightning from him. DEX save for half. Dodge only, can’t be parried."
    },
    {
      "name": "Wager: Spear Hurl",
      "dice": "2d10",
      "range": 8,
      "target": "s",
      "text": "Wager 2: attack roll vs one hero up to 8 squares away. Can be parried. The spear returns to his hand at the end of his turn; until then he has no King’s Thrust."
    },
    {
      "name": "Wager: Storm Vault",
      "dice": "3d8",
      "range": 4,
      "target": "a",
      "text": "Wager 3: he leaps up to 4 squares (doesn’t provoke) and lands; every hero within 2 squares of the landing takes the damage, DEX save for half. Dodge only."
    },
    {
      "name": "Wager: Crowned in Lightning",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Wager 4: no damage now. His next attack that hits deals +2d6 lightning, and until it hits his Lightning Reprisal strikes twice. Ends when that attack hits, or when he changes phase."
    },
    {
      "name": "Twin Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Two attack rolls, one after the other, vs the same hero up to 2 squares away (or a second hero if the first falls). Each hit is 2d8. Each is parried or dodged separately (two reactions, two stamina costs)."
    },
    {
      "name": "Sweeping Arc",
      "dice": "2d10",
      "range": 2,
      "target": "a",
      "text": "No attack roll: a full circle hitting every hero within 2 squares. DEX save for half. A parry can’t stop it (area). Punishes heroes crowding him."
    },
    {
      "name": "Lunging Pierce",
      "dice": "3d10",
      "range": 4,
      "target": "s",
      "text": "Telegraphed by a low stance (announce it). Next turn he dashes 3 squares in a straight line (doesn’t provoke), then makes an attack roll vs the hero at the end. Can be parried. Moving out of his line in between makes it miss."
    },
    {
      "name": "Sovereign's Theft",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away. On a hit: damage, and he steals the hero’s main element (fire, ice, poison...) for 2 rounds: the hero’s abilities lose that element’s extra effect, and his spear attacks deal +1d6 of it. A hero with no element just takes the damage. Can be parried (no damage, nothing stolen)."
    },
    {
      "name": "Lightning Reprisal",
      "dice": "2d8",
      "range": 12,
      "target": "s",
      "text": "Reaction, once per round, costs him nothing: when a hero more than 2 squares away hits him (arrow, bolt or spell), he hurls a bolt back at that hero: attack roll, 2d8 on a hit. Dodge only. Melee hits never trigger it."
    },
    {
      "name": "Shape the Storm",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Phase 3 opener (his action, no damage): he shapes Shōryū, a cloud dragon, out of the storm. It can’t be targeted or destroyed; it only acts through Cloud Dragon’s Judgement."
    },
    {
      "name": "Cloud Dragon's Judgement",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "At the end of each of his turns, the cloud dragon marks 3 squares (show them). At the end of his next turn lightning strikes them: anyone on a marked square takes the damage, DEX save for half. Leaving the square avoids it completely."
    }
  ],
  "Odi'ram: phase 1 (titan)": [
    {
      "name": "Embers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. Every time a hero takes fire damage (a parry’s chip damage included), they gain 1 Ember. At 4 Embers they burst: they take 10% of their max HP (no save) and drop to 0 Embers. At the end of each round, a hero who took no fire damage that round loses 1 Ember; standing in a safe spot (obsidian or water) at the end of the round removes 1 more."
    },
    {
      "name": "Molten Cleave",
      "dice": "4d10",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: he raises the sword the turn before (announce the arc: everything within 3 squares in front of him). Next turn it falls: full damage to every hero in the arc. Parry: half damage and 1 Ember. Dodge Roll missed by exactly 1: half damage; missed by more: full. Leaving the arc avoids it."
    },
    {
      "name": "Titan's Stride",
      "dice": "3d8",
      "range": 2,
      "target": "a",
      "text": "No attack roll: he steps forward 1 square; every hero in the 2 squares in front of him takes the damage and makes a STR save: fail = knocked prone. Fire: 1 Ember. Dodge only."
    },
    {
      "name": "Primordial Slam",
      "dice": "5d10",
      "range": 4,
      "target": "a",
      "text": "Telegraphed: he plants the sword (announce it). Next turn the ground erupts in a ring 4 squares around him: every hero in it takes the damage, no save. Dodge only. Heroes on a safe spot are spared completely."
    },
    {
      "name": "Burning Furrow",
      "dice": "3d8",
      "range": 8,
      "target": "a",
      "text": "No attack roll: a straight 8-square line of fire from him. DEX save for half. The line keeps burning for 2 rounds: anyone who starts their turn on it gains 1 Ember. Dodge only."
    },
    {
      "name": "Brand of Wrath",
      "dice": "2d10",
      "range": 6,
      "target": "s",
      "text": "Attack roll vs one hero up to 6 squares away: a hurled chunk of burning rock. On a hit: damage and 2 Embers. Dodge only (fire can’t be parried)."
    },
    {
      "name": "Ash Fall",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "No damage. Ash rains over the whole arena: every hero not on a safe spot gains 1 Ember."
    }
  ],
  "Odi'ram: phase 2 (unbound)": [
    {
      "name": "Embers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. Every time a hero takes fire damage (a parry’s chip damage included), they gain 1 Ember. At 4 Embers they burst: they take 10% of their max HP (no save) and drop to 0 Embers. At the end of each round, a hero who took no fire damage that round loses 1 Ember; standing in a safe spot (obsidian or water) at the end of the round removes 1 more."
    },
    {
      "name": "Blazing Flurry",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Armour shed, he attacks twice a turn with no telegraph. Attack roll vs one hero up to 3 squares away: a fast slash. Can be parried (the parry still gives 1 Ember)."
    },
    {
      "name": "Wildfire Sweep",
      "dice": "2d10",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a wide burning arc, everything within 3 squares in front of him. DEX save for half. 1 Ember on a fail. Dodge only."
    },
    {
      "name": "Burning Lunge",
      "dice": "3d8",
      "range": 5,
      "target": "s",
      "text": "He bounds up to 5 squares (doesn’t provoke), then makes an attack roll vs the hero he lands next to. Can be parried (1 Ember on the parry)."
    },
    {
      "name": "Inferno Gust",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a beat of his wings hits everyone within 3 squares in front of him: damage, pushed 2 squares, and 1 Ember. STR save: half damage, not pushed (Ember stays)."
    },
    {
      "name": "Flame Burst",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No damage. Fire erupts from his body: every hero within 3 squares gains 1 Ember. Can’t be dodged or parried."
    },
    {
      "name": "Kindle",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "No damage. He roars: every hero gains 1 Ember, wherever they are. Once every 3 rounds; reroll if used in the last 2 rounds."
    },
    {
      "name": "Furnace Heart",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Passive. Each time a hero’s Embers burst, he heals 2d10 (x10)."
    }
  ],
  "Odi'ram: phase 3 (blue fire)": [
    {
      "name": "Embers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive, blue fire. Embers now burst at 2 instead of 4, for 15% of max HP (no save), then reset to 0. Removal unchanged: no fire damage this round = -1, safe spot at the end of the round = -1 more."
    },
    {
      "name": "Boiling Ground",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Phase 3 rule: at the start of each round, the GM picks one safe spot and it boils away for the rest of the fight. A hero standing on it is not hurt but loses the spot."
    },
    {
      "name": "Azure Cleave",
      "dice": "6d10",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: his great blow returns in blue fire (announce the arc, within 3 squares in front of him). Next turn: full damage and 1 Ember to everyone in it. Dodge only, no parry. Leaving the arc avoids it."
    },
    {
      "name": "Sun's Collapse",
      "dice": "8d8",
      "range": 20,
      "target": "a",
      "text": "Once per fight. Telegraphed for 2 turns (announce it twice), then the whole arena erupts: every hero takes the damage, no save. Heroes on a safe spot take half. Dodge Roll can’t help (there is nowhere to roll). Fizzles if he is killed first."
    },
    {
      "name": "Blazing Flurry",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Armour shed, he attacks twice a turn with no telegraph. Attack roll vs one hero up to 3 squares away: a fast slash. Can be parried (the parry still gives 1 Ember)."
    },
    {
      "name": "Wildfire Sweep",
      "dice": "2d10",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a wide burning arc, everything within 3 squares in front of him. DEX save for half. 1 Ember on a fail. Dodge only."
    },
    {
      "name": "Burning Lunge",
      "dice": "3d8",
      "range": 5,
      "target": "s",
      "text": "He bounds up to 5 squares (doesn’t provoke), then makes an attack roll vs the hero he lands next to. Can be parried (1 Ember on the parry)."
    },
    {
      "name": "Inferno Gust",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "No attack roll: a beat of his wings hits everyone within 3 squares in front of him: damage, pushed 2 squares, and 1 Ember. STR save: half damage, not pushed (Ember stays)."
    },
    {
      "name": "Flame Burst",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No damage. Fire erupts from his body: every hero within 3 squares gains 1 Ember. Can’t be dodged or parried."
    },
    {
      "name": "Kindle",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "No damage. He roars: every hero gains 1 Ember, wherever they are. Once every 3 rounds; reroll if used in the last 2 rounds."
    },
    {
      "name": "Furnace Heart",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Passive. Each time a hero’s Embers burst, he heals 2d10 (x10)."
    }
  ],
  "Xibalba: phase 1 (rift)": [
    {
      "name": "Gravity Field",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive, at the start of each round: heroes more than 4 squares away are pulled 1 square toward her; heroes next to her are pushed out to 2 squares away. A STR save resists each move. Flying or anchored (holding a pillar) heroes are unaffected."
    },
    {
      "name": "Void Rend",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero in front of her: a claw that tears space. Can be parried."
    },
    {
      "name": "Wing Buffet",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "No attack roll: her wings strike every hero beside her (within 2 squares, to her sides). Damage, and STR save or pushed 2 squares. A save = half damage, no push. Dodge only."
    },
    {
      "name": "Spiked Tail",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero behind her, up to 3 squares away. +2d6 if the hero is exactly 3 squares away (the spiked tip). Can be parried."
    },
    {
      "name": "Gravity Lance",
      "dice": "3d8",
      "range": 8,
      "target": "s",
      "text": "Attack roll vs one hero up to 8 squares away: a beam of compressed void. On a hit: damage and pulled 2 squares toward her (no save). Dodge only (a beam)."
    },
    {
      "name": "Collapse Point",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she marks a square up to 6 squares away. At the start of her next turn a tiny black hole implodes there: everyone within 2 squares is first pulled 1 square toward it, then takes the damage, DEX save for half. Dodge only."
    },
    {
      "name": "Null Veil",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "No damage. She half-fades: every attack against her has disadvantage until the start of her next turn. Area effects and saves are not affected."
    }
  ],
  "Xibalba: phase 2 (brood)": [
    {
      "name": "Gravity Field",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive, at the start of each round: heroes more than 4 squares away are pulled 1 square toward her; heroes next to her are pushed out to 2 squares (STR save resists). Phase 2: a hero who was pulled also has -10 ft (2 squares) speed this round. All her limbs can now strike whoever is in front of her."
    },
    {
      "name": "Void Rend",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero in front of her: a claw that tears space. Can be parried."
    },
    {
      "name": "Wing Buffet",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "No attack roll: her wings strike every hero beside her (within 2 squares, to her sides). Damage, and STR save or pushed 2 squares. A save = half damage, no push. Dodge only."
    },
    {
      "name": "Spiked Tail",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero behind her, up to 3 squares away. +2d6 if the hero is exactly 3 squares away (the spiked tip). Can be parried."
    },
    {
      "name": "Void Spawn",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "Every 2 rounds, 2 voidlings appear next to her (never more than 4 on the field). Each: 15 HP (x10 = 150), AC 12, 1d8 bite. When one dies it bursts: heroes next to it are pulled 1 square toward where it died."
    },
    {
      "name": "Rift Step",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "No damage. She teleports up to 8 squares through a rift (doesn’t provoke). Her next attack, before the end of her next turn, has advantage."
    },
    {
      "name": "Crushing Orbit",
      "dice": "3d10",
      "range": 4,
      "target": "a",
      "text": "No attack roll: every hero within 4 squares is swung 2 squares around her (her choice of direction) and takes the damage. STR save for half, not moved. Dodge only."
    },
    {
      "name": "Tail Launch",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away. On a hit: damage, and STR save or thrown into the air. Airborne: they can’t move or attack, only Dodge Roll (at disadvantage). They fall at the end of her turn unless Wing Smash or Void Fist hits them first. Can be parried (no launch)."
    },
    {
      "name": "Wing Smash",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: attack roll. On a hit: damage, they land prone 2 squares away. They may Dodge Roll mid-air at disadvantage; no parry in the air."
    },
    {
      "name": "Void Fist",
      "dice": "3d10",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: attack roll. On a hit: slammed into the ground, damage and prone. They may Dodge Roll mid-air at disadvantage; no parry in the air."
    },
    {
      "name": "Tail Impale",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away, over her shoulder. On a hit: damage and pinned: restrained, 1d6 at the start of each of their turns, until a STR save at the start of their turn succeeds. Can be parried (no pin)."
    }
  ],
  "Xibalba: phase 3 (singularity)": [
    {
      "name": "Gravity Field",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive, singularity: the pull is 2 squares, heroes move at half speed while within 6 squares of her, and the STR save has disadvantage. Anchored heroes (holding a pillar) are unaffected. She makes two limb attacks a turn, and Tail Launch’s follow-up is free (no extra action)."
    },
    {
      "name": "Abyssal Maw",
      "dice": "6d8",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: she opens a black hole in her chest (announce it). From then on, at the end of each hero’s turn, a hero within 3 squares takes the damage unless anchored to a pillar. Lasts until the start of her next turn."
    },
    {
      "name": "Starless Night",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "No damage. The light dies for 2 rounds: every hero sees only 2 squares (can’t target anything further), and voidlings have advantage on their bites."
    },
    {
      "name": "Gravity Crush",
      "dice": "4d10",
      "range": 6,
      "target": "s",
      "text": "No attack roll: one hero up to 6 squares away is crushed by their own weight. STR save: fail = full damage, prone and restrained for 1 round; save = half, no conditions. Can’t be parried or dodged."
    },
    {
      "name": "Void Rend",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero in front of her: a claw that tears space. Can be parried."
    },
    {
      "name": "Wing Buffet",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "No attack roll: her wings strike every hero beside her (within 2 squares, to her sides). Damage, and STR save or pushed 2 squares. A save = half damage, no push. Dodge only."
    },
    {
      "name": "Spiked Tail",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero behind her, up to 3 squares away. +2d6 if the hero is exactly 3 squares away (the spiked tip). Can be parried."
    },
    {
      "name": "Tail Launch",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away. On a hit: damage, and STR save or thrown into the air. Airborne: they can’t move or attack, only Dodge Roll (at disadvantage). They fall at the end of her turn unless Wing Smash or Void Fist hits them first. Can be parried (no launch)."
    },
    {
      "name": "Wing Smash",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: attack roll. On a hit: damage, they land prone 2 squares away. They may Dodge Roll mid-air at disadvantage; no parry in the air."
    },
    {
      "name": "Void Fist",
      "dice": "3d10",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: attack roll. On a hit: slammed into the ground, damage and prone. They may Dodge Roll mid-air at disadvantage; no parry in the air."
    },
    {
      "name": "Tail Impale",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away, over her shoulder. On a hit: damage and pinned: restrained, 1d6 at the start of each of their turns, until a STR save at the start of their turn succeeds. Can be parried (no pin)."
    },
    {
      "name": "Void Spawn",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "Every 2 rounds, 2 voidlings appear next to her (never more than 4 on the field). Each: 15 HP (x10 = 150), AC 12, 1d8 bite. When one dies it bursts: heroes next to it are pulled 1 square toward where it died."
    },
    {
      "name": "Rift Step",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "No damage. She teleports up to 8 squares through a rift (doesn’t provoke). Her next attack, before the end of her next turn, has advantage."
    },
    {
      "name": "Crushing Orbit",
      "dice": "3d10",
      "range": 4,
      "target": "a",
      "text": "No attack roll: every hero within 4 squares is swung 2 squares around her (her choice of direction) and takes the damage. STR save for half, not moved. Dodge only."
    }
  ],
  "Izat'al: phase 1 (sorceress)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss who died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi’ram exist only if the party killed them. A spared boss’s token works once in this fight (a hero uses it as an action): Arachne’s silk restrains her for 1 round, no save; Odi’ram’s ember cancels one of her big attacks as it is announced."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroyed weakens her for the whole fight. Fire: no regeneration (otherwise 30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (otherwise spells of 6th level or lower can’t target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba’s): legendary actions 5 to 3."
    },
    {
      "name": "Gilded Talon",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: golden claws. Can be parried."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: a wave of gold over the whole arena. Every hero makes a WIS save: fail = damage and loses their next reaction (no Dodge or Parry until it is spent) as a memory slips away; save = half damage, reaction kept. The Hexblade is immune (no damage, no save). Dodge only halves it."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "Attack roll vs one hero up to 8 squares away. On a hit: damage, and she heals by the damage dealt. Dodge only (it is a soul, not a blow)."
    },
    {
      "name": "Forgetting",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "No damage. One hero up to 6 squares away makes a WIS save: fail = they pick one of their equipped abilities they can’t use until the end of their next turn. Dodge Roll and Parry can’t be forgotten."
    },
    {
      "name": "Echo: Absolute Zero",
      "dice": "6d8",
      "range": 8,
      "target": "a",
      "text": "Aethelric’s finisher, cast as a spell (toned down from 8d8). Telegraphed for 1 turn; every hero not behind full cover takes the damage, CON save for half. Dodge only halves."
    },
    {
      "name": "Echo: Plague Bloom",
      "dice": "6d6",
      "range": 10,
      "target": "a",
      "text": "Kernunos’s finisher, cast as a spell (toned down from 8d6). Every hero within 10 squares, CON save for half. Dodge only."
    },
    {
      "name": "Rime and Rot",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "No attack roll: frozen roots burst within 4 squares of her. DEX save: fail = full damage, restrained until the end of their next turn and 1d8 rot at the start of each of their next 2 turns; save = half, nothing else. Dodge only."
    }
  ],
  "Izat'al: phase 2 (both spared)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss who died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi’ram exist only if the party killed them. A spared boss’s token works once in this fight (a hero uses it as an action): Arachne’s silk restrains her for 1 round, no save; Odi’ram’s ember cancels one of her big attacks as it is announced."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroyed weakens her for the whole fight. Fire: no regeneration (otherwise 30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (otherwise spells of 6th level or lower can’t target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba’s): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: the crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open (the tell); that head breathes a 6-square cone. Everyone in it takes the damage, DEX save for half, plus on a failed save: 1 fire (1 Ember if Odi’ram died, else burning 1d6 for 1 round), 2 ice (slowed until the end of their next turn), 3 lightning (no reaction until their next turn), 4 poison (no healing for 1 round), 5 rot (1d8 at the start of their next 2 turns), 6 void (pulled 2 squares toward her). Dodge only."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises (out of reach) and marks a spot up to 6 squares away. Next turn she dives: everyone within 2 squares of the spot takes the damage, DEX save for half. Dodge only; leaving the area avoids it."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: a wave of gold over the whole arena. Every hero makes a WIS save: fail = damage and loses their next reaction (no Dodge or Parry until it is spent) as a memory slips away; save = half damage, reaction kept. The Hexblade is immune (no damage, no save). Dodge only halves it."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "Attack roll vs one hero up to 8 squares away. On a hit: damage, and she heals by the damage dealt. Dodge only (it is a soul, not a blow)."
    }
  ],
  "Izat'al: phase 2 (Arachne fell)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss who died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi’ram exist only if the party killed them. A spared boss’s token works once in this fight (a hero uses it as an action): Arachne’s silk restrains her for 1 round, no save; Odi’ram’s ember cancels one of her big attacks as it is announced."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroyed weakens her for the whole fight. Fire: no regeneration (otherwise 30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (otherwise spells of 6th level or lower can’t target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba’s): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: the crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open (the tell); that head breathes a 6-square cone. Everyone in it takes the damage, DEX save for half, plus on a failed save: 1 fire (1 Ember if Odi’ram died, else burning 1d6 for 1 round), 2 ice (slowed until the end of their next turn), 3 lightning (no reaction until their next turn), 4 poison (no healing for 1 round), 5 rot (1d8 at the start of their next 2 turns), 6 void (pulled 2 squares toward her). Dodge only."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises (out of reach) and marks a spot up to 6 squares away. Next turn she dives: everyone within 2 squares of the spot takes the damage, DEX save for half. Dodge only; leaving the area avoids it."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: a wave of gold over the whole arena. Every hero makes a WIS save: fail = damage and loses their next reaction (no Dodge or Parry until it is spent) as a memory slips away; save = half damage, reaction kept. The Hexblade is immune (no damage, no save). Dodge only halves it."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "Attack roll vs one hero up to 8 squares away. On a hit: damage, and she heals by the damage dealt. Dodge only (it is a soul, not a blow)."
    },
    {
      "name": "Echo: The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Arachne’s collecting finisher. Every hero bound by a contract thread (they made a deal with Arachne or failed a Silent Contract) loses one potion or takes 4d8, their choice. Can’t be dodged."
    },
    {
      "name": "Echo: Final Offer",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Arachne’s venom and webs in a 6-square cone (toned down from 4d8): DEX save for half; fail also slowed until the end of their next turn. Dodge only."
    }
  ],
  "Izat'al: phase 2 (Odi'ram fell)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss who died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi’ram exist only if the party killed them. A spared boss’s token works once in this fight (a hero uses it as an action): Arachne’s silk restrains her for 1 round, no save; Odi’ram’s ember cancels one of her big attacks as it is announced."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroyed weakens her for the whole fight. Fire: no regeneration (otherwise 30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (otherwise spells of 6th level or lower can’t target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba’s): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: the crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open (the tell); that head breathes a 6-square cone. Everyone in it takes the damage, DEX save for half, plus on a failed save: 1 fire (1 Ember if Odi’ram died, else burning 1d6 for 1 round), 2 ice (slowed until the end of their next turn), 3 lightning (no reaction until their next turn), 4 poison (no healing for 1 round), 5 rot (1d8 at the start of their next 2 turns), 6 void (pulled 2 squares toward her). Dodge only."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises (out of reach) and marks a spot up to 6 squares away. Next turn she dives: everyone within 2 squares of the spot takes the damage, DEX save for half. Dodge only; leaving the area avoids it."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: a wave of gold over the whole arena. Every hero makes a WIS save: fail = damage and loses their next reaction (no Dodge or Parry until it is spent) as a memory slips away; save = half damage, reaction kept. The Hexblade is immune (no damage, no save). Dodge only halves it."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "Attack roll vs one hero up to 8 squares away. On a hit: damage, and she heals by the damage dealt. Dodge only (it is a soul, not a blow)."
    },
    {
      "name": "Echo: Sun's Collapse",
      "dice": "6d8",
      "range": 20,
      "target": "a",
      "text": "Odi’ram’s finisher (toned down from 8d8): telegraphed for 2 turns, then the arena erupts for everyone, no save. Safe spots take half. His Embers rule returns for this fight (burst at 4)."
    }
  ],
  "Izat'al: phase 2 (both fell)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss who died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi’ram exist only if the party killed them. A spared boss’s token works once in this fight (a hero uses it as an action): Arachne’s silk restrains her for 1 round, no save; Odi’ram’s ember cancels one of her big attacks as it is announced."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroyed weakens her for the whole fight. Fire: no regeneration (otherwise 30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (otherwise spells of 6th level or lower can’t target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba’s): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: the crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open (the tell); that head breathes a 6-square cone. Everyone in it takes the damage, DEX save for half, plus on a failed save: 1 fire (1 Ember if Odi’ram died, else burning 1d6 for 1 round), 2 ice (slowed until the end of their next turn), 3 lightning (no reaction until their next turn), 4 poison (no healing for 1 round), 5 rot (1d8 at the start of their next 2 turns), 6 void (pulled 2 squares toward her). Dodge only."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises (out of reach) and marks a spot up to 6 squares away. Next turn she dives: everyone within 2 squares of the spot takes the damage, DEX save for half. Dodge only; leaving the area avoids it."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: a wave of gold over the whole arena. Every hero makes a WIS save: fail = damage and loses their next reaction (no Dodge or Parry until it is spent) as a memory slips away; save = half damage, reaction kept. The Hexblade is immune (no damage, no save). Dodge only halves it."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "Attack roll vs one hero up to 8 squares away. On a hit: damage, and she heals by the damage dealt. Dodge only (it is a soul, not a blow)."
    },
    {
      "name": "Echo: The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Arachne’s collecting finisher. Every hero bound by a contract thread (they made a deal with Arachne or failed a Silent Contract) loses one potion or takes 4d8, their choice. Can’t be dodged."
    },
    {
      "name": "Echo: Final Offer",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Arachne’s venom and webs in a 6-square cone (toned down from 4d8): DEX save for half; fail also slowed until the end of their next turn. Dodge only."
    },
    {
      "name": "Echo: Sun's Collapse",
      "dice": "6d8",
      "range": 20,
      "target": "a",
      "text": "Odi’ram’s finisher (toned down from 8d8): telegraphed for 2 turns, then the arena erupts for everyone, no save. Safe spots take half. His Embers rule returns for this fight (burst at 4)."
    },
    {
      "name": "Cinder Web",
      "dice": "5d8",
      "range": 6,
      "target": "a",
      "text": "Both fell: burning webs span a 6-square area. DEX save: fail = full damage and bound (restrained), 1 Ember at the start of each turn bound, until a STR save (action) breaks free; save = half, not bound. The fire spreads along the threads: a hero next to a bound one also gains 1 Ember at the start of their turn."
    }
  ],
  "Izat'al: phase 3 (the monster)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss who died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi’ram exist only if the party killed them. A spared boss’s token works once in this fight (a hero uses it as an action): Arachne’s silk restrains her for 1 round, no save; Odi’ram’s ember cancels one of her big attacks as it is announced."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroyed weakens her for the whole fight. Fire: no regeneration (otherwise 30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (otherwise spells of 6th level or lower can’t target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba’s): legendary actions 5 to 3."
    },
    {
      "name": "Echo: Cloud Dragon's Judgement",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "Her son’s finisher: a twisted cloud dragon marks 3 squares at the end of her turn; at the end of her next turn lightning strikes them, DEX save for half. Leaving the squares avoids it."
    },
    {
      "name": "Echo: Abyssal Maw",
      "dice": "5d8",
      "range": 3,
      "target": "a",
      "text": "Her daughter's black hole, torn out of her: anyone ending their turn within 3 squares takes damage unless anchored (toned down from 6d8)."
    },
    {
      "name": "Storm Singularity",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "No attack roll: every hero within 6 squares is pulled 2 squares toward her (STR save resists the pull), then lightning strikes each hero who was pulled for the damage, DEX save for half. Heroes who resisted the pull take nothing."
    },
    {
      "name": "The Last Breath",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "At 0 HP she does not fall: she begins to re-form at the start of her next turn (back to 10% HP). Only a hit from the Hexblade’s blade while she is at 0 finishes her for good: it devours her soul. Other damage does nothing while she is at 0."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Attack roll vs one hero up to 2 squares away: the crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open (the tell); that head breathes a 6-square cone. Everyone in it takes the damage, DEX save for half, plus on a failed save: 1 fire (1 Ember if Odi’ram died, else burning 1d6 for 1 round), 2 ice (slowed until the end of their next turn), 3 lightning (no reaction until their next turn), 4 poison (no healing for 1 round), 5 rot (1d8 at the start of their next 2 turns), 6 void (pulled 2 squares toward her). Dodge only."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises (out of reach) and marks a spot up to 6 squares away. Next turn she dives: everyone within 2 squares of the spot takes the damage, DEX save for half. Dodge only; leaving the area avoids it."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "No attack roll: a wave of gold over the whole arena. Every hero makes a WIS save: fail = damage and loses their next reaction (no Dodge or Parry until it is spent) as a memory slips away; save = half damage, reaction kept. The Hexblade is immune (no damage, no save). Dodge only halves it."
    }
  ],
  "Frozen North: Revenant Phalanx": [
    {
      "name": "Phalanx Thrust",
      "dice": "1d10",
      "range": 2,
      "target": "s",
      "text": "Its light attack: attack roll vs one hero up to 2 squares away (the spear reaches over an ally in front of it). Can be parried. On a miss: nothing."
    },
    {
      "name": "Shield Lock",
      "dice": "0",
      "range": 1,
      "target": "a",
      "text": "Passive, no action (if rolled, it uses Phalanx Thrust instead). While another Revenant Phalanx stands next to it, both get +2 AC and can't be pushed or knocked prone. A hero attacking from behind the line (the side away from the shields) ignores the +2. Split them up and they are ordinary soldiers. GM applies it."
    },
    {
      "name": "Phalanx Push",
      "dice": "1d6",
      "range": 1,
      "target": "s",
      "text": "Attack roll vs one adjacent hero with the coffin shield. On a hit: damage, and the hero is pushed 1 square straight back (no save). If a wall or another creature blocks the push, they fall prone instead. Can be parried (beaten parry: no damage, no push)."
    }
  ],
  "Frozen North: Revenant Courtier": [
    {
      "name": "Courtly Stab",
      "dice": "1d8",
      "range": 1,
      "target": "s",
      "text": "Her light attack: attack roll vs one adjacent hero with a dagger or rapier. Can be parried."
    },
    {
      "name": "Danse Macabre",
      "dice": "1d8",
      "range": 3,
      "target": "s",
      "text": "She whirls up to 3 squares (this movement never gives free attacks) and stabs one hero she ends next to: attack roll. If another Revenant Courtier is next to the same hero, the stab has advantage. Can be parried."
    },
    {
      "name": "Mourning Wail",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "No damage, no attack roll. Every hero within 3 squares makes a WIS save against 10 + her attack bonus, or is frightened of her until the end of their next turn (disadvantage on attacks against her, can't move closer to her). Can't be dodged or parried (it's sound). Never twice in a row: roll again."
    }
  ],
  "Frozen North: Accursed Servant": [
    {
      "name": "Frenzied Claws",
      "dice": "1d6",
      "range": 1,
      "target": "s",
      "text": "Two claw attacks vs one adjacent hero, each with its own attack roll and damage. Each can be parried on its own. Servants come in numbers: three of them on one hero is six attacks."
    },
    {
      "name": "Cursed Wail",
      "dice": "0",
      "range": 2,
      "target": "a",
      "text": "No damage, no attack roll. Every hero within 2 squares makes a WIS save against 10 + its attack bonus, or is frightened of it until the end of their next turn. A hero who already saved against a Cursed Wail this fight has advantage. Can't be dodged or parried."
    }
  ],
  "Frozen North: Necrolyte": [
    {
      "name": "Grave Bolt",
      "dice": "1d10",
      "range": 6,
      "target": "s",
      "text": "Its light attack, a spell: attack roll vs one hero up to 6 squares away. A screaming skull of green ghostfire. Can't be parried (a spell): dodge only."
    },
    {
      "name": "Raise the Fallen",
      "dice": "0",
      "range": 4,
      "target": "s",
      "text": "No damage. One destroyed undead within 4 squares (not a mini-boss) stands back up at half its max HP, on its square. Each body can only be raised once. If no body is in reach, it uses Grave Bolt instead. The reason to kill the Necrolyte first."
    },
    {
      "name": "Rot Ward",
      "dice": "0",
      "range": 4,
      "target": "s",
      "text": "No damage. One undead within 4 squares (or itself) gains 30 temporary HP, lost first. They don't stack: a second Rot Ward on the same target only tops it back up to 30."
    }
  ],
  "Frozen North: Revenant Hound": [
    {
      "name": "Rending Bite",
      "dice": "1d8",
      "range": 1,
      "target": "s",
      "text": "Its light attack: attack roll vs one adjacent hero, with advantage against a prone hero. Can be parried."
    },
    {
      "name": "Spine Burst",
      "dice": "1d6",
      "range": 1,
      "target": "a",
      "text": "No attack roll: it shakes its bone spines out in every direction. Every hero next to it makes a DEX save against 10 + its attack bonus for half. Dodge only."
    },
    {
      "name": "Pack Leap",
      "dice": "1d8",
      "range": 4,
      "target": "s",
      "text": "It leaps up to 4 squares (this movement never gives free attacks) and bites one hero it lands next to: attack roll, with advantage if another Revenant Hound is already next to that hero. Can be parried."
    }
  ],
  "Frozen North: Morwen, the Shadow of Calden": [
    {
      "name": "Crescent Reap",
      "dice": "1d10",
      "range": 2,
      "target": "s",
      "text": "Her light attack: attack roll vs one hero up to 2 squares away with a crescent sickle. Can be parried."
    },
    {
      "name": "Twin Moons",
      "dice": "2d6",
      "range": 1,
      "target": "s",
      "text": "Her heavy attack: two sickle cuts at one adjacent hero, each with its own attack roll and damage. A parry still takes half."
    },
    {
      "name": "Shadowstep",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "No damage. She vanishes and reappears on a free square next to any hero within 8 squares who isn't in bright light (a lit torch or a fire within 2 squares of them counts as bright light). Her next attack has advantage. If every hero is in bright light, she uses Crescent Reap instead."
    },
    {
      "name": "Harvest Hook",
      "dice": "1d8",
      "range": 3,
      "target": "s",
      "text": "Attack roll vs one hero up to 3 squares away. On a hit: damage, and a STR save against 10 + her attack bonus or pulled to a free square next to her. Can be parried (beaten parry: no damage, no pull)."
    },
    {
      "name": "Eclipse Veil",
      "dice": "0",
      "range": 5,
      "target": "a",
      "text": "No damage. A 3x3 zone of darkness up to 5 squares away for 2 rounds (mark it as a Void danger zone). Heroes inside are blinded (disadvantage on attacks, attacks against them have advantage); she sees through it. A lit torch carried in, or fire cast into it (an action), ends it."
    },
    {
      "name": "Mark of the Shadow",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "No damage. She marks one hero she can see. Until that hero drops to 0 HP or lands a critical hit on her, every single-target move she rolls goes after them. Using it again moves the mark."
    },
    {
      "name": "The Shadow of Calden",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Mini-boss of Calden's Keep, for a level 2-3 party: HP 900, AC 16, size 2x2, speed 7. Roll a d6 (1-6 in this order). She commands the Knights of the Gravid Moon and stalks the party. FIRST MEETING (an ambush anywhere in the Keep): when she drops to 450 HP she vanishes into the shadows and the fight ends; keep her sheet as it is. SECOND MEETING (the Inner Court, two Revenant Hounds at her side): she comes back with the HP she had left and fights to the end."
    }
  ],
  "Frozen North: Knight of the Gravid Moon": [
    {
      "name": "Broken Oath",
      "dice": "1d12",
      "range": 2,
      "target": "s",
      "text": "His light attack: attack roll vs one hero up to 2 squares away, a chop of the cracked greatsword. Can be parried."
    },
    {
      "name": "Moonlit Cleave",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "His heavy attack: a sweeping arc through every hero in front of him within 2 squares, one attack roll per hero. A parry still takes half."
    },
    {
      "name": "Crescent Pounce",
      "dice": "2d6",
      "range": 6,
      "target": "s",
      "text": "He leaps up to 6 squares (this movement never gives free attacks) and slams one hero he lands next to: attack roll. On a hit: damage and a STR save against 10 + his attack bonus or knocked prone. Dodge only (too heavy to parry)."
    },
    {
      "name": "Howl of the Gravid Moon",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "No damage. A Revenant Hound bursts in from the dark on a free square within 6 squares of him, and every undead within 6 squares heals 30 HP. Never two turns in a row: roll again."
    },
    {
      "name": "Savage Maul",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Claws and fangs vs one adjacent prone hero: attack roll with advantage. Can't be parried. If no adjacent hero is prone, he uses Broken Oath instead."
    },
    {
      "name": "Under the Gravid Moon",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Mini-boss guarding the gate of Calden's Inner Court, for a level 2-3 party: HP 1,000, AC 17, size 3x3, speed 6 (can't be pushed, pulled or knocked prone). Roll a d6: 1 Broken Oath, 2 Moonlit Cleave, 3 Crescent Pounce, 4 Howl of the Gravid Moon, 5 Savage Maul, 6 Broken Oath. At 500 HP his armour cracks and he goes feral: from then on he rolls twice each turn, but his AC drops to 15."
    }
  ]
}
