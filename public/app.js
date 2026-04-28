/* ===========================================
   NWL SCOREBOARD - Client-Side Application
   Live Google Sheets Sync + op.gg-Style List
   New World Aeternum Theme
   =========================================== */

const app = document.getElementById('app');
let currentRole = 'ALL';
let currentMatch = null;
let _loadingQuoteInterval = null;
let vodData = null; // cached vods.json
let currentMatchVods = {}; // canonical player name -> VOD url for current match

// ==========================================
//  LOADING EASTER EGG QUOTES
// ==========================================
const LOADING_QUOTES = [
  "Disabling Trading Post due to unexpected wealth...",
  "Wealth transfers disabled globally (please wait)...",
  "Duping gold coins via server transfer...",
  "Locking Company treasuries to prevent corruption...",
  "Calculating compensation coin (pray for the correct amount)...",
  "Hiding all furniture in storage sheds...",
  "Activating Hatchet machine gun mode...",
  "Polishing the Blunderbuss (while it remains disabled)...",
  "Healing rapidly by spamming crouch...",
  "Stacking damage buffs to infinity...",
  "Disabling Musket accuracy (we call it 'balance')...",
  "Loading Ice Gauntlet lag particles for the upcoming war...",
  "Dragging the game window for 100% damage immunity...",
  "Fast-forwarding server clock by 3 months...",
  "Downgrading town crafting stations via time travel bug...",
  "Injecting giant sausage graphics into global chat...",
  "Preparing desktop crash via item hover link...",
  "Waiting for server rollback (progress is relative)...",
  "Sending automated bans to rival Company leaders...",
  "Spawning infinite pig armies in Boarsholm...",
  "Analyzing auto-run keyweight to bypass AFK timer...",
  "Losing housing trophies during instance transition...",
  "Simulating 500ms desync for that authentic combat experience...",
  "Translating text fragments into '@UI_String_Not_Found'...",
  "Fixing one bug (by secretly introducing three new ones)...",
  "Downloading 40GB patch for a minor text localization...",
  "Extending scheduled maintenance by another 4 hours...",
  "Double-checking if the Trading Post actually works this time..."
];

function getRandomQuote(exclude) {
  let q;
  do { q = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]; } while (q === exclude && LOADING_QUOTES.length > 1);
  return q;
}

function startLoadingQuotes() {
  stopLoadingQuotes();
  const el = document.querySelector('.loading-quote');
  const bar = document.querySelector('.loading-quote-bar');
  if (!el) return;
  el.textContent = getRandomQuote();
  el.style.opacity = '1';
  if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = 'quoteTimer 5s linear forwards'; }
  _loadingQuoteInterval = setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = getRandomQuote(el.textContent);
      el.style.opacity = '1';
      if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = 'quoteTimer 5s linear forwards'; }
    }, 300);
  }, 5000);
}

function stopLoadingQuotes() {
  if (_loadingQuoteInterval) { clearInterval(_loadingQuoteInterval); _loadingQuoteInterval = null; }
}

function loadingScreenHTML(title, sub) {
  return `<div class="loading-screen">
    <div class="loading-spinner"></div>
    <div class="loading-text">${title}</div>
    <div class="loading-sub">${sub}</div>
    <div class="loading-quote-wrap">
      <div class="loading-quote"></div>
      <div class="loading-quote-track"><div class="loading-quote-bar"></div></div>
    </div>
  </div>`;
}

// ==========================================
//  RANDOM WALLPAPER SYSTEM
// ==========================================
const WALLPAPERS = [
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-0kwn35n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-8l9o02n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-c3jwc0n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-c9aie0n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-cdfcuzm24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-de38a1n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-ecqi40n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-h7g6n0n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-ji6o80n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-q12b10n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-rwwmbeo24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-sjumh1n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-v1ml84n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-vox2i0n24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-we4ifzm24x0e1.webp",
  "new-world-wallpapers-from-loading-screens-in-various-sizes-v0-xdu9oym24x0e1.webp"
];

function getRandomWallpaper() {
  return 'wallpapers/' + WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
}

function applyWallpaper() {
  const url = getRandomWallpaper();
  document.body.style.backgroundImage = `linear-gradient(rgba(10,14,10,0.55), rgba(10,14,10,0.78)), url('${url}')`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
}

// ==========================================
//  NAME MAPPING SYSTEM
// ==========================================

// Static name mappings from name_mapping.json (scoreboard name → canonical)
const NAME_MAPPING_JSON = {
  "Goalfryed": "goatfryed", "Hobakok": "Hobakok", "DRAGONPORN": "Dragonporn",
  "Spadetra7": "Spadetra", "Pangzor": "Pangz", "Darkarus": "Darkarus",
  "Motcoeur": "Motcoeur", "Blauu": "Blau", "Godias": "Godias",
  "Liona": "Liona/Skillissu", "Kru": "Kru", "setanko": "setanko",
  "FS Seiler": "Seiler", "Shiyraw": "Shiyraw", "Chammm": "Cham",
  "MIXXD": "MIXXD/Aly", "MIXXD-Aly": "MIXXD/Aly", "Nolas": "Nolas", "EfeAlaribel": "EfeAlanbel",
  "diSEMBOWELER": "diSEMBOWLER", "Gricius": "Gricius",
  "Krulaxx": "Krulaxx", "BUKAKU": "Bukaku", "eskiii": "Eski",
  "Revaa": "Revaa", "Wilu666": "Wilu666", "c0rpi": "c0rpi",
  "Zeleen": "Zeleen", "McMad4it": "McMad4It", "Brown-Noise": "Brown-Noise",
  "Stephenn": "Stephen", "Nieksas": "Nieksas", "Cannab3s": "Cannabis",
  "ON YO BACKLINE": "MighTs", "BLACK3AST": "BLACK3AST", "Nevnev": "Nevnev",
  "JerryPat": "JerryPat", "Elleira Dorn": "ElleiraDorn",
  "Die3neMika": "DieEneMika", "eke perkele": "eke",
  "pappychat38": "Pappychat", "Hucky": "Hucky", "n0madic btw": "n0madic",
  "Lutsch": "Lutsch", "Void Gengar": "Lutsch", "I Re Born I": "ReBorn", "Maseyee": "Maseye",
  "Gernhart Reinda": "BjörnHaudrauf", "Nerf Aimbot": "NerfPooP",
  "Lekaid": "Lekaid", "TeeZa": "TeeZa", "Holeeee": "Holee",
  "Pyre": "Pyre", "Zarkoi": "Zar_ki", "Birnzito": "Birnzito",
  "lclue": "Ictue", "Alexiaraae": "Alexiarae", "buffchamp": "buffchamp",
  "Chris P. Beacon": "Hammer", "SK21": "SK21", "Heavy Prison": "Jxsn",
  "LyZy": "Lumino/LyZy", "Csanahx": "Csanah", "M-DUB": "DUB",
  "pandatanga": "pandatanga", "Tiaela Eiriell": "Tira",
  "Kaldie Darkleaf": "KaldieDarkleaf", "Maalefis": "Maalefis",
  "Jarker": "Jarker", "Wyngaard": "Wijngaard",
  "Ulric Dorm": "UlricDorrn", "ChuckDorrris": "ChuckDorris",
  "Sonnihhh": "Sonnihh", "FroggyBalboa": "FroggyBalboa",
  "rdmMcffman": "moffman", "TheClover": "PinkClover",
  "Where Arda": "Costa", "DrCosta": "Costa", "Billy Talent ll": "BillyTalent", "Billy Talent": "BillyTalent",
  "xTaRl": "Tarienna", "Lord Ethernity": "Lord Ethernity",
  "TheHottestSilk": "TheHottestSilk", "Irvine": "Irvine",
  "H3SHKVZ3D": "H4SHK4Z3D", "USE DETO NOW": "MARKEL1to/US",
  "JeaysuTokugawa": "Jeaysu/Naosuk", "darksoul34": "Shiroyasha34",
  "LadyShp": "BL4CKSHP", "Actubch": "Actu",
  "REBE BEXHA": "JukerVG", "EpeliOfficial": "Epeli",
  "FS Kreamy": "Kream", "xquiv4heals": "xquiv",
  "Askeladddd": "RudiRagequit", "Queen Darckcha": "Darckcha",
  "Natalie V2": "LilNatalie", "Ambrozja": "Ambrozja/1.61",
  "Blamy": "Cloudninee/Blamy", "BjörnHaudrauf": "Gernhart Reinda",
  "Skill Issue": "Liona/Skillissu", "Psssst": "Boinosss/PssTV",
  "jormamas slave2": "jeszo", "Samson": "POPPING CLEANSE",
  "Cloudninee/B": "Blamy", "Maka": "M7k", "Tarienna": "Melglinn",
  "lolubroke": "Bullerby", "RudiRagequit": "Rudi Dodgeke",
  "ESKI": "eski xo", "MarkeIIto": "MARKEL1to/US",
  "Sten": "Stenbergz", "BjornHaudrauf": "Gernhart Reinda",
  "Stepmom": "StepmomMia",
  "Rudi Dodgeke": "RudiRagequit", "Paare": "xMartin96x",
  "xTaRi": "Tarienna", "Hop on Hop": "Zeleen",
  "Popping Cleanse": "Samson",
  "Gina Van Gina": "zigs", "Frasian GOAT": "kogame",
  "bullerby": "lolubroke", "II Nalany II": "Nalany",
  "Nameless II...": "JerryPat", "Nameless II": "JerryPat", "eldduC": "Cuddle",
  // Additional reverse / Character-Names-DB mappings
  "Barri Level": "Brown-Noise",
  "67crusader": "Benzema",
  "KQKH4NG": "JukerVG",
  "Howsmom": "diSEMBOWELER",
  "call me gus": "Kru",
  "Kohku": "Koku", "K0KHU": "Koku",
  "Mimimose": "JerryPat",
  "Hyperi0n": "Wimpin",
  "their spear snss": "buffchamp",
  "Felidaee": "Caruso0",
  "Bober": "Krulaxx",
  "MEATLOVER PIZZA": "Abary",
  "Atheria": "Gunzpewpew",
  "Trond": "Kream",
  "Melglinn": "Tarienna",
  "Lumino": "LyZy",
  "Elleria Dorn": "ElleiraDorn",
  "Juker": "JukerVG",
  "Shiyrow": "Shiyraw",
  "Motocoeur": "Motcoeur",
  "Nerfpoop": "NerfPooP",
  "Zarki": "Zar_ki",
  "Shiroyasha": "Shiroyasha34",
  "Markel1to": "MARKEL1to/US",
  "Cloudninee": "Cloudninee/Blamy",
  "Rivzone": "Rivzone",
  "M7k": "Maka",
  "Stenbergz": "Sten",
  "StepmomMia": "Stepmom",
  "GernhartRein": "BjörnHaudrauf",
  "Ambrozja/1.6": "Ambrozja/1.61",
  "kathien": "kathien",
  "Bourinosss/Pss": "Boinosss/PssTV",
  "Cloudninee/Bl": "Cloudninee/Blamy",
  "Cloudninee/Bla": "Cloudninee/Blamy",
  "Pappychat": "Pappychat",
  "Hajekken": "Hajekken",
  "TestoMatu": "TestoMatu",
  "!TestoMatu": "TestoMatu",
  "jeszo": "jormamas slave2",
  "shokkii": "shokkii",
  "Zekke": "Zekke",
  "Benzema": "Benzema",
  "Crimson Blader": "Apfel",
  "YourWetestDream": "TheHottestSilk",
  "Babulmoox": "babulm",
  "iBreezyJR": "Breezy",
  "StronkFis": "Stronk",
  "Actutch": "Actu",
  "HammerGD": "Hammer",
  "xxSHORTYxx": "SHORTY",
  "CatsandFurious": "CatAndFurious",
  "Lynnxx": "Lynnx",
  "NolasOwl": "Nolas",
  "CannabOs": "Cannabis",
  "GailibaxX": "GailibixX",
  "Steinbergz": "Sten",
  "Publiczek": "Publicezk",
  "Björn Haudrauf": "BjörnHaudrauf",
  // Liona/Skill* variants
  "Liona/SkillIss": "Liona/Skillissu",
  "Liona/SkillIssue": "Liona/Skillissu",
  "Liona/SkillIssu": "Liona/Skillissu",
  // Lumino/LyZy spacing variant
  "Lumino / LyZy": "Lumino/LyZy",
  // BLACK3AST typo
  "BLACKA3AST": "BLACK3AST",
  // Cloudninee variants
  "Cloudninee / Bla": "Cloudninee/Blamy",
  "Cloudnines/Bla": "Cloudninee/Blamy",
  "Cloudnine/Bla": "Cloudninee/Blamy",
  // Ambrozja variants
  "Ambrozja/1.618": "Ambrozja/1.61",
  "Ambrozja / 1.61": "Ambrozja/1.61",
  "Ambrozja/1.e1": "Ambrozja/1.61",

  // === Systematic duplicate merge ===

  // ShadowTrick* variants (all same player)
  "ShadowTrickle": "ShadowTrickier",
  "ShadowTricki": "ShadowTrickier",
  "ShadowTrickie": "ShadowTrickier",
  "ShadowTrickl": "ShadowTrickier",

  // Myopic variants (0 vs o)
  "My0pic": "myopic",
  "Myopic": "myopic",

  // Dr00gieboy → RudiRagequit (confirmed same player, different account)
  "Dr00gieboy": "RudiRagequit",

  // diSEMBOWLER truncations/typos
  "diSEMBOWLE": "diSEMBOWLER",
  "disEMBOWLER": "diSEMBOWLER",

  // TheHottestSilk truncations
  "TheHottestSil": "TheHottestSilk",
  "TheHottestSi": "TheHottestSilk",
  "YourWettestDream": "TheHottestSilk",

  // Jeaysu/Naosuk variants
  "Jeaysu/Naosu": "Jeaysu/Naosuk",
  "Jeaysu/Naosuke": "Jeaysu/Naosuk",
  "Jeaysu / Naosuk": "Jeaysu/Naosuk",

  // LastHitEnjoyer truncations
  "LastHitEnjoye": "LastHitEnjoyer",
  "LastHitEnjoy\u00e9": "LastHitEnjoyer",

  // CatAndFurious truncations
  "CatAndFuriou": "CatAndFurious",
  "CatAndfurious": "CatAndFurious",

  // KaldieDarkleaf truncation
  "KaldieDarklea": "KaldieDarkleaf",

  // MARKEL1to/US variants (truncations, I vs 1 confusion)
  "MARKEL1to/U": "MARKEL1to/US",
  "MARKELIto/LI": "MARKEL1to/US",
  "MARKELIto/US": "MARKEL1to/US",
  "MARKEL1to/U3": "MARKEL1to/US",

  // Bourinosss/PssTV truncations
  "Bourinosss/P": "Bourinosss/Pss",
  "Bourinosss/Ps": "Bourinosss/Pss",
  "Bourinosss": "Bourinosss/Pss",
  "Bourinosss / Pss": "Bourinosss/Pss",

  // GernhartReinda truncations
  "GernhartReind": "GernhartRein",
  "GernhartReinda": "GernhartRein",

  // Brown-Noise variants
  "Brown Noise": "Brown-Noise",

  // Motcoeur typo
  "Motcoer": "Motcoeur",

  // Maalefis typo
  "Malaefis": "Maalefis",

  // BL4CKSHP typo
  "BL4CHKSHP": "BL4CKSHP",

  // Holee extra e
  "Holeee": "Holee",

  // UlricDorrn typos/spacing
  "UlficDorrn": "UlricDorrn",
  "Ulric Dorrn": "UlricDorrn",

  // ElleiraDorn typo
  "EllelraDorn": "ElleiraDorn",

  // Howsmon typo (→ chains to diSEMBOWELER)
  "Howsmon": "Howsmom",

  // Birnzito typo
  "Birnzkto": "Birnzito",

  // McMad4It typos
  "McMad4ft": "McMad4It",
  "MacMad4It": "McMad4It",

  // Lekaid typo
  "Lekoid": "Lekaid",

  // Seiler typo
  "Seier": "Seiler",

  // Krulaxx typo
  "Krulaxs": "Krulaxx",

  // xMartin96x typo
  "xMartin96sx": "xMartin96x",

  // Wurstautomat truncations
  "Wurstautoma": "Wurstautomat",
  "Wurstatutoma": "Wurstautomat",

  // Stenbergz truncation
  "Stenberg": "Stenbergz",

  // Brit-ish variant
  "Brit-ish1": "Brit-ish",

  // Robdebobrob variant
  "Robdebobrob18": "Robdebobrob",

  // TiestoMatu → TestoMatu
  "TiestoMatu": "TestoMatu",

  // Darkarus with clan tags
  "DarkarusIINEE": "Darkarus",
  "DarkarusIINE": "Darkarus",
  "Darkarus|INEE": "Darkarus",
  "Darkarus[INE]": "Darkarus",

  // ellikuritti variants (typos)
  "ellikriitti": "ellikuritti",
  "Ellikuritti": "ellikuritti",
  "Ellikriitti": "ellikuritti",
  "elfikuritti": "ellikuritti",

  // Jormamasslav* → jormamas slave2 (truncations, no space)
  "Jormamasslav": "jormamas slave2",
  "Jormamaslave": "jormamas slave2",
  "Jormamasla": "jormamas slave2",

  // Lord Ethernity spacing variants
  "LordEthernity": "Lord Ethernity",
  "Lordethernity": "Lord Ethernity",

  // Gandalf variant
  "Gandalf03": "Gandalf",

  // Stryju/Bakelolo variants (truncations)
  "StryjuIBakel": "Stryju|Bakelolo",
  "StryjuIBakelofi": "Stryju|Bakelolo",
  "Stryju Bakelot": "Stryju|Bakelolo",

  // END3RR variant
  "END3R": "END3RR",

  // MIXXD with tag variants
  "MIXXD|Aly": "MIXXD/Aly",
  "MIXXD/Alay": "MIXXD/Aly",

  // Reborn capitalization
  "Reborn": "ReBorn",

  // NerfAimbot → NerfPooP (same player, already mapped via Nerf Aimbot)
  "NerfAimbot": "NerfPooP",

  // Moffman capitalization
  "Moffman": "moffman",

  // Alexarae typo
  "Alexarae": "Alexiarae",

  // Tequila variants
  "TeQuiLa": "Tequila",
  "xTeQuiLa": "Tequila",

  // Sotuqo variant (→ chains to Boinosss/PssTV)
  "Sotuqo Stress/P": "Boinosss/PssTV",

  // M7K capitalization
  "M7K": "M7k",

  // OSISAN (l vs I)
  "ll OSISAN ll": "II OSISAN II",

  // Nameless II variants
  "Nameless II.": "JerryPat",

  // LionaSilkilee (Liona alt name)
  "LionaSilkilee": "Liona/Skillissu",

  // Testomatu capitalization
  "Testomatu": "TestoMatu",

  // time.sconfuu → Time'sConflux
  "time.sconfuu": "Time'sConflux",
  "Time'sConflu": "Time'sConflux",

  // Kogame capitalization
  "kogame": "Kogame",

  // Shirohigo - standalone, no merge needed
  // Kathlen vs kathien - unsure, skipped
  // publiclizek / puublicapp - unsure, skipped
  // Assa vs Asza - unsure, skipped

  // Mights capitalization (already merges via lowercase, but explicit for clarity)
  "Mights": "MighTs",

  // WOFL STENBERGZ → Sten (same player with prefix)
  "WOFL STENBERGZ": "Stenbergz",
  "WOFLTrig": "WOFLTrig",

  // BjörnHaudrau truncation
  "BjörnHaudrau": "BjörnHaudrauf",

  // Auto-synced from name_mapping.json
  "Abary": "MEATLOVER PIZZA",
  "AllMadd": "PhckinMilke",
  "Aly": "MIXXD",
  "Angel": "Lyynx",
  "Apfel": "Crimson Blader",
  "Bullerby": "lolubroke",
  "Caruso0": "Felidaee",
  "Character Name #1": "Roster/Raid-planner name",
  "Clapus Maximus": "capdebolet",
  "Eleborn": "ReBorn",
  "Gunzpewpew": "Atheria",
  "Hammer": "Chris P. Beacon",
  "Hoosierz": "Voyd",
  "Hop on me": "Nyxie",
  "Jormas Slave2": "jeszo",
  "Jormamas Slave2": "jeszo",
  "JukerVG": "REBE BEXHA",
  "Jxsn": "Jxsn",
  "Kevin": "Smiamxiah",
  "Kogame": "Frasian GOAT",
  "Koku": "Kohku",
  "Kream": "Trond",
  "Lyynx": "Angel",
  "MARKEL1to": "MARKEL1to/US",
  "MARKEL1to/L": "MARKEL1to/US",
  "Nyxie": "Hop on me",
  "Ordeus": "Yamii",
  "PhckinMilke": "AllMadd",
  "ReBorn": "Eleborn",
  "Roster/Raid-planner name": "Character Name #1",
  "Shiroyasha34": "darksoul34",
  "Smiamxiah": "Kevin",
  "Tira": "Tiaela Eiriell",
  "Voyd": "Hoosierz",
  "Wimpin": "Hyperi0n",
  "Yamii": "Ordeus",
  "capdebolet": "Clapus Maximus",
  "xMartin96x": "Paare",
  "zigs": "Gina Van Gina",

  // Auto-synced from name_mapping.json
  "2nd Kru": "Kru",
  "Babulmxxx": "babulm",
  "Behind Lines": "Zeldris",
  "Grumpy Karen": "kathien",
  "IThinkHealers": "JukerVG",
  "MighTs": "Mights",
  "NevSquared": "Nevnev",
  "Palimpalim": "2xPalim",
  "Tank De Bolet": "capdebolet",
  "WhyDidIDoThis": "Holee",
  "ZKDD": "xBEAT",
  "noktana": "setanko",
  "sdfgasgf": "SDthe(Witch",
  "sintrael": "Shiroyasha34",

  // Auto-synced from name_mapping.json
  "2xPalim": "Palimpalim",
  "Belle": "Belle",
  "Holee": "WhyDidIDoThis",
  "Jegerys": "Jeg",
  "Jt23": "Jt",
  "SDthe(Witch": "sdfgasgf",
  "Zeldris": "Behind Lines",
  "hkN": "hkN.oO",
  "xBEAT": "ZKDD",

  // Auto-synced from name_mapping.json
  "Darth Jarker": "Jarker",
  "Zenø": "Zenodiac",

  // Auto-synced from name_mapping.json
  "1.618": "Ambrozja/1.6",
  "Bakelolo": "Stryju|Bakel",

  // Carusoo (double-o) → Felidaee/Caruso0 group
  "Carusoo": "Felidaee",
  // Couch1 → GailibixX (same player, new in-game name)
  "Couch1": "GailibixX",
  // capy / kel / OhMyGourd new aliases
  "dm for capy pics": "capy",
  "capy": "dm for capy pics",
  "CherieFanClub": "kel",
  "kel": "CherieFanClub",
  "4x4": "OhMyGourd",
  "OhMyGourd": "4x4",
  // Hoosierz/Vore variants
  "Hoosierz(Vor": "Hoosierz",
  "Vore": "Hoosierz",

  // Auto-synced from name_mapping.json
  "BelleSprout": "Belle",
  "Bella Aurora": "BellaAurora",
  "Babulmphone": "babulm",
  "GailibixX/Cou": "Couch1",

  // Auto-synced from name_mapping.json
  "2nd kru": "Kru",
  "BorisAriana": "BorisPotato",
  "BorisPotato": "BorisAriana",
  "laaap on a trip": "laaap",

  // Auto-synced from name_mapping.json
  "KathienMermaid": "kathien",
  "LIL CAPY": "CAPY",

  // Auto-synced from name_mapping.json
  "Baguetttte": "Inziar",
  "Frend": "Kryee",
  "Inziar": "Baguetttte",
  "Kryee": "Frend",
  "Raiduru": "Raiderer",

  // Auto-synced from name_mapping.json
  "Be my e-kitten": "Hahttori",
  "Big Sword Dude": "bsd",
  "Doakes": "joner",
  "Hahttori": "Be my e-kitten",
  "joner": "Doakes",

  // Auto-synced from name_mapping.json
  "AllMadd(Milk": "PhckinMilker",
  "PhckinMilker": "AllMadd(Milk",
  "Shunji": "shokkii",
  "WOFL STENBERG": "Sten",
};

// Build bidirectional canonical name lookup
let nameAliasMap = {}; // lowercased alias -> canonical name

function buildNameLookup() {
  // Start with NAME_MAPPING_JSON
  const groups = {};

  for (const [key, val] of Object.entries(NAME_MAPPING_JSON)) {
    const kl = key.toLowerCase().trim();
    const vl = val.toLowerCase().trim();

    // Find or create groups
    let gk = null, gv = null;
    for (const [canon, aliases] of Object.entries(groups)) {
      if (aliases.has(kl) || kl === canon) gk = canon;
      if (aliases.has(vl) || vl === canon) gv = canon;
    }

    if (gk && gv && gk !== gv) {
      // Merge groups
      for (const a of groups[gv]) groups[gk].add(a);
      groups[gk].add(gv);
      delete groups[gv];
      groups[gk].add(kl);
      groups[gk].add(vl);
    } else if (gk) {
      groups[gk].add(vl);
    } else if (gv) {
      groups[gv].add(kl);
    } else {
      // New group - use the value as canonical
      const canon = vl;
      groups[canon] = new Set([kl, vl]);
    }
  }

  // Build final lookup
  nameAliasMap = {};
  for (const [canon, aliases] of Object.entries(groups)) {
    for (const alias of aliases) {
      nameAliasMap[alias] = canon;
    }
    nameAliasMap[canon] = canon;
  }
}

function getCanonicalName(name) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  return nameAliasMap[lower] || lower;
}

function getDisplayName(name) {
  // Return the original name with proper casing (first seen version)
  return name;
}

function findDisplayName(canonical, names) {
  // Prefer a NAME_MAPPING_JSON value that matches the canonical name (proper casing)
  for (const val of Object.values(NAME_MAPPING_JSON)) {
    if (val.toLowerCase().trim() === canonical) return val;
  }
  // Fallback: longest name from match data
  return [...names].sort((a, b) => b.length - a.length)[0];
}

function getAllAliases(canonicalName) {
  const aliases = new Set();
  const canon = canonicalName.toLowerCase().trim();
  for (const [alias, c] of Object.entries(nameAliasMap)) {
    if (c === canon) aliases.add(alias);
  }
  aliases.add(canon);
  return [...aliases];
}

// Initialize name lookup
buildNameLookup();

// ==========================================
//  VOD SYSTEM
// ==========================================

async function loadVodData() {
  if (vodData) return vodData;
  try {
    const res = await fetch(`data/vods.json?_cb=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) vodData = await res.json();
  } catch (e) { /* vods.json not available, no problem */ }
  return vodData || {};
}

function stripParens(s) { return s.replace(/\s*\(.*?\)\s*/g, '').trim(); }

function buildMatchVodLookup(slug) {
  currentMatchVods = {};
  if (!vodData || !vodData[slug] || !currentMatch) return;
  const allPlayers = currentMatch.groups.flatMap(g => [...g.team1, ...g.team2]);
  for (const entry of vodData[slug]) {
    const discordLower = entry.discord.toLowerCase().trim();
    const discordStripped = stripParens(discordLower);
    const discordCanonical = nameAliasMap[discordLower] || nameAliasMap[discordStripped];
    let matched = null;
    // Try matching against actual players in this match
    for (const p of allPlayers) {
      const pCanonical = getCanonicalName(p.name);
      const pLower = p.name.toLowerCase();
      const pStripped = stripParens(pLower);
      // Exact canonical match (discord alias and player alias resolve to same person)
      if (discordCanonical && discordCanonical === pCanonical) { matched = pCanonical; break; }
      // Exact name match (case-insensitive, ignoring parenthesized suffixes)
      if (pLower === discordLower || pStripped === discordStripped) { matched = pCanonical; break; }
      // Partial/contains match (e.g. "Hoosierz" in "Hoosierz(Vor")
      if (pStripped.includes(discordStripped) || discordStripped.includes(pStripped)) { matched = pCanonical; break; }
    }
    if (matched) {
      currentMatchVods[matched] = entry.url;
    }
  }
}

function getVodCell(playerName) {
  const canonical = getCanonicalName(playerName);
  const url = currentMatchVods[canonical];
  if (!url) return '<td class="pt-vod"></td>';
  return `<td class="pt-vod"><a href="${url}" target="_blank" rel="noopener" class="vod-btn">&#9654; Watch VOD</a></td>`;
}

// ==========================================
//  GOOGLE SHEETS INTEGRATION
// ==========================================

const SPREADSHEET_ID = '1vYy9Zsn7hVN3Z3sEW2S0GsXEMh1VVM_P7vn6C5LMFgY';
const PUBLISHED_ID = '2PACX-1vReMFS4C8UfVHqgl0rI14LVdU4adkyw8_ClQpAJgkXluqncRdqBHXer156nDt_A3deeB7qO0vuDaHE8';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Hybrid data loading: the last N matches are live-synced from Google Sheets
// (so in-progress edits show up immediately). Older matches load from static
// JSON files in public/data/ for instant rendering. Set to 0 to disable live
// sync entirely (pure static mode).
const LIVE_SYNC_RECENT_COUNT = 5;

// Manual attacker overrides: which team (team1/team2) was the attacker.
// Used to set the attacker label. Does NOT by itself control player layout.
const ATTACKER_OVERRIDES = {
  'nwl-33': 'team2', // Syndicate (Capyknights) attacked, not Beaverknights
  'nwl-34': 'team2', // Syndicate (Capyknights) attacked, not Beaverknights
  'nwl-35': 'team1', // Marauders (Beaverknights) attacked
  'nwl-36': 'team1', // Marauders (Beaverknights) attacked
  'nwl-37': 'team2', // Syndicate (Capyknights) attacked
  'nwl-38': 'team1', // Marauders (Beaverknights) attacked
  'nwl-39': 'team1', // Marauders (Beaverknights) attacked
  'nwl-40': 'team2', // Syndicate (Capyknights) attacked
};

// Matches where the attacker is team2 (Capyknights at top of sheet) but the
// players are ALREADY correctly laid out (Beaverknights at top) due to wrong
// logo placement that the players followed — so no swap is needed.
// NWL#33/34: wrong logo, players followed it → Beaverknights are at top → no swap.
// All other team2-attacker matches: Capyknights physically at top → swap needed.
const NO_SWAP_OVERRIDES = new Set(['nwl-33', 'nwl-34']);

// Google Form for submitting VODs. Set this once after running
// scripts/create-vod-form.gs (the script prints the URL). When non-empty, a
// "Submit VOD" link appears in the hamburger menu. Form submissions land in
// the spreadsheet's "VODs" tab and are picked up by extract-data.py on the
// next auto-sync (~30 min during evening hours).
const VOD_SUBMIT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd1tbySbH7WONuIZ1AA_2e3v16PAnesYK5sf0bvDmqJf3fG4A/viewform';

// Team logo SHA-256 hashes for auto-detecting attacker from XLSX
const BEAVER_SHA256 = new Set([
  '2f48a7108179ab258234c478514a2f7372d7f3da24aa6b77342f04e1536e2efa',
  'fa6edfe0470cbe397980535a212a31959580bd248307384f8a00d44e24b2fd78',
  '0e9bfade9d3bd83d52c95e37832f7ba8c81b49f502c8672f63d751e35368901e',
]);
const CAPY_SHA256 = new Set([
  'a7d61003e93bd265102f3aa8dab77648859f0db35fe3959dab3f14ac29feb4bd',
  'e8543391076bd7afb22c1275312c7bff05ca14b18a6a39715cdd9cc0d99382b8',
  '5d91bd752aca7a3a5a636906547c54b9e2c4f146b7e90372c7608a3464c092bc',
]);

// -- CSV Parser ------------------------------

function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const lines = text.split('\n');

  for (const line of lines) {
    if (inQuotes) {
      current += '\n' + line;
      if ((line.match(/"/g) || []).length % 2 === 1) {
        inQuotes = false;
        rows.push(splitCSVLine(current));
        current = '';
      }
    } else {
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        inQuotes = true;
        current = line;
      } else {
        if (line.trim()) rows.push(splitCSVLine(line));
      }
    }
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { result.push(cell.trim()); cell = ''; }
      else cell += c;
    }
  }
  result.push(cell.trim());
  return result;
}

// -- Sheet Discovery -------------------------

async function fetchSheetList() {
  const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pubhtml?_cb=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot fetch sheet list');
  const html = await res.text();

  const sheets = [];
  const regex = /name:\s*"([^"]+)"[^}]*gid:\s*"(\d+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const name = match[1].replace(/\\\//g, '/');
    const gid = match[2];
    if (name !== 'Template' && name.match(/\d{2}\.\d{2}\.\d{4}/) && name.match(/NWL#/i)) {
      sheets.push({ gid, name });
    }
  }
  return sheets;
}

// -- Sheet Data Fetching ---------------------

async function fetchSheetCSV(gid) {
  const cb = `_cb=${Date.now()}`;
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}&${cb}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const url2 = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=csv&gid=${gid}&${cb}`;
    const res2 = await fetch(url2, { cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to fetch sheet gid=${gid}`);
    return await res2.text();
  }
  return await res.text();
}

// -- XLSX Metadata: Auto-Detect Attackers & Winners --

async function sha256hex(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function parseXLSXMetadata() {
  const attackers = {}; // dateKey -> 'team1' | 'team2'
  const winners = {};   // dateKey -> 'team1' | 'team2'
  if (typeof JSZip === 'undefined') return { attackers, winners };
  try {
    // Try Vercel API proxy first (avoids CORS), then direct URLs as fallback
    const cb = `_cb=${Date.now()}`;
    let resp = await fetch(`/api/xlsx?${cb}`, { cache: 'no-store' }).catch(() => null);
    if (!resp || !resp.ok) {
      resp = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&${cb}`, { cache: 'no-store' }).catch(() => null);
    }
    if (!resp || !resp.ok) {
      resp = await fetch(`https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=xlsx&${cb}`, { cache: 'no-store' }).catch(() => null);
    }
    if (!resp || !resp.ok) return { attackers, winners };
    const data = await resp.arrayBuffer();
    const zip = await JSZip.loadAsync(data);

    // 1. Identify team logos by SHA-256
    const imgTeam = {};
    const mediaFiles = Object.keys(zip.files).filter(p => p.startsWith('xl/media/'));
    await Promise.all(mediaFiles.map(async (path) => {
      const buf = await zip.files[path].async('arraybuffer');
      const hash = await sha256hex(buf);
      const fname = path.split('/').pop();
      if (BEAVER_SHA256.has(hash)) imgTeam[fname] = 'team1';
      else if (CAPY_SHA256.has(hash)) imgTeam[fname] = 'team2';
    }));

    // 2. Parse workbook structure
    const wbXml = await zip.file('xl/workbook.xml').async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const wbRels = {};
    for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
      wbRels[m[1]] = m[2];
    }

    // 3. For each NWL sheet: detect tab color (winner) + top image (attacker)
    for (const m of wbXml.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
      const sheetName = m[1].replace(/&amp;/g, '&');
      const dateMatch = sheetName.match(/(\d{2}\.\d{2}\.\d{4})/);
      if (!dateMatch) continue;
      const dateKey = dateMatch[1];

      const target = wbRels[m[2]];
      if (!target) continue;
      const sheetPath = 'xl/' + target;
      const sheetFile = zip.file(sheetPath);
      if (!sheetFile) continue;
      const sheetXml = await sheetFile.async('string');

      // Tab color → winner
      const tcm = sheetXml.match(/<tabColor rgb="([a-fA-F0-9]{8})"/i);
      if (tcm) {
        const c = tcm[1];
        const r = parseInt(c.slice(2, 4), 16), g = parseInt(c.slice(4, 6), 16), b = parseInt(c.slice(6, 8), 16);
        if (g > r && g > b) winners[dateKey] = 'team1';       // Green = Beaverknights
        else if ((r > g || b > g) && b > 50) winners[dateKey] = 'team2'; // Purple = Capyknights
      }

      // Drawing → images → top image = attacker
      const dm = sheetXml.match(/<drawing r:id="([^"]+)"/);
      if (!dm) continue;
      const sheetRelsPath = sheetPath.replace('worksheets/', 'worksheets/_rels/') + '.rels';
      const sheetRelsFile = zip.file(sheetRelsPath);
      if (!sheetRelsFile) continue;
      const sheetRels = await sheetRelsFile.async('string');

      const dm2 = sheetRels.match(new RegExp(`Id="${dm[1]}"[^>]*Target="([^"]+)"`));
      if (!dm2) continue;
      const drawingPath = 'xl/' + dm2[1].replace(/\.\.\//g, '');

      const drawingFile = zip.file(drawingPath);
      if (!drawingFile) continue;
      const drawingXml = await drawingFile.async('string');

      const drawingRelsPath = drawingPath.replace('drawings/', 'drawings/_rels/') + '.rels';
      const ridToImg = {};
      const drelsFile = zip.file(drawingRelsPath);
      if (drelsFile) {
        const drels = await drelsFile.async('string');
        for (const rm of drels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
          ridToImg[rm[1]] = rm[2].split('/').pop();
        }
      }

      const images = [];
      for (const a of drawingXml.matchAll(/<xdr:oneCellAnchor>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?r:embed="([^"]+)"[\s\S]*?<\/xdr:oneCellAnchor>/g)) {
        const row = parseInt(a[1]);
        const imgFile = ridToImg[a[2]] || '';
        const team = imgTeam[imgFile];
        if (team) images.push([row, team]);
      }

      if (images.length) {
        images.sort((a, b) => a[0] - b[0]);
        attackers[dateKey] = images[0][1]; // Top image = attacker
      }
    }
  } catch (e) {
    console.warn('XLSX metadata detection failed (falling back to matches.json):', e);
  }
  return { attackers, winners };
}

// -- Match Metadata Parsing ------------------

function parseSheetName(name) {
  const nwlMatch = name.match(/NWL#(\d+)/i);
  const nwlNumber = nwlMatch ? parseInt(nwlMatch[1]) : null;

  const dateMatch = name.match(/(\d{2}\.\d{2}\.\d{4})/);
  const date = dateMatch ? dateMatch[1] : '';

  const mapMatch = name.match(/^(.+?)\s+\d{2}\.\d{2}\.\d{4}/);
  const mapName = mapMatch ? mapMatch[1].trim() : name;

  return { nwlNumber, date, mapName };
}

// -- CSV → Match Data Parser -----------------

function safeInt(val) {
  if (!val || val === '') return 0;
  // Handle European number format: dots as thousands separator, comma as decimal
  const cleaned = String(val).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
}

function isGroupLabel(val) {
  return val && /^G\d+/.test(val.trim());
}

function parsePlayer(row, colOffset) {
  if (!row || row.length < colOffset + 7) return null;
  const role = (row[colOffset] || '').trim();
  const name = (row[colOffset + 1] || '').trim();
  if (!name || !role || role.length > 5 || !/^[a-zA-Z]+$/.test(role)) return null;
  return {
    name,
    role,
    kills: safeInt(row[colOffset + 2]),
    deaths: safeInt(row[colOffset + 3]),
    assists: safeInt(row[colOffset + 4]),
    healing: safeInt(row[colOffset + 5]),
    damage: safeInt(row[colOffset + 6]),
  };
}

function parseCSVMatch(csvText) {
  const rows = parseCSV(csvText);
  let result = null;
  let duration = null;

  // -- Collect metadata (result, duration) --
  let rawResult = null; // 'VICTORY' or 'DEFEAT' (attacker's perspective)
  for (const row of rows) {
    const h = (row[7] || '').trim();
    const hUp = h.toUpperCase();
    // Only take the FIRST VICTORY/DEFEAT found (attacker's result)
    if (result === null) {
      if (hUp === 'VICTORY') { result = 'team1'; rawResult = 'VICTORY'; }
      else if (hUp === 'DEFEAT') { result = 'team2'; rawResult = 'DEFEAT'; }
    }
    if (/^\d+:\d+$/.test(h)) duration = h;
  }

  // -- Extract total kill counts from fixed cells --
  // H24:J30 (row 23 col 7) = attacker total kills
  // H39:J46 (row 38 col 7) = defender total kills
  const attackerKills = safeInt(rows[23]?.[7]);
  const defenderKills = safeInt(rows[38]?.[7]);

  // -- Find all group-label rows --
  const labelRows = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const b = (row[1] || '').trim();
    const l = (row[11] || '').trim();
    const c = (row[2] || '').trim();
    const isHdr = c === 'Kills';
    const lb = isGroupLabel(b);
    const ll = isGroupLabel(l);
    if (isHdr || lb || ll) {
      labelRows.push({
        idx: i,
        left: lb ? b : null,
        right: ll ? l : null,
        isHeader: isHdr,
      });
    }
  }

  // -- Split into 2 sections --
  let splitIdx = null;
  let seenFirst = false;
  for (let i = 0; i < labelRows.length; i++) {
    const lr = labelRows[i];
    const hasG1OrHeader = lr.isHeader || (lr.left && lr.left.startsWith('G1'));
    if (hasG1OrHeader) {
      if (seenFirst) { splitIdx = i; break; }
      seenFirst = true;
    }
  }

  const s1 = splitIdx ? labelRows.slice(0, splitIdx) : labelRows;
  const s2 = splitIdx ? labelRows.slice(splitIdx) : [];

  function extractGroups(section) {
    const left = [], right = [];
    for (let i = 0; i < section.length; i++) {
      const lr = section[i];
      const startIdx = lr.idx + 1;
      const endIdx = (i + 1 < section.length) ? section[i + 1].idx - 1 : lr.idx + 6;
      const lp = [], rp = [];
      for (let r = startIdx; r <= Math.min(endIdx, rows.length - 1); r++) {
        const p1 = parsePlayer(rows[r], 0);
        if (p1) lp.push(p1);
        const p2 = parsePlayer(rows[r], 10);
        if (p2) rp.push(p2);
      }
      if (lr.left) left.push({ label: lr.left, players: lp });
      if (lr.right) right.push({ label: lr.right, players: rp });
    }
    return [left, right];
  }

  const [s1l, s1r] = extractGroups(s1);
  const [s2l, s2r] = extractGroups(s2);

  // -- Merge into groups (by group number, not index) --
  function getGroupNum(g) {
    const m = g.label.match(/\d+/);
    return m ? parseInt(m[0]) : 0;
  }
  function merge(t1List, t2List, offset) {
    const t1ByNum = {};
    for (const g of t1List) t1ByNum[getGroupNum(g)] = g;
    const t2ByNum = {};
    for (const g of t2List) t2ByNum[getGroupNum(g)] = g;
    const allNums = [...new Set([...Object.keys(t1ByNum), ...Object.keys(t2ByNum)])]
      .map(Number).sort((a, b) => a - b);
    const groups = [];
    for (const num of allNums) {
      const t1 = t1ByNum[num] || null;
      const t2 = t2ByNum[num] || null;
      const label = (t1 || t2 || {}).label || `G${num}`;
      groups.push({
        label,
        team1: t1 ? t1.players : [],
        team2: t2 ? t2.players : [],
      });
    }
    return groups;
  }

  const groups = [...merge(s1l, s2l, 0), ...merge(s1r, s2r, 5)];

  // -- Totals --
  const t1 = { kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
  const t2 = { kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
  for (const g of groups) {
    for (const p of g.team1) { for (const k in t1) t1[k] += p[k]; }
    for (const p of g.team2) { for (const k in t2) t2[k] += p[k]; }
  }

  return { groups, winner: result, rawResult, duration, totals: { team1: t1, team2: t2 }, attackerKills, defenderKills };
}

// -- Cache Layer -----------------------------

function getCached(key) {
  try {
    const raw = sessionStorage.getItem(`nwl_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(`nwl_${key}`); return null; }
    return data;
  } catch { return null; }
}

function setCache(key, data) {
  try { sessionStorage.setItem(`nwl_${key}`, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* storage full, ignore */ }
}

// -- Build All Match Data --------------------

// Process a single sheet entry into a match detail + summary.
// Shared by the live-sync path (buildMatchesFromSheets) and could be reused elsewhere.
async function processSheetEntry(entry, xlsxMeta, staticAttackers, staticWinners) {
  const csv = await fetchSheetCSV(entry.gid);
  const parsed = parseCSVMatch(csv);
  const slug = `nwl-${entry.nwlNumber}`;
  // Determine who attacked and whether the physical CSV layout needs swapping.
  //
  // The sheet always puts the attacker in the top section (parsed as team1).
  // When Capyknights attacked, their players are at top → we must swap so
  // team1 always = Beaverknights in the output.
  //
  // Exception: NWL#33/34 had a wrong logo AND players followed the wrong logo,
  // so Beaverknights ended up at top despite Capyknights attacking → no swap.
  // Those matches are listed in NO_SWAP_OVERRIDES.
  const overrideAttacker = ATTACKER_OVERRIDES[slug] || null;
  const detectedAttacker = xlsxMeta.attackers[entry.date] || staticAttackers[slug] || null;
  const attacker = overrideAttacker || detectedAttacker;

  // Capyknights (team2) are physically at the top of the sheet when they attacked,
  // unless this match is in NO_SWAP_OVERRIDES.
  const capyAtTop = (overrideAttacker === 'team2' || (!overrideAttacker && detectedAttacker === 'team2'))
                    && !NO_SWAP_OVERRIDES.has(slug);
  const didSwap = capyAtTop;

  if (didSwap) {
    for (const g of parsed.groups) {
      [g.team1, g.team2] = [g.team2, g.team1];
    }
    [parsed.totals.team1, parsed.totals.team2] = [parsed.totals.team2, parsed.totals.team1];
    if (parsed.winner === 'team1') parsed.winner = 'team2';
    else if (parsed.winner === 'team2') parsed.winner = 'team1';
  }

  // XLSX tab color is primary for winner, matches.json is fallback
  let winner = xlsxMeta.winners[entry.date] || staticWinners[slug];
  if (!winner) winner = parsed.winner;
  if (!winner) {
    const t1k = parsed.totals.team1.kills;
    const t2k = parsed.totals.team2.kills;
    winner = t1k > t2k ? 'team1' : (t2k > t1k ? 'team2' : null);
  }

  // Map top/bottom section kill cells to team1/team2. Driven by detected
  // (physical) attacker, since parsed.attackerKills/defenderKills come from
  // fixed top/bottom cells — so follow the actual swap, not the override.
  let team1Kills, team2Kills;
  if (parsed.attackerKills || parsed.defenderKills) {
    if (didSwap) {
      // After swap: team1 = Beaverknights (were defenders, bottom section)
      team1Kills = parsed.defenderKills;
      team2Kills = parsed.attackerKills;
    } else {
      team1Kills = parsed.attackerKills;
      team2Kills = parsed.defenderKills;
    }
    parsed.totals.team1.kills = team1Kills;
    parsed.totals.team2.kills = team2Kills;
  } else {
    team1Kills = parsed.totals.team1.kills;
    team2Kills = parsed.totals.team2.kills;
  }

  return {
    slug,
    detail: {
      slug, nwlNumber: entry.nwlNumber, mapName: entry.mapName,
      date: entry.date, duration: parsed.duration, winner, attacker,
      groups: parsed.groups, totals: parsed.totals,
      team1Name: 'Beaverknights', team2Name: 'Capyknights',
      gid: entry.gid,
    },
    summary: {
      slug, nwlNumber: entry.nwlNumber, mapName: entry.mapName,
      date: entry.date, duration: parsed.duration, winner, attacker,
      team1Kills, team2Kills,
      team1Name: 'Beaverknights', team2Name: 'Capyknights',
    },
  };
}

// Load a single match detail from its static JSON file in public/data/.
async function loadStaticMatchDetail(slug) {
  try {
    const res = await fetch(`data/${slug}.json?_cb=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) { /* ignore */ }
  return null;
}

// Hybrid loader: older matches come from static JSONs (instant), the last
// LIVE_SYNC_RECENT_COUNT matches are fetched live from Google Sheets so
// in-progress edits show up without re-running extract-data.py.
async function buildMatchesFromSheets() {
  const cached = getCached('all_matches');
  if (cached) return cached;

  // Always load the static summary list first — it's our base layer.
  const staticSummaries = await fetch(`data/matches.json?_cb=${Date.now()}`, { cache: 'no-store' })
    .then(r => r.ok ? r.json() : [])
    .catch(() => []);

  // Index static data for use as attacker/winner fallback.
  const staticWinners = {};
  const staticAttackers = {};
  staticSummaries.forEach(m => {
    staticWinners[m.slug] = m.winner;
    if (m.attacker) staticAttackers[m.slug] = m.attacker;
  });
  const staticSummaryBySlug = Object.fromEntries(staticSummaries.map(m => [m.slug, m]));

  // Try to fetch the Sheets tab list + XLSX metadata. If either fails we
  // degrade gracefully to pure-static mode.
  let sheets = [];
  let xlsxMeta = { attackers: {}, winners: {} };
  try {
    [sheets, xlsxMeta] = await Promise.all([
      fetchSheetList(),
      parseXLSXMetadata().catch(() => ({ attackers: {}, winners: {} })),
    ]);
  } catch (e) {
    console.warn('Google Sheets list unavailable, using pure static data:', e);
  }

  // Build entries with NWL numbers (reuses existing date/name parsing logic).
  const entries = sheets.map(s => {
    const meta = parseSheetName(s.name);
    const dt = meta.date ? parseDate(meta.date) : new Date(0);
    return { ...s, ...meta, dt };
  });
  entries.sort((a, b) => a.dt - b.dt);

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].nwlNumber !== null) continue;
    for (let j = i - 1; j >= 0; j--) {
      if (entries[j].nwlNumber !== null) {
        entries[i].nwlNumber = entries[j].nwlNumber + (i - j);
        break;
      }
    }
    if (entries[i].nwlNumber === null) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[j].nwlNumber !== null) {
          entries[i].nwlNumber = entries[j].nwlNumber - (j - i);
          break;
        }
      }
    }
    if (entries[i].nwlNumber === null) entries[i].nwlNumber = i + 1;
  }

  // Determine threshold: the last N matches (by NWL number) get live-synced.
  const allNumbers = entries.map(e => e.nwlNumber).concat(staticSummaries.map(m => m.nwlNumber));
  const maxNum = allNumbers.length ? Math.max(...allNumbers) : 0;
  const liveThreshold = LIVE_SYNC_RECENT_COUNT > 0 ? maxNum - LIVE_SYNC_RECENT_COUNT + 1 : Infinity;

  const liveEntries = entries.filter(e => e.nwlNumber >= liveThreshold);
  const oldEntries = entries.filter(e => e.nwlNumber < liveThreshold);

  // === Parallel A: load static JSON details for all old matches ===
  const oldStaticPromise = Promise.all(oldEntries.map(async (entry) => {
    const slug = `nwl-${entry.nwlNumber}`;
    const detail = await loadStaticMatchDetail(slug);
    if (!detail) return null;
    const summary = staticSummaryBySlug[slug] || {
      slug, nwlNumber: entry.nwlNumber, mapName: entry.mapName,
      date: entry.date, duration: detail.duration,
      winner: detail.winner, attacker: detail.attacker,
      team1Kills: detail.totals?.team1?.kills || 0,
      team2Kills: detail.totals?.team2?.kills || 0,
      team1Name: 'Beaverknights', team2Name: 'Capyknights',
    };
    return { slug, detail, summary };
  }));

  // === Parallel B: fetch live CSVs for recent matches (batched) ===
  const liveFetchPromise = (async () => {
    const out = [];
    const BATCH = 5;
    for (let b = 0; b < liveEntries.length; b += BATCH) {
      const batch = liveEntries.slice(b, b + BATCH);
      const results = await Promise.all(batch.map(async (entry) => {
        try {
          return await processSheetEntry(entry, xlsxMeta, staticAttackers, staticWinners);
        } catch (e) {
          console.warn(`Failed to parse sheet "${entry.name}" live, will fall back to static:`, e);
          return null;
        }
      }));
      for (const r of results) out.push(r);
    }
    return out;
  })();

  const [oldResults, liveResults] = await Promise.all([oldStaticPromise, liveFetchPromise]);

  // Merge
  const matchDetails = {};
  const matchList = [];

  for (const r of oldResults) {
    if (!r) continue;
    matchDetails[r.slug] = r.detail;
    matchList.push(r.summary);
  }

  // Live results: use sheets data where available; fall back to static for failures
  for (let i = 0; i < liveEntries.length; i++) {
    const entry = liveEntries[i];
    const slug = `nwl-${entry.nwlNumber}`;
    const r = liveResults[i];
    if (r) {
      matchDetails[r.slug] = r.detail;
      matchList.push(r.summary);
    } else {
      // Live fetch failed — fall back to static JSON for this slug.
      const detail = await loadStaticMatchDetail(slug);
      if (detail) {
        matchDetails[slug] = detail;
        const summary = staticSummaryBySlug[slug];
        if (summary) matchList.push(summary);
      }
    }
  }

  // If sheets were entirely unavailable, pick up any static-only matches we haven't added yet.
  if (!entries.length) {
    for (const m of staticSummaries) {
      if (matchDetails[m.slug]) continue;
      const detail = await loadStaticMatchDetail(m.slug);
      if (detail) {
        matchDetails[m.slug] = detail;
        matchList.push(m);
      }
    }
  }

  if (!matchList.length) throw new Error('No match data available');

  matchList.sort((a, b) => b.nwlNumber - a.nwlNumber);
  const result = { matchList, matchDetails, liveThreshold };
  setCache('all_matches', result);
  return result;
}

function parseDate(dateStr) {
  const [d, m, y] = dateStr.split('.');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

// -- Utilities ------------------------------

let compactNumbers = window.innerWidth < 600;
let currentView = 'excel'; // 'excel', 'list', 'comparison'
let fontSizeScale = parseInt(localStorage.getItem('nwl-font-size') || '100'); // percentage

function fmt(n) {
  if (compactNumbers) return fmtCompact(n);
  return fmtFull(n);
}

function fmtCompact(n) {
  if (!n || n === 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return '' + n;
}

function fmtFull(n) {
  if (!n || n === 0) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function kd(p) {
  return p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
}

function formatDate(dateStr) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [d, m, y] = dateStr.split('.');
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// -- Router ---------------------------------

function getRoute() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/match/')) {
    return { page: 'match', slug: hash.slice(7) };
  }
  if (hash.startsWith('/player/')) {
    return { page: 'player', playerName: decodeURIComponent(hash.slice(8)) };
  }
  if (hash === '/search') {
    return { page: 'search' };
  }
  if (hash === '/changelog') {
    return { page: 'changelog' };
  }
  return { page: 'home' };
}

function navigate(hash) {
  window.location.hash = hash;
}

// Encode a player name for safe use in onclick='navigate(...)' attributes
function encodePlayerForLink(name) {
  return encodeURIComponent(name).replace(/'/g, '%27');
}


window.addEventListener('hashchange', () => render());

// ==========================================
//  HAMBURGER NAVIGATION MENU
// ==========================================

function getHamburgerHTML() {
  return `
    <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-overlay" onclick="toggleNav()"></div>
    <nav class="nav-drawer">
      <div class="nav-drawer-title">NWL Scoreboard</div>
      <a onclick="toggleNav(); navigate('');">
        <svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>
        Match History
      </a>
      <a onclick="toggleNav(); navigate('#/search');">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        Player Search
      </a>
      <a href="https://docs.google.com/forms/d/e/1FAIpQLSeWlF7ZuHroaLtfhb2DNaavbiPo8X1GRBonDQg09-Uan1G7SA/viewform" target="_blank" rel="noopener noreferrer" onclick="toggleNav();">
        <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
        Support-Ticket
      </a>
      ${VOD_SUBMIT_FORM_URL ? `<a href="${VOD_SUBMIT_FORM_URL}" target="_blank" rel="noopener noreferrer" onclick="toggleNav();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Submit VOD
      </a>` : ''}
      <a onclick="toggleNav(); navigate('#/changelog');">
        <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01"/></svg>
        Changelog
      </a>
    </nav>`;
}

function toggleNav() {
  document.querySelector('.hamburger-btn')?.classList.toggle('open');
  document.querySelector('.nav-drawer')?.classList.toggle('open');
  document.querySelector('.nav-overlay')?.classList.toggle('open');
}

function attachHamburger() {
  const el = document.createElement('div');
  el.id = 'nav-menu';
  el.innerHTML = getHamburgerHTML();
  document.body.appendChild(el);
}

function ensureHamburger() {
  if (!document.getElementById('nav-menu')) {
    attachHamburger();
  }
}

function toggleFilterPanel() {
  const body = document.getElementById('filter-body');
  const arrow = document.getElementById('filter-arrow');
  if (body.style.display === 'none') {
    body.style.display = '';
    arrow.textContent = '▼';
  } else {
    body.style.display = 'none';
    arrow.textContent = '▶';
  }
}

// -- Render Router --------------------------

let sheetsData = null;
let _sheetsSyncPromise = null;

// Lazy Google Sheets sync: starts in background, resolves when done
function ensureSheetsSync() {
  if (sheetsData) return Promise.resolve(sheetsData);
  if (_sheetsSyncPromise) return _sheetsSyncPromise;
  _sheetsSyncPromise = Promise.race([
    buildMatchesFromSheets(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Sheets fetch timeout')), 30000))
  ]).then(data => {
    sheetsData = data;
    return data;
  }).catch(e => {
    console.warn('Google Sheets unavailable:', e);
    _sheetsSyncPromise = null;
    return null;
  });
  return _sheetsSyncPromise;
}

async function render() {
  stopLoadingQuotes();
  applyWallpaper();
  const route = getRoute();

  try {
    ensureHamburger();

    if (route.page === 'match') {
      // Match detail: recent matches are live-synced from Sheets, older ones
      // use static JSON for instant rendering.
      let data;
      if (sheetsData && sheetsData.matchDetails[route.slug]) {
        data = sheetsData.matchDetails[route.slug];
      } else {
        const slugNum = parseInt(String(route.slug).replace(/^nwl-/, ''), 10) || 0;
        // Peek at matches.json to find the max NWL number so we can tell
        // whether this match falls in the live-sync window.
        let maxNum = 0;
        try {
          const mRes = await fetch(`data/matches.json?_cb=${Date.now()}`, { cache: 'no-store' });
          if (mRes.ok) {
            const mList = await mRes.json();
            maxNum = mList.reduce((m, x) => Math.max(m, x.nwlNumber || 0), 0);
          }
        } catch { /* fall through with maxNum=0 */ }
        const isRecent = LIVE_SYNC_RECENT_COUNT > 0 && slugNum > 0 && slugNum > maxNum - LIVE_SYNC_RECENT_COUNT;

        if (isRecent) {
          // Live match: prefer Sheets, static JSON only as last resort.
          app.innerHTML = loadingScreenHTML('Loading Match', 'Syncing live with Google Sheets...');
          startLoadingQuotes();
          const sd = await ensureSheetsSync();
          data = sd && sd.matchDetails[route.slug];
          if (!data) {
            const res = await fetch(`data/${route.slug}.json?_cb=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) data = await res.json();
          }
        } else {
          // Archived match: static JSON first (instant), Sheets only as fallback.
          app.innerHTML = loadingScreenHTML('Loading Match', 'Fetching match data...');
          startLoadingQuotes();
          const res = await fetch(`data/${route.slug}.json?_cb=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            data = await res.json();
          } else {
            const sd = await ensureSheetsSync();
            data = sd && sd.matchDetails[route.slug];
          }
        }
        if (!data) throw new Error('Match not found');
      }
      currentMatch = data;
      currentRole = 'ALL';
      await loadVodData();
      buildMatchVodLookup(route.slug);
      renderMatchPage(data);
    } else if (route.page === 'search') {
      // Search needs full Sheets data for player index
      if (!sheetsData) {
        app.innerHTML = loadingScreenHTML('Loading Players', 'Syncing with Google Sheets...');
        startLoadingQuotes();
        await ensureSheetsSync();
      }
      renderSearchPage();
    } else if (route.page === 'changelog') {
      renderChangelogPage();
    } else if (route.page === 'player') {
      // Player profile needs full Sheets data
      if (!sheetsData) {
        app.innerHTML = loadingScreenHTML('Loading Player', 'Syncing with Google Sheets...');
        startLoadingQuotes();
        await ensureSheetsSync();
      }
      _playerRoleFilter = null;
      renderPlayerPage(route.playerName);
    } else {
      // Homepage: render instantly from static matches.json
      const res = await fetch(`data/matches.json?_cb=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load matches');
      const staticMatches = await res.json();

      // If Sheets data already available, merge in any newer matches
      if (sheetsData) {
        renderHomePage(sheetsData.matchList);
      } else {
        renderHomePage(staticMatches);
        // Start background sync; update homepage when done
        ensureSheetsSync().then(sd => {
          if (sd && getRoute().page === 'home') {
            renderHomePage(sd.matchList);
            ensureHamburger();
          }
        });
      }
    }
  } catch (e) {
    app.innerHTML = `<div class="wrap" style="text-align:center;padding:100px 20px;">
      <div style="font-family:'IM Fell DW Pica',serif;font-size:48px;color:var(--gold);letter-spacing:4px;margin-bottom:16px;">404</div>
      <div style="font-family:Share Tech Mono,monospace;font-size:12px;color:#4e5e78;letter-spacing:2px;">MATCH NOT FOUND</div>
      <a class="back-link" onclick="navigate('')" style="margin-top:24px;display:inline-flex;">← BACK TO MATCHES</a>
    </div>`;
  }
}

// ===========================================
//  HOME PAGE - Scoreboard-Style Match List
// ===========================================

function renderHomePage(matches) {
  let t1Wins = 0, t2Wins = 0;
  matches.forEach(m => {
    if (m.winner === 'team1') t1Wins++;
    else if (m.winner === 'team2') t2Wins++;
  });

  const total = matches.length;
  const t1Pct = total > 0 ? Math.round((t1Wins / total) * 100) : 0;
  const t2Pct = total > 0 ? Math.round((t2Wins / total) * 100) : 0;

  let html = `
    <div class="landing-bg-anim">
      <div class="fog-layer fog-1"></div>
      <div class="fog-layer fog-2"></div>
      <div class="fog-layer fog-3"></div>
      <div class="particles"></div>
      <div class="vignette"></div>
    </div>
    <div class="wrap">
    <div class="landing-header">
      <div class="landing-eyebrow">New World League · Scoreboard</div>
      <h1 class="landing-title">NWL<br>SCOREBOARD</h1>
      <div class="landing-sub">Beaverknights vs Capyknights · ${matches.length} Matches</div>
      ${sheetsData ? `<div class="live-badge"><span class="live-dot"></span> LIVE · Last ${LIVE_SYNC_RECENT_COUNT} matches synced with Google Sheets</div>` : ''}
    </div>

    <div class="season-record">
      <div class="record-block t1">
        <div class="record-label">🟢 Beaverknights</div>
        <div class="record-value">${t1Wins} Wins</div>
        <div class="record-pct">${t1Pct}%</div>
      </div>
      <div class="record-vs">
        <div class="record-vs-score">${t1Wins} : ${t2Wins}</div>
        <div class="record-vs-label">SEASON RECORD</div>
      </div>
      <div class="record-block t2">
        <div class="record-label">🟣 Capyknights</div>
        <div class="record-value">${t2Wins} Wins</div>
        <div class="record-pct">${t2Pct}%</div>
      </div>
    </div>

    <div class="matches-label">Match History</div>
    <div class="match-list">`;

  matches.forEach((m, i) => {
    const isT1 = m.winner === 'team1';
    const winClass = isT1 ? 'winner-t1' : 'winner-t2';
    const t1Score = m.team1Kills || 0;
    const t2Score = m.team2Kills || 0;

    // Attacker always on left, defender on right
    const atkIsT1 = m.attacker !== 'team2'; // default to team1 if unknown
    const leftName = atkIsT1 ? 'Beaverknights' : 'Capyknights';
    const leftFaction = atkIsT1 ? 'Marauder (Green)' : 'Syndicate (Purple)';
    const leftColorClass = atkIsT1 ? 'mb-t1' : 'mb-t2';
    const leftScore = atkIsT1 ? t1Score : t2Score;
    const rightName = atkIsT1 ? 'Capyknights' : 'Beaverknights';
    const rightFaction = atkIsT1 ? 'Syndicate (Purple)' : 'Marauder (Green)';
    const rightColorClass = atkIsT1 ? 'mb-t2' : 'mb-t1';
    const rightScore = atkIsT1 ? t2Score : t1Score;
    const winnerTag = isT1 ? '🟢 MARAUDER WINS' : '🟣 SYNDICATE WINS';
    const winnerTagClass = isT1 ? 'w1' : 'w2';

    html += `
      <a class="match-banner ${winClass}" onclick="navigate('#/match/${m.slug}')" id="row-${m.slug}" style="animation-delay:${Math.min(i * 0.04, 0.6)}s">
        <div class="mb-meta">
          <span class="mb-nwl">NWL#${m.nwlNumber}</span>
          <span class="mb-map">${m.mapName}</span>
          <span class="mb-date">${m.date}${m.duration ? ' · ' + m.duration : ''}</span>
        </div>
        <div class="mb-scoreboard">
          <div class="mb-team mb-team-atk ${leftColorClass}">
            <span class="mb-team-name">${leftName}</span>
            <span class="mb-faction">${leftFaction} · Attacker</span>
          </div>
          <div class="mb-score-center">
            <div class="mb-score">
              <span class="mb-s1 ${leftColorClass}">${leftScore}</span>
              <span class="mb-sep">:</span>
              <span class="mb-s2 ${rightColorClass}">${rightScore}</span>
            </div>
            <div class="mb-winner-tag ${winnerTagClass}">${winnerTag}</div>
          </div>
          <div class="mb-team mb-team-def ${rightColorClass}">
            <span class="mb-team-name">${rightName}</span>
            <span class="mb-faction">${rightFaction} · Defender</span>
          </div>
        </div>
      </a>`;
  });

  html += `</div>

    <div class="page-footer">
      * <span class="ft1">Green</span> = Beaverknights (Marauder) &nbsp;·&nbsp;
      <span class="ft2">Purple</span> = Capyknights (Syndicate)<br>
      * Click any match to view the full scoreboard with all 10 groups
    </div>
  </div>`;

  app.innerHTML = html;
}

// ===========================================
//  MATCH DETAIL PAGE
// ===========================================

function renderMatchPage(data) {
  const t1 = data.totals.team1;
  const t2 = data.totals.team2;
  const t1k = t1.kills || 0;
  const t2k = t2.kills || 0;
  const isT1Win = data.winner === 'team1';

  // Attacker always on top/left, defender on bottom/right
  const atkIsT1 = data.attacker !== 'team2'; // default to team1 if unknown
  const atk = atkIsT1 ? { name: 'Beaverknights', faction: 'Marauder (Green)', cls: 't1', stats: t1, kills: t1k } :
                         { name: 'Capyknights', faction: 'Syndicate (Purple)', cls: 't2', stats: t2, kills: t2k };
  const def = atkIsT1 ? { name: 'Capyknights', faction: 'Syndicate (Purple)', cls: 't2', stats: t2, kills: t2k } :
                         { name: 'Beaverknights', faction: 'Marauder (Green)', cls: 't1', stats: t1, kills: t1k };

  // Build Google Sheets URL for this specific match
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}${data.gid ? '#gid=' + data.gid : ''}`;

  let html = `<div class="wrap">
    <div class="match-nav">
      <a class="back-link" onclick="navigate('')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Matches
      </a>
    </div>

    <div class="match-header">
      <div class="match-eyebrow">New World League · NWL#${data.nwlNumber} · Match Scoreboard</div>
      <h1 class="match-map-name">${data.mapName.replace(/ /g, '<br>')}</h1>
      <div class="match-date">${formatDate(data.date)}${data.duration ? ' &nbsp;·&nbsp; Duration: ' + data.duration : ''}</div>
    </div>

    <div class="scoreboard">
      <div class="sb-team ${atk.cls}">
        <div class="sb-team-name">${atk.name}</div>
        <div class="sb-faction">${atk.faction} · Attacker</div>
        <div class="sb-stats">
          <div class="sb-stat"><span class="sb-stat-val">${atk.kills}</span><span class="sb-stat-lbl">Kills</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${atk.stats.deaths || 0}</span><span class="sb-stat-lbl">Deaths</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${atk.stats.assists || 0}</span><span class="sb-stat-lbl">Assists</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${fmt(atk.stats.healing)}</span><span class="sb-stat-lbl">Healing</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${fmt(atk.stats.damage)}</span><span class="sb-stat-lbl">Damage</span></div>
        </div>
      </div>

      <div class="sb-center">
        <div class="sb-score">
          <span class="s1 ${atk.cls}">${atk.kills}</span>
          <span class="sep">:</span>
          <span class="s2 ${def.cls}">${def.kills}</span>
        </div>
        <div class="sb-winner-tag ${isT1Win ? 'w1' : 'w2'}">${isT1Win ? '🟢 MARAUDER WINS' : '🟣 SYNDICATE WINS'}</div>
        <div class="sb-meta">${data.mapName} · ${data.date}</div>
      </div>

      <div class="sb-team ${def.cls}">
        <div class="sb-team-name">${def.name}</div>
        <div class="sb-faction">${def.faction} · Defender</div>
        <div class="sb-stats">
          <div class="sb-stat"><span class="sb-stat-val">${def.kills}</span><span class="sb-stat-lbl">Kills</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${def.stats.deaths || 0}</span><span class="sb-stat-lbl">Deaths</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${def.stats.assists || 0}</span><span class="sb-stat-lbl">Assists</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${fmt(def.stats.healing)}</span><span class="sb-stat-lbl">Healing</span></div>
          <div class="sb-stat"><span class="sb-stat-val">${fmt(def.stats.damage)}</span><span class="sb-stat-lbl">Damage</span></div>
        </div>
      </div>
    </div>

    <div class="filter-toolbar">
      <div class="filter-panel" id="filter-panel">
        <div class="filter-header" onclick="toggleFilterPanel()">
          <span class="filter-header-text">Filters</span>
          <span class="filter-toggle-arrow" id="filter-arrow">▶</span>
        </div>
        <div class="filter-body" id="filter-body" style="display:none">
          <div class="filter-group">
            <div class="filter-group-title">View</div>
            <label class="filter-option">
              <input type="radio" name="view-mode" value="excel" ${currentView === 'excel' ? 'checked' : ''}>
              <span class="filter-option-label">Standard</span>
            </label>
            <label class="filter-option">
              <input type="radio" name="view-mode" value="list" ${currentView === 'list' ? 'checked' : ''}>
              <span class="filter-option-label">List</span>
            </label>
            <label class="filter-option">
              <input type="radio" name="view-mode" value="comparison" ${currentView === 'comparison' ? 'checked' : ''}>
              <span class="filter-option-label">Comparison</span>
            </label>
          </div>
          <div class="filter-group">
            <div class="filter-group-title">Display</div>
            <label class="filter-option">
              <input type="checkbox" id="compact-toggle" ${compactNumbers ? 'checked' : ''}>
              <span class="filter-option-label">Compact Numbers</span>
            </label>
          </div>
        </div>
      </div>
      <div class="font-size-control">
        <span class="font-size-label">Text Size</span>
        <input type="range" id="font-size-slider" min="60" max="140" value="${fontSizeScale}" step="5">
        <span class="font-size-value" id="font-size-value">${fontSizeScale}%</span>
      </div>
      <a class="sheets-link" href="${sheetsUrl}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open in Google Sheets
      </a>
    </div>

    <div class="groups-container" id="groups-container"></div>

    <div class="page-footer">
      * <span class="ft1">Green rows</span> = Beaverknights player &nbsp;·&nbsp;
      <span class="ft2">Purple rows</span> = Capyknights player<br>
      * Roles: AoE (Area Healer) · Group-Healer (Single-Target Healer) · BR (Bruiser) · IV (Ice/Void) · RD (Ranged DPS) · MD (Melee DPS) · PT (Point) · HD (Heavy Dex) · VB (Voidblade)<br>
      * Click any player name to view their full match history
    </div>
  </div>`;

  app.innerHTML = html;

  renderGroups(data);

  // Apply saved font size zoom
  if (fontSizeScale !== 100) {
    const container = document.getElementById('groups-container');
    container.style.zoom = (fontSizeScale / 100);
  }

  document.getElementById('compact-toggle').addEventListener('change', (e) => {
    compactNumbers = e.target.checked;
    renderGroups(data);
  });

  document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentView = e.target.value;
      renderGroups(data);
    });
  });

  document.getElementById('font-size-slider').addEventListener('input', (e) => {
    fontSizeScale = parseInt(e.target.value);
    document.getElementById('font-size-value').textContent = fontSizeScale + '%';
    localStorage.setItem('nwl-font-size', fontSizeScale);
    const container = document.getElementById('groups-container');
    container.style.zoom = (fontSizeScale / 100);
  });
}



function makePlayerRow(p, team) {
  if (!p) return '';
  const cls = team === 't1' ? 'ptr-t1' : 'ptr-t2';
  const canonical = getCanonicalName(p.name);
  const playerLink = `<a onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>`;
  return `<tr class="${cls}">
    <td class="pt-role"><span class="role-badge r-${p.role}">${p.role}</span></td>
    <td class="pt-name">${playerLink}</td>
    ${getVodCell(p.name)}
    <td class="pt-num pt-kills">${p.kills}</td>
    <td class="pt-num pt-deaths">${p.deaths}</td>
    <td class="pt-num">${p.assists}</td>
    <td class="pt-num pt-heal">${fmt(p.healing)}</td>
    <td class="pt-num pt-dmg">${fmt(p.damage)}</td>
  </tr>`;
}

function makeExcelPlayerRow(p, team) {
  if (!p) return '';
  const cls = team === 't1' ? 'ptr-t1' : 'ptr-t2';
  const canonical = getCanonicalName(p.name);
  const playerLink = `<a onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>`;
  return `<tr class="${cls}" style="border-left:none;">
    <td class="pt-role"><span class="role-badge r-${p.role}">${p.role}</span></td>
    <td class="pt-name">${playerLink}</td>
    ${getVodCell(p.name)}
    <td class="pt-num pt-kills">${p.kills}</td>
    <td class="pt-num pt-deaths">${p.deaths}</td>
    <td class="pt-num">${p.assists}</td>
    <td class="pt-num pt-heal">${fmt(p.healing)}</td>
    <td class="pt-num pt-dmg">${fmt(p.damage)}</td>
  </tr>`;
}

function renderGroupExcel(g) {
  const t1Players = g.team1;
  const t2Players = g.team2;

  const gt1 = { kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
  const gt2 = { kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
  t1Players.forEach(p => { for (const k in gt1) gt1[k] += p[k]; });
  t2Players.forEach(p => { for (const k in gt2) gt2[k] += p[k]; });

  const thRow = `<thead><tr>
    <th class="ex-num" style="text-align:left;">Role</th>
    <th>Player</th>
    <th></th>
    <th class="ex-num">Kills</th>
    <th class="ex-num">Deaths</th>
    <th class="ex-num">Assists</th>
    <th class="ex-num">Heal</th>
    <th class="ex-num">Dmg</th>
  </tr></thead>`;

  function compStat(label, v1, v2, higherIsBetter) {
    const lead1 = higherIsBetter ? v1 > v2 : v1 < v2;
    const lead2 = higherIsBetter ? v2 > v1 : v2 < v1;
    return { label, v1, v2, lead1, lead2 };
  }

  const stats = [
    compStat('Kills', gt1.kills, gt2.kills, true),
    compStat('Deaths', gt1.deaths, gt2.deaths, false),
    compStat('Assists', gt1.assists, gt2.assists, true),
    compStat('Heal', gt1.healing, gt2.healing, true),
    compStat('Dmg', gt1.damage, gt2.damage, true),
  ];

  return `<div class="group-section">
    <div class="group-label">
      <span class="group-label-text">${g.label}</span>
      <span class="group-label-line"></span>
    </div>
    <div class="excel-group-block">
      <div class="excel-team-side t1-side">
        <div class="excel-team-header t1-header">🟢 Beaverknights</div>
        <table class="excel-table">${thRow}<tbody>
          ${t1Players.map(p => makeExcelPlayerRow(p, 't1')).join('')}
        </tbody></table>
      </div>
      <div class="excel-team-side t2-side">
        <div class="excel-team-header t2-header">🟣 Capyknights</div>
        <table class="excel-table">${thRow}<tbody>
          ${t2Players.map(p => makeExcelPlayerRow(p, 't2')).join('')}
        </tbody></table>
      </div>
      <div class="excel-comparison-row">
        <div class="excel-comparison-side t1-comp">
          ${stats.map(s => `<div class="excel-comp-stat">
            <span class="excel-comp-val ${s.lead1 ? 'lead' : ''}">${fmt(s.v1)}</span>
            <span class="excel-comp-lbl">${s.label}</span>
          </div>`).join('')}
        </div>
        <div class="excel-comparison-side t2-comp">
          ${stats.map(s => `<div class="excel-comp-stat">
            <span class="excel-comp-val ${s.lead2 ? 'lead' : ''}">${fmt(s.v2)}</span>
            <span class="excel-comp-lbl">${s.label}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function renderGroupList(g) {
  const t1Players = g.team1;
  const t2Players = g.team2;

  const gt1 = { kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
  const gt2 = { kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
  t1Players.forEach(p => { for (const k in gt1) gt1[k] += p[k]; });
  t2Players.forEach(p => { for (const k in gt2) gt2[k] += p[k]; });

  return `<div class="group-section">
    <div class="group-label">
      <span class="group-label-text">${g.label}</span>
      <span class="group-label-line"></span>
    </div>
    <div class="group-content">
      <div class="group-table-wrap">
        <table class="group-table">
          <thead>
            <tr>
              <th class="gt-th gt-role">Role</th>
              <th class="gt-th gt-name">Player</th>
              <th class="gt-th"></th>
              <th class="gt-th gt-num">Kills</th>
              <th class="gt-th gt-num">Deaths</th>
              <th class="gt-th gt-num">Assists</th>
              <th class="gt-th gt-num">Heal</th>
              <th class="gt-th gt-num">Dmg</th>
            </tr>
          </thead>
          <tbody>
            <tr class="team-divider-row"><td colspan="8"><span class="team-divider-label t1-divider">🟢 BEAVERKNIGHTS</span></td></tr>
            ${t1Players.map(p => makePlayerRow(p, 't1')).join('')}
            <tr class="team-divider-row"><td colspan="8"><span class="team-divider-label t2-divider">🟣 CAPYKNIGHTS</span></td></tr>
            ${t2Players.map(p => makePlayerRow(p, 't2')).join('')}
          </tbody>
        </table>
      </div>
      <div class="group-comparison">
        <div class="gc-title">Group Comparison</div>
        <div class="gc-row gc-header">
          <span class="gc-label"></span>
          <span class="gc-val gc-t1">🟢</span>
          <span class="gc-val gc-t2">🟣</span>
        </div>
        <div class="gc-row">
          <span class="gc-label">Kills</span>
          <span class="gc-val gc-t1 ${gt1.kills > gt2.kills ? 'gc-lead' : ''}">${fmt(gt1.kills)}</span>
          <span class="gc-val gc-t2 ${gt2.kills > gt1.kills ? 'gc-lead' : ''}">${fmt(gt2.kills)}</span>
        </div>
        <div class="gc-row">
          <span class="gc-label">Deaths</span>
          <span class="gc-val gc-t1 ${gt1.deaths < gt2.deaths ? 'gc-lead' : ''}">${fmt(gt1.deaths)}</span>
          <span class="gc-val gc-t2 ${gt2.deaths < gt1.deaths ? 'gc-lead' : ''}">${fmt(gt2.deaths)}</span>
        </div>
        <div class="gc-row">
          <span class="gc-label">Assists</span>
          <span class="gc-val gc-t1 ${gt1.assists > gt2.assists ? 'gc-lead' : ''}">${fmt(gt1.assists)}</span>
          <span class="gc-val gc-t2 ${gt2.assists > gt1.assists ? 'gc-lead' : ''}">${fmt(gt2.assists)}</span>
        </div>
        <div class="gc-row">
          <span class="gc-label">Healing</span>
          <span class="gc-val gc-t1 ${gt1.healing > gt2.healing ? 'gc-lead' : ''}">${fmt(gt1.healing)}</span>
          <span class="gc-val gc-t2 ${gt2.healing > gt1.healing ? 'gc-lead' : ''}">${fmt(gt2.healing)}</span>
        </div>
        <div class="gc-row">
          <span class="gc-label">Damage</span>
          <span class="gc-val gc-t1 ${gt1.damage > gt2.damage ? 'gc-lead' : ''}">${fmt(gt1.damage)}</span>
          <span class="gc-val gc-t2 ${gt2.damage > gt1.damage ? 'gc-lead' : ''}">${fmt(gt2.damage)}</span>
        </div>
      </div>
    </div>
  </div>`;
}

function renderExcelViewGroup(g, team, placeholderLabel) {
  const players = team === 't1' ? 'team1' : 'team2';
  const rowClass = team === 't1' ? 'ptr-t1' : 'ptr-t2';
  const teamPlayers = g ? g[players] : [];
  const label = g ? g.label : placeholderLabel;

  if (!g || teamPlayers.length === 0) {
    return `<div class="ev-group ev-group-empty">
      <div class="ev-group-label ev-empty-label">${label || '-'}</div>
      <div class="ev-empty-text">No players</div>
    </div>`;
  }

  return `<div class="ev-group">
    <div class="ev-group-label">${label}</div>
    <table class="ev-table">
      <thead><tr>
        <th class="ev-th" style="text-align:left;"></th>
        <th class="ev-th">Player</th>
        <th class="ev-th"></th>
        <th class="ev-th ev-num">Kills</th>
        <th class="ev-th ev-num">Deaths</th>
        <th class="ev-th ev-num">Assists</th>
        <th class="ev-th ev-num">Heal</th>
        <th class="ev-th ev-num">Dmg</th>
      </tr></thead>
      <tbody>
        ${teamPlayers.map(p => {
            const canonical = getCanonicalName(p.name);
            const playerLink = `<a onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>`;
            return `<tr class="${rowClass}" style="border-left:none;">
              <td class="pt-role"><span class="role-badge r-${p.role}">${p.role}</span></td>
              <td class="pt-name">${playerLink}</td>
              ${getVodCell(p.name)}
              <td class="pt-num pt-kills">${p.kills}</td>
              <td class="pt-num pt-deaths">${p.deaths}</td>
              <td class="pt-num">${p.assists}</td>
              <td class="pt-num pt-heal">${fmt(p.healing)}</td>
              <td class="pt-num pt-dmg">${fmt(p.damage)}</td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderGroups(data) {
  const container = document.getElementById('groups-container');
  let html = '';

  if (currentView === 'excel') {
    // Excel View: Paired layout - G1↔G6, G2↔G7, G3↔G8, G4↔G9, G5↔G10
    // Build a map by group number to handle gaps (e.g. G7 missing)
    const groupByNum = {};
    for (const g of data.groups) {
      const num = parseInt((g.label.match(/\d+/) || ['0'])[0]);
      if (num > 0) groupByNum[num] = g;
    }
    const maxPairs = 5;

    const isMobile = window.innerWidth <= 900;

    function renderPairedRows(team) {
      if (isMobile) {
        // Mobile: sequential G1, G2, ..., G10
        let rows = '';
        for (let i = 1; i <= 10; i++) {
          const g = groupByNum[i] || null;
          const label = g ? g.label : `G${i}`;
          rows += `<div class="ev-pair-cell">${renderExcelViewGroup(g, team, label)}</div>`;
        }
        return rows;
      }
      // Desktop: paired G1↔G6, G2↔G7, etc. (original layout)
      let rows = '';
      for (let i = 1; i <= maxPairs; i++) {
        const gLeft = groupByNum[i] || null;
        const gRight = groupByNum[i + 5] || null;
        const leftLabel = gLeft ? gLeft.label : `G${i}`;
        const rightLabel = gRight ? gRight.label : `G${i + 5}`;
        rows += `<div class="ev-pair-row">
          <div class="ev-pair-cell">${renderExcelViewGroup(gLeft, team, leftLabel)}</div>
          <div class="ev-pair-cell">${renderExcelViewGroup(gRight, team, rightLabel)}</div>
        </div>`;
      }
      return rows;
    }

    // Attacker always on top, defender on bottom
    const evAtkIsT1 = data.attacker !== 'team2';
    const atkTeamKey = evAtkIsT1 ? 't1' : 't2';
    const defTeamKey = evAtkIsT1 ? 't2' : 't1';
    const atkEmoji = evAtkIsT1 ? '🟢' : '🟣';
    const defEmoji = evAtkIsT1 ? '🟣' : '🟢';
    const atkName = evAtkIsT1 ? 'BEAVERKNIGHTS' : 'CAPYKNIGHTS';
    const defName = evAtkIsT1 ? 'CAPYKNIGHTS' : 'BEAVERKNIGHTS';
    const atkDividerClass = evAtkIsT1 ? 't1-divider' : 't2-divider';
    const defDividerClass = evAtkIsT1 ? 't2-divider' : 't1-divider';
    html = `<div class="excel-view-layout">
      <div class="ev-section-header ev-header-atk">
        <span class="ev-section-title ${atkDividerClass}">${atkEmoji} ${atkName} (ATTACKER)</span>
      </div>
      <div class="ev-section ev-section-${atkTeamKey}">
        ${renderPairedRows(atkTeamKey)}
      </div>
      <div class="ev-section-header ev-header-def">
        <span class="ev-section-title ${defDividerClass}">${defEmoji} ${defName} (DEFENDER)</span>
      </div>
      <div class="ev-section ev-section-${defTeamKey}">
        ${renderPairedRows(defTeamKey)}
      </div>
    </div>`;
  } else {
    data.groups.forEach(g => {
      const t1Players = g.team1;
      const t2Players = g.team2;
      if (t1Players.length === 0 && t2Players.length === 0) return;

      if (currentView === 'comparison') {
        html += renderGroupExcel(g);
      } else {
        html += renderGroupList(g);
      }
    });
  }

  container.innerHTML = html;
}

// ===========================================
//  PLAYER PROFILE PAGE
// ===========================================

function findPlayerInMatches(canonicalName) {
  if (!sheetsData) return [];
  const results = [];
  const canon = canonicalName.toLowerCase().trim();

  for (const [slug, match] of Object.entries(sheetsData.matchDetails)) {
    for (const g of match.groups) {
      for (const p of g.team1) {
        if (getCanonicalName(p.name) === canon) {
          results.push({
            slug, nwlNumber: match.nwlNumber, mapName: match.mapName,
            date: match.date, winner: match.winner,
            team: 'team1', group: g.label, player: p,
            won: match.winner === 'team1',
          });
        }
      }
      for (const p of g.team2) {
        if (getCanonicalName(p.name) === canon) {
          results.push({
            slug, nwlNumber: match.nwlNumber, mapName: match.mapName,
            date: match.date, winner: match.winner,
            team: 'team2', group: g.label, player: p,
            won: match.winner === 'team2',
          });
        }
      }
    }
  }

  // Sort by NWL number descending
  results.sort((a, b) => b.nwlNumber - a.nwlNumber);
  return results;
}

// ===========================================
//  PLAYER SEARCH PAGE
// ===========================================

function getAllPlayers() {
  if (!sheetsData) return [];
  const playerMap = {};

  for (const [slug, match] of Object.entries(sheetsData.matchDetails)) {
    for (const g of match.groups) {
      for (const p of [...g.team1, ...g.team2]) {
        const canon = getCanonicalName(p.name);
        if (!playerMap[canon]) {
          playerMap[canon] = { canonical: canon, appearances: 0, names: new Set() };
        }
        playerMap[canon].appearances++;
        playerMap[canon].names.add(p.name);
      }
    }
  }

  return Object.values(playerMap)
    .map(p => ({
      canonical: p.canonical,
      displayName: findDisplayName(p.canonical, p.names),
      aliases: [...p.names],
      appearances: p.appearances
    }))
    .sort((a, b) => b.appearances - a.appearances);
}

function renderSearchPage() {
  const allPlayers = getAllPlayers();

  app.innerHTML = `<div class="wrap">
    <div class="search-page">
      <div class="search-header">
        <div class="search-title">Player Search</div>
        <div class="search-sub">Search by player name or alias</div>
      </div>
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>
        <input class="search-input" type="text" id="player-search-input" placeholder="Enter player name..." autofocus>
      </div>
      <div id="search-results"></div>
    </div>
  </div>`;

  const input = document.getElementById('player-search-input');
  const resultsContainer = document.getElementById('search-results');

  function renderResults(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show all players when empty
      const items = allPlayers.slice(0, 30);
      resultsContainer.innerHTML = `<div class="search-results">${items.map(p => playerResultHTML(p)).join('')}</div>`;
      return;
    }
    const filtered = allPlayers.filter(p =>
      p.canonical.toLowerCase().includes(q) ||
      p.aliases.some(a => a.toLowerCase().includes(q))
    );
    if (filtered.length === 0) {
      resultsContainer.innerHTML = `<div class="search-results"><div class="search-no-results">No players found for "${query}"</div></div>`;
    } else {
      resultsContainer.innerHTML = `<div class="search-results">${filtered.map(p => playerResultHTML(p)).join('')}</div>`;
    }
  }

  function playerResultHTML(p) {
    const aliasText = p.aliases.filter(a => a !== p.displayName).join(', ');
    return `<div class="search-result-item" onclick="navigate('#/player/${encodePlayerForLink(p.canonical)}')">
      <div>
        <div class="search-result-name">${p.displayName}</div>
        ${aliasText ? `<div class="search-result-aliases">${aliasText}</div>` : ''}
      </div>
      <div class="search-result-meta">${p.appearances} matches</div>
    </div>`;
  }

  // Initial render - show all
  renderResults('');

  input.addEventListener('input', () => renderResults(input.value));
}

// ===========================================
//  CHANGELOG PAGE
// ===========================================

function renderChangelogPage() {
  const entries = [
    {
      date: '25.04.2026',
      changes: [
        'Fixed NWL#37 team assignment: Capyknights and Beaverknights players were swapped in the live sync. Root cause: the player-swap logic was suppressed whenever a manual attacker override was set, but NWL#37 genuinely needs the swap (unlike NWL#33/34 where it correctly should not swap).',
        'Added CW role badge (teal) for the new Crescent Wave role',
      ]
    },
    {
      date: '20.04.2026',
      changes: [
        'Added VB role badge (dark blue) for the new Voidblade role',
      ]
    },
    {
      date: '17.04.2026',
      changes: [
        'Fixed player team assignment for NWL#33 and NWL#34: the attacker override was incorrectly swapping Beaverknights and Capyknights players. Overrides now only correct the attacker label, not the physical player layout.',
      ]
    },
    {
      date: '16.04.2026',
      changes: [
        'Fixed attacker/defender assignment for NWL#33 and NWL#34: Syndicate (Capyknights) was the attacker in both matches, not Beaverknights',
      ]
    },
    {
      date: '15.04.2026',
      changes: [
        'VODs can now be submitted via Google Form — no more manual JSON editing. New VODs appear on the scoreboard within ~30 minutes (next auto-sync). The "Submit VOD" link in the burger menu opens the form.',
      ]
    },
    {
      date: '14.04.2026',
      changes: [
        'Added VOD links: players with recorded matches now show a ▶ button next to their name linking to the YouTube/Twitch VOD',
        'Fixed player merge bug: two different "Skill Issue" players (I vs l) were incorrectly combined into one profile with 60 matches',
        'Separated Liona/SkillIssue and MARKEL1to/US into distinct player profiles',
        'Added loading screen easter egg: rotating New World bug quotes with progress indicator',
        `Hybrid data loading: the last ${LIVE_SYNC_RECENT_COUNT} matches now sync live with Google Sheets (in-progress edits show up immediately), while older matches load instantly from static JSON files`,
        'Made loading screen quote text larger and more readable (18px instead of 12px)',
      ]
    },
    {
      date: '13.04.2026',
      changes: [
        'Fixed aggressive browser caching that required multiple hard-refreshes (Ctrl+F5) to see new matches',
        'Added cache-busting to all Google Sheets fetch requests',
        'Configured Vercel cache headers to prevent stale data',
        'Increased Sheets sync timeout from 15s to 30s for better reliability with growing match count',
        'Fixed table column alignment: Kills/Deaths/Assists/Heal/Dmg columns now align consistently across all groups',
        'Homepage now loads instantly from static data; Google Sheets sync runs in background',
      ]
    },
    {
      date: '10.04.2026',
      changes: [
        'Unified name_mapping.json across all sources (287 entries, previously fragmented across 3 files)',
        'Added new name mappings for NWL#32 players',
      ]
    },
    {
      date: '08.04.2026',
      changes: [
        'Added Average Kills, Average Deaths, Average Assists and Average KDA stat tiles to player profile',
        'Merged player profiles: Costa + DrCosta',
        "Merged player profiles: Time'sConflux + Time'sConflu",
        "Fixed navigation bug for player names containing apostrophes (e.g. Time'sConflux)",
        'Added Changelog page to burger menu',
        'Fixed role filter buttons for players with apostrophes in their name',
      ]
    }
  ];

  let html = `<div class="wrap">
    <a class="back-link" onclick="navigate('')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to Matches
    </a>
    <div class="player-header">
      <div class="player-eyebrow">NWL Scoreboard</div>
      <h1 class="player-name">Changelog</h1>
    </div>
    <div class="changelog-entries">`;

  for (const entry of entries) {
    html += `<div class="changelog-entry">
      <div class="changelog-date">${entry.date}</div>
      <ul class="changelog-list">
        ${entry.changes.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>`;
  }

  html += `</div></div>`;
  app.innerHTML = html;
  window.scrollTo(0, 0);
}

// ===========================================
//  PLAYER PROFILE PAGE
// ===========================================

let _playerRoleFilter = null; // null = all roles

function renderPlayerPage(playerName) {
  const canon = playerName.toLowerCase().trim();
  const allAppearances = findPlayerInMatches(canon);

  // Collect unique roles
  const roles = [...new Set(allAppearances.map(a => a.player.role))];
  const hasMultipleRoles = roles.length > 1;

  // Apply role filter
  const appearances = _playerRoleFilter
    ? allAppearances.filter(a => a.player.role === _playerRoleFilter)
    : allAppearances;

  // Get all known aliases for display
  const aliases = getAllAliases(canon);
  const aliasDisplay = aliases.filter(a => a !== canon).map(a => a).join(', ');

  // Find a good display name (prefer the most common one)
  const nameCounts = {};
  for (const app of allAppearances) {
    const n = app.player.name;
    nameCounts[n] = (nameCounts[n] || 0) + 1;
  }
  const allNames = new Set(Object.keys(nameCounts));
  const displayName = findDisplayName(canon, allNames);

  // Compute aggregates from filtered appearances
  let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalHealing = 0, totalDamage = 0, wins = 0;
  for (const a of appearances) {
    totalKills += a.player.kills;
    totalDeaths += a.player.deaths;
    totalAssists += a.player.assists;
    totalHealing += a.player.healing;
    totalDamage += a.player.damage;
    if (a.won) wins++;
  }
  const matchCount = appearances.length;
  const avgKD = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
  const winRate = matchCount > 0 ? Math.round((wins / matchCount) * 100) : 0;
  const avgHealing = matchCount > 0 ? Math.round(totalHealing / matchCount) : 0;
  const avgDamage = matchCount > 0 ? Math.round(totalDamage / matchCount) : 0;
  const avgKills = matchCount > 0 ? (totalKills / matchCount).toFixed(1) : '0';
  const avgDeaths = matchCount > 0 ? (totalDeaths / matchCount).toFixed(1) : '0';
  const avgAssists = matchCount > 0 ? (totalAssists / matchCount).toFixed(1) : '0';
  const avgKDA = matchCount > 0 ? ((totalKills + totalAssists) / Math.max(totalDeaths, 1)).toFixed(2) : '0';

  let html = `<div class="wrap">
    <a class="back-link" onclick="navigate('')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to Matches
    </a>

    <div class="player-header">
      <div class="player-eyebrow">Player Profile · Match History</div>
      <h1 class="player-name">${displayName}</h1>
      ${aliasDisplay ? `<div class="player-aliases">Also known as: ${aliasDisplay}</div>` : ''}
    </div>

    <div class="player-stats-grid">
      <div class="player-stats-row">
        <div class="player-stat-card">
          <div class="stat-val">${totalKills}</div>
          <div class="stat-lbl">Total Kills</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${totalDeaths}</div>
          <div class="stat-lbl">Total Deaths</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${totalAssists}</div>
          <div class="stat-lbl">Total Assists</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${avgKD}</div>
          <div class="stat-lbl">Avg KD</div>
        </div>
      </div>
      <div class="player-stats-row">
        <div class="player-stat-card">
          <div class="stat-val">${avgKills}</div>
          <div class="stat-lbl">Avg Kills</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${avgDeaths}</div>
          <div class="stat-lbl">Avg Deaths</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${avgAssists}</div>
          <div class="stat-lbl">Avg Assists</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${avgKDA}</div>
          <div class="stat-lbl">Avg KDA</div>
        </div>
      </div>
      <div class="player-stats-row">
        <div class="player-stat-card">
          <div class="stat-val">${matchCount}</div>
          <div class="stat-lbl">Matches</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${wins}/${matchCount - wins}</div>
          <div class="stat-lbl">W / L</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${winRate}%</div>
          <div class="stat-lbl">Win Rate</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">Inactive</div>
          <div class="stat-lbl">Rating</div>
        </div>
      </div>
      <div class="player-stats-row">
        <div class="player-stat-card">
          <div class="stat-val">${fmt(avgDamage)}</div>
          <div class="stat-lbl">Avg Damage</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${fmt(totalDamage)}</div>
          <div class="stat-lbl">Total Damage</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${fmt(avgHealing)}</div>
          <div class="stat-lbl">Avg Healing</div>
        </div>
        <div class="player-stat-card">
          <div class="stat-val">${fmt(totalHealing)}</div>
          <div class="stat-lbl">Total Healing</div>
        </div>
      </div>
    </div>`;

  // Role filter (only if player has multiple roles)
  if (hasMultipleRoles) {
    const roleOrder = ['AoE', 'HL', 'RD', 'IV', 'BR', 'PT', 'MD', 'HD', 'VB', 'CW'];
    const sorted = roles.sort((a, b) => (roleOrder.indexOf(a) === -1 ? 99 : roleOrder.indexOf(a)) - (roleOrder.indexOf(b) === -1 ? 99 : roleOrder.indexOf(b)));
    const roleCounts = {};
    for (const a of allAppearances) roleCounts[a.player.role] = (roleCounts[a.player.role] || 0) + 1;

    html += `<div class="player-role-filter">
      <span class="player-role-filter-label">Filter by Role</span>
      <div class="player-role-filter-buttons">
        <button class="role-filter-btn ${!_playerRoleFilter ? 'active' : ''}" onclick="setPlayerRoleFilter(null, '${canon.replace(/'/g, "\\x27")}')">All</button>
        ${sorted.map(r => `<button class="role-filter-btn ${_playerRoleFilter === r ? 'active' : ''}" onclick="setPlayerRoleFilter('${r}', '${canon.replace(/'/g, "\\x27")}')">
          <span class="role-badge r-${r}">${r}</span> <span class="role-filter-count">${roleCounts[r]}</span>
        </button>`).join('')}
      </div>
    </div>`;
  }

  if (appearances.length === 0) {
    html += `<div style="text-align:center;padding:40px;color:var(--muted);font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:2px;">
      NO MATCHES FOUND FOR THIS PLAYER
    </div>`;
  } else {
    html += `<div class="player-match-table-wrap">
      <table class="player-match-table">
        <thead>
          <tr>
            <th>NWL</th>
            <th>Map</th>
            <th>Date</th>
            <th>Team</th>
            <th>Group</th>
            <th>Role</th>
            <th class="num-col">K</th>
            <th class="num-col">D</th>
            <th class="num-col">A</th>
            <th class="num-col">Heal</th>
            <th class="num-col">Dmg</th>
            <th class="num-col">KD</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>`;

    for (const a of appearances) {
      const rowClass = a.team === 'team1' ? 'pm-t1' : 'pm-t2';
      const teamLabel = a.team === 'team1' ? 'Beaver' : 'Capy';
      const resultBadge = a.won ? '<span class="pm-result win">WIN</span>' : '<span class="pm-result loss">LOSS</span>';

      html += `<tr class="${rowClass}" onclick="navigate('#/match/${a.slug}')">
        <td class="pm-nwl">NWL#${a.nwlNumber}</td>
        <td class="pm-map">${a.mapName}</td>
        <td class="pm-date">${a.date}</td>
        <td class="pm-date">${teamLabel}</td>
        <td class="pm-date">${a.group}</td>
        <td><span class="role-badge r-${a.player.role}">${a.player.role}</span></td>
        <td class="pm-num">${a.player.kills}</td>
        <td class="pm-num">${a.player.deaths}</td>
        <td class="pm-num">${a.player.assists}</td>
        <td class="pm-num">${fmt(a.player.healing)}</td>
        <td class="pm-num">${fmt(a.player.damage)}</td>
        <td class="pm-num" style="color:var(--gold)">${kd(a.player)}</td>
        <td>${resultBadge}</td>
      </tr>`;
    }

    html += `</tbody></table></div>`;
  }

  html += `
    <div class="page-footer">
      * Click any match row to view the full match scoreboard<br>
      * Name matching is applied to merge alternate in-game names
    </div>
  </div>`;

  app.innerHTML = html;
}

function setPlayerRoleFilter(role, canon) {
  _playerRoleFilter = role;
  renderPlayerPage(canon);
}

// Make functions globally accessible
window.navigate = navigate;
window.toggleNav = toggleNav;
window.toggleFilterPanel = toggleFilterPanel;
window.setPlayerRoleFilter = setPlayerRoleFilter;

// -- Re-render groups on breakpoint change --
let _lastMobile = window.innerWidth <= 900;
window.addEventListener('resize', () => {
  const mob = window.innerWidth <= 900;
  if (mob !== _lastMobile) {
    _lastMobile = mob;
    if (currentMatch) renderGroups(currentMatch);
  }
});

// -- Initial render --
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => render());
} else {
  render();
}
