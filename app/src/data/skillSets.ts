// Started from the live page (index.html). The parity tests check the sets the
// backup page has stay unchanged; sets added since the cutover (Nameless King) are the app's own.
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
  ]
}
