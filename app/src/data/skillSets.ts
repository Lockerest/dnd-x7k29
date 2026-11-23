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
      "text": "A fast frostbitten slash at one hero. Can be parried."
    },
    {
      "name": "Rime Guard",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "He raises a frost-covered guard against the next melee blow; frost creeps up the attacker's weapon."
    },
    {
      "name": "Chain Pull",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "A frozen chain lashes out up to 3 squares, catches one hero and drags them next to him."
    }
  ],
  "Aethelric: phase 1 (all)": [
    {
      "name": "Warden's Cut",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "A fast frostbitten slash at one hero. Can be parried."
    },
    {
      "name": "Rime Guard",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "He raises a frost-covered guard against the next melee blow; frost creeps up the attacker's weapon."
    },
    {
      "name": "Chain Pull",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "A frozen chain lashes out up to 3 squares, catches one hero and drags them next to him."
    },
    {
      "name": "Prison Bars",
      "dice": "3d8",
      "range": 3,
      "target": "a",
      "text": "Bars of ice burst from the floor and cage the heroes caught in the area."
    },
    {
      "name": "Frostbite Cleave",
      "dice": "4d10",
      "range": 2,
      "target": "a",
      "text": "A huge crescent swing of his greatsword that hits everyone within 2 squares."
    },
    {
      "name": "Cold Snap",
      "dice": "0",
      "range": 3,
      "target": "s",
      "text": "The floor freezes under one hero (often one who just dodged); ice creeps up their boots and slows them."
    },
    {
      "name": "Warden's Toll",
      "dice": "0",
      "range": 8,
      "target": "a",
      "text": "His halo tolls like a great bell: a shockwave across the arena that leaves heroes staggered."
    }
  ],
  "Aethelric: phase 2 (golden)": [
    {
      "name": "Golden Slash",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "A fast slash trailing golden frost at one hero."
    },
    {
      "name": "Shattering Wave",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "A ring of golden ice erupts from him and hits everyone within 4 squares."
    },
    {
      "name": "Frozen Verdict",
      "dice": "6d8",
      "range": 6,
      "target": "s",
      "text": "Telegraphed: a gold glyph marks one hero, then a white-gold beam strikes that spot. Move out of it."
    },
    {
      "name": "Jailer's Embrace",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "He grabs one hero and seals them in a cage of golden ice."
    },
    {
      "name": "Absolute Zero",
      "dice": "8d8",
      "range": 8,
      "target": "a",
      "text": "His ultimate: the whole arena freezes in golden frost. Heroes need cover, such as ice pillars, to survive it."
    },
    {
      "name": "Last Gasp",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Near death he drops to one knee and every crack flares gold: one last burst before he falls."
    }
  ],
  "Arachne: phase 1 (all)": [
    {
      "name": "Thread Needle",
      "dice": "2d6",
      "range": 3,
      "target": "s",
      "text": "A needle on a gold thread pierces one hero up to 3 squares away and pulls them a few steps toward her."
    },
    {
      "name": "Silent Contract",
      "dice": "3d8",
      "range": 6,
      "target": "s",
      "text": "She offers a deal: the target hands over a potion, or takes a psychic blow."
    },
    {
      "name": "Web Snare",
      "dice": "0",
      "range": 4,
      "target": "a",
      "text": "A sheet of gold thread falls on an area; heroes inside are stuck in place."
    },
    {
      "name": "Quiet Venom",
      "dice": "1d6",
      "range": 1,
      "target": "s",
      "text": "A painless prick of pale venom: little damage, but the target is numbed and slowed."
    },
    {
      "name": "Whisper Step",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "She vanishes into a web strand and reappears behind a hero up to 6 squares away."
    },
    {
      "name": "Seen It Coming",
      "dice": "0",
      "range": 20,
      "target": "s",
      "text": "When a hero uses a golden ability, she collects a toll and heals from it."
    },
    {
      "name": "The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Her robe tears open and the giant spider body unfolds: the change to her spider form."
    }
  ],
  "Arachne: phase 2 (all)": [
    {
      "name": "Fang Bite",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "Her fangs strike one hero with pale, paralysing venom: painless, but it slows them."
    },
    {
      "name": "Leg Skewer",
      "dice": "3d10",
      "range": 2,
      "target": "s",
      "text": "She rears a spider leg and spikes it down at one hero up to 2 squares away."
    },
    {
      "name": "Web Cocoon",
      "dice": "0",
      "range": 2,
      "target": "s",
      "text": "She wraps one hero in silk; they are held until cut free."
    },
    {
      "name": "Venom Mist",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "A cone of pale venom mist; heroes caught in it are slowed."
    },
    {
      "name": "Ceiling Drop",
      "dice": "4d8",
      "range": 2,
      "target": "a",
      "text": "She climbs out of sight, then drops from the ceiling on everyone under her shadow. Watch for the shadow."
    },
    {
      "name": "Silk Net",
      "dice": "0",
      "range": 4,
      "target": "a",
      "text": "Webbing spreads over the floor around her; heroes move slowly through it."
    },
    {
      "name": "Final Offer",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Wounded, she makes one last offer: hand over a potion, or take the blow."
    }
  ],
  "Kernunos: phase 1 (all)": [
    {
      "name": "Antler Gore",
      "dice": "2d8",
      "range": 1,
      "target": "s",
      "text": "A lunging antler stab at one hero."
    },
    {
      "name": "Thorn Whip",
      "dice": "2d6",
      "range": 2,
      "target": "s",
      "text": "A thorny vine lashes one hero up to 2 squares away."
    },
    {
      "name": "Spore Burst",
      "dice": "1d6",
      "range": 3,
      "target": "a",
      "text": "A cloud of poison pollen bursts around him."
    },
    {
      "name": "Entangling Roots",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "Roots burst from the ground and grip the heroes in the area."
    },
    {
      "name": "Stag Charge",
      "dice": "4d10",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: he lowers his antlers and charges up to 6 squares, trampling everything in his path."
    },
    {
      "name": "Heartwood Bloom",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "A great flower blooms on him and heals him."
    },
    {
      "name": "Thorned Hide",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Thorns burst from his bark-like skin: anyone who hits him in melee is pricked."
    },
    {
      "name": "The Bloom Withers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "His chest splits open and the garden rots: the change to his rotten phase."
    }
  ],
  "Kernunos: phase 2 (all)": [
    {
      "name": "Rot Claw",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "A rotten claw slash at one hero, with poison."
    },
    {
      "name": "Maggot Swarm",
      "dice": "5d6",
      "range": 3,
      "target": "a",
      "text": "A swarm of maggots and flies pours over an area."
    },
    {
      "name": "Bursting Pods",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "Fleshy pods swell and burst one after another, spraying poison gas."
    },
    {
      "name": "Rotting Embrace",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "His decayed ribcage closes around one hero and holds them."
    },
    {
      "name": "Grave Roots",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Dead root ribs erupt in a line from the ground."
    },
    {
      "name": "Vomit of Decay",
      "dice": "6d6",
      "range": 3,
      "target": "a",
      "text": "A cone of rotten sludge and poison."
    },
    {
      "name": "Plague Bloom",
      "dice": "8d6",
      "range": 10,
      "target": "a",
      "text": "His ultimate: thousands of spore pods burst and poison gas fills the arena."
    }
  ],
  "Kernunos: phase 3 (rooted)": [
    {
      "name": "Spring Returns",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "At about 10% HP he roots himself and drains the forest and the heroes' life to heal back to about 20-25% HP."
    },
    {
      "name": "Withering Drain",
      "dice": "2d8",
      "range": 20,
      "target": "a",
      "text": "Roots drain life from every hero and heal him."
    },
    {
      "name": "Rot Claw",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "A rotten claw slash at one hero, with poison."
    },
    {
      "name": "Maggot Swarm",
      "dice": "5d6",
      "range": 3,
      "target": "a",
      "text": "A swarm of maggots and flies pours over an area."
    },
    {
      "name": "Bursting Pods",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "Fleshy pods swell and burst one after another, spraying poison gas."
    },
    {
      "name": "Rotting Embrace",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "His decayed ribcage closes around one hero and holds them."
    },
    {
      "name": "Grave Roots",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Dead root ribs erupt in a line from the ground."
    },
    {
      "name": "Vomit of Decay",
      "dice": "6d6",
      "range": 3,
      "target": "a",
      "text": "A cone of rotten sludge and poison."
    },
    {
      "name": "Plague Bloom",
      "dice": "8d6",
      "range": 10,
      "target": "a",
      "text": "His ultimate: thousands of spore pods burst and poison gas fills the arena."
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
  "Nameless King: phase 1 (storm rider)": [
    {
      "name": "Skyward Lance",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "Spear thrust from the dragon's back. Can be parried."
    },
    {
      "name": "Tail Sweep",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "The dragon's tail sweeps everyone near it. DEX save or knocked prone."
    },
    {
      "name": "Storm Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: the dragon inhales the turn before. A line of lightning breath. Dodge only."
    },
    {
      "name": "Coiling Gale",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "The dragon whips its body around: everyone in range is pushed 2 squares away. Sets up the breath."
    },
    {
      "name": "Thunder Dive",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "They fly up and leave the board for a turn (mark their shadow), then crash down on it. Dodge only."
    }
  ],
  "Nameless King: phase 2 (on foot)": [
    {
      "name": "King's Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "His bread-and-butter duelist thrust. Can be parried."
    },
    {
      "name": "Storm's Wager",
      "dice": "0",
      "range": 2,
      "target": "s",
      "text": "He spins the spear overhead. Roll a d4 in the open: 1 Thunder Lance, 2 Spear Hurl, 3 Storm Vault, 4 Crowned in Lightning. The roll is the tell."
    },
    {
      "name": "Wager: Thunder Lance",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Wager 1: a 6-square line of lightning. Dodge only."
    },
    {
      "name": "Wager: Spear Hurl",
      "dice": "2d10",
      "range": 8,
      "target": "s",
      "text": "Wager 2: thrown at one target up to 8 squares away. Can be parried; the spear returns at the end of his turn."
    },
    {
      "name": "Wager: Storm Vault",
      "dice": "3d8",
      "range": 4,
      "target": "a",
      "text": "Wager 3: he leaps up to 4 squares and hits everyone within 2 squares of where he lands. Dodge only."
    },
    {
      "name": "Wager: Crowned in Lightning",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Wager 4: no damage now. His next attack deals +2d6 lightning and his Lightning Reprisal hits twice until then."
    },
    {
      "name": "Twin Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Two quick hits of 2d8; each is parried or dodged separately."
    },
    {
      "name": "Sweeping Arc",
      "dice": "2d10",
      "range": 2,
      "target": "a",
      "text": "A full circle around him. Punishes players crowding him."
    },
    {
      "name": "Lunging Pierce",
      "dice": "3d10",
      "range": 4,
      "target": "s",
      "text": "Telegraphed by a low stance. He dashes 3 squares first, then pierces."
    },
    {
      "name": "Sovereign's Theft",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "If it hits, he steals the target's main element (fire, ice, poison...) for 2 rounds: his spear attacks deal +1d6 of it. A target with no element loses nothing."
    },
    {
      "name": "Lightning Reprisal",
      "dice": "2d8",
      "range": 12,
      "target": "s",
      "text": "Reaction, once per round, free: when hit from more than 2 squares away (arrow or spell), he hurls a bolt back at that attacker. Dodge only."
    }
  ],
  "Nameless King: phase 3 (cloud dragon)": [
    {
      "name": "King's Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "His bread-and-butter duelist thrust. Can be parried."
    },
    {
      "name": "Storm's Wager",
      "dice": "0",
      "range": 2,
      "target": "s",
      "text": "He spins the spear overhead. Roll a d4 in the open: 1 Thunder Lance, 2 Spear Hurl, 3 Storm Vault, 4 Crowned in Lightning. The roll is the tell."
    },
    {
      "name": "Wager: Thunder Lance",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Wager 1: a 6-square line of lightning. Dodge only."
    },
    {
      "name": "Wager: Spear Hurl",
      "dice": "2d10",
      "range": 8,
      "target": "s",
      "text": "Wager 2: thrown at one target up to 8 squares away. Can be parried; the spear returns at the end of his turn."
    },
    {
      "name": "Wager: Storm Vault",
      "dice": "3d8",
      "range": 4,
      "target": "a",
      "text": "Wager 3: he leaps up to 4 squares and hits everyone within 2 squares of where he lands. Dodge only."
    },
    {
      "name": "Wager: Crowned in Lightning",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Wager 4: no damage now. His next attack deals +2d6 lightning and his Lightning Reprisal hits twice until then."
    },
    {
      "name": "Twin Thrust",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "Two quick hits of 2d8; each is parried or dodged separately."
    },
    {
      "name": "Sweeping Arc",
      "dice": "2d10",
      "range": 2,
      "target": "a",
      "text": "A full circle around him. Punishes players crowding him."
    },
    {
      "name": "Lunging Pierce",
      "dice": "3d10",
      "range": 4,
      "target": "s",
      "text": "Telegraphed by a low stance. He dashes 3 squares first, then pierces."
    },
    {
      "name": "Sovereign's Theft",
      "dice": "2d8",
      "range": 2,
      "target": "s",
      "text": "If it hits, he steals the target's main element (fire, ice, poison...) for 2 rounds: his spear attacks deal +1d6 of it. A target with no element loses nothing."
    },
    {
      "name": "Lightning Reprisal",
      "dice": "2d8",
      "range": 12,
      "target": "s",
      "text": "Reaction, once per round, free: when hit from more than 2 squares away (arrow or spell), he hurls a bolt back at that attacker. Dodge only."
    },
    {
      "name": "Shape the Storm",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Phase 3 opener (his action): he raises the spear and shapes Shōryū out of the storm clouds. The cloud dragon can't be destroyed."
    },
    {
      "name": "Cloud Dragon's Judgement",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "End of each of his turns: the cloud dragon marks 3 squares. Next turn lightning strikes them (DEX save for half)."
    }
  ],
  "Odi'ram: phase 1 (titan)": [
    {
      "name": "Embers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. Any fire damage, a parry's chip included, gives the hero 1 Ember. At 4 Embers they burst for 10% of max HP and reset. A round with no fire damage removes 1 Ember; standing in a safe spot (obsidian or water) removes 1 more."
    },
    {
      "name": "Molten Cleave",
      "dice": "4d10",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: he raises the sword the turn before. A vast arc in front of him. A parry takes half and 1 Ember. A dodge missed by exactly 1 takes half; worse takes it all."
    },
    {
      "name": "Titan's Stride",
      "dice": "3d8",
      "range": 2,
      "target": "a",
      "text": "He steps forward; everyone in the 2 squares in front makes a STR save or is knocked prone."
    },
    {
      "name": "Primordial Slam",
      "dice": "5d10",
      "range": 4,
      "target": "a",
      "text": "Telegraphed: he plants the sword; next turn the ground erupts in a ring around him. Dodge only. Safe spots are spared."
    },
    {
      "name": "Burning Furrow",
      "dice": "3d8",
      "range": 8,
      "target": "a",
      "text": "He drags the blade through the floor: a line of fire that burns for 2 rounds. Standing in it gives 1 Ember per turn."
    },
    {
      "name": "Brand of Wrath",
      "dice": "2d10",
      "range": 6,
      "target": "s",
      "text": "He hurls a chunk of burning fire at one hero, who takes 2 Embers. Dodge only."
    },
    {
      "name": "Ash Fall",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Ash rains over the arena: every hero outside a safe spot gains 1 Ember."
    }
  ],
  "Odi'ram: phase 2 (unbound)": [
    {
      "name": "Embers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. Any fire damage, a parry's chip included, gives the hero 1 Ember. At 4 Embers they burst for 10% of max HP and reset. A round with no fire damage removes 1 Ember; standing in a safe spot (obsidian or water) removes 1 more."
    },
    {
      "name": "Blazing Flurry",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Armour shed, he attacks twice a turn with no telegraph. A fast slash. Can be parried (plus 1 Ember)."
    },
    {
      "name": "Wildfire Sweep",
      "dice": "2d10",
      "range": 3,
      "target": "a",
      "text": "A wide burning arc. DEX save for half."
    },
    {
      "name": "Burning Lunge",
      "dice": "3d8",
      "range": 5,
      "target": "s",
      "text": "He closes the distance in one bound."
    },
    {
      "name": "Inferno Gust",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "A beat of his burning wings: everyone in front is pushed 2 squares and gains 1 Ember."
    },
    {
      "name": "Flame Burst",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "Fire erupts from every crack in his body: everyone within 3 gains 1 Ember."
    },
    {
      "name": "Kindle",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "He roars: every hero gains 1 Ember. Once every 3 rounds."
    },
    {
      "name": "Furnace Heart",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Passive. Each time a hero's Embers burst, he heals 2d10."
    }
  ],
  "Odi'ram: phase 3 (blue fire)": [
    {
      "name": "Embers",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. Blue fire: Embers now burst at 2 instead of 4, for 15% of max HP. A round with no fire damage still removes 1; a safe spot removes 1 more."
    },
    {
      "name": "Boiling Ground",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Each round, one safe spot boils away: the arena shrinks."
    },
    {
      "name": "Azure Cleave",
      "dice": "6d10",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: his great blow returns in blue fire. Dodge only."
    },
    {
      "name": "Sun's Collapse",
      "dice": "8d8",
      "range": 20,
      "target": "a",
      "text": "Once. Telegraphed for 2 turns, then the whole arena erupts. Heroes in a safe spot take half."
    },
    {
      "name": "Blazing Flurry",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Armour shed, he attacks twice a turn with no telegraph. A fast slash. Can be parried (plus 1 Ember)."
    },
    {
      "name": "Wildfire Sweep",
      "dice": "2d10",
      "range": 3,
      "target": "a",
      "text": "A wide burning arc. DEX save for half."
    },
    {
      "name": "Burning Lunge",
      "dice": "3d8",
      "range": 5,
      "target": "s",
      "text": "He closes the distance in one bound."
    },
    {
      "name": "Inferno Gust",
      "dice": "2d6",
      "range": 3,
      "target": "a",
      "text": "A beat of his burning wings: everyone in front is pushed 2 squares and gains 1 Ember."
    },
    {
      "name": "Flame Burst",
      "dice": "0",
      "range": 3,
      "target": "a",
      "text": "Fire erupts from every crack in his body: everyone within 3 gains 1 Ember."
    },
    {
      "name": "Kindle",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "He roars: every hero gains 1 Ember. Once every 3 rounds."
    },
    {
      "name": "Furnace Heart",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "Passive. Each time a hero's Embers burst, he heals 2d10."
    }
  ],
  "Xibalba: phase 1 (rift)": [
    {
      "name": "Gravity Field",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. At the start of each round, heroes more than 4 squares away are pulled 1 square toward her and heroes next to her are pushed out to 2 squares (STR save resists)."
    },
    {
      "name": "Void Rend",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "A claw swipe that tears space, at a hero in front of her. Can be parried."
    },
    {
      "name": "Wing Buffet",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "Her wings strike to the sides: STR save or pushed 2 squares."
    },
    {
      "name": "Spiked Tail",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Her tail strikes behind her: +2d6 if the target is exactly 3 squares away, at the spiked tip."
    },
    {
      "name": "Gravity Lance",
      "dice": "3d8",
      "range": 8,
      "target": "s",
      "text": "A beam of compressed void at a distant hero, who is pulled 2 squares toward her."
    },
    {
      "name": "Collapse Point",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she marks a square; next turn a tiny black hole implodes there, pulling everyone nearby toward it first. Dodge only."
    },
    {
      "name": "Null Veil",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "She half-fades into the void: attacks against her have disadvantage until her next turn."
    }
  ],
  "Xibalba: phase 2 (brood)": [
    {
      "name": "Gravity Field",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. At the start of each round, heroes more than 4 squares away are pulled 1 square toward her and heroes next to her are pushed out to 2 squares (STR save resists). Phase 2: pulled heroes also get -10 ft speed. All her limbs can now strike whoever is in front of her."
    },
    {
      "name": "Void Rend",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "A claw swipe that tears space, at a hero in front of her. Can be parried."
    },
    {
      "name": "Wing Buffet",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "Her wings strike to the sides: STR save or pushed 2 squares."
    },
    {
      "name": "Spiked Tail",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Her tail strikes behind her: +2d6 if the target is exactly 3 squares away, at the spiked tip."
    },
    {
      "name": "Void Spawn",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "Every 2 rounds, 2 voidlings appear (up to 4 at once): about 15 HP, 1d8 bite; when one dies it bursts, pulling heroes next to it 1 square."
    },
    {
      "name": "Rift Step",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "She teleports through a rift; her next attack has advantage."
    },
    {
      "name": "Crushing Orbit",
      "dice": "3d10",
      "range": 4,
      "target": "a",
      "text": "Everyone within 4 squares is swung 2 squares around her and takes damage."
    },
    {
      "name": "Tail Launch",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Her tail whips up under a hero and throws them into the air (STR save to stay grounded). Airborne, they fall at the end of her turn unless a follow-up hits first."
    },
    {
      "name": "Wing Smash",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: she swats them out of the air; they land prone 2 squares away. They may dodge mid-air at disadvantage."
    },
    {
      "name": "Void Fist",
      "dice": "3d10",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: she slams them into the ground, prone on a hit. They may dodge mid-air at disadvantage."
    },
    {
      "name": "Tail Impale",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Her tail stabs forward over her shoulder and pins the target: restrained until a STR save at the start of their turn, 1d6 each turn pinned."
    }
  ],
  "Xibalba: phase 3 (singularity)": [
    {
      "name": "Gravity Field",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Passive. Singularity: the pull is 2 squares, heroes move at half speed, and the STR save is harder. She makes two limb attacks a turn, and Tail Launch's follow-up is free."
    },
    {
      "name": "Abyssal Maw",
      "dice": "6d8",
      "range": 3,
      "target": "a",
      "text": "Telegraphed: she opens a black hole in her own chest. Anyone ending their turn within 3 squares takes damage, unless anchored to a pillar."
    },
    {
      "name": "Starless Night",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "The light dies: everyone sees only 2 squares for 2 rounds, and voidlings get advantage."
    },
    {
      "name": "Gravity Crush",
      "dice": "4d10",
      "range": 6,
      "target": "s",
      "text": "The target's own weight crushes them: STR save or prone and restrained for 1 round."
    },
    {
      "name": "Void Rend",
      "dice": "2d10",
      "range": 1,
      "target": "s",
      "text": "A claw swipe that tears space, at a hero in front of her. Can be parried."
    },
    {
      "name": "Wing Buffet",
      "dice": "2d8",
      "range": 2,
      "target": "a",
      "text": "Her wings strike to the sides: STR save or pushed 2 squares."
    },
    {
      "name": "Spiked Tail",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Her tail strikes behind her: +2d6 if the target is exactly 3 squares away, at the spiked tip."
    },
    {
      "name": "Tail Launch",
      "dice": "2d8",
      "range": 3,
      "target": "s",
      "text": "Her tail whips up under a hero and throws them into the air (STR save to stay grounded). Airborne, they fall at the end of her turn unless a follow-up hits first."
    },
    {
      "name": "Wing Smash",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: she swats them out of the air; they land prone 2 squares away. They may dodge mid-air at disadvantage."
    },
    {
      "name": "Void Fist",
      "dice": "3d10",
      "range": 3,
      "target": "s",
      "text": "Follow-up, only against an airborne hero: she slams them into the ground, prone on a hit. They may dodge mid-air at disadvantage."
    },
    {
      "name": "Tail Impale",
      "dice": "3d8",
      "range": 3,
      "target": "s",
      "text": "Her tail stabs forward over her shoulder and pins the target: restrained until a STR save at the start of their turn, 1d6 each turn pinned."
    },
    {
      "name": "Void Spawn",
      "dice": "0",
      "range": 6,
      "target": "a",
      "text": "Every 2 rounds, 2 voidlings appear (up to 4 at once): about 15 HP, 1d8 bite; when one dies it bursts, pulling heroes next to it 1 square."
    },
    {
      "name": "Rift Step",
      "dice": "0",
      "range": 8,
      "target": "s",
      "text": "She teleports through a rift; her next attack has advantage."
    },
    {
      "name": "Crushing Orbit",
      "dice": "3d10",
      "range": 4,
      "target": "a",
      "text": "Everyone within 4 squares is swung 2 squares around her and takes damage."
    }
  ],
  "Izat'al: phase 1 (sorceress)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss that died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi'ram exist only if the party killed them. A spared boss's token works once in this fight: Arachne's silk restrains her 1 round; Odi'ram's ember cancels one of her big attacks."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroys weakens her for the whole fight. Fire: no more regeneration (30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (spells of 6th level or lower can target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba's): legendary actions 5 to 3."
    },
    {
      "name": "Gilded Talon",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "A strike of golden claws. Can be parried."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "A wave of gold over the arena: WIS save or lose your next reaction as a memory slips away. The Hexblade is immune."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "She draws a thread of soul from one hero and heals for the damage dealt."
    },
    {
      "name": "Forgetting",
      "dice": "0",
      "range": 6,
      "target": "s",
      "text": "WIS save or the target forgets one equipped ability until the end of their next turn."
    },
    {
      "name": "Echo: Absolute Zero",
      "dice": "6d8",
      "range": 8,
      "target": "a",
      "text": "Aethelric's frozen finisher, cast as a spell (toned down from 8d8)."
    },
    {
      "name": "Echo: Plague Bloom",
      "dice": "6d6",
      "range": 10,
      "target": "a",
      "text": "Kernunos's rot finisher, cast as a spell (toned down from 8d6)."
    },
    {
      "name": "Rime and Rot",
      "dice": "5d8",
      "range": 4,
      "target": "a",
      "text": "Aethelric's frost and Kernunos's rot together: frozen roots burst up. DEX save or restrained, and 1d8 rot for 2 rounds."
    }
  ],
  "Izat'al: phase 2 (both spared)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss that died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi'ram exist only if the party killed them. A spared boss's token works once in this fight: Arachne's silk restrains her 1 round; Odi'ram's ember cancels one of her big attacks."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroys weakens her for the whole fight. Fire: no more regeneration (30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (spells of 6th level or lower can target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba's): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "The crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open; that head breathes a cone. 1 fire (1 Ember if Odi'ram died, else burning 1d6), 2 ice (slowed), 3 lightning (no reaction), 4 poison (no healing 1 round), 5 rot (1d8 for 2 rounds), 6 void (pulled 2 squares). The roll is the tell."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises and dives on a spot. Dodge only."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "A wave of gold over the arena: WIS save or lose your next reaction as a memory slips away. The Hexblade is immune."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "She draws a thread of soul from one hero and heals for the damage dealt."
    }
  ],
  "Izat'al: phase 2 (Arachne fell)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss that died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi'ram exist only if the party killed them. A spared boss's token works once in this fight: Arachne's silk restrains her 1 round; Odi'ram's ember cancels one of her big attacks."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroys weakens her for the whole fight. Fire: no more regeneration (30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (spells of 6th level or lower can target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba's): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "The crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open; that head breathes a cone. 1 fire (1 Ember if Odi'ram died, else burning 1d6), 2 ice (slowed), 3 lightning (no reaction), 4 poison (no healing 1 round), 5 rot (1d8 for 2 rounds), 6 void (pulled 2 squares). The roll is the tell."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises and dives on a spot. Dodge only."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "A wave of gold over the arena: WIS save or lose your next reaction as a memory slips away. The Hexblade is immune."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "She draws a thread of soul from one hero and heals for the damage dealt."
    },
    {
      "name": "Echo: The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Arachne's collecting finisher. Every hero bound by a contract thread pays its price."
    },
    {
      "name": "Echo: Final Offer",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Arachne's venom and webs in a cone (toned down from 4d8)."
    }
  ],
  "Izat'al: phase 2 (Odi'ram fell)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss that died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi'ram exist only if the party killed them. A spared boss's token works once in this fight: Arachne's silk restrains her 1 round; Odi'ram's ember cancels one of her big attacks."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroys weakens her for the whole fight. Fire: no more regeneration (30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (spells of 6th level or lower can target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba's): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "The crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open; that head breathes a cone. 1 fire (1 Ember if Odi'ram died, else burning 1d6), 2 ice (slowed), 3 lightning (no reaction), 4 poison (no healing 1 round), 5 rot (1d8 for 2 rounds), 6 void (pulled 2 squares). The roll is the tell."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises and dives on a spot. Dodge only."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "A wave of gold over the arena: WIS save or lose your next reaction as a memory slips away. The Hexblade is immune."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "She draws a thread of soul from one hero and heals for the damage dealt."
    },
    {
      "name": "Echo: Sun's Collapse",
      "dice": "6d8",
      "range": 20,
      "target": "a",
      "text": "Odi'ram's finisher: telegraphed for 2 turns, then the arena erupts (toned down from 8d8). His Embers rule returns for this fight (burst at 4). Safe spots take half."
    }
  ],
  "Izat'al: phase 2 (both fell)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss that died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi'ram exist only if the party killed them. A spared boss's token works once in this fight: Arachne's silk restrains her 1 round; Odi'ram's ember cancels one of her big attacks."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroys weakens her for the whole fight. Fire: no more regeneration (30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (spells of 6th level or lower can target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba's): legendary actions 5 to 3."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "The crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open; that head breathes a cone. 1 fire (1 Ember if Odi'ram died, else burning 1d6), 2 ice (slowed), 3 lightning (no reaction), 4 poison (no healing 1 round), 5 rot (1d8 for 2 rounds), 6 void (pulled 2 squares). The roll is the tell."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises and dives on a spot. Dodge only."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "A wave of gold over the arena: WIS save or lose your next reaction as a memory slips away. The Hexblade is immune."
    },
    {
      "name": "Soul Tithe",
      "dice": "2d8",
      "range": 8,
      "target": "s",
      "text": "She draws a thread of soul from one hero and heals for the damage dealt."
    },
    {
      "name": "Echo: The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "Arachne's collecting finisher. Every hero bound by a contract thread pays its price."
    },
    {
      "name": "Echo: Final Offer",
      "dice": "3d8",
      "range": 6,
      "target": "a",
      "text": "Arachne's venom and webs in a cone (toned down from 4d8)."
    },
    {
      "name": "Echo: Sun's Collapse",
      "dice": "6d8",
      "range": 20,
      "target": "a",
      "text": "Odi'ram's finisher: telegraphed for 2 turns, then the arena erupts (toned down from 8d8). His Embers rule returns for this fight (burst at 4). Safe spots take half."
    },
    {
      "name": "Cinder Web",
      "dice": "5d8",
      "range": 6,
      "target": "a",
      "text": "Both fell: Arachne's threads set alight by Odi'ram's fire. Burning webs span the area: DEX save or bound (restrained) and 1 Ember at the start of each turn bound; a STR save breaks free. The fire spreads along the threads to any hero next to a bound one."
    }
  ],
  "Izat'al: phase 3 (the monster)": [
    {
      "name": "The Contract",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Every boss that died gave her their power: Aethelric, Kernunos, the Nameless King and Xibalba always do. The Echo moves of Arachne and Odi'ram exist only if the party killed them. A spared boss's token works once in this fight: Arachne's silk restrains her 1 round; Odi'ram's ember cancels one of her big attacks."
    },
    {
      "name": "Crystals",
      "dice": "0",
      "range": 20,
      "target": "a",
      "text": "GM rules. Each region crystal the party destroys weakens her for the whole fight. Fire: no more regeneration (30 HP at the start of each of her turns). Blue: AC 25 to 23. Green: loses limited magic immunity (spells of 6th level or lower can target her). Dark grey: loses immunity to poisoned and stunned. White: legendary resistances 5 to 2. Black (Xibalba's): legendary actions 5 to 3."
    },
    {
      "name": "Echo: Cloud Dragon's Judgement",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "Her son's finisher: she summons a twisted copy of his cloud dragon to strike the arena."
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
      "text": "Both children's powers together: everyone is pulled 2 squares, then lightning strikes each hero pulled."
    },
    {
      "name": "The Last Breath",
      "dice": "0",
      "range": 1,
      "target": "s",
      "text": "At 0 HP she does not fall: she begins to re-form. Only a strike from the Hexblade's blade finishes her; it devours her soul."
    },
    {
      "name": "Crowned Fang",
      "dice": "2d10",
      "range": 2,
      "target": "s",
      "text": "The crowned head bites. Can be parried."
    },
    {
      "name": "Dominion Breath",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Roll a d6 in the open; that head breathes a cone. 1 fire (1 Ember if Odi'ram died, else burning 1d6), 2 ice (slowed), 3 lightning (no reaction), 4 poison (no healing 1 round), 5 rot (1d8 for 2 rounds), 6 void (pulled 2 squares). The roll is the tell."
    },
    {
      "name": "Sky-Fall",
      "dice": "4d8",
      "range": 6,
      "target": "a",
      "text": "Telegraphed: she rises and dives on a spot. Dodge only."
    },
    {
      "name": "Golden Wave",
      "dice": "3d8",
      "range": 20,
      "target": "a",
      "text": "A wave of gold over the arena: WIS save or lose your next reaction as a memory slips away. The Hexblade is immune."
    }
  ]
}
