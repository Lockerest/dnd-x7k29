// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.

/** Drawn ability icons: SVG shapes on a 48 x 48 grid. */
export const GLYPHS: Record<string, string> = {
  "slash": "<path d=\"M10 40L40 10M18 42L42 18M8 32L32 8\"/>",
  "sword": "<path d=\"M24 5L28 30L24 34L20 30Z\"/><path d=\"M14 33H34M24 34V43\"/>",
  "shield": "<path d=\"M24 6L40 12V24C40 34 32 40 24 44C16 40 8 34 8 24V12Z\"/>",
  "arrow": "<path d=\"M8 40L38 10M38 10L27 12M38 10L36 21M8 40V31M8 40H17\"/>",
  "volley": "<path d=\"M6 30L30 6M30 6L21 8M30 6L28 15M14 42L38 18M38 18L29 20M38 18L36 27M22 44L44 22\"/>",
  "flame": "<path d=\"M24 5C28 16 38 20 36 32C35 40 29 44 24 44C18 44 12 40 12 32C12 25 19 22 20 14C22 17 24 11 24 5Z\"/><path d=\"M24 44C20 42 18 38 20 34C22 36 24 34 24 30C27 34 30 38 28 42\"/>",
  "bolt": "<path d=\"M28 4L12 26H22L18 44L36 20H26Z\"/>",
  "ice": "<path d=\"M24 5V43M8 14L40 34M8 34L40 14M18 7L24 12L30 7M18 41L24 36L30 41\"/>",
  "heal": "<path d=\"M20 8H28V20H40V28H28V40H20V28H8V20H20Z\"/>",
  "eye": "<path d=\"M3 24C12 10 36 10 45 24C36 38 12 38 3 24Z\"/><circle cx=\"24\" cy=\"24\" r=\"6\"/>",
  "vortex": "<path d=\"M24 24a3 3 0 0 1 6 0a8 8 0 0 1-16 0a14 14 0 0 1 28 0a20 20 0 0 1-40 0\"/>",
  "star": "<path d=\"M24 4L29 19L44 24L29 29L24 44L19 29L4 24L19 19Z\"/>",
  "skull": "<path d=\"M24 6C14 6 10 14 10 22C10 28 14 30 16 32V39H32V32C34 30 38 28 38 22C38 14 34 6 24 6Z\"/><circle cx=\"18\" cy=\"23\" r=\"3\"/><circle cx=\"30\" cy=\"23\" r=\"3\"/><path d=\"M24 29V33\"/>",
  "dash": "<path d=\"M5 15H31M11 24H43M5 33H29M36 16L43 24L36 32\"/>",
  "spear": "<path d=\"M7 41L33 15\"/><path d=\"M30 5L43 18L39 22L26 9Z\"/>",
  "hammer": "<path d=\"M8 10H32V24H8Z\"/><path d=\"M20 24V44M32 14L40 14\"/>",
  "shout": "<path d=\"M6 24L20 17V31Z\"/><path d=\"M26 15Q33 24 26 33M32 10Q44 24 32 38\"/>",
  "mirror": "<path d=\"M24 5L40 24L24 43L8 24Z\"/><path d=\"M24 5V43M14 18L20 14\"/>",
  "smoke": "<circle cx=\"15\" cy=\"29\" r=\"9\"/><circle cx=\"31\" cy=\"27\" r=\"11\"/><circle cx=\"23\" cy=\"17\" r=\"9\"/>",
  "portal": "<circle cx=\"24\" cy=\"24\" r=\"5\"/><circle cx=\"24\" cy=\"24\" r=\"12\"/><circle cx=\"24\" cy=\"24\" r=\"19\"/>",
  "drop": "<path d=\"M24 5C30 16 38 24 38 32C38 40 32 44 24 44C16 44 10 40 10 32C10 24 18 16 24 5Z\"/>",
  "hook": "<path d=\"M14 6V28A9 9 0 0 0 32 28V20M26 26L32 20L38 26\"/>",
  "sun": "<circle cx=\"24\" cy=\"24\" r=\"8\"/><path d=\"M24 4V11M24 37V44M4 24H11M37 24H44M10 10L15 15M33 33L38 38M38 10L33 15M15 33L10 38\"/>",
  "quake": "<path d=\"M4 38H44M24 38L20 29L29 23L22 14L27 6\"/><path d=\"M10 38L8 32M38 38L40 33\"/>",
  "dome": "<path d=\"M5 39A19 19 0 0 1 43 39Z\"/><path d=\"M14 39A10 10 0 0 1 34 39\"/>",
  "ghost": "<path d=\"M11 43V21A13 13 0 0 1 37 21V43L31 37L24 43L17 37Z\"/><circle cx=\"19\" cy=\"22\" r=\"2\"/><circle cx=\"29\" cy=\"22\" r=\"2\"/>",
  "fist": "<path d=\"M12 22V12H20V22M20 22V10H28V22M28 22V12H36V26C36 36 30 42 22 42C14 42 10 36 12 28Z\"/>",
  "cross": "<path d=\"M10 10L38 38M38 10L10 38\"/><circle cx=\"24\" cy=\"24\" r=\"16\"/>",
  "wave": "<path d=\"M4 18C10 10 16 26 24 18S38 10 44 18M4 32C10 24 16 40 24 32S38 24 44 32\"/>"
}

/** Which shape an ability gets: the first pattern its name matches (in order). */
export const GLYPH_RULES: [RegExp, string][] = [
  [/heal|mend|restor|second wind|rally|warmth|sanctuary|bolster|unbroken/i, "heal"],
  [/golden|oathbreaker/i, "sword"],
  [/volley|rain of arrow|barrage|arrowstorm|storm of barbs|ricochet/i, "volley"],
  [/meteor|cataclysm|fire|flame|ember|burn|wildfire|blaze/i, "flame"],
  [/frost|ice|freez|chill/i, "ice"],
  [/poison|venom|blossom|toxic/i, "drop"],
  [/rush|dash|tether|blink/i, "dash"],
  [/arrow|shot|dragonpiercer|nailing|pinning/i, "arrow"],
  [/lightning|bolt|static|\barc\b|tempest|chain|overcharge|surge|gale/i, "bolt"],
  [/frost|ice|freez|chill/i, "ice"],
  [/poison|venom|blossom|toxic/i, "drop"],
  [/shield|guard|bulwark|brace|stance|titanic|last bastion|indomitable|parry|barrier|iron/i, "shield"],
  [/ward|veil|shroud|cloak|camouflage|dome/i, "dome"],
  [/eye|predator|hunter|seeking|marked|heartseeker/i, "eye"],
  [/gravity|singularity|event horizon|void|rift|pull|spiral|vortex/i, "vortex"],
  [/mirror|image|decoy|double|illusion|mirage|echo|swap|phantom|hall of|curtain/i, "mirror"],
  [/smoke|sand|choking|distract|confus/i, "smoke"],
  [/step|rush|dash|charge|quick|tether|blink|flurry/i, "dash"],
  [/ghost|shadow|spirit/i, "ghost"],
  [/roar|cry|intimidat|taunt|shout/i, "shout"],
  [/hammer|crush|skull|slam|earthsplit|titan|fall|heavy|break|swing/i, "hammer"],
  [/spear|lance|lances|thrust|needle|thread|reach|pierc/i, "spear"],
  [/hook|haul|trip|cripple|hamstring|trap|hex/i, "hook"],
  [/radiant|dawn|sun|sigil|star|enchant|rune|elemental/i, "star"],
  [/disarm|pilfer|fool|sleight|backstab|jab|cutting|slash|strike|rend|cyclone|sweep|stab|edge|bash|combo/i, "slash"],
  [/push|force|wave|rain/i, "wave"],
]

/** Icon colour per class. */
export const CLASS_COLORS: Record<string, string> = {
  "fighter": "#c9833a",
  "archer": "#6fae55",
  "mage": "#5b83e0",
  "thief": "#9a63c4",
  "warrior": "#c8483b",
  "sorcerer": "#2fb3b3",
  "spearhand": "#9aa3b8",
  "magickarcher": "#3fbf9f",
  "trickster": "#d45c9c",
  "hexblade": "#a8323e",
  "duelist": "#c0965a"
}

/** Ability board choices: kinds, vocations, bonuses. */
export const KINDS: [string, string][] = [
  [
    "atk",
    "Attack"
  ],
  [
    "heal",
    "Heal"
  ],
  [
    "util",
    "Utility"
  ],
  [
    "check",
    "d20 check"
  ]
]
export const VOCATIONS: [string, string][] = [
  [
    "any",
    "Any vocation"
  ],
  [
    "fighter",
    "Fighter"
  ],
  [
    "archer",
    "Archer"
  ],
  [
    "mage",
    "Mage"
  ],
  [
    "thief",
    "Thief"
  ],
  [
    "warrior",
    "Warrior"
  ],
  [
    "sorcerer",
    "Sorcerer"
  ],
  [
    "spearhand",
    "Mystic Spearhand"
  ],
  [
    "magickarcher",
    "Magick Archer"
  ],
  [
    "trickster",
    "Trickster"
  ],
  [
    "hexblade",
    "Hexblade"
  ],
  [
    "duelist",
    "Duelist"
  ]
]
export const BONUSES: [string, string][] = [
  [
    "",
    "none"
  ],
  [
    "level",
    "level"
  ],
  [
    "str",
    "STR"
  ],
  [
    "dex",
    "DEX"
  ],
  [
    "int",
    "INT"
  ],
  [
    "wis",
    "WIS"
  ]
]
