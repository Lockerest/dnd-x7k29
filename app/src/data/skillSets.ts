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
      "target": "s"
    },
    {
      "name": "Rime Guard",
      "dice": "0",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Chain Pull",
      "dice": "2d8",
      "range": 3,
      "target": "s"
    }
  ],
  "Aethelric: phase 1 (all)": [
    {
      "name": "Warden's Cut",
      "dice": "2d8",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Rime Guard",
      "dice": "0",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Chain Pull",
      "dice": "2d8",
      "range": 3,
      "target": "s"
    },
    {
      "name": "Prison Bars",
      "dice": "3d8",
      "range": 3,
      "target": "a"
    },
    {
      "name": "Frostbite Cleave",
      "dice": "4d10",
      "range": 2,
      "target": "a"
    },
    {
      "name": "Cold Snap",
      "dice": "0",
      "range": 3,
      "target": "s"
    },
    {
      "name": "Warden's Toll",
      "dice": "0",
      "range": 8,
      "target": "a"
    }
  ],
  "Aethelric: phase 2 (golden)": [
    {
      "name": "Golden Slash",
      "dice": "2d10",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Shattering Wave",
      "dice": "5d8",
      "range": 4,
      "target": "a"
    },
    {
      "name": "Frozen Verdict",
      "dice": "6d8",
      "range": 6,
      "target": "s"
    },
    {
      "name": "Jailer's Embrace",
      "dice": "2d8",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Absolute Zero",
      "dice": "8d8",
      "range": 8,
      "target": "a"
    },
    {
      "name": "Last Gasp",
      "dice": "0",
      "range": 1,
      "target": "s"
    }
  ],
  "Arachne: phase 1 (all)": [
    {
      "name": "Thread Needle",
      "dice": "2d6",
      "range": 3,
      "target": "s"
    },
    {
      "name": "Silent Contract",
      "dice": "3d8",
      "range": 6,
      "target": "s"
    },
    {
      "name": "Web Snare",
      "dice": "0",
      "range": 4,
      "target": "a"
    },
    {
      "name": "Quiet Venom",
      "dice": "1d6",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Whisper Step",
      "dice": "0",
      "range": 6,
      "target": "s"
    },
    {
      "name": "Seen It Coming",
      "dice": "0",
      "range": 20,
      "target": "s"
    },
    {
      "name": "The Bill Comes Due",
      "dice": "0",
      "range": 20,
      "target": "a"
    }
  ],
  "Arachne: phase 2 (all)": [
    {
      "name": "Fang Bite",
      "dice": "2d10",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Leg Skewer",
      "dice": "3d10",
      "range": 2,
      "target": "s"
    },
    {
      "name": "Web Cocoon",
      "dice": "0",
      "range": 2,
      "target": "s"
    },
    {
      "name": "Venom Mist",
      "dice": "0",
      "range": 3,
      "target": "a"
    },
    {
      "name": "Ceiling Drop",
      "dice": "4d8",
      "range": 2,
      "target": "a"
    },
    {
      "name": "Silk Net",
      "dice": "0",
      "range": 4,
      "target": "a"
    },
    {
      "name": "Final Offer",
      "dice": "4d8",
      "range": 6,
      "target": "a"
    }
  ],
  "Kernunos: phase 1 (all)": [
    {
      "name": "Antler Gore",
      "dice": "2d8",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Thorn Whip",
      "dice": "2d6",
      "range": 2,
      "target": "s"
    },
    {
      "name": "Spore Burst",
      "dice": "1d6",
      "range": 3,
      "target": "a"
    },
    {
      "name": "Entangling Roots",
      "dice": "2d6",
      "range": 3,
      "target": "a"
    },
    {
      "name": "Stag Charge",
      "dice": "4d10",
      "range": 6,
      "target": "a"
    },
    {
      "name": "Heartwood Bloom",
      "dice": "0",
      "range": 1,
      "target": "s"
    },
    {
      "name": "Thorned Hide",
      "dice": "0",
      "range": 1,
      "target": "s"
    },
    {
      "name": "The Bloom Withers",
      "dice": "0",
      "range": 20,
      "target": "a"
    }
  ],
  "Kernunos: phase 2 (all)": [
    {
      "name": "Rot Claw",
      "dice": "2d10",
      "range": 2,
      "target": "s"
    },
    {
      "name": "Maggot Swarm",
      "dice": "5d6",
      "range": 3,
      "target": "a"
    },
    {
      "name": "Bursting Pods",
      "dice": "5d8",
      "range": 4,
      "target": "a"
    },
    {
      "name": "Rotting Embrace",
      "dice": "2d8",
      "range": 2,
      "target": "s"
    },
    {
      "name": "Grave Roots",
      "dice": "3d8",
      "range": 6,
      "target": "a"
    },
    {
      "name": "Vomit of Decay",
      "dice": "6d6",
      "range": 3,
      "target": "a"
    },
    {
      "name": "Plague Bloom",
      "dice": "8d6",
      "range": 10,
      "target": "a"
    }
  ],
  "Kernunos: phase 3 (rooted)": [
    {
      "name": "Spring Returns",
      "dice": "0",
      "range": 20,
      "target": "a"
    },
    {
      "name": "Withering Drain",
      "dice": "2d8",
      "range": 20,
      "target": "a"
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
