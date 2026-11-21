// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.
/** Where boss themes and ability sounds are hosted. */
export const AUDIO_BASE = "https://cdn.creativeclaw.co/u/59c4c4dc/audio/"

export type ThemeInfo = { key: string; name: string; id: string }

/** Boss and region themes (file id on the audio host). */
export const THEMES: ThemeInfo[] = [
  {
    "key": "aethelric",
    "name": "Aethelric",
    "id": "bb763fc1-b551-4bd8-91c6-889ae616888e"
  },
  {
    "key": "firstdefier",
    "name": "Aethelric, phase 2 (The First Defier)",
    "id": "48a83e9d-e782-4de8-8cf5-5b4b72927e77"
  },
  {
    "key": "arachne",
    "name": "Arachne",
    "id": "b202befe-f852-4d61-810f-9e0b9f2eb29d"
  },
  {
    "key": "thecollector",
    "name": "Arachne, phase 2 (The Collector)",
    "id": "2e082d16-95f0-4e47-91c1-a1604c704275"
  },
  {
    "key": "kernunos",
    "name": "Kernunos",
    "id": "3d3f97fc-a644-4607-ac94-3e33dbd36605"
  },
  {
    "key": "rotforest",
    "name": "Kernunos, phase 2 (rotten forest)",
    "id": "92cb8394-561e-4f9a-abc1-37aa1b8d44a9"
  },
  {
    "key": "namelessking",
    "name": "Nameless King",
    "id": "2180d510-e607-4525-8bcb-2487dec3a162"
  },
  {
    "key": "kingonfoot",
    "name": "Nameless King, phase 2 (on foot)",
    "id": "1bfa4d00-2ae3-4865-bf4b-c80437286b18"
  },
  {
    "key": "odiram",
    "name": "Odi'ram",
    "id": "8df55a6c-abb3-40a1-9f7f-a11a7a089fd3"
  },
  {
    "key": "emberrage",
    "name": "Odi'ram, phase 2 (rage)",
    "id": "c5de69dc-4914-4ccd-ae4b-a038ab8d3038"
  },
  {
    "key": "xibalba",
    "name": "Xibalba",
    "id": "7cd55131-adb9-41af-9a82-dc2ce12364d3"
  },
  {
    "key": "collapsingvoid",
    "name": "Xibalba, phase 2 (collapsing void)",
    "id": "890f1ca5-b606-478f-983e-eb390380ba69"
  },
  {
    "key": "izatal",
    "name": "Izat'al",
    "id": "59c1b08b-b57c-48da-a5a8-215d826828ce"
  },
  {
    "key": "dragonqueen",
    "name": "Izat'al, phase 2 (dragon form)",
    "id": "6f08f794-f300-492b-887c-a0ce109126b0"
  },
  {
    "key": "rotarena",
    "name": "Kernunos, phase 3 (rotted arena)",
    "id": "a09d986c-7998-4274-a2f7-62da870f7f60"
  }
]

/** Theme keys per boss, in phase order (used when adding a next phase sheet). */
export const THEME_GROUPS: Record<string, string[]> = {
  "aethelric": [
    "aethelric",
    "firstdefier"
  ],
  "arachne": [
    "arachne",
    "thecollector"
  ],
  "kernunos": [
    "kernunos",
    "rotforest",
    "rotarena"
  ],
  "namelessking": [
    "namelessking",
    "kingonfoot"
  ],
  "odiram": [
    "odiram",
    "emberrage"
  ],
  "xibalba": [
    "xibalba",
    "collapsingvoid"
  ],
  "izatal": [
    "izatal",
    "dragonqueen"
  ]
}

/** Ability sound files, by ability slug (see abilitySlug). */
export const ABILITY_SOUNDS: Record<string, string> = {
  "antler_gore": "b899dfec-3fb5-4d3f-b080-227e234c9065",
  "thorn_whip": "03ae183f-313b-4fc1-b552-9d501cc35f1c",
  "spore_burst": "f589af60-6912-48e7-85aa-ee8551746993",
  "entangling_roots": "26aa6463-6b9e-49d6-b5d3-ae5969cec257",
  "stag_charge": "70555b53-e0f4-4139-8beb-9bfb9f0ae253",
  "heartwood_bloom": "e66dfdb6-35f0-47c1-9e33-46615fbe910c",
  "thorned_hide": "3e0708b2-f32c-4177-a622-462ef7e63100",
  "rot_claw": "642b42f8-2352-420e-a37c-c1f4d8942582",
  "maggot_swarm": "3e6af9f7-7ed1-4623-bd6b-a76c2a700b69",
  "bursting_pods": "8febb53c-b93e-45c8-8fbf-ef5528ae6f24",
  "rotting_embrace": "c0b2d9e7-ccf6-49e7-b5ad-6ab1561c93c2",
  "grave_roots": "b548178b-b89b-4230-b678-4e31493d02c6",
  "vomit_of_decay": "80c70d4a-8d7b-4667-b29d-230f38569058",
  "plague_bloom": "fa4e3278-6051-4973-8ca4-71cc9b2d44b2",
  "spring_returns": "43726338-8b62-4d5a-957b-04c94bd17205",
  "withering_drain": "6ce78575-18ff-46c3-8985-71ce1e5bc09c",
  "the_bloom_withers": "2ee30d2d-bf29-48f8-ae09-9196240b903a",
  "multi_slash": "c8ae722d-6975-4316-b7ca-6b55c20c9257",
  "power_strike": "4c1dcae7-d8e0-4bfa-86de-8640235dccff",
  "second_wind": "6c20a89c-6dbb-4371-aef8-d27f47044398",
  "shield_bash": "241eacc0-b08d-4f0b-a4ee-854c49185083",
  "iron_stance": "de307f86-ccea-47db-8d4c-f4f43c6481ba",
  "rending_combo": "03356d69-b763-42b8-86ce-75e910665e8e",
  "shield_wall": "9b2ae128-3e7d-4cfa-9d57-8bd4dc29aec0",
  "vanguard_rush": "92fb3540-a74a-4829-8669-899caf16cf57",
  "bulwark_charge": "49e25584-ea6b-42d4-9bb3-025237894da1",
  "taunting_roar": "514c63a8-64fb-4686-96de-fc3acaf7139b",
  "cyclone_slash": "931f0d08-0df5-43a0-b19d-29e5fec0eb6a",
  "hamstring": "918fb924-8d80-41e9-91f4-ff63dbb5dfbb",
  "indomitable": "591a3ed6-84d7-49de-a3c2-26097334dc69",
  "last_bastion": "b06a9ac7-4d70-463d-a739-260f040b3293",
  "oathbreaker": "0b4e164c-7292-4a4f-9e95-3f530545222d",
  "titanic_guard": "289f5442-be00-47e0-8925-d654daa57fe1",
  "hunter_s_eye": "fdeb5098-bc8b-418e-a3ea-66d37c955df6",
  "piercing_shot": "078c45ed-4688-491f-9eac-b32a0f50edf6",
  "pinning_shot": "ac18c357-e527-4b82-b1e3-80ca2e611a5b",
  "triple_volley": "204e4893-e992-4db9-b9d4-fddfdd086129",
  "arrowstorm": "548621e5-fc0d-48c9-9671-834856c1ab40",
  "poison_arrow": "6d0f1138-3f9f-432b-a83d-6bb8c80399dd",
  "nailing_shot": "48009272-c3e4-46f4-b45a-b4e331587ab5",
  "quick_step": "eecafbab-7211-4c64-97ed-9cc07d35f0f6",
  "frost_arrow": "2cc5ee97-c213-4aed-905e-f61c412e95d2",
  "wildfire_arrow": "be6b078b-6028-4da6-8dba-699f86ab4551",
  "predator_s_eye": "a7b9de20-f71f-4a04-87e6-227d33b71a45",
  "ricochet_shot": "3957b5a3-ea81-4a9b-955b-591f3e2c3a7c",
  "camouflage": "c9e6e8b2-26cf-4b70-ad1f-02c9d86bae6f",
  "rain_of_arrows": "86c69989-2853-4618-b0b0-b55d9efd0ead",
  "dragonpiercer": "a3436db6-4948-4160-9cff-3119b713eccd",
  "storm_of_barbs": "05e8f112-42eb-4ae3-88ba-8fc4d6e0f39f",
  "arcane_ward": "68d1478a-8a81-43ee-aad1-cb92184f8743",
  "ember_burst": "777b0b52-2377-425c-88d3-e1ad0417bbae",
  "firebolt": "e5f4ae3d-deb2-4473-bf5d-42a13031d272",
  "mending_light": "bc644f52-e14c-40dd-8b26-5bdeb3b7f2cc",
  "arcane_barrage": "95390658-49fc-4e3a-b1ba-5e776a0cb583",
  "force_push": "316535bd-f84e-4bf8-b204-3cd9ac111a33",
  "restoring_light": "30a65cb7-5b80-40e9-afbd-a962798d009b",
  "ward_of_ages": "05c9a577-a78e-4e10-9ea6-ef83bf757a20",
  "gale_burst": "cde9bd1c-32fd-49fe-92a7-b98130c1b2fc",
  "lightning_lash": "7e353b1f-9d44-4977-b7a6-11031c56d077",
  "frostbind": "e38685f6-f4a8-45e0-bd66-fd316df1ada1",
  "greater_mending": "b7dad364-8a2d-49f1-8e49-d72fb76c44cb",
  "blink_step": "5ca0629d-2f39-4be1-ba7d-4a582e6018a6",
  "mirror_image": "a37f15ae-6f91-45cd-8968-0a9b16876c0f",
  "meteor_fall": "cfd36a5a-3404-4236-b222-0b7d16f8702f",
  "void_lance": "6b2a2339-ad67-43a6-822f-36cb1f812626",
  "backstab": "bfa09cec-f8f5-43de-a350-7536045c1087",
  "cutting_flurry": "b8707269-4f12-4e6a-83a6-96cbf1f6c6f0",
  "pilfer": "fa47f8ff-2f6f-47bc-958c-0f244118d679",
  "smoke_bomb": "611dd391-0a0a-48b0-8b0a-ff0e2f11bdf0",
  "pocket_sand": "6342a0da-d280-4070-a960-c8e071d824a5",
  "shadow_flurry": "6929bd70-fe44-4829-8ba1-104e91f70d3f",
  "choking_smoke": "52e25fc8-6d50-4e72-b404-a8d6cafc3c6f",
  "tripwire": "c3ecc6d7-dc84-4dfe-ad8d-46f8e239e061",
  "cripple": "d58a8d0a-ac4f-4d29-a891-66057e21dd50",
  "venomous_edge": "2f0ecc41-8b41-440d-9905-05e8c505b86b",
  "marked_for_death": "164caaa6-5821-4f12-8619-81a407e91309",
  "shadow_cloak": "0a338bec-be72-47cb-b47a-d5dfe1ea9813",
  "disarming_cut": "3cb15da3-6814-414f-9594-e4d6bd9cd8e8",
  "ghost_step": "3cf34d95-3d26-4fb4-918e-9ea1f6e9b7f3",
  "death_blossom": "fc8d3ef4-51cf-49c2-a44c-c99580cab863",
  "heartseeker": "84a885d4-0f91-4410-96e5-adffd9f82e3d",
  "brace": "9571ae7f-4391-44a4-a237-8368cc95d30c",
  "guard_break": "e29858b3-41d1-45e3-bdde-7b1386c001b4",
  "heavy_swing": "fa217422-0ae5-482d-90b8-8449e44a8c2e",
  "hammer_fall": "4a520e48-7f5a-4c43-80b4-6b15ae61a0cd",
  "skullsplitter": "2b8b5fb0-bdd0-4062-96ad-30dc14734478",
  "ground_slam": "8ff527c7-0ac5-4f66-b3e3-8e29b0d60bca",
  "shoulder_charge": "2fc410b5-8120-4598-9e9e-3144cc45f8c4",
  "crushing_blow": "a52bc60f-ed9d-4f34-a6e5-0f84748fcfce",
  "rally": "77ce9576-435c-49a6-83e6-abb3f6764428",
  "intimidate": "99f28958-7e82-4d20-b368-3041a330c2a0",
  "war_cry": "d416db28-6460-434a-8e22-fb28c0656fad",
  "bulwark_stance": "e6123b9a-19b5-46ab-a532-002bf4245c66",
  "unbroken": "164be27e-813f-4781-aacc-37fdec44584d",
  "earthsplitter": "0295c907-02b3-4f51-bee4-65dbd6c762b8",
  "titan_s_fall": "d555aa41-d7b3-47ae-ac1b-f7d8359feae0",
  "burning_ground": "aa3ea6f0-400f-4bca-abed-2c57222e8248",
  "elemental_bolt": "81ef60e3-a658-4941-a2af-0803fa70a395",
  "frost_veil": "1315f311-ec7f-462c-a705-903e990e2b7e",
  "ember_warmth": "718cd2d4-5071-4e97-8fd5-58dfa996bfb4",
  "tempest_lances": "c39345b9-ef32-4ea2-b095-7f847c0e3bbb",
  "elemental_ward": "262ed850-82d8-42f0-9d7e-b1dc62382cea",
  "static_field": "495f249c-ca05-4705-948b-95ff5f5f1a7e",
  "elemental_surge": "dc8504a7-2cfa-4715-a098-78d6728df7af",
  "healing_rain": "1cd1c3dd-f518-44d3-bcb0-ca86a30b8250",
  "chain_lightning": "6119a7c4-ef96-4f78-a6b5-4ea24c670871",
  "ice_prison": "06e7df6a-4c48-4e1a-aa45-fad2884f7df7",
  "flame_wreath": "4deaafd5-8841-401c-affd-c36bed957b44",
  "overcharge": "e8a38560-d0b4-4157-9ed4-c07dd8c13baa",
  "arc_storm": "0927e2e4-47e5-4600-abab-5a132f1de8d0",
  "cataclysm": "8337d7c5-f139-4406-b813-0b297e638532",
  "pull_stance": "403bcc3d-1ee3-4a81-8544-592611de9f50",
  "spear_thrust": "2d69cdd8-cd11-412d-a2ad-e46378228d9c",
  "sweeping_lance": "cfd2bdfd-9841-445b-81b7-e6fca75085fa",
  "reaching_guard": "5bbd67d9-13d2-466f-ba2a-92572a91da29",
  "spiral_lance": "66bb0374-1d24-4b6d-830d-318ba45295ca",
  "lance_sweep": "3234143a-bd4a-4d26-b7db-7a525d1d6fdc",
  "tether_dash": "fc1196c2-3d39-4d46-a53f-6d9e1485eff9",
  "gravity_pull": "5f6e6bff-aee9-4937-9ebe-f215eb818531",
  "hook_and_haul": "0c133883-a69e-4419-abba-049972adead8",
  "gravity_shield": "c0ac9401-3333-4321-a4fa-1ef509c3722f",
  "rift_lance": "646e5586-2984-436a-84e4-9ead141557ef",
  "spell_parry": "310efebf-ff80-4e2f-86f9-ca337c4b1d34",
  "thread_the_needle": "68eb9b3f-f242-49ac-b717-5a7441aa31bc",
  "event_horizon": "33f57862-5d59-4f64-8e98-c05498779321",
  "singularity_spear": "1fd4cdbc-478e-41e5-bffb-7b369fa55371",
  "enchanted_arrow": "800689e7-e737-40b9-b25e-1905db43d040",
  "healing_sigil": "e9e9efc7-bb26-416c-b713-f90b868ef9b5",
  "sigil_shot": "8ca0fcb6-54a1-4979-9e22-3739c1fb29ad",
  "restoring_arrow": "29fcbec7-a83a-430d-99f7-273a49471729",
  "sigil_volley": "733d7f92-9a81-4aa9-b427-e24c69381ea9",
  "frost_sigil": "687c1e62-c08f-4703-a815-7075cf9479b9",
  "rune_arrow": "e0ceabeb-555b-4955-9c45-70a4f9169826",
  "bolstering_sigil": "33a9c405-7ea6-4b3f-8be5-a6fa75e07604",
  "seeking_sigil": "0fa2faf7-8f52-4a83-b3e4-600688694a8c",
  "piercing_sigil": "3ba06671-9eed-4fd0-ba33-cc9722194fee",
  "spirit_arrow": "a53dce00-76d6-4615-9ca0-1dc1703f811d",
  "mirror_sigil": "d1e54e6b-337c-4afa-81a9-74935433a402",
  "sanctuary_sigil": "d5a4acb0-7f6c-4139-85a4-f7adeded91b6",
  "radiant_dawn": "f614c107-b0c9-4ea9-a74c-b0a684b651b5",
  "starfall_barrage": "9ad5d913-42b5-4881-a0cf-870e6d547e1e",
  "distract": "ff88879a-8e6f-4aea-ab96-aff63e1d373d",
  "mirror_step": "99a775d7-b7ba-46b5-ac38-00601521dd63",
  "quick_jab": "135b1c90-2575-4484-9ef9-d2ca3c0c0f71",
  "mirage_dance": "31935a60-fb46-4c6c-80a0-0f196c7ea1d6",
  "swap_places": "1e4dd7b0-77f9-48a6-8faa-eb39864e836d",
  "decoy_double": "28342454-4635-40d8-9c20-8fd2d2bad77b",
  "sleight_trick": "6ceaff1e-7648-4bbe-a2ca-bafa1cb7a2db",
  "fool_s_gambit": "997931c9-08f5-4c11-86ec-db61b8cf01de",
  "hall_of_mirrors": "d192a806-65c4-405b-8a7b-ab9635256726",
  "confusing_jab": "e6921763-3fd8-4759-9954-c134e08f6070",
  "phantom_veil": "c6f8c513-53ad-42d4-bee6-ba80a76ec485",
  "echo_strike": "4dcebb72-b49e-44e0-9d9b-f634dd1080bc",
  "hex_trap": "e1b2db48-50c0-471e-afbe-a7d9a1d40879",
  "curtain_call": "2680eec8-a76c-451a-919c-37ee183cf1a3",
  "grand_illusion": "295e6790-ec6f-45d2-a2c6-e246c6eafeb3",
  "warden_s_cut": "94b47b8e-14cd-4a74-bc07-62b7bc2e1bc3",
  "rime_guard": "d1f78c68-8e7b-4f44-9748-d61c94e805f4",
  "chain_pull": "34e5ef1d-eef3-467e-9afa-b4919f506268",
  "prison_bars": "2287fcd1-e173-4bfd-af6c-ef188f75536e",
  "frostbite_cleave": "9a1221d8-5ab0-4141-aafc-abd532236af2",
  "cold_snap": "b6a4ac80-b766-458a-8c9f-9e88b73d77a1",
  "warden_s_toll": "68139286-1fe9-4dff-9c67-8035b76b454f",
  "golden_slash": "52faf478-f430-427c-9515-186999839703",
  "shattering_wave": "d7b8b951-d960-4ffc-a0e5-abf2702d30d3",
  "frozen_verdict": "2217c3d8-e1f5-4215-9d15-10a08cd20ce9",
  "jailer_s_embrace": "21f9a944-6b13-4cb7-b3e9-96ebbb12284f",
  "absolute_zero": "253c22eb-c6d8-46db-9763-378c2e66bd66",
  "last_gasp": "a27a7dac-9528-439d-add8-6987f8b828db",
  "thread_needle": "3bd74eb0-a21c-4f94-ae48-a3d92ac87372",
  "silent_contract": "5856d88f-d256-4159-83f0-b4dc0a17a48d",
  "web_snare": "b675e6fe-41b8-4490-a123-c2000e0b1f47",
  "quiet_venom": "8577b9cc-2618-448f-84f4-3b1d28650667",
  "whisper_step": "04ae7d55-853f-45ff-a793-d8827c83d8e3",
  "seen_it_coming": "2537d766-3fbd-45ef-ace3-bc0531ced62f",
  "the_bill_comes_due": "e53e01db-a1b6-483e-890a-35b4c9c2b76b",
  "fang_bite": "6dd06fb0-c7e0-4418-b36f-8bcfb1b50dc4",
  "leg_skewer": "30379726-a4b6-4dfb-975c-efc2f9b2a747",
  "web_cocoon": "3b974413-b6d5-4d25-8f1d-c54d251c2210",
  "venom_mist": "f756221f-ed29-43b3-ac85-915e59382a68",
  "ceiling_drop": "ad2b7abe-4386-48b0-9642-39edf3d96520",
  "silk_net": "dffc14f1-3d49-4d3e-bc55-ba7ee5e282e1",
  "final_offer": "92a4415f-3da1-440d-9f83-e8de39b0ef03",
  "skyward_lance": "d00ed858-2270-417f-945b-a2d4ea7ddcbb",
  "tail_sweep": "7bca70d7-3469-44f6-8696-ef2d2953afe2",
  "storm_breath": "633b813c-47bc-46dd-8dea-bd10b2e3caf5",
  "wingbeat_gale": "37cda0f9-7535-4534-be0f-5f7c5ab47e6a",
  "thunder_dive": "43bae564-9202-4592-90ab-56f5cc89a9a8",
  "king_s_thrust": "1806738c-7822-430f-b1d8-493fe2aafaee",
  "storm_s_wager": "94302f8b-cb3b-4859-8f86-61f954a41864",
  "wager_thunder_lance": "9abc6096-8a5f-453c-9302-12f15446f33c",
  "wager_spear_hurl": "cd206b54-c18f-4504-bc91-78778578d21e",
  "wager_storm_vault": "08009d39-2814-4040-ae0e-5ebc007b199e",
  "wager_crowned_in_lightning": "850278de-a6c4-4682-aa95-e5d93529a4d2",
  "twin_thrust": "90fa3870-ab06-4322-a007-702771833217",
  "sweeping_arc": "643e12da-bf69-4410-8ea4-02c15c647fb3",
  "lunging_pierce": "6fe92f85-27fc-42ec-bfd6-ff88eed8f1f1",
  "sovereign_s_theft": "2d729b6c-400c-4cac-9381-6795bb30ad4b",
  "lightning_reprisal": "cbcfeeba-6013-42fc-be1e-d7244890e7d5",
  "shape_the_storm": "58cc8d8f-5c92-439b-a9e3-0e9804950429",
  "cloud_dragon_s_judgement": "33f45ecc-7084-4a92-b285-24ce2aafba6b"
}

export const themeUrl = (id: string) => `${AUDIO_BASE}${id}.mp3`

/** The GM's base attack sounds on the audio host, by clip slot ("Import base attack sounds from web"). */
export const BASE_SOUNDS: Record<string, string> = {
  swing: 'de0e6e2b-d041-4f3a-bca1-e01f611048ff',
  bow: '13d91d45-d01c-4aac-b095-07eca8eb5269',
  slash: '0b034496-b0e1-4305-b543-d6562d6d11ab',
  heavy: '0c811e37-07a8-46d4-88fb-a950093f6dae',
  bash: 'ba48cb49-1b8f-4bf7-949e-4738b73df541',
  parry: '6fe842e4-1701-4c7f-98a5-4edf3be31db6',
  dodge: '05be4be7-009f-4b35-9892-9abd3e63c224',
  dodgeh: '5b033a3c-3be2-4c8b-a7df-735da06db897',
  fire: '2346f2d0-593d-4096-a247-c7fc0968fc54',
  ice: '730630cd-fc62-4c04-8cba-a9443cf88ff6',
  bolt: 'bd9221a2-0675-47a6-8bc0-a1d6054ba94b',
  arrow: 'cb7d9d2d-1e66-400e-aa8f-979757272ed6',
  poison: '0486ac81-1758-4c63-93b6-9d441221f0be',
}

/** The bosses that always get a row in the GM's Boss themes list. */
export const BOSS_NAMES = ['Aethelric', 'Arachne', 'Kernunos', 'Nameless King', "Odi'ram", 'Xibalba', "Izat'al"]
