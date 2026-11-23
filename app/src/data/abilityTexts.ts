// Precise ability texts (1.20.0). They replace the short texts of the class board
// wherever an ability is described (the Reference, the sheet, equipping), even on a
// board saved before: the board keeps its numbers, these words say exactly what the
// ability does, what it can't do and when it ends early.
//
// Shared terms (also shown above the Reference table, see ABILITY_GLOSSARY):
// damage is dice + your class stat modifier, every number is x10 on the table,
// 1 square = 5 ft, "for N rounds" lasts until the start of your Nth turn from now.

/** How to read every ability: shown once above the class abilities. */
export const ABILITY_GLOSSARY = [
  'Every ability uses 1 of your 2 actions on your turn unless it says Reaction, Passive or charge (a whole turn). Its stamina is paid when you use it, even if it misses.',
  'Attack: roll d20 + your attack bonus against the target’s AC. No attack roll: it always reaches its target(s), who may get a save instead. A natural 20 is a critical hit (damage dice doubled).',
  'Damage and healing are the dice + your class stat modifier (STR, DEX or INT, shown on each ability) unless it says otherwise. Dice results are x10 on the table, like your HP; flat numbers written in an ability (50 temporary HP, 20 stamina, 40 absorbed) are already table numbers.',
  '1 square = 5 ft. "For 2 rounds" lasts until the start of your second turn from now. "Until your next turn" ends at the start of your next turn.',
  'Unless an ability says so: effects end early if you drop to 0 HP, the same ability doesn’t stack with itself (using it again restarts its duration), and only enemies are affected.',
]

/** How to read every boss move: shown once above the Boss abilities. */
export const BOSS_GLOSSARY = [
  'Attack roll: d20 + the boss’s attack bonus against one hero’s AC. No attack roll: it always reaches everyone in the area, who make the save it names. Every save (and every Dodge Roll or Parry) is rolled against that move’s attack total. "For half": a beaten save halves the damage; anything else in the move happens only on a failed save.',
  'Parry works only on a single-target weapon, claw, bite, tail, chain or thrown attack, and only where the move says "Can be parried". Area moves, spells, beams, breath, fire, frost, lightning, poison and sound: dodge only. "A parry still takes half": even a beaten Parry halves the damage instead of stopping it. "Can’t be dodged": Dodge Roll does nothing against it.',
  'Telegraphed: announcing it uses the boss’s action; it lands on his next turn, exactly where it was marked, so heroes get their turns to move out. Leaving the marked area avoids it completely. It fizzles if the boss is stunned, killed or changes phase before it lands. A telegraphed move is never used twice in a row.',
  'Prone: standing up costs half your movement; melee attacks against you have advantage. Restrained: speed 0, attacks against you have advantage, yours have disadvantage. Slowed: half movement. Frightened: disadvantage on attacks against the source, can’t move closer to it. Poisoned: disadvantage on attacks. "Until the end of their next turn" includes that whole turn.',
  'Dice are x10 like HP (2d8 rolled 9 = 90). 1 square = 5 ft, counted from the edge of the boss’s base. "GM rules" rows are not attacks: they hold the fight’s numbers and order (roll a d6 for the move unless it says otherwise).',
]

/** Precise text by ability name (Golden and Crimson versions by their full name). */
export const ABILITY_TEXTS: Record<string, string> = {
  // ---- Fighter (STR) ----
  'Power Strike': 'Attack: one heavy blow at an adjacent enemy. On a hit: 2d8 + STR damage, instead of your weapon’s damage (it doesn’t add to a light or heavy attack). On a miss: nothing.',
  'Multi-Slash': 'Attack, adjacent: a fast follow-up slash, 2d6 + STR on a hit. Cheap filler between your bigger moves.',
  'Shield Bash':
    'No attack roll, needs a shield: bash an adjacent enemy for 1d4 + STR. It makes a STR save (DC 8 + your attack bonus) or falls prone until it stands up on its turn. Huge enemies (size 3 or more) can’t be knocked prone, only damaged.',
  'Second Wind': 'Heal yourself 1d10 + your level. Only yourself. Can’t raise you from 0 HP (you’re down and can’t act). Doesn’t cure fatigue or the revival curse.',
  'Rending Combo':
    'Attack: three rapid swings at one adjacent enemy. Roll each swing to hit separately; each hit deals 1d8 + STR (so up to 3d8 + 3x STR). Each swing can be dodged or parried on its own. If the target dies, the remaining swings stop. Versus Power Strike: three chances that each add STR, against one sure big hit.',
  'Rending Combo (Golden)':
    'Golden form of Rending Combo. Needs Rending Combo equipped. Attack: four swings at one adjacent enemy, each rolled to hit separately; each hit deals 1d8 + 1d6 + STR. Each swing can be dodged or parried on its own; the rest stop if the target dies. Costs 10% of your max HP when used (never drops you below 1 HP).',
  'Shield Wall':
    'Choose one ally within 1 square. Until the start of your next turn, every hit meant for them hits you instead, and you take half damage from those hits. Ends early if they move more than 1 square away from you, or you drop to 0 HP. Area attacks still hit them normally.',
  'Bulwark Charge':
    'Attack: rush up to 3 squares in a straight line (no stamina for this movement, but you must have a clear path) and slam an enemy at the end. On a hit: 3d8 + STR, and it makes a STR save or is pushed 2 squares away from you. Size 3+ enemies can’t be pushed.',
  'Bulwark Charge (Golden)':
    'Golden form of Bulwark Charge. Needs Bulwark Charge equipped. Rush up to 3 squares in a straight line and slam: on a hit 4d8 + 3d6 + STR, and a STR save or pushed 2 squares (size 3+ can’t be pushed). Costs 15% of your max HP when used (never below 1 HP).',
  'Cyclone Slash':
    'One attack roll compared to each adjacent enemy’s AC: every one it beats takes 4d8 + STR and makes a STR save or falls prone (size 3+ can’t be knocked prone). Never hits allies. Each target may dodge or parry it separately.',
  Indomitable:
    'Passive (still takes an equip slot). Once between rests at an altar, when damage would drop you to 0 HP, you stay at 1 HP instead. It does nothing against effects that kill outright, and it’s used up even if you’d have been healed right after.',
  Oathbreaker:
    'Charge: using it takes your whole turn (both actions) and you can’t Dodge or Parry until your next turn. On your next turn, release it for free: Attack, one adjacent enemy, 5d10 + STR that ignores poise (it can’t be blocked by poise and always counts as a stagger hit). If you are stunned, knocked down or drop to 0 HP while charging, the charge is lost (stamina stays spent).',
  'Oathbreaker (Golden)':
    'Golden form of Oathbreaker. Needs Oathbreaker equipped. Same charge rules (whole turn, no Dodge or Parry until released, lost if stunned, knocked down or dropped). Release: 7d10 + STR that ignores poise. Costs 25% of your max HP when you start charging (never below 1 HP).',
  'Iron Stance':
    'Plant your feet: +2 AC, and you can’t be pushed, pulled or knocked prone, for 2 rounds. Ends early the moment you move by choice (walking, dashing, Dodge Roll or any ability that moves you), if you are stunned, or drop to 0 HP. Being moved against your will doesn’t end it, because you can’t be. You can still attack, Parry and use abilities that don’t move you.',
  'Vanguard Rush': 'Attack: dash up to 3 squares (no stamina for this movement) and strike an enemy you end next to: 3d6 + STR on a hit. The dash still provokes free attacks from enemies you leave.',
  'Taunting Roar':
    'Every enemy within 4 squares that can hear you must make its next attack against you (if it can reach you; if it can’t, it must move toward you instead). Lasts until each of them has made that one attack, or until the start of your next turn. Bosses that are telegraphing a move finish it first.',
  Hamstring:
    'Attack: a low cut on an adjacent enemy: 3d8 + STR, and on a hit its speed is halved for 2 rounds. Doesn’t stack with other slows (the strongest one applies). Flying enemies are slowed but don’t fall.',
  'Last Bastion':
    'You and every ally within 2 squares gain 50 temporary HP for 2 rounds. Temporary HP is lost first and can’t be healed back. It doesn’t add to temporary HP someone already has: they keep the higher amount.',
  'Titanic Guard': 'For 2 rounds you take half damage from everything and can’t be staggered, pushed or knocked prone. You can still be grappled or restrained. Ends early if you drop to 0 HP.',

  // ---- Archer (DEX) ----
  'Piercing Shot': 'Attack, range 8 squares: one arrow for 2d6 + DEX. It ignores half cover (the target gets no AC bonus from half cover). Full cover still blocks it.',
  'Triple Volley': 'Range 6 squares: three arrows at one enemy, each rolled to hit separately at -2. Each hit deals 1d4 + DEX. Each arrow can be dodged on its own; the rest stop if the target dies.',
  'Pinning Shot':
    'No attack roll, range 6 squares: an arrow pins one enemy for 1d6 + DEX. It makes a DEX save or its speed is 0 until the start of your next turn (it can still attack and use abilities in place). Flying enemies are grounded only if they’re within reach of a surface.',
  "Hunter's Eye": 'Mark one enemy you can see. Your next hit on it this turn or next is a critical on a 19 or 20. Ends after that one attack, or at the end of your next turn.',
  Arrowstorm:
    'One attack roll at -2, range 8 squares: three arrows in a burst at one enemy. On a hit all three land, 3d6 + DEX in total. On a miss, none do. The -2 is to the roll only; it costs no extra stamina.',
  'Arrowstorm (Golden)':
    'Golden form of Arrowstorm. Needs Arrowstorm equipped. One attack roll with no -2 penalty, range 8: four arrows, 8d6 + DEX in total on a hit. Costs 10% of your max HP when used (never below 1 HP).',
  'Nailing Shot': 'Attack, range 8 squares: 2d6 + DEX on a hit, and the target makes a DEX save or its speed is 0 until the start of your next turn. It can still attack in place.',
  'Wildfire Arrow':
    'Attack, range 10 squares: 3d8 + DEX fire to the target on a hit. Hit or miss, the square it lands in (the target’s, or behind it on a miss) burns until the start of your next turn: anyone who starts a turn there or walks into it takes 1d6 fire. Allies too.',
  'Wildfire Arrow (Golden)':
    'Golden form of Wildfire Arrow. Needs Wildfire Arrow equipped. Attack, range 10: 4d8 + 3d6 + DEX fire on a hit; the burning square deals 1d6 to anyone (allies too) who starts a turn there or enters it, until the start of your next turn. Costs 15% of your max HP (never below 1 HP).',
  "Predator's Eye":
    'Your next 2 attacks (within the next 2 rounds) are critical hits on a 19 or 20 and ignore half and three-quarters cover. Full cover still blocks. Unused shots are lost after 2 rounds.',
  'Rain of Arrows': 'No attack roll, range 10 squares: arrows rain on a 3-square-wide area (3x3). Everyone in it takes 4d6 + DEX, DEX save for half. It hits allies inside too, so aim carefully.',
  Dragonpiercer:
    'Attack, range 12 squares: a shot in a straight 12-square line. Roll once and compare to each creature’s AC in the line: every enemy it beats takes 6d8 + DEX. Allies in the line are not hit. Walls and full cover stop it.',
  'Dragonpiercer (Golden)':
    'Golden form of Dragonpiercer. Needs Dragonpiercer equipped. Same 12-square line, one roll compared to each enemy’s AC: 8d8 + DEX to each it beats. Costs 20% of your max HP (never below 1 HP).',
  'Poison Arrow':
    'Attack, range 8 squares: 2d6 + DEX on a hit, and the target makes a CON save or is poisoned for 2 rounds (disadvantage on its attack rolls). Undead and constructs can’t be poisoned.',
  'Quick Step': 'Move up to 4 squares without provoking free attacks and without paying stamina for those squares, then +1 AC until the start of your next turn. Can’t move through enemies or walls.',
  'Frost Arrow': 'Attack, range 10 squares: 3d6 + DEX cold on a hit, and the target’s speed is halved for 2 rounds. Doesn’t stack with other slows (the strongest applies).',
  'Ricochet Shot':
    'Attack, range 8 squares: 3d6 + DEX on a hit, then the arrow bounces to a second enemy within 2 squares of the first: roll again to hit it, 3d6 + DEX on a hit. No bounce if the first shot misses.',
  Camouflage:
    'You become hidden: enemies lose track of you and can’t target you with single-target attacks until you attack, use an ability on an enemy, or end your turn in the open next to an enemy. Area attacks still hit you. Your first attack from hiding has advantage and ends it.',
  'Storm of Barbs': 'No attack roll, range 10 squares: barbed arrows cover a 4x4-square area. Every enemy in it takes 5d8 + DEX, DEX save for half. Allies in the area are not hit.',

  // ---- Mage (INT) ----
  Firebolt: 'Attack, range 8 squares: a bolt of fire, 2d10 + INT on a hit. Fire can’t be parried, only dodged.',
  'Ember Burst':
    'No attack roll, range 6 squares: an explosion with a 4-square radius around a point you choose. Everyone in it (allies too, unless your Spell Shaping leaves them out) takes 6d6 + INT fire, DEX save for half.',
  'Arcane Ward':
    'A shield of force on yourself that absorbs the next 50 + 10 per level damage. It lasts until it has absorbed that much or the fight ends. Casting it again replaces the old ward, it doesn’t add up.',
  'Mending Light': 'Heal one ally within 6 squares (or yourself) 2d8 + INT. Once per turn, even if you have actions left. Can’t revive someone at 0 HP.',
  'Arcane Barrage': 'Three seeking bolts of force, range 8 squares, at one enemy: one attack roll for all three; on a hit, 3d10 + INT force in total. Force is just the damage type: it doesn’t push.',
  'Arcane Barrage (Golden)':
    'Golden form of Arcane Barrage. Needs Arcane Barrage equipped. Same three bolts, one attack roll, range 8: 4d12 + INT force on a hit. Costs 10% of your max HP (never below 1 HP).',
  'Ward of Ages':
    'Put a force ward on yourself or one ally within 6 squares: it absorbs the next 50 + 10 per level damage, then breaks. It lasts until broken or the fight ends. Only one Ward of Ages per creature; it doesn’t stack with Arcane Ward (the larger one stays).',
  'Lightning Lash': 'Attack, range 8 squares: a whip of lightning, 4d8 + INT on a hit. Lightning can’t be parried, only dodged.',
  'Lightning Lash (Golden)': 'Golden form of Lightning Lash. Needs Lightning Lash equipped. Attack, range 8: 5d8 + 2d6 + INT lightning on a hit. Costs 15% of your max HP (never below 1 HP).',
  Frostbind:
    'A 3-square cone of cold in front of you (range 6 for where it starts): one attack roll compared to each creature’s AC in the cone; each one beaten takes 5d6 + INT cold and makes a CON save or has its speed halved for 2 rounds. Allies in the cone are hit too unless Spell Shaping leaves them out.',
  'Mirror Image':
    'Three illusory copies of you appear. Each time an attack would hit you, one image takes it instead and vanishes (area attacks hit you and pop every image). They last until all three are gone or the fight ends.',
  'Meteor Fall':
    'Charge: using it takes your whole turn and you can’t Dodge or Parry until your next turn. On your next turn, release it for free on a point within 8 squares: everything in a 6-square radius takes 9d6 + INT fire, DEX save for half (allies too, unless Spell Shaping leaves them out). Lost if you are stunned, knocked down or drop to 0 HP while charging.',
  'Meteor Fall (Golden)':
    'Golden form of Meteor Fall. Needs Meteor Fall equipped. Same charge rules; release: 12d6 + INT fire in a 6-square radius, DEX save for half. Costs 20% of your max HP when you start charging (never below 1 HP).',
  'Force Push':
    'Attack, range 6 squares: 2d8 + INT force on a hit, and the target is pushed 2 squares straight away from you. Size 3+ enemies take the damage but aren’t pushed. A wall stops the push.',
  'Restoring Light': 'Heal one ally within 6 squares (or yourself) 3d8 + INT. Can’t revive someone at 0 HP.',
  'Gale Burst':
    'No attack roll, range 6 squares: a burst of wind around one enemy hits it and everyone within 1 square of it: 3d6 + INT, DEX save for half. Allies next to the target are hit too unless Spell Shaping leaves them out.',
  'Greater Mending': 'Heal one ally within 6 squares (or yourself) 4d8 + INT. Can’t revive someone at 0 HP.',
  'Blink Step': 'Teleport up to 4 squares to a free square you can see. Doesn’t provoke free attacks and costs no movement stamina. Can’t pass through magical barriers.',
  'Void Lance': 'Attack, range 10 squares: a single lance of void energy at one enemy, 5d10 + INT on a hit. It can’t be parried, only dodged.',

  // ---- Thief (DEX) ----
  Backstab:
    'Attack, adjacent: 3d6 + DEX on a hit. If you have advantage on the attack or an ally is next to the target, it deals +2d6 more. This bonus is separate from Sneak Attack, and both can apply.',
  'Cutting Flurry':
    'Two quick light-weapon strikes at one adjacent enemy, each rolled to hit separately; each hit deals 1d6 + DEX. Each can be dodged or parried on its own; the second stops if the target dies.',
  'Smoke Bomb':
    'A 1-square cloud (3x3, centred on you) that blocks sight completely until the start of your next turn. Creatures inside can’t be targeted by attacks from outside, and you can move out of it without provoking free attacks this turn. Area attacks still hit inside.',
  Pilfer:
    'DEX check (d20 + DEX) against the GM’s DC to lift a small item (a potion, a key, a pouch) from an adjacent creature mid-fight. On a fail it notices. Can’t take something held in a hand or worn as armour.',
  'Shadow Flurry': 'Three light strikes at one adjacent enemy with one attack roll: on a hit all three land, 3d6 + DEX in total. On a miss, none do.',
  'Shadow Flurry (Golden)': 'Golden form of Shadow Flurry. Needs Shadow Flurry equipped. One attack roll, adjacent: 8d6 + DEX in total on a hit. Costs 10% of your max HP (never below 1 HP).',
  'Choking Smoke': 'A 3x3-square cloud within 6 squares, until the start of your next turn: enemies inside have disadvantage on attack rolls. Allies inside are not affected. It doesn’t block sight.',
  'Venomous Edge': 'No attack roll, adjacent: a poisoned cut that always lands, 3d6 + DEX poison. It can be dodged but not parried. Undead and constructs take no poison damage (they take nothing).',
  'Venomous Edge (Golden)':
    'Golden form of Venomous Edge. Needs Venomous Edge equipped. No attack roll, adjacent: 7d6 + DEX poison. Can be dodged, not parried. Costs 15% of your max HP (never below 1 HP).',
  'Marked for Death':
    'Mark one enemy you can see. For the rest of the fight you have advantage on attacks against it and deal +1d8 to it on every hit. Only one mark at a time: marking another ends the first. Ends if the target dies or you drop to 0 HP.',
  'Ghost Step':
    'Reaction (no action), once per round: right after you take a hit, vanish and reappear in a free square within 3 squares you can see. You still take that hit’s damage. Doesn’t provoke free attacks.',
  Heartseeker:
    'Attack, adjacent: 8d6 + DEX on a hit. If you are behind the target (opposite side from the creature it last attacked) or an ally is next to it, the hit is automatically a critical (dice doubled). You still need to hit.',
  'Heartseeker (Golden)':
    'Golden form of Heartseeker. Needs Heartseeker equipped. Attack, adjacent: 10d6 + DEX on a hit; automatic critical from behind or with an ally next to the target. Costs 20% of your max HP (never below 1 HP).',
  'Pocket Sand':
    'One adjacent enemy makes a DEX save or is blinded until the start of your next turn (disadvantage on its attacks, and attacks against it have advantage). Creatures without eyes are immune.',
  Tripwire:
    'Set a tripwire across up to 2 adjacent squares next to you. The first enemy that walks into it falls prone (no save) and the wire is gone. Size 3+ enemies snap it without falling. It lasts until triggered or the fight ends; only one at a time.',
  Cripple: 'Attack, adjacent: 3d6 + DEX on a hit, and the target’s speed is 0 until the start of your next turn. Flying enemies are slowed to 0 but stay in the air.',
  'Shadow Cloak': 'Until the end of your next turn: advantage on stealth checks, and your next attack from hiding has advantage (on top of Sneak Attack). Ends when you make that attack.',
  'Disarming Cut':
    'Attack, adjacent: 4d6 + DEX on a hit, and the target makes a DEX save or drops its weapon in its square (it must use an action to pick it up). Natural weapons (claws, jaws) can’t be dropped.',
  'Death Blossom': 'No attack roll: you strike every enemy adjacent to you for 6d6 + DEX each. Each target may dodge it. Never hits allies.',

  // ---- Warrior (STR) ----
  'Heavy Swing': 'Attack, adjacent: a big two-handed swing, 2d6 + STR on a hit.',
  'Guard Break': 'Attack, adjacent: 1d10 + STR on a hit, and the target can’t Parry or use a shield until the start of your next turn.',
  Brace: 'Until the start of your next turn you can’t be staggered and get +2 on saves against being pushed or knocked prone. Ends early if you move by choice.',
  Skullsplitter: 'Attack, adjacent: one crushing blow, 3d12 + STR on a hit. It counts as 2 hits toward your Stagger rule (so it can complete a stagger faster).',
  'Skullsplitter (Golden)':
    'Golden form of Skullsplitter. Needs Skullsplitter equipped. Attack, adjacent: 4d12 + STR on a hit, counting as 2 hits toward Stagger. Costs 10% of your max HP (never below 1 HP).',
  'Ground Slam': 'One attack roll compared to the AC of every enemy within 2 squares of you: each one beaten takes 3d8 + STR and makes a STR save or falls prone (size 3+ can’t). Never hits allies.',
  'Crushing Blow': 'Attack, adjacent: 4d10 + STR on a hit, and the target’s armour is broken: -2 AC for 2 rounds. Doesn’t stack with itself (refreshes instead).',
  'Crushing Blow (Golden)':
    'Golden form of Crushing Blow. Needs Crushing Blow equipped. Attack, adjacent: 5d10 + STR on a hit, and -2 AC for 2 rounds (doesn’t stack). Costs 15% of your max HP (never below 1 HP).',
  'War Cry': 'You and every ally within 6 squares deal +1d4 damage on every hit for 2 rounds. Doesn’t stack with another War Cry.',
  Unbroken: 'Passive (still takes an equip slot): your poise is 50% higher, and while you are above half HP you can’t be staggered at all.',
  "Titan's Fall": 'Attack: leap up to 4 squares (over obstacles and enemies, no free attacks, no movement stamina) and land on one enemy: 6d10 + STR on a hit. On a miss you still land next to it.',
  "Titan's Fall (Golden)": 'Golden form of Titan’s Fall. Needs Titan’s Fall equipped. Same leap; 8d10 + STR on a hit. Costs 20% of your max HP (never below 1 HP).',
  'Hammer Fall': 'Attack, adjacent: a slow crushing blow, 3d10 + STR on a hit, and the target’s speed is halved for 2 rounds (doesn’t stack with other slows).',
  'Shoulder Charge':
    'Attack: rush up to 2 squares in a straight line (no movement stamina) and slam an enemy: 3d8 + STR on a hit, and it is shoved 2 squares away (size 3+ can’t be shoved). A wall stops the shove.',
  Rally: 'Heal one ally within 3 squares (or yourself) 2d8 + your level. Can’t revive someone at 0 HP.',
  Intimidate: 'Every enemy within 3 squares that can see you makes a WIS save or has disadvantage on its attacks until the start of your next turn. Mindless creatures are immune.',
  'Bulwark Stance': 'Until the start of your next turn you take half damage from everything, but your speed is halved. Ends early if you drop to 0 HP.',
  Earthsplitter:
    'One attack roll compared to each creature’s AC in a straight 4-square line in front of you: each enemy beaten takes 5d12 + STR. The line becomes difficult terrain for the rest of the fight. Allies in the line are not hit.',

  // ---- Sorcerer (INT) ----
  'Elemental Bolt': 'Attack, range 6 squares: a bolt of fire, ice or lightning (your choice, it counts for Elemental Charge), 2d8 + INT on a hit. Can’t be parried, only dodged.',
  'Burning Ground':
    'No attack roll, range 6 squares: a 2x2-square area bursts into flame: everyone in it takes 3d6 + INT fire, DEX save for half. The ground keeps burning until the start of your next turn (1d6 to anyone who enters or starts there, allies too). Counts as fire.',
  'Frost Veil': 'You resist cold and fire (take half damage from them) for the rest of the fight. Ends if you drop to 0 HP.',
  'Tempest Lances':
    'Range 8 squares: three lances at one enemy, each rolled to hit separately. Choose fire, ice or lightning for each lance (any mix; each counts for Elemental Charge). Each hit deals 1d8 + INT. Can’t be parried; each can be dodged on its own.',
  'Tempest Lances (Golden)':
    'Golden form of Tempest Lances. Needs Tempest Lances equipped. Range 8: four lances at one enemy, any mix of elements, each rolled to hit separately; each hit deals 1d10 + INT. Costs 10% of your max HP (never below 1 HP).',
  'Elemental Ward': 'You and one ally within 6 squares resist one element you choose (fire, ice or lightning): half damage from it for the rest of the fight. Casting it again changes the element.',
  'Elemental Surge': 'Attack, range 8 squares: a surge of the element you choose (counts for Elemental Charge), 5d8 + INT on a hit. Can’t be parried.',
  'Elemental Surge (Golden)': 'Golden form of Elemental Surge. Needs Elemental Surge equipped. Attack, range 8: 7d8 + INT of the chosen element. Costs 15% of your max HP (never below 1 HP).',
  'Chain Lightning':
    'No attack roll, range 8 squares: lightning hits one enemy, then jumps to up to 3 more enemies, each within 2 squares of the last. Each one takes 4d8 + INT, DEX save for half. It never jumps to allies. Counts as lightning.',
  Overcharge: 'Passive (still takes an equip slot): once between rests at an altar, cast one spell for 0 stamina. Say so before casting. It doesn’t remove a spell’s HP cost.',
  Cataclysm:
    'Charge: using it takes your whole turn and you can’t Dodge or Parry until your next turn. On your next turn, release it for free: every enemy within 8 squares of you takes 8d8 + INT, DEX save for half. Allies are never hit. Lost if you are stunned, knocked down or drop to 0 HP while charging.',
  'Cataclysm (Golden)':
    'Golden form of Cataclysm. Needs Cataclysm equipped. Same charge rules; release: 10d8 + INT to every enemy within 8 squares, DEX save for half. Costs 20% of your max HP when you start charging (never below 1 HP).',
  'Ember Warmth': 'Heal one ally within 4 squares (or yourself) 2d8 + INT. Counts as fire for Elemental Charge.',
  'Static Field':
    'No attack roll, range 6 squares: a crackling field on one enemy and everything within 1 square of it: 3d6 + INT lightning, DEX save for half. Allies inside are hit too. Counts as lightning.',
  'Healing Rain': 'Heal one ally within 6 squares (or yourself) 3d8 + INT.',
  'Ice Prison':
    'Range 6 squares: one enemy makes a CON save or is encased in ice: restrained (speed 0, disadvantage on attacks, attacks against it have advantage) for 2 rounds. It repeats the save at the end of each of its turns and breaks free on a success. Size 4 enemies are only slowed (speed halved). Counts as ice.',
  'Flame Wreath': 'For 2 rounds, any enemy that hits you with a melee attack takes 2d6 fire right after (no save). Ranged attackers are not burned.',
  'Arc Storm': 'No attack roll, range 10 squares: a lightning storm on a 4x4-square area: every enemy in it takes 6d8 + INT lightning, DEX save for half. Allies are not hit. Counts as lightning.',

  // ---- Spearhand (STR) ----
  'Spear Thrust': 'Attack, reach 2 squares: 2d6 + STR on a hit.',
  'Sweeping Lance': 'One attack roll compared to each enemy within 2 squares in front of you (a 3-square-wide arc): each one beaten takes 2d8 + STR. Never hits allies.',
  'Pull Stance':
    'Ready a pull until the start of your next turn: the first enemy that ends its move within 2 squares of you is pulled next to you (STR save to resist). Ends early if you move by choice.',
  'Spiral Lance':
    'Attack, reach 2: three thrusts with one attack roll. On a hit, 3d8 + STR in total and the last thrust pulls the target 2 squares toward you (size 3+ isn’t pulled). On a miss, nothing.',
  'Spiral Lance (Golden)':
    'Golden form of Spiral Lance. Needs Spiral Lance equipped. Attack, reach 2: 4d8 + 4d6 + STR on a hit and a 2-square pull (not size 3+). Costs 10% of your max HP (never below 1 HP).',
  'Tether Dash': 'Dash up to 4 squares straight to an enemy (no movement stamina, doesn’t provoke) and make one free Attack at it: 2d8 + STR on a hit.',
  'Gravity Pull': 'No attack roll, range 4 squares: pull one enemy straight to you and hit it for 3d6 + STR. STR save to resist the pull (it still takes the damage). Size 3+ enemies aren’t pulled.',
  'Gravity Pull (Golden)':
    'Golden form of Gravity Pull. Needs Gravity Pull equipped. No attack roll, range 4: pull and 7d6 + STR (STR save resists only the pull; size 3+ not pulled). Costs 15% of your max HP (never below 1 HP).',
  'Rift Lance': 'No attack roll: every enemy within 3 squares is pulled next to you and takes 3d6 + STR, STR save for half damage and no pull. Size 3+ enemies aren’t pulled. Never affects allies.',
  'Spell Parry':
    'Reaction (no action), once per round: cancel one spell or projectile aimed at you or an adjacent ally. It can’t cancel area effects, cones, lines, breath or beams. You must see it coming (not while blinded).',
  'Singularity Spear':
    'Attack, range 8 squares: hurl your spear at one enemy, 6d8 + STR on a hit. Hit or miss, a gravity well forms there: every enemy within 4 squares is pulled 2 squares toward it (STR save to resist; size 3+ aren’t pulled). Your spear returns to you.',
  'Singularity Spear (Golden)': 'Golden form of Singularity Spear. Needs Singularity Spear equipped. Same throw and gravity well; 8d8 + STR on a hit. Costs 20% of your max HP (never below 1 HP).',
  'Reaching Guard': '+2 AC against melee attacks for 2 rounds. Doesn’t help against spells, arrows or area attacks. Ends early if you drop your spear.',
  'Lance Sweep': 'One attack roll compared to each enemy within your 2-square reach (all around you): each one beaten takes 3d6 + STR. Never hits allies.',
  'Hook and Haul': 'Attack, range 5 squares: 3d6 + STR on a hit, and the target is pulled 3 squares toward you (size 3+ isn’t pulled).',
  'Gravity Shield': 'Absorb the next 40 damage you take before the start of your next turn. Whatever isn’t used is lost then.',
  'Thread the Needle': 'Attack, reach 2: a precise thrust, 4d8 + STR on a hit, and a critical hit on a 19 or 20.',
  'Event Horizon':
    'No attack roll, range 6 squares: pick a point; every enemy within 4 squares of it is pulled to it and takes 6d8 + STR, then its speed is halved for 2 rounds. STR save: half damage, no pull, not slowed. Size 4 enemies aren’t pulled. Never affects allies.',

  // ---- Magick Archer (DEX) ----
  'Enchanted Arrow': 'Attack, range 8 squares: 2d6 + DEX magick on a hit. Can’t be parried.',
  'Sigil Shot': 'Attack, range 8 squares: 2d8 + DEX on a hit. Hit or miss, it leaves a sigil on the target’s square (see Lingering Sigils).',
  'Healing Sigil': 'Heal one ally within 8 squares (or yourself) 2d6 + INT. With True Flight it never misses. Leaves a sigil on their square.',
  'Sigil Volley':
    'Range 8 squares: three enchanted arrows at one enemy, each rolled to hit separately; each hit deals 1d8 + DEX. Each can be dodged on its own; the rest stop if the target dies. Only the first arrow that hits leaves a sigil.',
  'Sigil Volley (Golden)':
    'Golden form of Sigil Volley. Needs Sigil Volley equipped. Range 8: four arrows at one enemy, each rolled to hit separately; each hit deals 1d8 + 1d6 + DEX. Costs 10% of your max HP (never below 1 HP).',
  'Rune Arrow': 'Attack, range 8 squares: 2d6 + DEX on a hit, and the target is marked for 2 rounds: every ally (not you) deals +1d4 on hits against it. One mark at a time.',
  'Seeking Sigil': 'No attack roll, range 10 squares: a homing arrow that always hits one enemy you can see for 3d8 + DEX. It can still be dodged.',
  'Seeking Sigil (Golden)': 'Golden form of Seeking Sigil. Needs Seeking Sigil equipped. No attack roll, range 10: 7d8 + DEX, can be dodged. Costs 15% of your max HP (never below 1 HP).',
  'Spirit Arrow': 'No attack roll, range 10 squares: a spirit arrow that always hits one enemy for 2d10 + DEX and passes through cover and shields. It can’t be parried, only dodged.',
  'Mirror Sigil':
    'A 3x3-square sigil within 8 squares, until the start of your next turn: the first ranged attack (arrow, bolt, thrown weapon or single-target spell) against each ally standing in it is cancelled. Nothing is reflected back. Area attacks are not cancelled.',
  'Starfall Barrage': 'No attack roll, range 10 squares: eight arrows rain over a 6x6-square area: every enemy in it takes 6d6 + DEX, DEX save for half. Allies are not hit.',
  'Starfall Barrage (Golden)':
    'Golden form of Starfall Barrage. Needs Starfall Barrage equipped. Same area; 8d6 + DEX, DEX save for half, allies untouched. Costs 20% of your max HP (never below 1 HP).',
  'Restoring Arrow': 'An arrow that heals one ally within 6 squares 2d8 + INT (True Flight: never misses). Can’t revive someone at 0 HP.',
  'Frost Sigil': 'Attack, range 8 squares: 3d6 + DEX cold on a hit, and the target’s speed is halved for 2 rounds (doesn’t stack with other slows).',
  'Bolstering Sigil': 'A 3x3-square sigil within 8 squares for 2 rounds: allies who start their turn in it add +1d4 to their attack rolls until the end of that turn.',
  'Piercing Sigil':
    'Range 10 squares: an arrow in a straight line that passes through up to two enemies. Roll once and compare to each one’s AC: each beaten takes 4d6 + DEX. Allies in the line are not hit.',
  'Sanctuary Sigil': 'Heal one ally within 6 squares (or yourself) 3d8 + INT, and leave a sigil on their square.',
  'Radiant Dawn': 'No attack roll, range 10 squares: a burst of light over a 4x4-square area: every enemy in it takes 6d6 + DEX radiant, DEX save for half. Allies are not hit.',

  // ---- Trickster (DEX) ----
  'Quick Jab': 'Attack, adjacent: a fast jab, 2d6 + DEX on a hit.',
  'Mirror Step':
    'Step 1 square without provoking free attacks and leave an image where you stood: the next attack against you rolls a d6, and on 4+ it hits the image instead (the image then vanishes). Counts as one of your Afterimages (max 2).',
  Distract: 'DEX check (d20 + DEX) against an enemy within 6 squares (DC set by the GM, usually 10 + its WIS): on a success it must target you with its next attack, if it can.',
  'Mirage Dance':
    'Attack, adjacent: three strikes with one attack roll, 3d6 + DEX in total on a hit. Hit or miss, you gain one decoy that takes the next hit meant for you (then vanishes). The decoy counts toward your 2 Afterimages.',
  'Mirage Dance (Golden)':
    'Golden form of Mirage Dance. Needs Mirage Dance equipped. One attack roll, adjacent: 8d6 + DEX on a hit, plus one decoy as above. Costs 10% of your max HP (never below 1 HP).',
  'Decoy Double':
    'Create a double of yourself in a free square within 2 squares. Until the start of your next turn, enemies that can see it must attack the double first if they can reach it; it vanishes after one hit. It can’t move or act.',
  "Fool's Gambit": 'No attack roll, adjacent: a cheap trick (sand, a feint, a trip) that always lands for 3d6 + DEX. It can be dodged, not parried.',
  "Fool's Gambit (Golden)": 'Golden form of Fool’s Gambit. Needs Fool’s Gambit equipped. No attack roll, adjacent: 7d6 + DEX, can be dodged. Costs 15% of your max HP (never below 1 HP).',
  'Phantom Veil':
    'You turn invisible for 2 rounds: enemies can’t target you with single-target attacks unless they guess your square, and your attacks have advantage. Ends early the moment you attack or use an ability on an enemy (that attack still has advantage), or drop to 0 HP. Area attacks still hit you.',
  'Hex Trap':
    'Place a hidden trap on a free square within 2 squares. The first enemy that enters it is confused for 2 rounds: at the start of each of its turns roll a d6: 1-2 it attacks the nearest creature (ally or foe), 3-4 it wanders 2 squares randomly, 5-6 it acts normally. One trap at a time; it lasts until triggered or the fight ends.',
  'Grand Illusion':
    'Every enemy within 6 squares makes a WIS save. Each one that fails, on its next turn, attacks the nearest other enemy instead of you (if none is in reach, it does nothing). Bosses get advantage on the save. Mindless creatures are immune.',
  'Grand Illusion (Golden)': 'Golden form of Grand Illusion. Needs Grand Illusion equipped. Same effect, but bosses get no advantage on the save. Costs 20% of your max HP (never below 1 HP).',
  'Swap Places': 'Swap places with a willing ally or a size 1 enemy within 2 squares (an enemy makes a DEX save to refuse). Nobody provokes free attacks from the swap.',
  'Sleight Trick': 'DEX check against the GM’s DC: take a small item from, or plant one on, an adjacent creature without it noticing. Can’t take something held in a hand or worn as armour.',
  'Hall of Mirrors': 'Three images surround you: +2 AC until the next hit lands on you (then all three vanish). Ends early if you drop to 0 HP. Doesn’t stack with itself.',
  'Confusing Jab': 'Attack, adjacent: 3d6 + DEX on a hit, and the target makes a WIS save or is confused until the start of your next turn (see Hex Trap for what confused means).',
  'Echo Strike':
    'Attack, adjacent: 4d6 + DEX on a hit. If it hit, the same strike repeats on that target at the start of your next turn for another 4d6 + DEX (no roll, no stamina), as long as it’s still within 1 square.',
  'Curtain Call':
    'No attack roll: every enemy within 1 square takes 6d6 + DEX and makes a WIS save or is charmed until the start of your next turn (it can’t attack you, but can attack your allies). Never hits allies.',

  // ---- Hexblade (STR) ----
  'Hooked Slash': 'Attack, adjacent (2 squares while the blade is Fed): 2d6 + STR on a hit. A hit feeds the blade, a miss costs the blood price (see Fed and Blood Price).',
  Bloodletting:
    'Attack, adjacent: 1d10 + STR on a hit, and the target bleeds: 1d4 at the start of each of its turns for 2 rounds. Undead and constructs don’t bleed. Using it again refreshes the bleed, it doesn’t stack.',
  'Blood Mark': 'Mark one enemy within 6 squares for 3 rounds: your hits on it deal +1d4 and heal you 20 each. One mark at a time. Ends early if it dies.',
  'Sinew Lash': 'Attack, reach 3 squares: the blade uncoils, 3d8 + STR on a hit, and the target is pulled 1 square toward you (size 3+ isn’t pulled).',
  'Sinew Lash (Crimson)': 'Crimson form of Sinew Lash. Needs Sinew Lash equipped. Attack, reach 3: 5d8 + STR on a hit and a 1-square pull (not size 3+). Costs 10% of your max HP (never below 1 HP).',
  'Blood Hex': 'One enemy within 6 squares makes a CON save or, for 2 rounds, has -2 AC and can’t regain HP. Doesn’t stack with itself. Constructs are immune.',
  'Reaping Arc': 'One attack roll compared to each adjacent enemy’s AC: each one beaten takes 3d6 + STR, and each hit feeds the blade. If it misses all of them, you pay the blood price once.',
  'Drink Deep': 'Your next hit before the end of this turn heals you for half the damage it deals. If you don’t hit this turn, it’s wasted.',
  'Thousand Cuts':
    'Attack, reach 2: a flurry of whip cuts, 4d8 + STR on a hit, and the target gains 1 bleed per 2 damage dice rolled at 5 or more (each bleed: 1d4 at the start of its turn, for 2 rounds).',
  'Thousand Cuts (Crimson)': 'Crimson form of Thousand Cuts. Needs Thousand Cuts equipped. Attack, reach 2: 6d8 + STR on a hit, bleed as above. Costs 15% of your max HP (never below 1 HP).',
  'Sanguine Pact': 'Free (0 stamina, but still 1 action): pay 10% of your max HP to gain 20 stamina right away. Can’t take you below 1 HP; can’t go above your max stamina.',
  'Hex of Frailty': 'Every enemy within 3 squares makes a CON save or takes +1d6 damage from every hit (from anyone) for 2 rounds. Doesn’t stack with itself.',
  'Coiling Snare':
    'Attack, reach 3: 2d8 + STR on a hit, and the target makes a STR save or is restrained (speed 0, disadvantage on attacks) until the start of your next turn. Size 4 enemies can’t be restrained, only damaged.',
  Bloodbound: 'Passive (still takes an equip slot): while you are below half HP, Fed gives +2d6 instead of +1d6.',
  'Blade Guard': 'The blade curls around you until the start of your next turn: the next hit on you deals half damage, and that hit feeds the blade as if you had hit. Only one hit.',
  Exsanguinate:
    'Range: a straight 3-square line from you. One attack roll compared to each enemy’s AC in the line: each beaten takes 6d10 + STR, and you heal half of the total damage dealt. Allies in the line are not hit.',
  'Exsanguinate (Crimson)':
    'Crimson form of Exsanguinate. Needs Exsanguinate equipped. Same 3-square line and roll: 8d10 + STR to each enemy beaten, heal half the total. Costs 20% of your max HP (never below 1 HP).',
  'Red Eclipse': 'For 3 rounds, every hit you land heals you 1d8, but every miss costs twice the blood price. Ends early if you drop to 0 HP.',

  // ---- Duelist (DEX) ----
  Riposte:
    'Reaction (no action), only right after a clean parry (you beat the roll completely): strike back at the attacker if it’s within reach, 2d6 + DEX on a hit, +1d6 for each Flow you have. Once per parry.',
  Lunge: 'Attack: close up to 2 squares in a straight line (no movement stamina) and thrust: 2d8 + DEX on a hit.',
  Challenge:
    'Mark one enemy within 6 squares for 3 rounds: each time it attacks anyone but you, you may make a free Lunge at it (no stamina, no action) right after, if you can reach it. One mark at a time.',
  'Sidestep Cut':
    'Reaction, once per round, against an attack you can’t parry: make a Dodge Roll (costs its stamina) and if you fully avoid the hit, strike back for 2d8 + DEX (roll to hit) and gain 1 Flow.',
  'Twin Fang': 'Adjacent: broadsword then dagger in one motion, two separate attack rolls. The broadsword deals 2d8 + DEX on a hit, the dagger 1d8 + DEX. Each can be dodged or parried on its own.',
  'Twin Fang (Golden)': 'Golden form of Twin Fang. Needs Twin Fang equipped. Two attack rolls, adjacent: broadsword 3d8 + DEX, dagger 2d8 + DEX. Costs 10% of your max HP (never below 1 HP).',
  'Measured Guard': 'Until the start of your next turn, a parry that misses the roll by exactly 1 counts as clean (no damage, and you may counter-attack or Riposte).',
  'Disarming Bind': 'Attack, adjacent: 2d6 + DEX on a hit, and the target makes a STR save or its next attack has disadvantage. Natural weapons can be bound too.',
  'Cartwheel Slash':
    'Attack, reach 2: flip over the target (to the free square on its far side, no free attacks) and cut: 3d6 + DEX on a hit. If there’s no free square behind it, you stay where you are. Can’t flip over size 3+ enemies.',
  'Cascade of Steel': 'Attack, adjacent: a spinning combo with one attack roll, 4d8 + DEX on a hit, and +1 Flow (or +2 on a critical hit).',
  'Cascade of Steel (Golden)':
    'Golden form of Cascade of Steel. Needs Cascade of Steel equipped. One attack roll, adjacent: 6d8 + DEX on a hit, +1 Flow (+2 on a crit). Costs 15% of your max HP (never below 1 HP).',
  'Read the Blade': 'Study one enemy within 6 squares: +1 on your parry rolls against its attacks for the rest of the fight. Only one enemy at a time.',
  Punish:
    'Attack, adjacent, only against an enemy that is off-balance or staggered: if it hits, it’s an automatic critical hit (3d10 doubled + DEX). Can’t be used on a target that isn’t off-balance or staggered.',
  'Unbroken Flow': 'Passive (still takes an equip slot): the first time in each fight that you fail a parry, you keep your Flow (you still take the hit and are still off-balance).',
  Feint: 'Bait one adjacent enemy: it makes a WIS save or immediately attacks you (out of turn, using its next attack), and you parry it at +2. If it passes, nothing happens.',
  'Flow State': 'For 2 rounds your Flow can’t drop (not even from a failed parry) and can go up to 5 instead of 3. When it ends, Flow above 3 is lost.',
  'Final Measure': 'Attack, adjacent: 6d8 + DEX on a hit, +2d8 for each Flow you spend. All your Flow is spent when you use it, even on a miss.',
  'Final Measure (Golden)':
    'Golden form of Final Measure. Needs Final Measure equipped. Attack, adjacent: 8d8 + DEX on a hit, +2d8 per Flow spent (all Flow is spent, even on a miss). Costs 20% of your max HP (never below 1 HP).',

  // ---- Everyone ----
  'Dodge Roll':
    'Reaction (no action), any time an attack would hit you: roll a DEX save (d20 + DEX) against its attack roll. Beat it: no damage. Miss by 1-2: half damage. Miss by more: full damage. Costs 30 stamina either way. Works against everything, area attacks included.',
  Parry:
    'Reaction (no action), needs a shield or melee weapon: against a weapon, claw, tail, bite or projectile attack that would hit you, roll a STR save (d20 + STR) against its roll. Beat it: no damage, and you may counter-attack once. Miss by 1-2: half damage. Miss by more: full damage. Costs 20 stamina either way. Can’t parry spells, fire, frost, lightning, poison, beams, breath or area attacks: those can only be dodged.',
}

/**
 * Attacks with their own roll rules: hits = one attack roll per entry, each with those
 * dice (+ the class stat); tb = a change to every roll's attack bonus.
 */
export const ATTACK_RULES: Record<string, { hits?: string[]; tb?: number }> = {
  'Rending Combo': { hits: ['1d8', '1d8', '1d8'] },
  'Rending Combo (Golden)': { hits: ['1d8+1d6', '1d8+1d6', '1d8+1d6', '1d8+1d6'] },
  'Triple Volley': { hits: ['1d4', '1d4', '1d4'], tb: -2 },
  'Cutting Flurry': { hits: ['1d6', '1d6'] },
  'Tempest Lances': { hits: ['1d8', '1d8', '1d8'] },
  'Tempest Lances (Golden)': { hits: ['1d10', '1d10', '1d10', '1d10'] },
  'Sigil Volley': { hits: ['1d8', '1d8', '1d8'] },
  'Sigil Volley (Golden)': { hits: ['1d8+1d6', '1d8+1d6', '1d8+1d6', '1d8+1d6'] },
  'Twin Fang': { hits: ['2d8', '1d8'] },
  'Twin Fang (Golden)': { hits: ['3d8', '2d8'] },
  Arrowstorm: { tb: -2 },
}

/** The precise text for an ability, or the board's own text. */
export const abilityText = (name: string, fallback: string) => ABILITY_TEXTS[name] ?? fallback
