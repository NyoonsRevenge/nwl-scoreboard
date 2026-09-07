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
let currentMatchVods = {}; // canonical player name -> Liste der VOD-URLs des Matches

/* ── Wartungsmodus ─────────────────────────────────────────────────────────
   Legt eine Wartungsmeldung ueber die unscharf gestellte Seite.
   Abschalten:  MAINTENANCE_MODE = false
   Vorschau:    ?preview=lastlight an die URL haengen                       */
const MAINTENANCE_MODE = true;
// 12:00 deutsche Ortszeit am 07.09.2026 (CEST = UTC+2, Sommerzeit gilt noch).
const MAINTENANCE_TARGET = new Date('2026-09-07T12:00:00+02:00');

// Zugang zur fertigen Seite, solange der Wartungsmodus laeuft. Kein Schutz vor
// jemandem, der den Quelltext liest — nur davor, dass die Adresse zufaellig
// erraten wird.
const PREVIEW_PARAM = 'preview';
const PREVIEW_TOKEN = 'lastlight';
const PREVIEW_KEY = 'nwl_preview_access';

// Einmal mit dem Vorschau-Link gekommen, gilt der Zugang fuer die ganze
// Browser-Sitzung. Sonst stuende ein Pruefer wieder vor der Wartungsseite,
// sobald er die nackte Domain aufruft oder einen Link ohne den Parameter
// bekommt.
function hasPreviewAccess() {
  try {
    if (new URLSearchParams(location.search).get(PREVIEW_PARAM) === PREVIEW_TOKEN) {
      try { sessionStorage.setItem(PREVIEW_KEY, '1'); } catch {}
      return true;
    }
    return sessionStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

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
  "Double-checking if the Trading Post actually works this time...",
  "Restarting the server 10 minutes before the war begins..."
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
  "Where Arda": "Costa", "DrCosta": "Costa", "100%ABRO": "Costa", "Billy Talent ll": "BillyTalent", "Billy Talent": "BillyTalent",
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
  "Melglinn": "Tarienna",
  "Lumino": "LyZy",
  "Elleria Dorn": "ElleiraDorn",
  "Juker": "JukerVG",
  "Shiyrow": "Shiyraw",
  "Motocoeur": "Motcoeur",
  "Nerfpoop": "NerfPooP",
  "Zarki": "Zar_ki",
  "Shiroyasha": "Shiroyasha34",
  "Shiroyasha3": "Shiroyasha34",
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
  "Ambrozja/1.": "Ambrozja/1.61",

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
  "KaldieDarkle": "KaldieDarkleaf",

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
  "GernhartReir": "GernhartRein",
  "GernhartRei": "GernhartRein",

  // Brown-Noise variants
  "Brown Noise": "Brown-Noise",

  // Motcoeur typo
  "Motcoer": "Motcoeur",

  // Maalefis typo
  "Malaefis": "Maalefis",

  // BL4CKSHP aliases
  "BL4CHKSHP": "BL4CKSHP",
  "Blackshp": "BL4CKSHP",

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
  "Stryju|Bakel": "Stryju|Bakelolo",

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

  // OSISAN (l vs I vs ||)
  "ll OSISAN ll": "II OSISAN II",
  "|| OSISAN ||": "II OSISAN II",

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
  "Kathien(Grun": "kathien",
  "Kathien(Gru": "kathien",
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

  // Auto-synced from name_mapping.json
  "DoubleAgent2": "AGENT",
  "Ictue": "MIchael Simons",
  "MIchael Simons": "Ictue",
  "Mablooze": "Mablỏỏzẽ",
  "T93XBanger": "T93Asadi",

  // Auto-synced from name_mapping.json
  "Kream": "Trond",
  "Trond": "Kream",

  // Auto-synced from name_mapping.json
  "KitKat(OnMe": "On Me Here",
  "On Me Here": "KitKat(OnMe",
  "Suzana01": "SK21",
  "Winovore": "jhit lair",
  "jhit lair": "Winovore",

  // Auto-synced from name_mapping.json
  "Andrew1999": "Jegerys",
  "Migi": "SACRED ON POINT",
  "SACRED ON POINT": "Migi",
  "SmileyBill": "shield rush",
  "shield rush": "SmileyBill",

  // Auto-synced from name_mapping.json
  "Emir Sama": "Uninstall.exe",
  "Uninstall.exe": "Emir Sama",
  "Uninstall.ex": "Uninstall.exe",

  // Auto-synced from name_mapping.json
  "Bukaku": "EgirlsBathwater",
  "EgirlsBathwater": "Bukaku",

  // Auto-synced from name_mapping.json
  "BOUFFEURDEMOULE": "Shiyrow",
  "BeetleJuice": "Chewbacca",
  "Chewbacca": "BeetleJuice",
  "Jamel2boule": "Jamel",
  "Master Yoghurt": "Nieksas",

  // Auto-synced from name_mapping.json
  "Ayzyenx": "Spyfromzoo",
  "Spyfromzoo": "Ayzyenx",

  // Auto-synced from name_mapping.json
  "J3G3R": "Jegerys",
  "Jamel": "LastHitEnjoyer",
  "LastHitEnjoyer": "Jamel",
  "RediiN": "elf",
  "elf": "RediiN",

  // Auto-synced from name_mapping.json
  "BRITISH EGIRL": "Hiko(Hikoah",
  "GGEZ NO DISBAND": "Vago",
  "Hiko(Hikoah": "BRITISH EGIRL",
  "Hiko(Hikoah)": "Hiko(Hikoah",
  "Vago": "GGEZ NO DISBAND",
  "SAKIC8D": "SAKIC",
  "Goatfryed": "goatfryed",
  "BLAACKB3AST": "BLACK3AST",
  "Rupp3rt": "Ruppert",
  "Jeszo": "jormamas slave2",
  "LilNatalie V2": "LilNatalie",
  "Billy Talent II": "BillyTalent",
  "ShdwTrckr": "ShadowTrickier",
  "Lynnxxx": "Lynnx",
  "Shiro34": "Shiroyasha34",
  "shua": "sadshua",
  "Zeraphinea": "Zeraphine",
  "NotFjayy": "Fjayy",
  "Guni": "Proguni",
  "Hanrich": "Ganrich",
  "Absolute Drama": "Braczyn/Abso",
  "Kel(CherieFa": "kel(cherieFan",
  "Kel(CherieFai": "kel(cherieFan",
  "RaninoSPOT": "Ranino",
  "Cloudninee/E": "Cloudninee/Blamy",
  "Cloudninee/": "Cloudninee/Blamy",
  "Cloudninee/l": "Cloudninee/Blamy",

  // === BEGIN: Auto-synced from Character-Names-DB ===
  "Shocking Myself": "MARKEL1to",
  "escargot": "Nyxie",
  "Njord": "kathien",
  "KelHBK": "kel",
  "xVoyd": "Inziar",
  "Dogtierplay": "Bukaku",
  "throat bruiser": "Ruppert",
  "CANBASANKÖYLÜ": "hypheer",
  "kuroroEU": "ABOSLLOO",
  "Nordseekrabbe": "BeetleJuice",
  "banshe9": "SnakySan",
  // === END: Auto-synced from Character-Names-DB ===

  // Auto-synced from name_mapping.json
  "ABOSLLOO": "kuroroEU",
  "Actubutperkele": "actu",
  "Hikoah": "Hiko(Hikoah)",
  "Ruppert": "throat bruiser",
  "hypheer": "CANBASANKÖYLÜ",

  // Auto-synced from name_mapping.json
  "Carryyou": "Shirohigo",
  "ProCoulD": "hkN.oO",
  "Shirohigo": "Carryyou",
  "YourWettestDream": "TheHottestSilk",
  "hkN.oO": "ProCoulD",
  "lil capy": "capy",
  "not a healer": "Maalefis",

  // Auto-synced from name_mapping.json
  "KaliyaSan": "SnakySan",
  "Pork Daddy": "Ruppert",
  "SnakySan": "KaliyaSan",
  "TzudemBag": "Emir Sama",

  // Auto-synced from name_mapping.json
  "Alexiarae": "Where Clump",
  "Anwreq": "Parship",
  "Hop on DOOMER": "Hiko(Hikoah)",
  "Lewis": "thuggin",
  "Parship": "Anwreq",
  "Where Clump": "Alexiarae",
  "thuggin": "Lewis",

  // Auto-synced from name_mapping.json
  "Hiko": "Hiko(Hikoah)",

  // Auto-synced from name_mapping.json
  "Ayzvenx": "Spyfromzoo",
  "HydeeFEIN": "Hydee",
  "IIIII": "IIIII",
  "Scrap": "screup",
  "Vietmam": "Vietmam",
  "jimijefet": "JukerVG",
  "xGodias": "Godias",

  // Auto-synced from name_mapping.json
  "Not Peb": "peb",

  // Auto-synced from name_mapping.json
  "Calingo": "N3crome",
  "Edating Demon": "Shiroyasha34",
  "Lumson": "Lumino",
  "N3crome": "Calingo",

  // Auto-synced from name_mapping.json
  "Harambibi": "sbe3",
  "WestMilker": "AllMadd(Milk",
  "Zarkoï": "Zar_ki",
  "sbe3": "Harambibi",

  // Auto-synced from name_mapping.json
  "Djemba": "NWisbackCOPIUM",
  "NWisbackCOPIUM": "Djemba",
  "Point Princess": "belle",
  "Theo": "Thiu",
  "Thiu": "Theo",
  "belle": "Point Princess",
  "cac light": "Spyfromzoo",

  // Auto-synced from name_mapping.json
  "Dogtierplaye": "Bukaku",

  // Auto-synced from name_mapping.json
  "Hawk.-": "Yohnoz's Kitten",
  "Spymaster": "Yohnoz",
  "Take Care Bear": "belle",
  "Yohnoz": "Spymaster",
  "Yohnoz's Kitten": "Hawk.-",

  // Auto-synced from name_mapping.json
  "Artenug": "Frubella",
  "Baker": "nowasuwe",
  "Beaversspyb": "Bukaku",
  "Bjorn(Grump": "Grumpy Karen",
  "Frubella": "Artenug",
  "Mabl": "Mablỏỏzẽ",
  "OLD MAN MELEE": "Voyd",
  "Queen Screup": "screup",
  "nowasuwe": "Baker",

  // Auto-synced from name_mapping.json
  "Gaehr Kalan": "Gaehr",

  // Auto-synced from name_mapping.json
  "Aelvyn": "Ambrozja/1.6",
  "I WhoHow I": "LyZy",

  // Auto-synced from name_mapping.json
  "Niki": "Nykhi",
  "Nykhi": "Niki",
  "Ta2": "Tattooo",
  "Tattooo": "Ta2",

  // Auto-synced from name_mapping.json
  "DonBraczyno": "Braczyn/Abso",

  // Auto-synced from name_mapping.json
  "Tari": "Melglinn",

  // Auto-synced from name_mapping.json
  "HealsIfYouStep": "belle",
  "King R0NDO": "Rondo",

  // Auto-synced from name_mapping.json
  "Swifty": "i'm clicking",
  "i'm clicking": "Swifty",

  // Auto-synced from name_mapping.json
  "goatfryd": "goatfryed",

  // Auto-synced from name_mapping.json
  "Hop on Jesoz": "Jeszo",

  // Auto-synced from name_mapping.json
  "Rouse": "CptRouse",

  // Auto-synced from name_mapping.json
  "Turio13": "Turio",

  // Auto-synced from name_mapping.json
  "Iam Norse": "Norse",

  // Auto-synced from name_mapping.json
  "PinkOnPoint": "PinkClover",

  // Auto-synced from name_mapping.json
  "Behind me": "Sonnihh",

  // Auto-synced from name_mapping.json
  "Senborq": "Senborg",

  // Auto-synced from name_mapping.json
  "Killer Kitten": "Nalany",

  // Auto-synced from name_mapping.json
  "IfIspeak...": "DrCosta",
  "NWLWINNER": "Yohno",
  "Nalany": "Killer Kitten",
  "PinkClover": "PinkOnPoint",
  "RedbullAmba": "Uninstall.exe",
  "RedbullAmb": "Uninstall.exe",
  "Sonnihh": "Behind me",
  "Yohno": "NWLWINNER",

  // Auto-synced from name_mapping.json
  "Lachs Haudrauf": "BjörnHaudrauf",

  // Auto-synced from name_mapping.json
  "Tierlok": "Tier",

  // Auto-synced from name_mapping.json
  "HammerCD": "Hammer",

  // Auto-synced from name_mapping.json
  "Calçot": "Calcot",

  // Auto-synced from name_mapping.json
  "Bjorn Trond": "Trond",

  // Auto-synced from name_mapping.json
  "Opercent skill": "Revaa",

  // Auto-synced from name_mapping.json
  "Gaehr Rathma": "Gaehr",

  // Auto-synced from name_mapping.json
  "semoiD": "Diomes",

  // Auto-synced from name_mapping.json
  "WOFL Trig": "WOFLTrig",

  // Auto-synced from name_mapping.json
  "HealingMika": "Healing Mika",

  // Merges 07.09.2026: Truncations, Tippfehler und Schreibvarianten
  "Russelnase": "Rüsselnase",
  "SDthe(Witch": "SDthe(Witch)",
  "Mablôôzë": "Mablỏỏzẽ",
  "Bourinosss/": "Bourinosss/P",
  "Bourinosss/Psssst": "Bourinosss/P",
  "Alleria Gale": "AlleriaGale",
  "Beetle Juice": "BeetleJuice",
  "LastHitEnjoyé": "Jamel",
  "LastHitEnjoy": "Jamel",
  "Jamel/LastHi": "Jamel",
  "Jamel/LastH": "Jamel",
  "Jormamasslave2": "Jeszo",
  "SmileyBill": "SmileyBill(Sh",
  "SmileyBill(S": "SmileyBill(Sh",
  "Time's Conflux": "Time'sConflu",
  "Hoosierz(Vore": "Hoosierz(Vor",
  "Hoosierz(Vo": "Hoosierz(Vor",
  "Kel(CherieFar": "Kel(CherieFa",
  "joner(doake": "joner(doakes",
  "bufffchamp": "buffchamp",
  "H45HK4Z3": "H4SHK4Z3D",
  "Ambrozja/1": "Ambrozja/1.6",
  "Cannab1s": "Cannabis",
  "Palizzii": "Palizzi",
  "Bejonder": "Beyonder",
  "shokki": "shokkii",
  "Caruso": "Carusoo",
  "GailibixX/Co": "GailibixX/Cou",
  "Darkarus|Wh": "Darkarus",
  "Blamy 2.0": "Cloudninee/Bla",
  "Dr. Costa": "Costa",
  "Johnoz": "Yohnoz",
  "dxrkie": "darkie",
};

// Role-specific overrides for ambiguous names. Some players share an in-game
// name (e.g. "Skill Issue" exists as both Liona's alt and MARKEL1to/US's main —
// the I/l visual collision makes them indistinguishable by name alone). The
// weapon role disambiguates: Liona plays heal/support, MARKEL plays Blunderbuss.
// Map: lowercased name -> { ROLE: canonical }
const ROLE_OVERRIDES = {
  "skill issue": { "BR": "MARKEL1to/US" },
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

function roleBadgeClass(role) {
  if (!role || role === '?') return 'r-unknown';
  if (role === 'GOAT') return 'r-goat';
  return `r-${role}`;
}

function roleBadgeText(role) {
  return role === 'GOAT' ? '🐐' : role;
}

function getCanonicalName(name, role) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  if (role && ROLE_OVERRIDES[lower] && ROLE_OVERRIDES[lower][role]) {
    const override = ROLE_OVERRIDES[lower][role].toLowerCase().trim();
    return nameAliasMap[override] || override;
  }
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
  currentMatchVods = buildVodLookup(slug, currentMatch);
}

// slug + Matchdaten -> { kanonischer Name: [URLs] }. Bewusst dieselbe Funktion
// fuer Match- und Spielerseite: sonst koennte ein VOD an der einen Stelle einem
// Spieler zugeordnet werden und an der anderen einem zweiten.
function buildVodLookup(slug, matchData) {
  const out = {};
  if (!vodData || !vodData[slug] || !matchData || !matchData.groups) return out;
  const allPlayers = matchData.groups.flatMap(g => [...(g.team1 || []), ...(g.team2 || [])]);
  for (const entry of vodData[slug]) {
    const discordLower = entry.discord.toLowerCase().trim();
    const discordStripped = stripParens(discordLower);
    const discordCanonical = nameAliasMap[discordLower] || nameAliasMap[discordStripped];
    let matched = null;
    // Try matching against actual players in this match
    for (const p of allPlayers) {
      const pCanonical = getCanonicalName(p.name, p.role);
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
      // Liste statt Einzelwert: manche Spieler posten mehrere POVs pro War,
      // die sollen alle erreichbar sein statt sich gegenseitig zu ersetzen.
      const liste = out[matched] || (out[matched] = []);
      if (!liste.includes(entry.url)) liste.push(entry.url);
    }
  }
  return out;
}

// Ergebnisse je Match merken - die Spielerseite fragt sonst fuer jede Zeile neu.
const _vodLookupCache = {};
function vodsForPlayerInMatch(slug, canon) {
  if (!(slug in _vodLookupCache)) {
    const md = sheetsData && sheetsData.matchDetails && sheetsData.matchDetails[slug];
    _vodLookupCache[slug] = buildVodLookup(slug, md);
  }
  return _vodLookupCache[slug][canon] || [];
}

function getVodCell(playerName, role) {
  const canonical = getCanonicalName(playerName, role);
  const urls = currentMatchVods[canonical] || [];
  if (!urls.length) return '<td class="pt-vod"></td>';
  // Bei einem Video bleibt die Beschriftung wie gehabt; erst ab zwei wird
  // durchnummeriert, damit der Normalfall unveraendert aussieht.
  const btn = (url, label, title) =>
    `<a href="${url}" target="_blank" rel="noopener" class="vod-btn"`
    + (title ? ` title="${title}"` : '') + `>&#9654; ${label}</a>`;
  if (urls.length === 1) {
    return `<td class="pt-vod">${btn(urls[0], 'Watch VOD', '')}</td>`;
  }
  // Nur die Nummer: zwei Buttons muessen in die schmale Spalte passen, ohne
  // die Zeile auf doppelte Hoehe zu treiben. Der Tooltip sagt, was gemeint ist.
  const buttons = urls
    .map((u, i) => btn(u, String(i + 1), `Watch VOD ${i + 1} of ${urls.length}`))
    .join('');
  return `<td class="pt-vod pt-vod-multi">${buttons}</td>`;
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
// 0 = keine Live-Synchronisierung mehr: alle Matches kommen aus den
// statischen JSON-Dateien. Auf >0 setzen, um die letzten N Matches wieder
// direkt aus Google Sheets zu laden.
const LIVE_SYNC_RECENT_COUNT = 0;

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
  'nwl-41': 'team2', // Syndicate (Capyknights) attacked
  'nwl-42': 'team1', // Marauders (Beaverknights) attacked
  'nwl-43': 'team1', // Marauders (Beaverknights) attacked
  'nwl-44': 'team2', // Syndicate (Capyknights) attacked
  'nwl-45': 'team1', // Marauders (Beaverknights) attacked
  'nwl-46': 'team1', // Marauders (Beaverknights) attacked
  'nwl-47': 'team2', // Syndicate (Capyknights) attacked
  'nwl-48': 'team1', // Marauders (Beaverknights) attacked
  'nwl-49': 'team1', // Marauders (Beaverknights) attacked
  'nwl-50': 'team1', // Marauders (Beaverknights) attacked
  'nwl-53': 'team1', // Marauders (Beaverknights) attacked
  'nwl-54': 'team1', // Marauders (Beaverknights) attacked
  'nwl-55': 'team1', // Marauders (Beaverknights) attacked
  'nwl-56': 'team2', // Syndicate (Capyknights) attacked
  'nwl-57': 'team1', // Marauders (Beaverknights) attacked
  'nwl-58': 'team2', // Syndicate (Capyknights) attacked
  'nwl-59': 'team2', // Syndicate (Capyknights) attacked
  'nwl-60': 'team2', // Syndicate (Capyknights) attacked
  'nwl-61': 'team2', // Syndicate (Capyknights) attacked
  'nwl-62': 'team1', // Marauders (Beaverknights) attacked
  'nwl-63': 'team1', // Marauders (Beaverknights) attacked
  'nwl-64': 'team1', // Marauders (Beaverknights) attacked
  'nwl-65': 'team2', // Syndicate (Capyknights) attacked
  'nwl-66': 'team1', // Marauders (Beaverknights) attacked
  'nwl-67': 'team1', // Marauders (Beaverknights) attacked
  'nwl-68': 'team2', // Syndicate (Capyknights) attacked
  'nwl-69': 'team2', // Syndicate (Capyknights) attacked
  'nwl-70': 'team1', // Marauders (Beaverknights) attacked
  'nwl-71': 'team1', // Marauders (Beaverknights) attacked
  'nwl-72': 'team1', // Marauders (Beaverknights) attacked
  'nwl-100': 'team1', // Marauders (Beaverknights) attacked
  'nwl-73': 'team2', // Syndicate (Capyknights) attacked
  'nwl-75': 'team2', // Syndicate (Capyknights) attacked
  'nwl-74': 'team2', // Syndicate (Capyknights) attacked
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
  let role = (row[colOffset] || '').trim();
  const name = (row[colOffset + 1] || '').trim();
  if (!name) return null;
  if (!role || role.length > 5 || !/^[a-zA-Z]+$/.test(role)) role = '?';
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
      // Each team has its own position label per group (e.g. G3 is "Top weak"
      // for one and "Bottom strong" for the other since they fight from
      // opposite ends). Keep both for team-aware rendering.
      const t1Label = t1 ? t1.label : null;
      const t2Label = t2 ? t2.label : null;
      const label = t1Label || t2Label || `G${num}`;
      groups.push({
        label,
        team1Label: t1Label || label,
        team2Label: t2Label || label,
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
      // Position labels are team-specific; swap them with the players so each
      // side keeps its own perspective label.
      [g.team1Label, g.team2Label] = [g.team2Label, g.team1Label];
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
  // degrade gracefully to pure-static mode. With LIVE_SYNC_RECENT_COUNT at 0
  // nothing would be read from the sheet anyway, so we skip the two requests
  // entirely — that also keeps the site working once the sheet is gone.
  let sheets = [];
  let xlsxMeta = { attackers: {}, winners: {} };
  if (LIVE_SYNC_RECENT_COUNT > 0) {
    try {
      [sheets, xlsxMeta] = await Promise.all([
        fetchSheetList(),
        parseXLSXMetadata().catch(() => ({ attackers: {}, winners: {} })),
      ]);
    } catch (e) {
      console.warn('Google Sheets list unavailable, using pure static data:', e);
    }
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

  // Pick up any static-only matches we haven't added yet. This covers two cases:
  //   1. Sheets was entirely unavailable (pure-static fallback).
  //   2. A match exists only in matches.json because it was never entered into
  //      the spreadsheet (e.g. a war where no stats were collected).
  // Purely additive — slugs already built from the sheet are skipped.
  for (const m of staticSummaries) {
    if (matchDetails[m.slug]) continue;
    const detail = await loadStaticMatchDetail(m.slug);
    if (detail) {
      matchDetails[m.slug] = detail;
      matchList.push(m);
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
  if (hash === '/tier-list') {
    return { page: 'tier-list' };
  }
  if (hash === '/records') {
    return { page: 'records' };
  }
  if (hash === '/mvps') {
    return { page: 'mvps' };
  }
  if (hash === '/maps') {
    return { page: 'maps' };
  }
  if (hash === '/farewell') {
    return { page: 'farewell' };
  }
  if (hash === '/compare' || hash.startsWith('/compare/')) {
    const parts = hash.split('/').slice(2).filter(Boolean)
      .map(s => (s === '-' ? '' : decodeURIComponent(s)));
    return { page: 'compare', a: parts[0] || '', b: parts[1] || '' };
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

// Pages worth pointing at from the homepage and the top of the drawer.
// `tag` renders the small gold NEW chip next to the entry.
const FEATURE_LINKS = [
  { hash: '#/records', label: 'League Records', short: 'Records',
    icon: '<path d="M8 21h8M12 17v4M6 3h12v6a6 6 0 01-12 0V3zM6 5H4a2 2 0 000 4h2m12-4h2a2 2 0 010 4h-2"/>' },
  { hash: '#/mvps', label: 'MVP Leaderboard', short: 'MVPs',
    icon: '<path d="M12 2l2.9 6.2 6.6.9-4.8 4.7 1.2 6.7L12 17.3 6.1 20.5l1.2-6.7L2.5 9.1l6.6-.9L12 2z"/>' },
  { hash: '#/tier-list', label: 'Tier-List', short: 'Tier-List', tierGated: true,
    icon: '<path d="M4 6h16M4 12h10M4 18h6"/><circle cx="19" cy="12" r="2"/><circle cx="13" cy="18" r="2"/>' },
  { hash: '#/compare', label: 'Compare Players', short: 'Compare',
    icon: '<path d="M12 3v18M5 8l-3 4 3 4m14-8l3 4-3 4"/>' },
  { hash: '#/maps', label: 'Map Statistics', short: 'Maps',
    icon: '<path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3zM9 4v13m6-10v13"/>' },
  { hash: '#/farewell', label: 'Farewell Video', short: 'Farewell',
    icon: '<polygon points="6 4 20 12 6 20 6 4"/>' },
];

function visibleFeatureLinks() {
  return FEATURE_LINKS.filter(f => !f.tierGated || isTierListMenuVisible());
}

// Kurze, stumme Schleife als Wegweiser zum Abschiedsvideo. Bewusst ein eigener
// 364-KB-Ausschnitt und nicht das 13-MB-Video: Die Startseite ruft jeder auf,
// der ganze Film nur, wer ihn sehen will.
function farewellTeaserHTML() {
  return `<a class="teaser" onclick="navigate('#/farewell')" title="Watch the farewell video">
      <video class="teaser-video" src="media/farewell-preview.mp4"
             poster="media/farewell-poster.jpg"
             autoplay muted loop playsinline preload="none"></video>
      <span class="teaser-overlay">
        <span class="teaser-play">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20 7 4"/></svg>
        </span>
        <span class="teaser-text">
          <span class="teaser-title">Farewell Video</span>
          <span class="teaser-sub">Seven months in two minutes &middot; 1:58</span>
        </span>
      </span>
    </a>`;
}

// Compact row of shortcuts on the homepage so the new pages are reachable
// without opening the drawer.
function quickNavHTML() {
  const items = visibleFeatureLinks().map(f => `
    <a class="quick-btn" onclick="navigate('${f.hash}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${f.icon}</svg>
      ${f.short}<span class="quick-new">NEW</span>
    </a>`).join('');
  return `<div class="quick-nav">${items}</div>`;
}

function getHamburgerHTML() {
  const features = visibleFeatureLinks().map(f => `
      <a onclick="toggleNav(); navigate('${f.hash}');">
        <svg viewBox="0 0 24 24">${f.icon}</svg>
        ${f.label}<span class="nav-new">NEW</span>
      </a>`).join('');

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
      ${features}
      <div class="nav-spacer"></div>
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

// One-shot guard so navigating away from the tier-list (back to home, etc.)
// doesn't immediately bounce back via the secret-link auto-redirect.
let _tierSecretRedirected = false;

async function render() {
  stopLoadingQuotes();
  applyWallpaper();

  // Secret-link entry: visiting "/?secret=aeternum" (no hash) jumps straight
  // to the tier list on first render. After the initial redirect the user is
  // free to navigate elsewhere without being pulled back.
  // Deliberately keyed on the secret param: isTierListEnabled() is true for
  // everyone now, so using it here would drag every visitor from the
  // homepage straight into the tier list.
  if (!_tierSecretRedirected && hasTierSecret() && !window.location.hash) {
    _tierSecretRedirected = true;
    window.location.hash = '#/tier-list';
    return; // hashchange will re-trigger render()
  }

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
      buildMatchMvpLookup(data);
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
    } else if (route.page === 'tier-list') {
      if (!isTierListEnabled()) { navigate(''); return; }
      if (!sheetsData && !_tierStaticData) {
        app.innerHTML = loadingScreenHTML('Loading Tier-List', 'Fetching match archive...');
        startLoadingQuotes();
        // Race the Sheets sync against a fast static fallback so the page
        // still renders if Sheets are unreachable.
        await Promise.race([
          ensureSheetsSync(),
          loadStaticTierData(),
        ]);
        // If Sheets won, prefer it (more up-to-date), otherwise fall back.
        if (!sheetsData && !_tierStaticData) await loadStaticTierData();
      }
      renderTierListPage();
    } else if (route.page === 'farewell') {
      // Braucht keine Match-Daten - sofort zeigen.
      renderFarewellPage();
    } else if (route.page === 'records' || route.page === 'mvps'
               || route.page === 'maps' || route.page === 'compare') {
      const titles = { records: 'League Records', mvps: 'MVP Leaderboard',
                       maps: 'Map Statistics', compare: 'Compare Players' };
      if (!sheetsData && !_tierStaticData) {
        app.innerHTML = loadingScreenHTML(titles[route.page], 'Fetching match archive...');
        startLoadingQuotes();
        await ensureArchive();
      }
      if (route.page === 'records') renderRecordsPage();
      else if (route.page === 'mvps') renderMvpLeaderboardPage();
      else if (route.page === 'maps') renderMapStatsPage();
      else renderComparePage(route.a, route.b);
    } else if (route.page === 'player') {
      // Player profile needs full Sheets data
      if (!sheetsData) {
        app.innerHTML = loadingScreenHTML('Loading Player', 'Syncing with Google Sheets...');
        startLoadingQuotes();
        await ensureSheetsSync();
      }
      await loadVodData();
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
      ${sheetsData && LIVE_SYNC_RECENT_COUNT > 0 ? `<div class="live-badge"><span class="live-dot"></span> LIVE · Last ${LIVE_SYNC_RECENT_COUNT} matches synced with Google Sheets</div>` : ''}
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

    ${farewellTeaserHTML()}
    ${quickNavHTML()}
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

// ===========================================
//  ROLE MVP ALGORITHM (per match)
// ===========================================

// ── FEATURE FLAG ─────────────────────────────────────────────────────────
// Role MVPs are live. The other visibility rules stay in place so the feature
// can be switched back to a preview without touching any call site: set
// MVP_FORCE_ENABLED to false and only localhost / ?mvp=1 / the localStorage
// opt-in will see it again.
//
// Visibility rules (any one of these makes it visible):
//   1. MVP_FORCE_ENABLED === true                  (master switch)
//   2. running on localhost / 127.0.0.1            (local dev)
//   3. URL contains ?mvp=1                         (share-link override)
//   4. localStorage.nwl_mvp_preview === '1'        (per-browser opt-in)
const MVP_FORCE_ENABLED = true;
function isMvpEnabled() {
  if (MVP_FORCE_ENABLED) return true;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (/[?&]mvp=1\b/.test(window.location.search)) return true;
  try { if (localStorage.getItem('nwl_mvp_preview') === '1') return true; } catch {}
  return false;
}

// Score = Kills − W·Deaths + Assists/20 + Healing/K + Damage/K
//   · W = 2 for DPS/tank roles, W = 5 for healers (staying alive is a healer's
//     main job — high healing only counts if you survived to deliver it).
//   · Healing/Damage raw values are in the millions, so K normalizes them into
//     the same magnitude as kills/deaths.
//   · Assists weighted only 1/20 — in NWL almost everyone racks up 80–110
//     assists just by being near fights, so they are mostly noise.
//   · MVPs are awarded *per role*, so the formula only ever compares players
//     with similar stat profiles. Additionally, HL is split into two buckets:
//     Main-Zerg healers (groups 1–6) and Dex-Groups healers (groups 7–10),
//     because the main zerg healers see far more raw healing throughput.
const MVP_SCORE_K = 100000;

const MVP_ROLE_NAMES = {
  AoE: 'Area Healer',
  HL_zerg: 'Group Healer · Main Zerg (G1–6)',
  HL_ks:   'Group Healer · Dex Groups (G7–10)',
  RD: 'Ranged DPS', IV: 'Ice / Void',
  BR: 'Bruiser', PT: 'Point', MD: 'Melee DPS', HD: 'Heavy Dex',
  VB: 'Voidblade', CW: 'Crescent Wave',
};
const MVP_ROLE_ORDER = ['AoE', 'HL_zerg', 'HL_ks', 'RD', 'IV', 'BR', 'PT', 'MD', 'HD', 'VB', 'CW', 'FL'];

// Buckets where staying alive matters more than anything else.
const MVP_HEALER_BUCKETS = new Set(['AoE', 'HL_zerg', 'HL_ks']);

let _mvpCollapsed = false;

// Map a player to their MVP bucket. Most roles map 1:1; HL is split by group
// number into Main-Zerg (G1–6) and Kill-Squad (G7–10).
function mvpBucket(p, groupLabel) {
  if (p.role === 'HL') {
    const m = (groupLabel || '').match(/^G(\d+)/i);
    const n = m ? parseInt(m[1], 10) : 0;
    return n >= 7 ? 'HL_ks' : 'HL_zerg';
  }
  return p.role || '?';
}

// Role code used for the badge (HL_zerg / HL_ks both render as 'HL').
function mvpBadge(bucket) {
  return (bucket === 'HL_zerg' || bucket === 'HL_ks') ? 'HL' : bucket;
}

function mvpScore(p, bucket) {
  const deathWeight = MVP_HEALER_BUCKETS.has(bucket) ? 5 : 2;
  return (p.kills || 0)
    - deathWeight * (p.deaths || 0)
    + (p.assists || 0) / 20
    + (p.healing || 0) / MVP_SCORE_K
    + (p.damage || 0) / MVP_SCORE_K;
}

// Bucket every player of a match (both teams, all groups) and rank them.
function computeRoleMVPs(data) {
  const byBucket = {};
  for (const g of data.groups) {
    for (const teamKey of ['team1', 'team2']) {
      for (const p of (g[teamKey] || [])) {
        const bucket = mvpBucket(p, g.label);
        (byBucket[bucket] = byBucket[bucket] || []).push({
          ...p, team: teamKey, group: g.label, score: mvpScore(p, bucket),
        });
      }
    }
  }
  return Object.keys(byBucket)
    .sort((a, b) => {
      const ia = MVP_ROLE_ORDER.indexOf(a), ib = MVP_ROLE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(bucket => ({ bucket, players: byBucket[bucket].sort((a, b) => b.score - a.score) }));
}

// A player only counts as match MVP if they actually beat someone: buckets
// with fewer contenders than this are skipped, otherwise the single player
// of a rare role would be crowned MVP in every match they show up in.
const MVP_MIN_CONTENDERS = 3;

// slug -> Set of canonical names that took an MVP title in that war. Used to
// flag the war in a player profile match history.
let _mvpBySlugCache = null;
function mvpWinnersBySlug() {
  if (_mvpBySlugCache) return _mvpBySlugCache;
  const src = sheetsData || _tierStaticData;
  const details = (src && src.matchDetails) || {};
  const out = {};
  for (const [slug, match] of Object.entries(details)) {
    if (!match || !match.groups || !match.groups.length) continue;
    const set = new Set();
    for (const { players } of computeRoleMVPs(match)) {
      if (players.length < MVP_MIN_CONTENDERS) continue;
      const top = players[0];
      if (top && top.name) set.add(getCanonicalName(top.name, top.role));
    }
    out[slug] = set;
  }
  _mvpBySlugCache = out;
  return out;
}

// Canonical names that took a role MVP title in the match currently on
// screen, so every group view can mark them. Same gate as the MVP panel:
// a bucket needs real competition before anyone is crowned.
let currentMatchMvps = new Set();
function buildMatchMvpLookup(data) {
  currentMatchMvps = new Set();
  if (!isMvpEnabled() || !data || !data.groups || !data.groups.length) return;
  for (const { players } of computeRoleMVPs(data)) {
    if (players.length < MVP_MIN_CONTENDERS) continue;
    const top = players[0];
    if (top && top.name) currentMatchMvps.add(getCanonicalName(top.name, top.role));
  }
}

function getMvpStar(playerName, role) {
  if (!currentMatchMvps.size) return '';
  return currentMatchMvps.has(getCanonicalName(playerName, role))
    ? ' <span class="pm-mvp" title="Match MVP in this role">★</span>'
    : '';
}

// How often each player finished #1 in their role bucket, across all matches.
// Returns bucket -> canonical name -> count.
function computeMvpCounts(matchDetails) {
  const counts = {};
  for (const match of Object.values(matchDetails || {})) {
    if (!match || !match.groups || !match.groups.length) continue;
    for (const { bucket, players } of computeRoleMVPs(match)) {
      if (players.length < MVP_MIN_CONTENDERS) continue;
      const top = players[0];
      if (!top || !top.name) continue;
      const canon = getCanonicalName(top.name, top.role);
      if (!counts[bucket]) counts[bucket] = {};
      counts[bucket][canon] = (counts[bucket][canon] || 0) + 1;
    }
  }
  return counts;
}

function roleMVPsHTML(data) {
  const roleMVPs = computeRoleMVPs(data);
  let cards = '';
  for (const { bucket, players } of roleMVPs) {
    const badge = mvpBadge(bucket);
    let entries = '';
    players.slice(0, 3).forEach((p, i) => {
      const canonical = getCanonicalName(p.name, p.role);
      const teamCls = p.team === 'team1' ? 'mvp-t1' : 'mvp-t2';
      entries += `<div class="mvp-entry${i === 0 ? ' mvp-entry-top' : ''}">
        <span class="mvp-rank mvp-rank-${i + 1}">${i + 1}</span>
        <div class="mvp-entry-main">
          <a class="mvp-name ${teamCls}" onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>
          <div class="mvp-entry-stats">${p.kills}/${p.deaths}/${p.assists} · ${fmt(p.healing)} heal · ${fmt(p.damage)} dmg</div>
        </div>
        <span class="mvp-score">${p.score.toFixed(1)}</span>
      </div>`;
    });
    cards += `<div class="mvp-card mvp-card-${badge}">
      <div class="mvp-card-head">
        <span class="role-badge ${roleBadgeClass(badge)}">${roleBadgeText(badge)}</span>
        <span class="mvp-role-name">${MVP_ROLE_NAMES[bucket] || bucket}</span>
      </div>
      ${entries}
    </div>`;
  }
  return `<div class="mvp-section">
    <div class="mvp-head" onclick="toggleMvpPanel()">
      <div class="mvp-head-text">
        <span class="mvp-head-title">Role MVPs</span>
        <span class="mvp-head-formula">Score = K − 2·D + A/20 + Heal/100k + Dmg/100k · healers: 5·D · HL split G1–6 / G7–10 · top 3 per role</span>
      </div>
      <span class="mvp-toggle-arrow" id="mvp-arrow">${_mvpCollapsed ? '▶' : '▼'}</span>
    </div>
    <div class="mvp-grid" id="mvp-grid"${_mvpCollapsed ? ' style="display:none"' : ''}>
      ${cards}
    </div>
  </div>`;
}

function toggleMvpPanel() {
  _mvpCollapsed = !_mvpCollapsed;
  const grid = document.getElementById('mvp-grid');
  const arrow = document.getElementById('mvp-arrow');
  if (grid) grid.style.display = _mvpCollapsed ? 'none' : '';
  if (arrow) arrow.textContent = _mvpCollapsed ? '▶' : '▼';
}

function renderMatchPage(data) {
  // Manche Wars wurden ohne Spielerstatistiken erfasst — dann waeren MVPs,
  // Filter und Gruppen leer und das 0:0 im Scoreboard irrefuehrend.
  const hasPlayerData = (data.groups || []).some(
    g => (g.team1 || []).length || (g.team2 || []).length);
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

    ${hasPlayerData ? '' : `<div class="no-data-note">
      <strong>No player data recorded for this match.</strong>
      Only the result was logged — map, date and winner. Kill counts below show
      as 0 because no scoreboard was captured.
    </div>`}

    ${hasPlayerData && isMvpEnabled() ? roleMVPsHTML(data) : ''}

    <div class="filter-toolbar"${hasPlayerData ? '' : ' style="display:none"'}>
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
  const canonical = getCanonicalName(p.name, p.role);
  const playerLink = `<a onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>`;
  return `<tr class="${cls}">
    <td class="pt-role"><span class="role-badge ${roleBadgeClass(p.role)}">${roleBadgeText(p.role)}</span></td>
    <td class="pt-name">${playerLink}${getMvpStar(p.name, p.role)}</td>
    ${getVodCell(p.name, p.role)}
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
  const canonical = getCanonicalName(p.name, p.role);
  const playerLink = `<a onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>`;
  return `<tr class="${cls}" style="border-left:none;">
    <td class="pt-role"><span class="role-badge ${roleBadgeClass(p.role)}">${roleBadgeText(p.role)}</span></td>
    <td class="pt-name">${playerLink}${getMvpStar(p.name, p.role)}</td>
    ${getVodCell(p.name, p.role)}
    <td class="pt-num pt-kills">${p.kills}</td>
    <td class="pt-num pt-deaths">${p.deaths}</td>
    <td class="pt-num">${p.assists}</td>
    <td class="pt-num pt-heal">${fmt(p.healing)}</td>
    <td class="pt-num pt-dmg">${fmt(p.damage)}</td>
  </tr>`;
}

function renderGroupLabelHtml(g) {
  // Each team has its own position label per group (e.g. G3 is "Top weak" for
  // Beaver and "Bottom strong" for Capy because they fight from opposite ends).
  // Show both when they differ; fall back to the single label for older data.
  const t1 = g.team1Label || g.label || '';
  const t2 = g.team2Label || g.label || '';
  if (!t1 && !t2) return g.label || '';
  if (t1 === t2 || !t2 || !t1) return g.label || t1 || t2;
  // Extract "Gn:" prefix once and team-specific position text after.
  const m1 = t1.match(/^(G\d+\s*:?\s*)(.*)$/i);
  const m2 = t2.match(/^(G\d+\s*:?\s*)(.*)$/i);
  const prefix = (m1 && m1[1]) || (m2 && m2[1]) || '';
  const pos1 = m1 ? m1[2].trim() : t1;
  const pos2 = m2 ? m2[2].trim() : t2;
  return `${prefix.replace(/\s*:?\s*$/, '')}: <span class="grp-pos grp-pos-t1">🟢 ${pos1}</span> <span class="grp-pos-sep">·</span> <span class="grp-pos grp-pos-t2">🟣 ${pos2}</span>`;
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
      <span class="group-label-text">${renderGroupLabelHtml(g)}</span>
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
      <span class="group-label-text">${renderGroupLabelHtml(g)}</span>
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
  // Each team has its own position label per group (e.g. G3 is "Top weak" for
  // one team and "Bottom strong" for the other since they fight from opposite
  // ends). Fall back to the generic label for older match JSONs.
  const teamLabelKey = team === 't1' ? 'team1Label' : 'team2Label';
  const label = g ? (g[teamLabelKey] || g.label) : placeholderLabel;

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
            const canonical = getCanonicalName(p.name, p.role);
            const playerLink = `<a onclick="navigate('#/player/${encodePlayerForLink(canonical)}')">${p.name}</a>`;
            return `<tr class="${rowClass}" style="border-left:none;">
              <td class="pt-role"><span class="role-badge ${roleBadgeClass(p.role)}">${roleBadgeText(p.role)}</span></td>
              <td class="pt-name">${playerLink}${getMvpStar(p.name, p.role)}</td>
              ${getVodCell(p.name, p.role)}
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
        if (getCanonicalName(p.name, p.role) === canon) {
          results.push({
            slug, nwlNumber: match.nwlNumber, mapName: match.mapName,
            date: match.date, winner: match.winner,
            team: 'team1', group: g.label, player: p,
            won: match.winner === 'team1',
          });
        }
      }
      for (const p of g.team2) {
        if (getCanonicalName(p.name, p.role) === canon) {
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
        const canon = getCanonicalName(p.name, p.role);
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
      date: '07.09.2026',
      changes: [
        'New page — Farewell Video: a two-minute look back at seven months of the league, built entirely from the numbers on this site. A short silent preview of it sits on the homepage under the season record.',
        'Role MVPs are now visible for every match — the top three players per role, scored with the formula shown in the panel header. The winner of each role also gets a gold ★ next to their name in the group tables, in all three views.',
        'The Tier-List is out of hiding and has its own entry in the burger menu. The secret link still works and jumps straight to it.',
        'The D-Tier column is sealed: the column and its headcount stay visible, the names are redacted. It is a joke list, nobody needs to be named at the bottom of one.',
        'A thank-you to Irvine greets you on arrival. The button is the only way past it, and it keeps a running tally.',
        'Tier-List now shows how often a player was crowned match MVP in that role (gold ★ on the chip). Only counted when at least 3 players contested the role in that match, so the sole player of a rare role does not collect a free MVP every war.',
        'New page — League Records: single-war bests (kills, damage, healing, assists, deaths), career totals, plus biggest blowouts and bloodiest wars. Every single-war list shows each player only once, with their best war, so one outlier cannot fill the whole top five.',
        'New page — MVP Leaderboard: every player ranked by MVP titles, broken down by role, with the MVP rate per war played.',
        'New page — Map Statistics: win rates and average scores per territory, plus how often the attacking side actually wins.',
        'New page — Compare Players: two players head to head across their whole career. Type to search, pick from the list that drops down, and narrow the numbers to a single role with one click.',
        'Merged 33 duplicate player profiles that were split by truncated or misspelled scoreboard names — among them RedbullAmb/RedbullAmba (Uninstall.exe), Beetle Juice, SmileyBill, Hoosierz, Bourinosss, LastHitEnjoy (Jamel), Ambrozja, Cannab1s, shokki, Caruso and Dr. Costa.',
        'All matches now load from the static data files. The last few wars used to be read live from the spreadsheet on every visit; that step is gone, so pages open faster and the scoreboard keeps working even once the spreadsheet is no longer reachable.',
        'Records and the MVP leaderboard use competition ranking: players on the same value share a rank and the positions they take up are skipped (1, 2, 2, 4). Two players tied for first both get the gold medal.',
        'Tier-List scores are now adjusted for sample size: an average is weighted against the role average by how many wars it rests on. A strong run over ten wars no longer outranks a strong run over seventy, and thin samples sit closer to the middle in both directions.',
        'Tier-List now needs 10 games in a role instead of 5. Two good wars used to be enough to land at the top and skew the percentile split for everyone else. A checkbox under the table brings the short-timers back in.',
        'Added around 400 VODs from the Discord threads, covering 72 of 75 wars. Players who recorded more than one POV in a war now get one button per video, and the match history on a player page lists their own recordings war by war.',
        'Map names are now normalised: historic spelling slips ("Ebonescale Reach", "Ebenonscale Reach") no longer split one territory into three.',
      ]
    },
    {
      date: '06.09.2026',
      changes: [
        'Added NWL#74 (Windsward, 31.08.2026) — Beaverknights won as defenders. No player stats were captured for this war, so the match page shows the result only, with a note explaining the empty scoreboard.',
        'Matches that exist only as static JSON (no spreadsheet tab) are now always merged into the match list — previously they only appeared when Google Sheets was completely unreachable.',
        'extract-data.py keeps hand-added matches that have no spreadsheet tab instead of dropping them on the next auto-sync.',
        'Maintenance mode: the site now shows a maintenance notice with a live countdown over the dimmed homepage.',
      ]
    },
    {
      date: '19.06.2026',
      changes: [
        'Merged Dogtierplaye alias into Bukaku player profile',
        'Merged NWL62 name variants: Goatfryed→goatfryed, BLAACKB3AST→BLACK3AST, Rupp3rt→Ruppert, Jeszo→jormamas slave2, LilNatalie V2→LilNatalie, Billy Talent II→BillyTalent, ShdwTrckr→ShadowTrickier, Lynnxxx→Lynnx, Shiro34→Shiroyasha34, shua→sadshua, Zeraphinea→Zeraphine, NotFjayy→Fjayy, Guni→Proguni, Hanrich→Ganrich, Absolute Drama→Braczyn/Abso',
        'Merged Kel(CherieFa and Kel(CherieFai aliases into kel(cherieFan player profile',
        'Players with missing or unmapped roles now appear on the scoreboard with a "?" badge instead of being hidden',
        'Merged RaninoSPOT alias into Ranino player profile',
      ]
    },
    {
      date: '04.05.2026',
      changes: [
        'Fixed NWL#37 team assignment again: Beaverknights and Capyknights players were swapped. Removed nwl-37 from SKIP_SWAP_MATCHES in extract-data.py so the swap is applied on future syncs, and corrected the static nwl-37.json data.',
      ]
    },
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
        'Hybrid data loading: the last 5 matches now sync live with Google Sheets (in-progress edits show up immediately), while older matches load instantly from static JSON files',
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

// Wie in den Gruppentabellen: ein Video behaelt die volle Beschriftung,
// ab zwei wird nummeriert.
function playerVodCell(a, canon) {
  const urls = vodsForPlayerInMatch(a.slug, canon);
  if (!urls.length) return '';
  const btn = (url, label, title) =>
    `<a href="${url}" target="_blank" rel="noopener" class="vod-btn"`
    + (title ? ` title="${title}"` : '') + `>&#9654; ${label}</a>`;
  if (urls.length === 1) return btn(urls[0], 'VOD', 'Watch this player\'s POV');
  return urls.map((u, i) =>
    btn(u, String(i + 1), `Watch VOD ${i + 1} of ${urls.length}`)).join('');
}

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
          <span class="role-badge ${roleBadgeClass(r)}">${roleBadgeText(r)}</span> <span class="role-filter-count">${roleCounts[r]}</span>
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
            <th>VOD</th>
          </tr>
        </thead>
        <tbody>`;

    for (const a of appearances) {
      const rowClass = a.team === 'team1' ? 'pm-t1' : 'pm-t2';
      const teamLabel = a.team === 'team1' ? 'Beaver' : 'Capy';
      const resultBadge = a.won ? '<span class="pm-result win">WIN</span>' : '<span class="pm-result loss">LOSS</span>';

      const wasMvp = (mvpWinnersBySlug()[a.slug] || new Set()).has(canon);
      const mvpStar = wasMvp
        ? ` <span class="pm-mvp" title="Match MVP in this role">★</span>`
        : '';

      html += `<tr class="${rowClass}" onclick="navigate('#/match/${a.slug}')">
        <td class="pm-nwl">NWL#${a.nwlNumber}</td>
        <td class="pm-map">${a.mapName}</td>
        <td class="pm-date">${a.date}</td>
        <td class="pm-date">${teamLabel}</td>
        <td class="pm-date">${a.group}</td>
        <td><span class="role-badge ${roleBadgeClass(a.player.role)}">${roleBadgeText(a.player.role)}</span>${mvpStar}</td>
        <td class="pm-num">${a.player.kills}</td>
        <td class="pm-num">${a.player.deaths}</td>
        <td class="pm-num">${a.player.assists}</td>
        <td class="pm-num">${fmt(a.player.healing)}</td>
        <td class="pm-num">${fmt(a.player.damage)}</td>
        <td class="pm-num" style="color:var(--gold)">${kd(a.player)}</td>
        <td>${resultBadge}</td>
        <td class="pm-vod" onclick="event.stopPropagation()">${playerVodCell(a, canon)}</td>
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

// ===========================================
//  TIER LIST PAGE
// ===========================================

// ── ACCESS GATE ─────────────────────────────────────────────────────────
// Reachable from the burger menu; the secret URL
//     https://<host>/?secret=aeternum
// additionally jumps straight to the page on load.
function hasTierSecret() {
  return /[?&]secret=aeternum\b/.test(window.location.search);
}
// The Tier-List is public now. Set TIER_LIST_PUBLIC to false to hide it
// again: it then falls back to the secret URL only and disappears from
// the burger menu.
const TIER_LIST_PUBLIC = true;

function isTierListEnabled() {
  return TIER_LIST_PUBLIC || hasTierSecret();
}
function isTierListMenuVisible() {
  return TIER_LIST_PUBLIC;
}

// Minimum games on a role before that role-slot is shown in the tier list.
// Ab wie vielen Spielen in einer Rolle jemand ueberhaupt gewertet wird.
// Wer eine Rolle zweimal gespielt hat, landet sonst durch einen einzigen guten
// Abend ganz oben und verzerrt die Perzentil-Einteilung fuer alle anderen.
const TIER_MIN_GAMES = 10;

// Der Schalter unter der Tabelle setzt die Schwelle voruebergehend auf 1.
// Bewusst nur im Speicher: beim naechsten Aufruf gilt wieder die Vorgabe.
let _tierShowAll = false;
function tierMinGames() { return _tierShowAll ? 1 : TIER_MIN_GAMES; }

function toggleTierShowAll() {
  _tierShowAll = !_tierShowAll;
  renderTierListPage();
}

// Role buckets: damage roles share a single dmg-vs-mirror bonus formula;
// healers share the group-survival bonus.
const TIER_DAMAGE_ROLES = new Set(['RD','MD','IV','BR','PT','HD','VB','CW']);
// Roles that are nominally dex-side (kill-squad) even when they happen to be
// listed in groups 1–6. Their deaths are excluded from the healer group-deaths
// penalty so a tank/healer trio isn't punished for the MD's solo dives.
const TIER_DEX_SIDE_ROLES = new Set(['MD','RD','CW']);

function tierNormRole(role) {
  return role === 'Aoe' ? 'AoE' : (role || '?');
}

// Map a player to their tier bucket. HL is split into G1–6 (zerg) and G7–10 (ks).
function tierBucketOf(p, groupLabel) {
  const role = tierNormRole(p.role);
  if (role === 'HL') {
    const m = (groupLabel || '').match(/^G(\d+)/i);
    const n = m ? parseInt(m[1], 10) : 0;
    return n >= 7 ? 'HL_ks' : 'HL_zerg';
  }
  return role;
}

const TIER_BUCKET_NAMES = {
  AoE: 'Area Healer',
  HL_zerg: 'Group Healer · G1–6',
  HL_ks:   'Dex Healer · G7–10',
  RD: 'Ranged DPS', IV: 'IG / VG · Support',
  BR: 'Bruiser', PT: 'Point', MD: 'Melee DPS', HD: 'Heavy Dex',
  VB: 'Voidblade', CW: 'Crescent Wave',
};
// Column order — keep healers/tanky frontline first, damage right.
const TIER_BUCKET_ORDER = ['AoE','HL_zerg','HL_ks','BR','PT','IV','RD','MD','HD','VB','CW'];
// Role-badge CSS code for a bucket (HL_zerg / HL_ks both render as HL).
function tierBadgeOf(bucket) {
  return (bucket === 'HL_zerg' || bucket === 'HL_ks') ? 'HL' : bucket;
}

// Per-match score. Extends MVP formula:
//   - Healer bonus: (mirror group deaths − own group deaths), with MD/RD/CW
//     excluded from both sides (those roles are dex-side even in groups 1–6).
//   - IV (Ice Gauntlet / Void Gauntlet) — treated as a CC/Support role:
//     higher death weight (CC chain breaks when you die), assists weighted
//     much higher (assists ARE the output for IV: oblivions, slows, roots,
//     ice storm tags), no damage-vs-mirror bonus (IV isn't in the damage
//     race), plus a half-strength group-survival bonus since CC keeps the
//     point alive. Same MD/RD/CW exclusion as healers.
//   - Other damage roles: damage compared to same-role peers across own +
//     mirror group, so kill-stealers without damage output are de-weighted.
function tierMatchScore(p, bucket, ownGroup, mirrorGroup) {
  const isHealer = bucket === 'AoE' || bucket === 'HL_zerg' || bucket === 'HL_ks';
  const isSupport = bucket === 'IV';

  // Death weight & assist weight differ for support / healer / dps.
  const deathW   = isHealer ? 5 : (isSupport ? 3 : 2);
  const assistW  = isSupport ? 8 : 20; // smaller divisor = higher weight

  let s = (p.kills || 0)
        - deathW * (p.deaths || 0)
        + (p.assists || 0) / assistW
        + (p.healing || 0) / 100000
        + (p.damage || 0) / 100000;

  const sumGroupDeaths = (arr) => arr.reduce((acc, x) =>
    TIER_DEX_SIDE_ROLES.has(tierNormRole(x.role)) ? acc : acc + (x.deaths || 0), 0);

  if (isHealer) {
    const ownDeaths = sumGroupDeaths(ownGroup || []);
    const mirrorDeaths = sumGroupDeaths(mirrorGroup || []);
    s += (mirrorDeaths - ownDeaths);
  } else if (isSupport) {
    // Half-strength survival bonus for IV — CC contributes to group survival,
    // but not as directly as healing does.
    const ownDeaths = sumGroupDeaths(ownGroup || []);
    const mirrorDeaths = sumGroupDeaths(mirrorGroup || []);
    s += 0.5 * (mirrorDeaths - ownDeaths);
  } else if (TIER_DAMAGE_ROLES.has(bucket)) {
    const peers = [...(ownGroup || []), ...(mirrorGroup || [])]
      .filter(x => tierNormRole(x.role) === bucket);
    if (peers.length > 0) {
      const avgDmg = peers.reduce((a, x) => a + (x.damage || 0), 0) / peers.length;
      s += ((p.damage || 0) - avgDmg) / 100000;
    }
  }
  return s;
}

// Static fallback: load every per-match JSON via matches.json index so the
// tier list still works when Google Sheets is unreachable.
let _tierStaticData = null;
async function loadStaticTierData() {
  if (_tierStaticData) return _tierStaticData;
  try {
    const summaries = await fetch(`data/matches.json?_cb=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : []);
    const details = await Promise.all(
      summaries.map(m => loadStaticMatchDetail(m.slug).then(d => d ? [m.slug, d] : null))
    );
    const matchDetails = {};
    for (const entry of details) if (entry) matchDetails[entry[0]] = entry[1];
    _tierStaticData = { matchDetails };
    return _tierStaticData;
  } catch (e) {
    console.warn('Static tier data load failed:', e);
    _tierStaticData = { matchDetails: {} };
    return _tierStaticData;
  }
}

function computeTierList() {
  const src = sheetsData || _tierStaticData;
  if (!src || !src.matchDetails) return { buckets: {}, order: TIER_BUCKET_ORDER };
  const agg = {}; // bucket -> canonical -> { canon, names:Set, sum, count }
  const mvpCounts = computeMvpCounts(src.matchDetails);

  for (const match of Object.values(src.matchDetails)) {
    for (const g of match.groups) {
      for (const teamKey of ['team1','team2']) {
        const own = g[teamKey] || [];
        const mirror = g[teamKey === 'team1' ? 'team2' : 'team1'] || [];
        for (const p of own) {
          // Skip empty roster slots (all-zero rows).
          if (!p.name) continue;
          const bucket = tierBucketOf(p, g.label);
          const score = tierMatchScore(p, bucket, own, mirror);
          const canon = getCanonicalName(p.name, p.role);
          if (!agg[bucket]) agg[bucket] = {};
          if (!agg[bucket][canon]) agg[bucket][canon] = { canon, names: new Set(), sum: 0, count: 0 };
          agg[bucket][canon].sum += score;
          agg[bucket][canon].count += 1;
          agg[bucket][canon].names.add(p.name);
        }
      }
    }
  }

  const out = {};
  for (const [bucket, players] of Object.entries(agg)) {
    const list = Object.values(players)
      .filter(x => x.count >= tierMinGames())
      .map(x => ({
        canon: x.canon,
        displayName: findDisplayName(x.canon, x.names),
        games: x.count,
        avg: x.sum / x.count,
        mvps: (mvpCounts[bucket] || {})[x.canon] || 0,
      }));

    // Stichprobenkorrektur. Ein Schnitt aus 11 Wars traegt weniger Gewissheit
    // als einer aus 70; ohne Korrektur entscheidet in der Spitze das Glueck.
    // Der gewertete Wert ist deshalb ein Mittel aus eigenem Schnitt und
    // Rollendurchschnitt, gewichtet mit der Spielzahl gegen SHRINK_WEIGHT.
    // Das zieht duenne Stichproben in BEIDE Richtungen zur Mitte, nicht nur
    // nach unten. Als Gewicht dient die Mindestspielzahl: wer genau sie
    // erreicht, zaehlt halb sich selbst, halb den Durchschnitt.
    const SHRINK_WEIGHT = TIER_MIN_GAMES;
    const rollenMittel = list.length
      ? list.reduce((a, p) => a + p.avg, 0) / list.length
      : 0;
    for (const p of list) {
      p.score = (p.games * p.avg + SHRINK_WEIGHT * rollenMittel)
              / (p.games + SHRINK_WEIGHT);
    }
    list.sort((a, b) => b.score - a.score);

    const n = list.length;
    list.forEach((p, i) => {
      // Percentile-based tier — robust against scale differences between roles.
      const pct = n > 0 ? (i + 0.5) / n : 0;
      if (pct <= 0.15) p.tier = 'S';
      else if (pct <= 0.35) p.tier = 'A';
      else if (pct <= 0.65) p.tier = 'B';
      else if (pct <= 0.85) p.tier = 'C';
      else p.tier = 'D';
    });
    out[bucket] = list;
  }
  return { buckets: out, order: TIER_BUCKET_ORDER };
}

const TIER_ORDER = ['S','A','B','C','D'];
// Nobody needs to be named and shamed at the bottom of a joke list.
const TIER_SEALED = 'D';
// Lock time on the tier-list disclaimer button, in seconds.
const TIER_DISCLAIMER_SECONDS = 5;

// Bar widths look hand-drawn rather than name-length-derived, and stay
// stable across renders because they hash the canonical name.
function redactBarWidth(canon) {
  let h = 0;
  for (let i = 0; i < canon.length; i++) h = (h * 31 + canon.charCodeAt(i)) >>> 0;
  return 58 + (h % 38);
}
let _tierFilter = new Set(); // selected buckets; empty = show all

function toggleTierFilter(bucket) {
  if (_tierFilter.has(bucket)) _tierFilter.delete(bucket);
  else _tierFilter.add(bucket);
  renderTierListPage();
}
function clearTierFilter() {
  _tierFilter = new Set();
  renderTierListPage();
}

function renderTierListPage() {
  const { buckets, order } = computeTierList();
  const allBuckets = order.filter(b => buckets[b] && buckets[b].length > 0);
  const visibleBuckets = _tierFilter.size === 0 ? allBuckets : allBuckets.filter(b => _tierFilter.has(b));

  let filterBtns = `<button class="tier-filter-btn ${_tierFilter.size === 0 ? 'active' : ''}" onclick="clearTierFilter()">All</button>`;
  for (const b of allBuckets) {
    const badge = tierBadgeOf(b);
    const active = _tierFilter.has(b) ? 'active' : '';
    filterBtns += `<button class="tier-filter-btn ${active}" onclick="toggleTierFilter('${b}')">
      <span class="role-badge ${roleBadgeClass(badge)}">${roleBadgeText(badge)}</span>
      <span class="tier-filter-name">${TIER_BUCKET_NAMES[b] || b}</span>
    </button>`;
  }

  let grid = '';
  if (visibleBuckets.length === 0) {
    grid = `<div class="tier-empty">No qualifying players yet · need ${tierMinGames()}+ games on a role</div>`;
  } else {
    // Tiers across the top as columns; one row per class bucket. Class color
    // tints the whole row so each role band is recognizable at a glance.
    // When more than one role row is visible, draw a thin role-colored line
    // under each row (except the last) so neighbouring roles are easy to tell
    // apart. With a single role visible the dividers would be redundant.
    const isMultiRole = visibleBuckets.length > 1;
    const lastBucket = isMultiRole ? visibleBuckets[visibleBuckets.length - 1] : null;
    grid = `<div class="tier-grid${isMultiRole ? ' multi-role' : ''}" style="grid-template-columns: 200px repeat(${TIER_ORDER.length}, minmax(180px, 1fr));">`;
    grid += `<div class="tier-grid-cell tier-grid-corner"></div>`;
    for (const tier of TIER_ORDER) {
      const sealed = tier === TIER_SEALED;
      grid += `<div class="tier-grid-cell tier-grid-tier tier-tier-${tier} tier-col-${tier}${sealed ? ' tier-tier-sealed' : ''}">
        ${tier}-Tier${sealed ? `<svg class="tier-seal-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>` : ''}
      </div>`;
    }
    for (const b of visibleBuckets) {
      const badge = tierBadgeOf(b);
      const rowExtra = (b === lastBucket) ? ' tier-row-last' : '';
      grid += `<div class="tier-grid-cell tier-grid-head tier-row-${badge}${rowExtra}">
        <span class="role-badge ${roleBadgeClass(badge)}">${roleBadgeText(badge)}</span>
        <span class="tier-col-name">${TIER_BUCKET_NAMES[b] || b}</span>
        <span class="tier-col-count">${(buckets[b] || []).length} players</span>
      </div>`;
      for (const tier of TIER_ORDER) {
        const players = (buckets[b] || []).filter(p => p.tier === tier);
        let chips = '';
        if (tier === TIER_SEALED) {
          // The bottom tier stays sealed. The column and its headcount remain
          // visible, the names never reach the markup in the first place.
          chips = players.map(p => `<span class="tier-redact" style="width:${redactBarWidth(p.canon)}%"></span>`).join('');
          grid += `<div class="tier-grid-cell tier-cell tier-cell-sealed tier-row-${badge} tier-col-${tier}${rowExtra}"
            title="${players.length} ${players.length === 1 ? 'entry' : 'entries'} · sealed">${chips}</div>`;
          continue;
        }
        for (const p of players) {
          const mvpTitle = p.mvps
            ? ` · ${p.mvps}× match MVP in this role`
            : '';
          const mvpBadgeHtml = p.mvps
            ? `<span class="tier-chip-mvp">★${p.mvps}</span>`
            : '';
          chips += `<a class="tier-chip${p.mvps ? ' has-mvp' : ''}" onclick="navigate('#/player/${encodePlayerForLink(p.canon)}')" title="${p.games} games · avg score ${p.avg.toFixed(1)} · rated ${p.score.toFixed(1)} after the sample-size adjustment${mvpTitle}">
            <span class="tier-chip-name">${p.displayName}</span>${mvpBadgeHtml}<span class="tier-chip-games">${p.games}</span>
          </a>`;
        }
        grid += `<div class="tier-grid-cell tier-cell tier-row-${badge} tier-col-${tier}${rowExtra}">${chips}</div>`;
      }
    }
    grid += `</div>`;
  }

  // Per-session disclaimer — shown once per browser session, button locked
  // for TIER_DISCLAIMER_SECONDS.
  let disclaimerAck = false;
  try { disclaimerAck = sessionStorage.getItem('nwl_tier_disclaimer_ack') === '1'; } catch {}
  const disclaimerHTML = disclaimerAck ? '' : `
    <div class="tier-disclaimer-overlay" id="tier-disclaimer">
      <div class="tier-disclaimer-card">
        <div class="tier-disclaimer-eyebrow">Disclaimer</div>
        <div class="tier-disclaimer-text">
          I understand this list is purely fictional and doesn't reflect actual skill or macro in the slightest, it's just tracking some silly numbers. On top of that, the formulas were written by someone who is awful at math, which adds a whole new layer of clowning to it.
        </div>
        <button class="tier-disclaimer-btn" id="tier-disclaimer-btn" disabled>
          <span id="tier-disclaimer-btn-label">I understand (${TIER_DISCLAIMER_SECONDS}s)</span>
        </button>
        <div class="tier-disclaimer-progress-track">
          <div class="tier-disclaimer-progress-bar" id="tier-disclaimer-bar"></div>
        </div>
      </div>
    </div>`;

  app.innerHTML = `<div class="wrap">
    <a class="back-link" onclick="navigate('')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to Matches
    </a>
    <div class="player-header">
      <div class="player-eyebrow">NWL Scoreboard</div>
      <h1 class="player-name">Tier-List</h1>
      <div class="player-aliases">Per-role rankings · ${tierMinGames()}+ games required · <span class="tier-chip-mvp tier-legend-star">★</span> = times crowned match MVP in that role (only counted when at least ${MVP_MIN_CONTENDERS} players contested it) · MVP formula extended with healer group survival vs. mirror &amp; DPS damage-share vs. mirror</div>
    </div>
    <div class="tier-filter-bar">
      <div class="tier-filter-label">Filter Class</div>
      <div class="tier-filter-buttons">${filterBtns}</div>
    </div>
    ${grid}
    <div class="tier-showall">
      <label class="tier-showall-label">
        <input type="checkbox" id="tier-showall"${_tierShowAll ? ' checked' : ''}
               onchange="toggleTierShowAll()">
        Include players with fewer than ${TIER_MIN_GAMES} games in a role
      </label>
      <span class="tier-showall-note">${_tierShowAll
        ? 'Showing everyone. A single strong war can put someone at the top, so the order means less down here.'
        : ''}</span>
    </div>
    <div class="page-footer">
      * Tiers are percentile-assigned within each role column (S=top 15%, A=15–35%, B=35–65%, C=65–85%, D=bottom 15%).<br>
      * Healer score adds (mirrorGroupDeaths − ownGroupDeaths), excluding dex-side MD/RD/CW from both sides.<br>
      * IG/VG (Support): K − 3·D + A/8 + Heal/100k + Dmg/100k + ½·(mirrorGroupDeaths − ownGroupDeaths). Assists weighted high because CC/oblivion/slow are the real output; no damage-vs-mirror bonus.<br>
      * DPS score adds (playerDamage − sameRoleAvg) / 100k across own + mirror group.<br>
      * Scores are adjusted for sample size: an average is weighted against the role average
        by how many wars it rests on (${TIER_MIN_GAMES} games = half and half, 70 games = almost
        entirely your own). Thin samples sit closer to the middle in both directions, so a
        handful of lucky &mdash; or unlucky &mdash; wars cannot decide the top.<br>
      * The D-Tier column is sealed. The entries are counted, the names stay redacted — no one gets pilloried over a joke list.
    </div>
  </div>${disclaimerHTML}`;
  window.scrollTo(0, 0);
  if (!disclaimerAck) activateTierDisclaimer();
}

// Countdown on the disclaimer "I understand" button + progress bar.
// requestAnimationFrame for smooth bar; one tick/sec for the label text.
function activateTierDisclaimer() {
  const overlay = document.getElementById('tier-disclaimer');
  if (!overlay) return;
  const btn = document.getElementById('tier-disclaimer-btn');
  const label = document.getElementById('tier-disclaimer-btn-label');
  const bar = document.getElementById('tier-disclaimer-bar');
  const TOTAL = TIER_DISCLAIMER_SECONDS * 1000;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const pct = Math.min(1, elapsed / TOTAL);
    if (bar) bar.style.width = (pct * 100) + '%';
    const remaining = Math.max(0, Math.ceil((TOTAL - elapsed) / 1000));
    if (pct < 1) {
      if (label) label.textContent = `I understand (${remaining}s)`;
      requestAnimationFrame(tick);
    } else {
      if (label) label.textContent = 'I understand';
      if (btn) { btn.disabled = false; btn.classList.add('ready'); }
    }
  }
  requestAnimationFrame(tick);

  btn?.addEventListener('click', () => {
    if (btn.disabled) return;
    try { sessionStorage.setItem('nwl_tier_disclaimer_ack', '1'); } catch {}
    overlay.classList.add('dismissed');
    setTimeout(() => overlay.remove(), 250);
  });
}

// Make functions globally accessible
window.navigate = navigate;
window.toggleNav = toggleNav;
window.toggleFilterPanel = toggleFilterPanel;
window.setPlayerRoleFilter = setPlayerRoleFilter;
window.toggleMvpPanel = toggleMvpPanel;
window.toggleTierFilter = toggleTierFilter;
window.toggleTierShowAll = toggleTierShowAll;
window.clearTierFilter = clearTierFilter;
window.isTierListEnabled = isTierListEnabled;
window.onCompareSearch = onCompareSearch;
window.onCompareFocus = onCompareFocus;
window.onCompareBlur = onCompareBlur;
window.onCompareKey = onCompareKey;
window.onCompareHover = onCompareHover;
window.onComparePick = onComparePick;
window.onCompareClear = onCompareClear;
window.onCompareRolePick = onCompareRolePick;

// -- Re-render groups on breakpoint change --
let _lastMobile = window.innerWidth <= 900;
window.addEventListener('resize', () => {
  const mob = window.innerWidth <= 900;
  if (mob !== _lastMobile) {
    _lastMobile = mob;
    if (currentMatch) renderGroups(currentMatch);
  }
});

// ===========================================
//  LEAGUE STATS PAGES
//  Records · MVP Leaderboard · Map Stats · Compare
//  All four read the same archive and fall back to the static JSON files when
//  the Google Sheets sync is unavailable, exactly like the tier list does.
// ===========================================

async function ensureArchive() {
  if (sheetsData || _tierStaticData) return;
  await Promise.race([ensureSheetsSync(), loadStaticTierData()]);
  if (!sheetsData && !_tierStaticData) await loadStaticTierData();
}

// Historic spelling slips in the sheet ("Ebonescale Reach", "Ebenonscale
// Reach") would otherwise show up as separate territories on the map page.
// Fold every variant into the most frequent spelling of the same map.
let _mapCanonCache = null;
let _archiveCacheSrc = null;

function _levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

function _mapKey(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildMapCanon() {
  const src = sheetsData || _tierStaticData;
  const details = (src && src.matchDetails) || {};
  const counts = {};
  for (const d of Object.values(details)) {
    const n = (d.mapName || '').trim();
    if (n) counts[n] = (counts[n] || 0) + 1;
  }
  // Most frequent spelling wins, rarer near-identical variants fold into it.
  const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const canon = {};
  const kept = [];
  for (const n of names) {
    const kn = _mapKey(n);
    const hit = kept.find(k => {
      const kk = _mapKey(k);
      const maxLen = Math.max(kk.length, kn.length) || 1;
      return 1 - _levenshtein(kk, kn) / maxLen > 0.85;
    });
    canon[n] = hit || n;
    if (!hit) kept.push(n);
  }
  _mapCanonCache = canon;
}

function canonicalMapName(name) {
  if (!_mapCanonCache) buildMapCanon();
  return _mapCanonCache[name] || name || 'Unknown';
}

// Drop every derived cache when the underlying archive object changes (e.g.
// a static-first render later gets replaced by the live Sheets data).
function _checkArchiveCache() {
  const src = sheetsData || _tierStaticData;
  if (src !== _archiveCacheSrc) {
    _archiveCacheSrc = src;
    _archiveRowsCache = null;
    _archiveCareersCache = null;
    _mapCanonCache = null;
  }
}

// Normalised match list. The detail JSON carries everything we need; the
// Sheets summaries are only consulted to fill gaps.
function archiveMatchList() {
  _checkArchiveCache();
  const src = sheetsData || _tierStaticData;
  const details = (src && src.matchDetails) || {};
  const summaries = {};
  if (sheetsData && sheetsData.matchList) {
    for (const s of sheetsData.matchList) summaries[s.slug] = s;
  }
  return Object.entries(details).map(([slug, d]) => {
    const s = summaries[slug] || {};
    return {
      slug,
      nwlNumber: d.nwlNumber != null ? d.nwlNumber : s.nwlNumber,
      mapName: canonicalMapName(d.mapName || s.mapName),
      date: d.date || s.date || '',
      duration: d.duration || s.duration || null,
      winner: d.winner || s.winner || null,
      attacker: d.attacker || s.attacker || null,
      totals: d.totals || { team1: {}, team2: {} },
      groups: d.groups || [],
    };
  }).filter(m => m.nwlNumber != null).sort((a, b) => b.nwlNumber - a.nwlNumber);
}

// One row per player per match — the base for every leaderboard below.
let _archiveRowsCache = null;
function archivePlayerRows() {
  if (_archiveRowsCache) return _archiveRowsCache;
  const rows = [];
  for (const m of archiveMatchList()) {
    for (const g of m.groups) {
      for (const teamKey of ['team1', 'team2']) {
        for (const p of (g[teamKey] || [])) {
          if (!p.name) continue;
          rows.push({
            canon: getCanonicalName(p.name, p.role),
            name: p.name, role: p.role || '?', group: g.label,
            team: teamKey, won: m.winner === teamKey,
            slug: m.slug, nwl: m.nwlNumber, map: m.mapName, date: m.date,
            kills: p.kills || 0, deaths: p.deaths || 0, assists: p.assists || 0,
            healing: p.healing || 0, damage: p.damage || 0,
          });
        }
      }
    }
  }
  _archiveRowsCache = rows;
  return rows;
}

// Career aggregates per canonical player.
let _archiveCareersCache = null;
function archiveCareers() {
  if (_archiveCareersCache) return _archiveCareersCache;
  const agg = {};
  for (const r of archivePlayerRows()) {
    let a = agg[r.canon];
    if (!a) {
      a = agg[r.canon] = { canon: r.canon, names: new Set(), matches: 0, wins: 0,
                           kills: 0, deaths: 0, assists: 0, healing: 0, damage: 0 };
    }
    a.names.add(r.name);
    a.matches++;
    if (r.won) a.wins++;
    a.kills += r.kills; a.deaths += r.deaths; a.assists += r.assists;
    a.healing += r.healing; a.damage += r.damage;
  }
  _archiveCareersCache = Object.values(agg).map(a => ({
    ...a,
    displayName: findDisplayName(a.canon, a.names),
    kd: a.deaths > 0 ? a.kills / a.deaths : a.kills,
    winRate: a.matches ? a.wins / a.matches : 0,
  }));
  return _archiveCareersCache;
}

function statsPageHeader(title, subtitle) {
  return `<a class="back-link" onclick="navigate('')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to Matches
    </a>
    <div class="player-header">
      <div class="player-eyebrow">NWL Scoreboard</div>
      <h1 class="player-name">${title}</h1>
      <div class="player-aliases">${subtitle}</div>
    </div>`;
}

// Wettkampf-Zaehlung: gleiche Werte teilen sich einen Rang, die dadurch
// belegten Positionen werden uebersprungen (1, 2, 2, 4). Ohne das bekaemen
// zwei Spieler mit identischem Wert zwei verschiedene Nummern, was eine
// Rangfolge behauptet, die es nicht gibt.
function rankLabels(list, valueOf) {
  let rang = 0;
  let vorher;
  return list.map((item, i) => {
    const v = valueOf(item);
    if (i === 0 || v !== vorher) rang = i + 1;
    vorher = v;
    return rang;
  });
}

function playerLinkHTML(canon, label) {
  return `<a class="stats-player" onclick="navigate('#/player/${encodePlayerForLink(canon)}')">${label}</a>`;
}
function matchLinkHTML(slug, nwl, map) {
  return `<a class="stats-match" onclick="navigate('#/match/${slug}')">NWL#${nwl} · ${map}</a>`;
}

// ── 1. LEAGUE RECORDS ─────────────────────────────────────────────────────

const RECORD_STATS = [
  { key: 'kills',   label: 'Most Kills in one War' },
  { key: 'damage',  label: 'Most Damage in one War' },
  { key: 'healing', label: 'Most Healing in one War' },
  { key: 'assists', label: 'Most Assists in one War' },
  { key: 'deaths',  label: 'Most Deaths in one War' },
];

const CAREER_STATS = [
  { key: 'kills',   label: 'Total Kills' },
  { key: 'damage',  label: 'Total Damage' },
  { key: 'healing', label: 'Total Healing' },
  { key: 'assists', label: 'Total Assists' },
  { key: 'matches', label: 'Most Wars Played' },
];

function renderRecordsPage() {
  const rows = archivePlayerRows();
  const careers = archiveCareers();
  const matches = archiveMatchList().filter(m => m.groups.length);
  const isBig = k => k === 'damage' || k === 'healing';

  // Spellings drift between wars ("pandatanga" / "Pandatanga"), so label every
  // record with the player's canonical name.
  const careerName = {};
  for (const c of careers) careerName[c.canon] = c.displayName;

  // One entry per player per category — otherwise a single outlier player can
  // occupy the whole top 5 with five different wars.
  const bestPerPlayer = key => {
    const best = {};
    for (const r of rows) {
      const cur = best[r.canon];
      if (!cur || r[key] > cur[key]) best[r.canon] = r;
    }
    return Object.values(best).sort((a, b) => b[key] - a[key]).slice(0, 5);
  };

  let singles = '';
  for (const rec of RECORD_STATS) {
    const top = bestPerPlayer(rec.key);
    const raenge = rankLabels(top, r => r[rec.key]);
    let items = '';
    top.forEach((r, i) => {
      items += `<tr>
        <td class="stats-rank rank-${raenge[i]}">${raenge[i]}</td>
        <td class="stats-who">${playerLinkHTML(r.canon, careerName[r.canon] || r.name)}<span class="stats-sub">${matchLinkHTML(r.slug, r.nwl, r.map)}</span></td>
        <td class="stats-num">${isBig(rec.key) ? fmt(r[rec.key]) : r[rec.key]}</td>
      </tr>`;
    });
    singles += `<div class="stats-card">
      <div class="stats-card-head">${rec.label}</div>
      <table class="stats-table"><tbody>${items}</tbody></table>
    </div>`;
  }

  let careerCards = '';
  for (const rec of CAREER_STATS) {
    const top = careers.slice().sort((a, b) => b[rec.key] - a[rec.key]).slice(0, 5);
    const raenge = rankLabels(top, c => c[rec.key]);
    let items = '';
    top.forEach((c, i) => {
      items += `<tr>
        <td class="stats-rank rank-${raenge[i]}">${raenge[i]}</td>
        <td class="stats-who">${playerLinkHTML(c.canon, c.displayName)}<span class="stats-sub">${c.matches} wars</span></td>
        <td class="stats-num">${isBig(rec.key) ? fmt(c[rec.key]) : c[rec.key]}</td>
      </tr>`;
    });
    careerCards += `<div class="stats-card">
      <div class="stats-card-head">${rec.label}</div>
      <table class="stats-table"><tbody>${items}</tbody></table>
    </div>`;
  }

  const withKills = matches.map(m => ({
    m,
    t1: (m.totals.team1 && m.totals.team1.kills) || 0,
    t2: (m.totals.team2 && m.totals.team2.kills) || 0,
  }));
  const matchRow = (x, val) => `<tr>
      <td class="stats-who">${matchLinkHTML(x.m.slug, x.m.nwlNumber, x.m.mapName)}<span class="stats-sub">${formatDate(x.m.date)}</span></td>
      <td class="stats-num">${val}</td>
    </tr>`;
  const byMargin = withKills.slice().sort((a, b) => Math.abs(b.t1 - b.t2) - Math.abs(a.t1 - a.t2));
  const byTotal = withKills.slice().sort((a, b) => (b.t1 + b.t2) - (a.t1 + a.t2));

  const matchCards = `
    <div class="stats-card">
      <div class="stats-card-head">Biggest Blowouts</div>
      <table class="stats-table"><tbody>
        ${byMargin.slice(0, 5).map(x => matchRow(x, x.t1 + ' : ' + x.t2)).join('')}
      </tbody></table>
    </div>
    <div class="stats-card">
      <div class="stats-card-head">Bloodiest Wars <span class="stats-card-note">combined kills</span></div>
      <table class="stats-table"><tbody>
        ${byTotal.slice(0, 5).map(x => matchRow(x, x.t1 + x.t2)).join('')}
      </tbody></table>
    </div>`;

  app.innerHTML = `<div class="wrap">
    ${statsPageHeader('League Records', 'All-time bests across ' + matches.length + ' wars with recorded stats')}
    <div class="stats-section-title">Single-War Records</div>
    <div class="stats-grid">${singles}</div>
    <div class="stats-section-title">Career Totals</div>
    <div class="stats-grid">${careerCards}</div>
    <div class="stats-section-title">Match Records</div>
    <div class="stats-grid">${matchCards}</div>
    <div class="page-footer">
      * Single-war records list each player only once, with their best war.<br>
      * Career totals count every recorded appearance, across all roles.<br>
      * Wars without captured player stats are excluded.
    </div>
  </div>`;
}

// ── 2. MVP LEADERBOARD ────────────────────────────────────────────────────

function renderMvpLeaderboardPage() {
  const src = sheetsData || _tierStaticData;
  const counts = computeMvpCounts((src && src.matchDetails) || {});
  const careers = {};
  for (const c of archiveCareers()) careers[c.canon] = c;

  // canon -> { total, perBucket: {bucket: n} }
  const byPlayer = {};
  for (const [bucket, players] of Object.entries(counts)) {
    for (const [canon, n] of Object.entries(players)) {
      let e = byPlayer[canon];
      if (!e) e = byPlayer[canon] = { canon, total: 0, perBucket: {} };
      e.total += n;
      e.perBucket[bucket] = (e.perBucket[bucket] || 0) + n;
    }
  }
  const list = Object.values(byPlayer).sort((a, b) => b.total - a.total || a.canon.localeCompare(b.canon));
  const totalMvps = list.reduce((a, e) => a + e.total, 0);

  const raenge = rankLabels(list, e => e.total);
  let rowsHTML = '';
  list.forEach((e, i) => {
    const career = careers[e.canon];
    const name = career ? career.displayName : e.canon;
    const wars = career ? career.matches : 0;
    const rate = wars ? Math.round((e.total / wars) * 100) : 0;
    const badges = Object.entries(e.perBucket)
      .sort((a, b) => b[1] - a[1])
      .map(([bucket, n]) => {
        const badge = tierBadgeOf(bucket);
        return `<span class="mvpl-role"><span class="role-badge ${roleBadgeClass(badge)}">${roleBadgeText(badge)}</span>${n}</span>`;
      }).join('');
    rowsHTML += `<tr>
      <td class="stats-rank rank-${raenge[i]}">${raenge[i]}</td>
      <td class="stats-who">${playerLinkHTML(e.canon, name)}</td>
      <td class="stats-num mvpl-total">${e.total}</td>
      <td class="mvpl-roles">${badges}</td>
      <td class="stats-num stats-dim">${wars}</td>
      <td class="stats-num stats-dim">${rate}%</td>
    </tr>`;
  });

  app.innerHTML = `<div class="wrap">
    ${statsPageHeader('MVP Leaderboard', 'How often each player topped their role in a war &middot; ' + totalMvps + ' MVP titles awarded')}
    <div class="stats-tablewrap">
      <table class="stats-table stats-table-wide">
        <thead><tr>
          <th class="stats-rank">#</th><th>Player</th><th class="stats-num">MVPs</th>
          <th>By Role</th><th class="stats-num">Wars</th><th class="stats-num">Rate</th>
        </tr></thead>
        <tbody>${rowsHTML || '<tr><td colspan="6" class="stats-empty">No data</td></tr>'}</tbody>
      </table>
    </div>
    <div class="page-footer">
      * An MVP title is awarded per role per war, using the same formula as the Role MVP panel on a match page.<br>
      * Only counted when at least ${MVP_MIN_CONTENDERS} players contested that role in the war, so the sole player of a rare role does not collect a free title.<br>
      * Rate = MVP titles divided by wars played.
    </div>
  </div>`;
}

// ── 3. MAP STATISTICS ─────────────────────────────────────────────────────

function renderMapStatsPage() {
  const matches = archiveMatchList().filter(m => m.winner);
  const byMap = {};
  let atkWins = 0, atkTotal = 0;

  for (const m of matches) {
    let e = byMap[m.mapName];
    if (!e) e = byMap[m.mapName] = { map: m.mapName, n: 0, t1: 0, t2: 0, k1: 0, k2: 0, atkWins: 0, atkKnown: 0 };
    e.n++;
    if (m.winner === 'team1') e.t1++; else if (m.winner === 'team2') e.t2++;
    e.k1 += (m.totals.team1 && m.totals.team1.kills) || 0;
    e.k2 += (m.totals.team2 && m.totals.team2.kills) || 0;
    if (m.attacker) {
      e.atkKnown++; atkTotal++;
      if (m.attacker === m.winner) { e.atkWins++; atkWins++; }
    }
  }

  const list = Object.values(byMap).sort((a, b) => b.n - a.n);
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

  let rowsHTML = '';
  for (const e of list) {
    const share1 = pct(e.t1, e.n);
    rowsHTML += `<tr>
      <td class="stats-who"><strong>${e.map}</strong></td>
      <td class="stats-num">${e.n}</td>
      <td class="stats-num map-t1">${e.t1}</td>
      <td class="stats-num map-t2">${e.t2}</td>
      <td class="map-barcell">
        <div class="map-bar" title="Beaverknights ${share1}% · Capyknights ${100 - share1}%">
          <div class="map-bar-t1" style="width:${share1}%"></div>
        </div>
        <span class="map-bar-lbl">${share1}% / ${100 - share1}%</span>
      </td>
      <td class="stats-num stats-dim">${Math.round(e.k1 / e.n)} : ${Math.round(e.k2 / e.n)}</td>
      <td class="stats-num">${e.atkKnown ? pct(e.atkWins, e.atkKnown) + '%' : '—'}</td>
    </tr>`;
  }

  const atkPct = pct(atkWins, atkTotal);

  app.innerHTML = `<div class="wrap">
    ${statsPageHeader('Map Statistics', 'Win rates and average scores per territory across ' + matches.length + ' wars')}
    <div class="stats-highlight">
      <div class="stats-highlight-val">${atkPct}%</div>
      <div class="stats-highlight-lbl">of all wars were won by the <strong>attacking</strong> side<br>
        <span class="stats-dim">${atkWins} of ${atkTotal} wars with a known attacker &middot; defenders took ${100 - atkPct}%</span></div>
    </div>
    <div class="stats-tablewrap">
      <table class="stats-table stats-table-wide">
        <thead><tr>
          <th>Map</th><th class="stats-num">Wars</th>
          <th class="stats-num map-t1">BK</th><th class="stats-num map-t2">CK</th>
          <th>Win Share</th>
          <th class="stats-num">Avg Kills</th>
          <th class="stats-num">Attacker Wins</th>
        </tr></thead>
        <tbody>${rowsHTML || '<tr><td colspan="7" class="stats-empty">No data</td></tr>'}</tbody>
      </table>
    </div>
    <div class="page-footer">
      * BK = Beaverknights (green) &middot; CK = Capyknights (purple).<br>
      * Avg Kills shows the average final score on that map, Beaverknights first.<br>
      * Attacker Wins = share of wars on that map won by whichever side attacked.
    </div>
  </div>`;
}

// ── 4. PLAYER COMPARISON ──────────────────────────────────────────────────

// Reihenfolge: erst was den Spieler beschreibt, dann die Durchschnitte pro
// War, dann die Summen. `gap` setzt eine feine Trennlinie ueber die Zeile und
// macht die drei Bloecke sichtbar, ohne eine zweite Tabelle zu brauchen.
const COMPARE_ROWS = [
  { key: 'matches', label: 'Wars played',  fmt: v => v,            higher: true },
  { key: 'winRate', label: 'Win rate',     fmt: v => Math.round(v * 100) + '%', higher: true },
  { key: 'kd',      label: 'K/D',          fmt: v => v.toFixed(2), higher: true },
  { key: 'kda',     label: 'KDA',          fmt: v => v.toFixed(2), higher: true },

  { key: 'avgKills',   label: 'Avg kills / war',   fmt: v => v.toFixed(1), higher: true, gap: true },
  { key: 'avgDeaths',  label: 'Avg deaths / war',  fmt: v => v.toFixed(1), higher: false },
  { key: 'avgAssists', label: 'Avg assists / war', fmt: v => v.toFixed(1), higher: true },
  { key: 'avgDamage',  label: 'Avg damage / war',  fmt: v => fmt(Math.round(v)), higher: true },
  { key: 'avgHealing', label: 'Avg healing / war', fmt: v => fmt(Math.round(v)), higher: true },

  { key: 'kills',   label: 'Total kills',   fmt: v => v,      higher: true, gap: true },
  { key: 'deaths',  label: 'Total deaths',  fmt: v => v,      higher: false },
  { key: 'assists', label: 'Total assists', fmt: v => v,      higher: true },
  { key: 'damage',  label: 'Total damage',  fmt: v => fmt(v), higher: true },
  { key: 'healing', label: 'Total healing', fmt: v => fmt(v), higher: true },

  { key: 'mvps',    label: 'MVP titles',   fmt: v => v,       higher: true, gap: true },
];

// Role filter per side. Kept in memory rather than in the URL so the two
// sides stay independent of the shareable player pair.
const _compareRole = { a: '', b: '' };
// Live query per side while its combobox is open.
const _compareSearch = { a: '', b: '' };

// Every role a player actually appears with, most-played first.
function compareRolesFor(canon) {
  const counts = {};
  for (const r of archivePlayerRows()) {
    if (r.canon !== canon) continue;
    counts[r.role] = (counts[r.role] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([role, n]) => ({ role, n }));
}

// Which role a freshly picked player starts on: the one they played most.
// Single-role players need no filter at all — their role is shown under the
// name instead.
function defaultCompareRole(canon) {
  if (!canon) return '';
  const roles = compareRolesFor(canon);
  return roles.length > 1 ? roles[0].role : '';
}

// MVP titles for a player, optionally restricted to one role. HL is split into
// two buckets internally, so an HL filter has to add both back together.
function compareMvpCount(canon, role) {
  const src = sheetsData || _tierStaticData;
  const counts = computeMvpCounts((src && src.matchDetails) || {});
  let total = 0;
  for (const [bucket, players] of Object.entries(counts)) {
    if (role) {
      const matchesRole = role === 'HL'
        ? (bucket === 'HL_zerg' || bucket === 'HL_ks')
        : bucket === role;
      if (!matchesRole) continue;
    }
    total += players[canon] || 0;
  }
  return total;
}

function compareStatsFor(canon, role) {
  const rows = archivePlayerRows().filter(r => r.canon === canon && (!role || r.role === role));
  if (!rows.length) return null;
  const names = new Set();
  let matches = 0, wins = 0, kills = 0, deaths = 0, assists = 0, healing = 0, damage = 0;
  for (const r of rows) {
    names.add(r.name);
    matches++;
    if (r.won) wins++;
    kills += r.kills; deaths += r.deaths; assists += r.assists;
    healing += r.healing; damage += r.damage;
  }
  const n = matches || 1;
  return {
    canon, matches, wins, kills, deaths, assists, healing, damage,
    displayName: findDisplayName(canon, names),
    kd: deaths > 0 ? kills / deaths : kills,
    // KDA wie im Spreadsheet: (Kills + Assists) / Deaths.
    kda: deaths > 0 ? (kills + assists) / deaths : (kills + assists),
    winRate: matches ? wins / matches : 0,
    avgKills: kills / n, avgDeaths: deaths / n, avgAssists: assists / n,
    avgDamage: damage / n, avgHealing: healing / n,
    mvps: compareMvpCount(canon, role),
  };
}

// One combobox per side: the text field IS the picker. Typing filters the list
// right underneath it, a click or Enter selects — there is no second dropdown
// left to operate afterwards.
const COMPARE_LIST_MAX = 60;

// Which player currently sits on which side. The URL stays the source of truth;
// this only lets us tell "same player" from "someone new" when resetting roles.
let _cmpCanonA = '';
let _cmpCanonB = '';

// Highlighted row per side, for arrow-key navigation.
const _compareHi = { a: 0, b: 0 };

function _cmpAllPlayers() {
  return archiveCareers()
    .slice()
    .sort((a, b) => b.matches - a.matches || a.displayName.localeCompare(b.displayName));
}

function _cmpAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _cmpSelected(side) {
  return side === 'a' ? _cmpCanonA : _cmpCanonB;
}

function _cmpCareer(canon) {
  return canon ? archiveCareers().find(c => c.canon === canon) : null;
}

function compareListHTML(side, selected) {
  const q = (_compareSearch[side] || '').toLowerCase().trim();
  const all = _cmpAllPlayers();
  const hits = (q
    ? all.filter(c => c.displayName.toLowerCase().includes(q) || c.canon.includes(q))
    : all).slice(0, COMPARE_LIST_MAX);
  if (!hits.length) return `<div class="cmp-empty">No player matches "${_cmpAttr(q)}"</div>`;
  if (_compareHi[side] >= hits.length) _compareHi[side] = 0;
  return hits.map((c, i) => `<div class="cmp-item${i === _compareHi[side] ? ' is-hi' : ''}${c.canon === selected ? ' is-sel' : ''}"
        data-canon="${_cmpAttr(c.canon)}" onmousedown="event.preventDefault()"
        onclick="onComparePick('${side}', this.dataset.canon)"
        onmouseenter="onCompareHover('${side}', ${i})">
      <span class="cmp-item-name">${c.displayName}</span><span class="cmp-item-n">${c.matches} wars</span>
    </div>`).join('');
}

// Roles as one-click chips instead of a dropdown — visible at a glance and
// only rendered for players who actually played more than one.
function compareRoleChips(side, canon, selected) {
  if (!canon) return '';
  const roles = compareRolesFor(canon);
  if (!roles.length) return '';
  // Nothing to filter for a one-role player — their role is shown under the
  // name instead, see roleNote() in renderComparePage.
  if (roles.length < 2) return '';
  const count = n => (n == null ? '' : `<span class="cmp-rolechip-n">${n}</span>`);
  // Same badge markup as everywhere else, so the role colors match the rest.
  const badge = role => `<span class="role-badge ${roleBadgeClass(role)}">${roleBadgeText(role)}</span>`;
  const chip = (val, inner, n) => `<button class="cmp-rolechip${val === selected ? ' is-on' : ''}"
      onclick="onCompareRolePick('${side}', '${val}')">${inner}${count(n)}</button>`;
  return `<div class="cmp-roles">
      ${chip('', '<span class="cmp-rolechip-all">All</span>', null)}${roles.map(r => chip(r.role, badge(r.role), r.n)).join('')}
    </div>`;
}

function comparePickerHTML(side, selected) {
  const cur = _cmpCareer(selected);
  return `<div class="compare-picker">
      <div class="cmp-combo">
        <input class="cmp-input" id="cmp-input-${side}" type="text" role="combobox"
               autocomplete="off" spellcheck="false" placeholder="Search a player..."
               value="${_cmpAttr(cur ? cur.displayName : '')}"
               oninput="onCompareSearch('${side}')" onfocus="onCompareFocus('${side}')"
               onblur="onCompareBlur('${side}')" onkeydown="onCompareKey('${side}', event)">
        ${cur
          ? `<button class="cmp-clear" title="Clear" onmousedown="event.preventDefault()" onclick="onCompareClear('${side}')">&times;</button>`
          : `<span class="cmp-caret">&#9662;</span>`}
        <div class="cmp-list" id="cmp-list-${side}" hidden></div>
      </div>
      ${compareRoleChips(side, selected, _compareRole[side])}
    </div>`;
}

function _cmpOpenList(side) {
  const list = document.getElementById('cmp-list-' + side);
  if (!list) return;
  list.innerHTML = compareListHTML(side, _cmpSelected(side));
  list.hidden = false;
  const hi = list.querySelector('.is-hi');
  if (hi) hi.scrollIntoView({ block: 'nearest' });
}

function onCompareFocus(side) {
  _compareSearch[side] = '';
  _compareHi[side] = 0;
  const input = document.getElementById('cmp-input-' + side);
  if (input) input.select();
  _cmpOpenList(side);
}

function onCompareSearch(side) {
  const input = document.getElementById('cmp-input-' + side);
  _compareSearch[side] = input ? input.value : '';
  _compareHi[side] = 0;
  _cmpOpenList(side);
}

function onCompareBlur(side) {
  const list = document.getElementById('cmp-list-' + side);
  if (list) list.hidden = true;
  // Drop a half-typed query so the field shows the actual selection again.
  const input = document.getElementById('cmp-input-' + side);
  const cur = _cmpCareer(_cmpSelected(side));
  if (input) input.value = cur ? cur.displayName : '';
  _compareSearch[side] = '';
}

function onCompareHover(side, i) {
  if (_compareHi[side] === i) return;
  _compareHi[side] = i;
  const list = document.getElementById('cmp-list-' + side);
  if (!list) return;
  list.querySelectorAll('.cmp-item').forEach((el, idx) => el.classList.toggle('is-hi', idx === i));
}

function onCompareKey(side, ev) {
  const list = document.getElementById('cmp-list-' + side);
  const open = list && !list.hidden;
  const items = open ? Array.from(list.querySelectorAll('.cmp-item')) : [];
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    if (!items.length) { _cmpOpenList(side); return; }
    const n = items.length;
    _compareHi[side] = (_compareHi[side] + (ev.key === 'ArrowDown' ? 1 : n - 1)) % n;
    _cmpOpenList(side);
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    const hit = items[_compareHi[side]];
    if (hit) onComparePick(side, hit.dataset.canon);
  } else if (ev.key === 'Escape') {
    const input = document.getElementById('cmp-input-' + side);
    if (input) input.blur();
  }
}

function onComparePick(side, canon) { _cmpApply(side, canon); }
function onCompareClear(side) { _cmpApply(side, ''); }

function _cmpApply(side, canon) {
  // A different player invalidates the role picked for the old one and
  // starts on their own most-played role.
  if (side === 'a') {
    if (canon !== _cmpCanonA) _compareRole.a = defaultCompareRole(canon);
    _cmpCanonA = canon;
  } else {
    if (canon !== _cmpCanonB) _compareRole.b = defaultCompareRole(canon);
    _cmpCanonB = canon;
  }
  _compareSearch[side] = '';
  _compareHi[side] = 0;
  // "-" keeps a single pick in the URL while the other side is still empty.
  const target = (!_cmpCanonA && !_cmpCanonB)
    ? '#/compare'
    : `#/compare/${_cmpCanonA ? encodePlayerForLink(_cmpCanonA) : '-'}/${_cmpCanonB ? encodePlayerForLink(_cmpCanonB) : '-'}`;
  if (window.location.hash === target) render();
  else navigate(target);
}

function onCompareRolePick(side, role) {
  _compareRole[side] = _compareRole[side] === role ? '' : role;
  render();
}

function renderComparePage(nameA, nameB) {
  // Reached via URL rather than the picker (deep link, back button) — same
  // starting role as a fresh pick.
  if ((nameA || '') !== _cmpCanonA) _compareRole.a = defaultCompareRole(nameA || '');
  if ((nameB || '') !== _cmpCanonB) _compareRole.b = defaultCompareRole(nameB || '');
  _cmpCanonA = nameA || '';
  _cmpCanonB = nameB || '';
  const A = nameA ? compareStatsFor(nameA, _compareRole.a) : null;
  const B = nameB ? compareStatsFor(nameB, _compareRole.b) : null;

  // Shows the picked role, or — for players who only ever played one — that
  // one role, so the heading always says what these numbers cover.
  const roleNote = (stats, side) => {
    let r = _compareRole[side];
    if (!r) {
      const roles = compareRolesFor(stats.canon);
      if (roles.length === 1) r = roles[0].role;
    }
    return r
      ? `<span class="compare-rolenote">as <span class="role-badge ${roleBadgeClass(r)}">${roleBadgeText(r)}</span></span>`
      : '';
  };

  let body = '';
  if (!A || !B) {
    body = `<div class="compare-hint">Pick two players to compare their career numbers side by side.</div>`;
  } else {
    let rows = '';
    for (const r of COMPARE_ROWS) {
      const va = A[r.key], vb = B[r.key];
      // Verglichen wird, was am Ende dasteht, nicht der Rohwert: 3.5769 und
      // 3.5797 erscheinen beide als "3.6". Einen davon gruen zu faerben wuerde
      // einen Unterschied behaupten, den auf dem Bildschirm niemand sieht.
      const fa = r.fmt(va), fb = r.fmt(vb);
      let clsA = 'cmp-tie', clsB = 'cmp-tie';
      if (fa !== fb) {
        const aWins = r.higher ? va > vb : va < vb;
        clsA = aWins ? 'cmp-win' : 'cmp-lose';
        clsB = aWins ? 'cmp-lose' : 'cmp-win';
      }
      rows += `<tr${r.gap ? ' class="cmp-gap"' : ''}>
        <td class="cmp-val ${clsA}">${fa}</td>
        <td class="cmp-label">${r.label}</td>
        <td class="cmp-val ${clsB}">${fb}</td>
      </tr>`;
    }
    body = `<div class="compare-heads">
        <div class="compare-head">${playerLinkHTML(A.canon, A.displayName)}${roleNote(A, 'a')}</div>
        <div class="compare-vs">vs</div>
        <div class="compare-head">${playerLinkHTML(B.canon, B.displayName)}${roleNote(B, 'b')}</div>
      </div>
      <table class="compare-table"><tbody>${rows}</tbody></table>`;
  }

  app.innerHTML = `<div class="wrap">
    ${statsPageHeader('Compare Players', 'Career numbers head to head')}
    <div class="compare-pickers">
      ${comparePickerHTML('a', nameA || '')}
      <span class="compare-pickers-vs">vs</span>
      ${comparePickerHTML('b', nameB || '')}
    </div>
    ${body}
    <div class="page-footer">
      * Players who filled more than one role start on their most-played one.
        Tap another chip to switch, or All to add every role together.<br>
      * The small number is how many wars that player (or that role) appears in.<br>
      * Green marks the better value; for deaths, lower is better.
        Rows where both sides show the same number are left unmarked.
    </div>
  </div>`;
}

// -- Abschiedsfilm ---------------------------------------------------------
// Das Video liegt als Datei im Projekt, nicht bei einem Videodienst. Sonst
// haenge die Seite an einem fremden Anbieter, der sie ueberdauern muesste -
// und genau das soll sie ja nicht.
function renderFarewellPage() {
  app.innerHTML = `<div class="wrap">
    ${statsPageHeader('Farewell', 'Seven months of the Beaverknights New World League')}
    <div class="film">
      <video class="film-video" controls preload="metadata" playsinline
             poster="media/farewell-poster.jpg">
        <source src="media/farewell.mp4" type="video/mp4">
        Your browser cannot play this video.
        <a href="media/farewell.mp4">Download it instead.</a>
      </video>
    </div>
    <div class="page-footer">
      * Every number in the film is taken from the data on this site.<br>
      * Best watched full screen with the sound on.
    </div>
  </div>`;
  window.scrollTo(0, 0);
}

// -- Wartungsmodus-Overlay --
// Liegt als eigenes Element auf <body>, nicht in #app — so ueberlebt es jedes
// Re-Render der Seite darunter.
function initMaintenanceOverlay() {
  if (!MAINTENANCE_MODE) return;
  if (hasPreviewAccess()) return;

  app.classList.add('maint-blurred');

  const ov = document.createElement('div');
  ov.className = 'maint-overlay';
  ov.innerHTML = `
    <div class="maint-card">
      <div class="maint-eyebrow">New World League</div>
      <h1 class="maint-title">Under Maintenance</h1>
      <p class="maint-text">
        The NWL Scoreboard is getting one last big update before it goes silent
        for good. The update should be done tomorrow, 07.09.2026, at around
        12:00 CEST.
      </p>
      <div class="maint-countdown" id="maint-countdown"></div>
      <p class="maint-joke">
        (Estimate given in Aeternum Standard Time, where a 30-minute maintenance
        window has historically lasted until dinner. If the timer hits zero and
        nothing has changed &mdash; that is not a bug, that is tradition.)
      </p>
    </div>`;
  document.body.appendChild(ov);

  const out = ov.querySelector('#maint-countdown');
  const cell = (v, l) =>
    `<div class="maint-cd-cell"><span class="maint-cd-val">${String(v).padStart(2, '0')}</span>` +
    `<span class="maint-cd-lbl">${l}</span></div>`;

  const tick = () => {
    // Gegen die Systemzeit des Besuchers, nicht gegen eine Serverzeit.
    const ms = MAINTENANCE_TARGET.getTime() - Date.now();
    if (ms <= 0) {
      out.innerHTML = '<div class="maint-soon">Any moment now&hellip;</div>';
      return;
    }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor(ms / 3600000) % 24;
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    out.innerHTML = (d > 0 ? cell(d, d === 1 ? 'Day' : 'Days') : '')
      + cell(h, 'Hours') + cell(m, 'Minutes') + cell(s, 'Seconds');
  };
  tick();
  setInterval(tick, 1000);
}

// -- Tribute-Overlay --
// Faehrt beim Betreten der Seite hoch und laesst sich nur ueber den
// Dankes-Button schliessen — kein Wegklicken daneben, kein Escape.
const TRIBUTE_MODE = true;
// Zaehler ueberlebt den Tab, das "schon gesehen" nicht — so nervt das Fenster
// beim Herumklicken nicht, begruesst aber jeden neuen Besuch.
const TRIBUTE_COUNT_KEY = 'nwl_respects_paid';
const TRIBUTE_SEEN_KEY = 'nwl_tribute_seen';
// Der Zaehler bleibt verborgen, solange er klein ist: eine einstellige Zahl
// unter einem Dankeschoen sieht nach Desinteresse aus, obwohl sie nur heisst,
// dass noch kaum jemand da war. Ab hier wird er eingeblendet.
const TRIBUTE_COUNT_MIN = 100;

function readRespects() {
  try {
    const n = parseInt(localStorage.getItem(TRIBUTE_COUNT_KEY) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
}

function writeRespects(n) {
  try { localStorage.setItem(TRIBUTE_COUNT_KEY, String(n)); } catch {}
}

// Der geteilte Zaehler liegt hinter /api/thanks. Antwortet er nicht (kein
// Store eingerichtet, Dienst weg, offline), liefern beide Funktionen null und
// das Fenster bleibt beim lokalen Zaehler — sichtbar aendert sich dann nichts.
async function fetchThanksTotal() {
  try {
    const r = await fetch('api/thanks', { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.ok && typeof d.count === 'number' ? d.count : null;
  } catch { return null; }
}

async function sendThanks() {
  try {
    const r = await fetch('api/thanks', { method: 'POST', cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.ok && typeof d.count === 'number' ? d : null;
  } catch { return null; }
}

function initTributeOverlay() {
  if (!TRIBUTE_MODE) return;
  const params = new URLSearchParams(location.search);
  if (params.has('nof')) return;
  // Nur ein blockierendes Fenster gleichzeitig — der Wartungsmodus gewinnt.
  if (MAINTENANCE_MODE && !hasPreviewAccess()) return;
  try { if (sessionStorage.getItem(TRIBUTE_SEEN_KEY) === '1') return; } catch {}

  app.classList.add('maint-blurred');

  let count = readRespects();
  const ov = document.createElement('div');
  ov.className = 'maint-overlay tribute-overlay';
  ov.innerHTML = `
    <div class="maint-card tribute-card">
      <div class="maint-eyebrow">Beaverknights New World League</div>
      <h1 class="maint-title tribute-title">Thank You Irvine!!!</h1>
      <p class="maint-text">
        Thank you, Irvine, for taking on the enormous amount of time and work it
        took to organise the Beaverknights New World League for us. We all know
        how the New World community can get: toxic players, egos,
        ragequitters, drama, ragebait and everything in between.
      </p>
      <p class="maint-text">
        Next to every other project out there, the Beavers NWL stood out like no
        other, and for all the right reasons. What made it unique was how the
        community treated each other. Sure, there was rivalry, and there was
        trash talk after a war. But next to what other leagues and
        companies put each other through, it never came close. People kept
        showing up for one another, week after week.
        Everyone who wanted to play got a fair shot. So many wars stayed close
        and tense down to the final seconds. And that is exactly why we love
        this game (and hate it).
      </p>
      <button class="tribute-btn" id="tribute-btn" type="button">Thank you, Irvine</button>
      <div class="tribute-count" id="tribute-countbox"${count > TRIBUTE_COUNT_MIN ? '' : ' hidden'}>
        <span class="tribute-count-val" id="tribute-count">${fmtFull(count)}</span>
        <span class="tribute-count-lbl">Thank yous sent</span>
      </div>
      <p class="maint-joke tribute-note">
        The Corruption needs no force, only a grasping hand. It found one in
        the halls of Amazon: a hunger with no bottom, that sold the isle
        stone by stone and called the ruin profit. The game is dead. I watched
        it die.<br><br>
        But a record does not die so easily. Let this be set down: when the
        servers go dark in February of 2027, these pages remain. Every war
        fought here stays written, long after the last of us has stopped
        rising.
        <span class="tribute-sig">final page of a Beaverknight&rsquo;s
        journal, recovered at Windsward</span>
      </p>
    </div>`;
  document.body.appendChild(ov);

  const btn = ov.querySelector('#tribute-btn');
  const out = ov.querySelector('#tribute-count');
  const countBox = ov.querySelector('#tribute-countbox');

  // Zahl und Sichtbarkeit haengen zusammen und werden nur hier gesetzt.
  const zeigeStand = () => {
    out.textContent = fmtFull(count);
    countBox.hidden = count <= TRIBUTE_COUNT_MIN;
  };
  let dismissing = false;
  // Solange der Server nicht geantwortet hat, steht der lokale Stand da.
  let remote = false;

  fetchThanksTotal().then(n => {
    if (n === null) return;
    remote = true;
    count = n;
    zeigeStand();
  });

  btn.addEventListener('click', () => {
    // Sofort hochzaehlen, damit der Klick spuerbar ankommt; der Serverwert
    // korrigiert die Zahl gleich darauf, falls er abweicht.
    count++;
    if (!remote) writeRespects(count);
    zeigeStand();

    sendThanks().then(d => {
      if (!d) return;
      remote = true;
      count = d.count;
      zeigeStand();
    });
    // Zahl kurz anstossen, damit der Klick sichtbar ankommt.
    out.classList.remove('bumped');
    void out.offsetWidth;
    out.classList.add('bumped');

    if (dismissing) return;
    dismissing = true;
    // Kurz offen lassen, damit man den Zaehler klettern sieht (und ruhig noch
    // einmal draufklicken kann), bevor das Fenster geht.
    setTimeout(() => {
      try { sessionStorage.setItem(TRIBUTE_SEEN_KEY, '1'); } catch {}
      ov.classList.add('dismissed');
      app.classList.remove('maint-blurred');
      setTimeout(() => ov.remove(), 420);
    }, 1000);
  });
}

// -- Initial render --
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    render();
    initMaintenanceOverlay();
    initTributeOverlay();
  });
} else {
  render();
  initMaintenanceOverlay();
  initTributeOverlay();
}
