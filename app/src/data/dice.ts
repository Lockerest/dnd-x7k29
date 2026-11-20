// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.

/** The 3D dice library (loaded only when dice are first shown) and its textures. */
export const DICE_LIB = 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box-threejs@0.0.12/'

/** A custom colour set for the 3D dice, when the library has none built in. */
export type CustomColorset = { name: string; background: string; foreground: string; outline: string; texture: string }

/** Dice styles: id, name, swatch colour, the library's colour set and material, and a custom set. */
export type Skin = [id: string, name: string, swatch: string, colorset: string | null, material: string, custom?: CustomColorset]

export const SKINS: Skin[] = [
  ['classic', 'Ivory', '#e9e2d0', 'white', 'plastic'],
  ['black', 'Obsidian', '#1b1b22', 'black', 'plastic'],
  ['red', 'Red', '#b3262c', null, 'plastic', { name: 'red', background: '#b3262c', foreground: '#ffffff', outline: 'none', texture: 'none' }],
  ['pink', 'Pink Dreams', '#e86aa8', 'pinkdreams', 'glass'],
  ['glass', 'Translucent', '#9ad0ff', null, 'glass', { name: 'glass', background: '#9ad0ff', foreground: '#ffffff', outline: 'none', texture: 'none' }],
  ['lava', 'Lava', '#f43c04', 'fire', 'glass'],
  ['veins', 'Veins', '#8b1a1a', 'bloodmoon', 'plastic'],
  ['galaxy', 'Astral Sea', '#8e6bd6', 'astralsea', 'glass'],
  ['gold', 'Gold', '#d4a017', null, 'metal', { name: 'gold', background: '#d4a017', foreground: '#3a2600', outline: 'none', texture: 'none' }],
  ['bronze', 'Bronze', '#a66a2c', 'bronze', 'metal'],
  ['ice', 'Ice', '#53b7e8', 'ice', 'glass'],
  ['poison', 'Poison', '#2f8f3a', 'poison', 'glass'],
  ['acid', 'Acid', '#7fdc1d', 'acid', 'glass'],
  ['thunder', 'Thunder', '#4a4a8a', 'thunder', 'glass'],
  ['lightning', 'Lightning', '#4aa3ff', 'lightning', 'glass'],
  ['water', 'Water', '#2a6ad4', 'water', 'glass'],
  ['earth', 'Earth', '#7a5a32', 'earth', 'glass'],
  ['force', 'Force', '#a64ac9', 'force', 'glass'],
  ['psychic', 'Psychic', '#d94ab0', 'psychic', 'glass'],
  ['necrotic', 'Necrotic', '#3a3a3a', 'necrotic', 'glass'],
  ['radiant', 'Radiant', '#f9b333', 'radiant', 'glass'],
  ['starynight', 'Starry Night', '#2b3a8a', 'starynight', 'glass'],
  ['glitterparty', 'Glitter', '#d96ad9', 'glitterparty', 'glass'],
  ['dragons', 'Dragons', '#a02020', 'dragons', 'glass'],
  ['rainbow', 'Rainbow', 'linear-gradient(90deg,#e33,#fb3,#3c5,#38f,#a4f)', 'rainbow', 'glass'],
]

/** The dice buttons on the Dice card. */
export const DIE_SIZES = [4, 6, 8, 10, 12, 20, 100]
