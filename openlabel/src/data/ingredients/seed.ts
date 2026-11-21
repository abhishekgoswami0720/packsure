/**
 * The seed ingredient knowledge base shipped inside the app.
 *
 * Everything here is bundled so OpenLabel works fully offline on first launch.
 * The data is intentionally curated for the Indian packaged-food shelf: the
 * sweeteners, colours, preservatives and oils you actually meet on a label.
 *
 * Summaries are written for a layperson and kept high-level; references point
 * at the relevant regulator or encyclopaedia entry rather than a specific study,
 * so links stay stable over time.
 */
import { Ingredient, Region, RegionRegulation } from '@/domain/ingredients/types';
import { INS_REGISTRY } from './registry';
import { FOOD_REGISTRY } from './foods';

const efsa = { label: 'EFSA — additive evaluations', url: 'https://www.efsa.europa.eu/en/topics/topic/food-additives' };
const fssai = { label: 'FSSAI — food standards', url: 'https://www.fssai.gov.in/' };
const fda = { label: 'US FDA — food additives', url: 'https://www.fda.gov/food/food-additives-petitions' };
const wiki = (slug: string, name: string) => ({ label: `Wikipedia — ${name}`, url: `https://en.wikipedia.org/wiki/${slug}` });

const DOSSIERS: Ingredient[] = [
  // ── Artificial sweeteners ────────────────────────────────────────────────
  {
    id: 'aspartame',
    name: 'Aspartame',
    category: 'artificial_sweetener',
    riskLevel: 'high',
    purpose: 'A low-calorie sweetener roughly 200× sweeter than sugar, used in diet drinks and sugar-free foods.',
    eNumber: '951',
    insNumber: '951',
    aliases: ['aspartame', 'nutrasweet', 'equal', 'canderel'],
    regulatoryStatus: 'Permitted in India, the EU and the US within daily-intake limits.',
    countriesRestricted: [],
    scientificSummary:
      'In 2023 the WHO’s cancer agency (IARC) classified aspartame as "possibly carcinogenic to humans", while JECFA kept the acceptable daily intake unchanged. People with the rare condition phenylketonuria must avoid it.',
    references: [wiki('Aspartame', 'Aspartame'), efsa],
    scorePenalty: 16,
  },
  {
    id: 'acesulfame-k',
    name: 'Acesulfame potassium',
    category: 'artificial_sweetener',
    riskLevel: 'moderate',
    purpose: 'A heat-stable artificial sweetener, often blended with aspartame or sucralose to round out taste.',
    eNumber: '950',
    insNumber: '950',
    aliases: ['acesulfame k', 'acesulfame potassium', 'ace k', 'acesulphame'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Generally regarded as safe by regulators at normal intakes. Some animal studies have raised questions about long-term effects, but human evidence of harm is limited.',
    references: [wiki('Acesulfame_potassium', 'Acesulfame potassium'), efsa],
  },
  {
    id: 'sucralose',
    name: 'Sucralose',
    category: 'artificial_sweetener',
    riskLevel: 'moderate',
    purpose: 'A no-calorie sweetener made from sugar, common in "diet" and "zero" products.',
    eNumber: '955',
    insNumber: '955',
    aliases: ['sucralose', 'splenda'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Long considered inert, but recent research suggests heating sucralose (e.g. in baked goods) may form undesirable compounds, and effects on gut bacteria are debated.',
    references: [wiki('Sucralose', 'Sucralose'), efsa],
  },
  {
    id: 'saccharin',
    name: 'Saccharin',
    category: 'artificial_sweetener',
    riskLevel: 'moderate',
    purpose: 'One of the oldest artificial sweeteners, intensely sweet with a slight metallic aftertaste.',
    eNumber: '954',
    insNumber: '954',
    aliases: ['saccharin', 'sodium saccharin', 'sweetex'],
    regulatoryStatus: 'Permitted; an earlier US cancer warning was withdrawn in 2000.',
    countriesRestricted: [],
    scientificSummary:
      'A bladder-cancer signal in 1970s rat studies turned out to be specific to rats and not relevant to humans. Now considered safe by major regulators.',
    references: [wiki('Saccharin', 'Saccharin'), fda],
  },

  // ── Flavour enhancers ────────────────────────────────────────────────────
  {
    id: 'msg',
    name: 'Monosodium glutamate',
    category: 'flavour_enhancer',
    riskLevel: 'moderate',
    purpose: 'Adds a savoury "umami" taste; widespread in snacks, noodles and seasoning mixes.',
    eNumber: '621',
    insNumber: '621',
    aliases: ['msg', 'monosodium glutamate', 'ajinomoto', 'sodium glutamate', 'china salt'],
    regulatoryStatus: 'Permitted; FSSAI requires a label declaration and it cannot be added to foods for infants.',
    countriesRestricted: [],
    scientificSummary:
      'Classified as generally safe. A minority of people report short-term symptoms ("MSG sensitivity") after large doses, but controlled trials have not reliably reproduced this.',
    references: [wiki('Monosodium_glutamate', 'Monosodium glutamate'), fssai],
  },
  {
    id: 'disodium-inosinate',
    name: 'Disodium inosinate',
    category: 'flavour_enhancer',
    riskLevel: 'low',
    purpose: 'A flavour booster almost always paired with MSG to amplify savouriness.',
    eNumber: '631',
    insNumber: '631',
    aliases: ['disodium inosinate', 'sodium inosinate'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Considered safe in food amounts. Often derived from meat or fish, which is relevant for strict vegetarians. People with gout may prefer to limit purine-rich additives.',
    references: [wiki('Disodium_inosinate', 'Disodium inosinate'), efsa],
  },
  {
    id: 'disodium-guanylate',
    name: 'Disodium guanylate',
    category: 'flavour_enhancer',
    riskLevel: 'low',
    purpose: 'A flavour enhancer used together with MSG and inosinate for a rounder savoury taste.',
    eNumber: '627',
    insNumber: '627',
    aliases: ['disodium guanylate', 'sodium guanylate'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Generally recognised as safe in normal food use. Like inosinate it is purine-based, which gout sufferers may wish to note.',
    references: [wiki('Disodium_guanylate', 'Disodium guanylate'), efsa],
  },

  // ── Artificial colours ───────────────────────────────────────────────────
  {
    id: 'tartrazine',
    name: 'Tartrazine',
    category: 'artificial_color',
    riskLevel: 'high',
    purpose: 'A bright lemon-yellow synthetic dye used in soft drinks, sweets and savoury snacks.',
    eNumber: '102',
    insNumber: '102',
    aliases: ['tartrazine', 'yellow 5', 'fd c yellow 5', 'ci 19140'],
    regulatoryStatus: 'Permitted in India and the EU; EU products carry a hyperactivity warning label.',
    countriesRestricted: ['European Union (warning label required)'],
    scientificSummary:
      'Linked in the Southampton study to increased hyperactivity in some children, which is why EU labels must warn about it. May trigger reactions in a small number of aspirin-sensitive people.',
    references: [wiki('Tartrazine', 'Tartrazine'), efsa],
  },
  {
    id: 'sunset-yellow',
    name: 'Sunset Yellow FCF',
    category: 'artificial_color',
    riskLevel: 'high',
    purpose: 'An orange-yellow dye used in squashes, jellies, snacks and confectionery.',
    eNumber: '110',
    insNumber: '110',
    aliases: ['sunset yellow', 'sunset yellow fcf', 'yellow 6', 'ci 15985', 'orange yellow s'],
    regulatoryStatus: 'Permitted in India and the EU; EU products carry a hyperactivity warning label.',
    countriesRestricted: ['European Union (warning label required)'],
    scientificSummary:
      'One of the Southampton "Southampton Six" colours associated with hyperactivity in some children. EFSA has reviewed and tightened its acceptable intake over time.',
    references: [wiki('Sunset_Yellow_FCF', 'Sunset Yellow FCF'), efsa],
  },
  {
    id: 'allura-red',
    name: 'Allura Red AC',
    category: 'artificial_color',
    riskLevel: 'high',
    purpose: 'A red dye used in drinks, sweets, sauces and baked goods.',
    eNumber: '129',
    insNumber: '129',
    aliases: ['allura red', 'allura red ac', 'red 40', 'fd c red 40', 'ci 16035'],
    regulatoryStatus: 'Permitted in India, the EU and the US; EU products carry a hyperactivity warning.',
    countriesRestricted: ['European Union (warning label required)'],
    scientificSummary:
      'Another Southampton colour linked to hyperactivity in sensitive children. Some recent animal research has explored effects on gut inflammation; human evidence is still developing.',
    references: [wiki('Allura_Red_AC', 'Allura Red AC'), efsa],
  },
  {
    id: 'carmoisine',
    name: 'Carmoisine',
    category: 'artificial_color',
    riskLevel: 'moderate',
    purpose: 'A red-to-maroon dye used in jams, sweets and beverages.',
    eNumber: '122',
    insNumber: '122',
    aliases: ['carmoisine', 'azorubine', 'ci 14720'],
    regulatoryStatus: 'Permitted in India and the EU; banned in some countries. EU warning label applies.',
    countriesRestricted: ['United States', 'Japan', 'Norway'],
    scientificSummary:
      'An azo dye in the Southampton group associated with hyperactivity. It is not approved for food use in the United States.',
    references: [wiki('Azorubine', 'Carmoisine (Azorubine)'), efsa],
  },
  {
    id: 'ponceau-4r',
    name: 'Ponceau 4R',
    category: 'artificial_color',
    riskLevel: 'moderate',
    purpose: 'A strawberry-red dye used in desserts, drinks and tinned fruit.',
    eNumber: '124',
    insNumber: '124',
    aliases: ['ponceau 4r', 'cochineal red a', 'ci 16255'],
    regulatoryStatus: 'Permitted in India and the EU; not approved in the US.',
    countriesRestricted: ['United States', 'Norway'],
    scientificSummary:
      'A Southampton azo dye linked to hyperactivity in some children and disallowed for food in the United States.',
    references: [wiki('Ponceau_4R', 'Ponceau 4R'), efsa],
  },
  {
    id: 'brilliant-blue',
    name: 'Brilliant Blue FCF',
    category: 'artificial_color',
    riskLevel: 'low',
    purpose: 'A bright blue dye used in drinks, ice creams and sweets, often to make greens.',
    eNumber: '133',
    insNumber: '133',
    aliases: ['brilliant blue', 'brilliant blue fcf', 'blue 1', 'ci 42090'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Considered low-risk at normal intakes by current regulators. Poorly absorbed by the body; allergic reactions are rare.',
    references: [wiki('Brilliant_Blue_FCF', 'Brilliant Blue FCF'), efsa],
  },

  // ── Preservatives ────────────────────────────────────────────────────────
  {
    id: 'sodium-benzoate',
    name: 'Sodium benzoate',
    category: 'preservative',
    riskLevel: 'moderate',
    purpose: 'Stops mould and yeast growing in acidic foods like soft drinks, pickles and sauces.',
    eNumber: '211',
    insNumber: '211',
    aliases: ['sodium benzoate', 'benzoate of soda'],
    regulatoryStatus: 'Permitted in India, the EU and the US within limits.',
    countriesRestricted: [],
    scientificSummary:
      'Safe on its own, but when combined with vitamin C (ascorbic acid) it can form small amounts of benzene, a carcinogen. Manufacturers now control this, but the two are worth noting together.',
    references: [wiki('Sodium_benzoate', 'Sodium benzoate'), efsa],
  },
  {
    id: 'potassium-sorbate',
    name: 'Potassium sorbate',
    category: 'preservative',
    riskLevel: 'low',
    purpose: 'A mild preservative against mould and yeast in cheese, baked goods and drinks.',
    eNumber: '202',
    insNumber: '202',
    aliases: ['potassium sorbate', 'sorbate'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Widely regarded as one of the safer preservatives. Breaks down in the body much like a fatty acid; reactions are uncommon.',
    references: [wiki('Potassium_sorbate', 'Potassium sorbate'), efsa],
  },
  {
    id: 'sodium-nitrite',
    name: 'Sodium nitrite',
    category: 'preservative',
    riskLevel: 'high',
    purpose: 'Cures and preserves processed meats (ham, sausages, bacon) and keeps their pink colour.',
    eNumber: '250',
    insNumber: '250',
    aliases: ['sodium nitrite', 'nitrite'],
    regulatoryStatus: 'Permitted only in specific cured-meat products within strict limits.',
    countriesRestricted: [],
    scientificSummary:
      'Under high heat or in the stomach, nitrites can form nitrosamines, which are linked to bowel cancer. Processed meats are classified by the WHO (IARC) as carcinogenic to humans.',
    references: [wiki('Sodium_nitrite', 'Sodium nitrite'), efsa],
    scorePenalty: 14,
  },
  {
    id: 'sulphur-dioxide',
    name: 'Sulphur dioxide',
    category: 'preservative',
    riskLevel: 'moderate',
    purpose: 'A preservative and antioxidant in dried fruit, wine, juices and some pickles.',
    eNumber: '220',
    insNumber: '220',
    aliases: ['sulphur dioxide', 'sulfur dioxide', 'sulphites', 'sulfites', 'so2'],
    regulatoryStatus: 'Permitted; must be declared as it is a recognised allergen.',
    countriesRestricted: [],
    scientificSummary:
      'Sulphites can trigger asthma attacks and breathing problems in sensitive people, which is why they must always be declared on the label.',
    references: [wiki('Sulfur_dioxide', 'Sulphur dioxide'), efsa],
  },

  // ── Antioxidants ─────────────────────────────────────────────────────────
  {
    id: 'bha',
    name: 'Butylated hydroxyanisole (BHA)',
    category: 'antioxidant',
    riskLevel: 'high',
    purpose: 'Keeps fats and oils from going rancid in snacks, instant noodles and chewing gum.',
    eNumber: '320',
    insNumber: '320',
    aliases: ['bha', 'butylated hydroxyanisole'],
    regulatoryStatus: 'Permitted within limits in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Listed by the US National Toxicology Program as "reasonably anticipated to be a human carcinogen" based on animal studies. Human risk at food levels is debated but it draws caution.',
    references: [wiki('Butylated_hydroxyanisole', 'BHA'), fda],
    scorePenalty: 12,
  },
  {
    id: 'bht',
    name: 'Butylated hydroxytoluene (BHT)',
    category: 'antioxidant',
    riskLevel: 'moderate',
    purpose: 'An antioxidant that protects fats in cereals, snacks and packaging.',
    eNumber: '321',
    insNumber: '321',
    aliases: ['bht', 'butylated hydroxytoluene'],
    regulatoryStatus: 'Permitted within limits in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Animal studies show mixed results — some protective, some harmful — at high doses. Regulators consider it acceptable in the small amounts used in food.',
    references: [wiki('Butylated_hydroxytoluene', 'BHT'), efsa],
  },
  {
    id: 'tbhq',
    name: 'Tertiary butylhydroquinone (TBHQ)',
    category: 'antioxidant',
    riskLevel: 'moderate',
    purpose: 'Extends the shelf life of fried foods, instant noodles and biscuits.',
    eNumber: '319',
    insNumber: '319',
    aliases: ['tbhq', 'tertiary butylhydroquinone', 'tert butylhydroquinone'],
    regulatoryStatus: 'Permitted within strict limits in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Considered safe by regulators at the low permitted levels. Very high doses in animals caused harm, and some research is exploring effects on the immune system.',
    references: [wiki('Tert-Butylhydroquinone', 'TBHQ'), fda],
  },

  // ── Emulsifiers & stabilisers ────────────────────────────────────────────
  {
    id: 'soy-lecithin',
    name: 'Soy lecithin',
    category: 'emulsifier',
    riskLevel: 'low',
    purpose: 'A natural emulsifier from soybeans that keeps chocolate and spreads smooth.',
    eNumber: '322',
    insNumber: '322',
    aliases: ['soy lecithin', 'soya lecithin', 'lecithin'],
    regulatoryStatus: 'Permitted; declared because soy is an allergen.',
    countriesRestricted: [],
    scientificSummary:
      'Generally considered safe and even a source of choline. The main caution is soy allergy. Often derived from genetically-modified soy.',
    references: [wiki('Lecithin', 'Lecithin'), efsa],
  },
  {
    id: 'mono-diglycerides',
    name: 'Mono- and diglycerides',
    category: 'emulsifier',
    riskLevel: 'moderate',
    purpose: 'Emulsifiers that improve texture in breads, margarine, ice cream and baked goods.',
    eNumber: '471',
    insNumber: '471',
    aliases: ['mono and diglycerides', 'monoglycerides', 'diglycerides', 'glycerides of fatty acids'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Safe as an additive, but they are a form of processed fat and can contain small amounts of trans fats that do not have to be declared separately.',
    references: [wiki('Mono-_and_diglycerides_of_fatty_acids', 'Mono- and diglycerides'), efsa],
  },
  {
    id: 'carrageenan',
    name: 'Carrageenan',
    category: 'stabiliser',
    riskLevel: 'moderate',
    purpose: 'A seaweed-derived thickener in dairy, plant milks, jellies and processed meats.',
    eNumber: '407',
    insNumber: '407',
    aliases: ['carrageenan', 'carrageenin'],
    regulatoryStatus: 'Permitted; not allowed in infant formula in the EU.',
    countriesRestricted: ['European Union (banned in infant formula)'],
    scientificSummary:
      'Food-grade carrageenan is approved, but a degraded form ("poligeenan") is a known irritant, and some research links carrageenan to gut inflammation. Evidence in humans is not settled.',
    references: [wiki('Carrageenan', 'Carrageenan'), efsa],
  },
  {
    id: 'xanthan-gum',
    name: 'Xanthan gum',
    category: 'stabiliser',
    riskLevel: 'low',
    purpose: 'A fermentation-derived thickener used in sauces, dressings and gluten-free baking.',
    eNumber: '415',
    insNumber: '415',
    aliases: ['xanthan gum', 'xanthan'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Considered safe and acts as soluble fibre. Very large amounts can have a laxative effect, but normal food levels are well tolerated.',
    references: [wiki('Xanthan_gum', 'Xanthan gum'), efsa],
  },

  // ── Acidity regulators & raising agents ──────────────────────────────────
  {
    id: 'citric-acid',
    name: 'Citric acid',
    category: 'acidity_regulator',
    riskLevel: 'low',
    purpose: 'Adds tartness and controls acidity in drinks, sweets and preserved foods.',
    eNumber: '330',
    insNumber: '330',
    aliases: ['citric acid'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Naturally found in citrus fruit and widely regarded as safe. Most commercial citric acid is made by fermenting a mould, which rarely causes sensitivity.',
    references: [wiki('Citric_acid', 'Citric acid'), efsa],
  },
  {
    id: 'sodium-bicarbonate',
    name: 'Sodium bicarbonate',
    category: 'raising_agent',
    riskLevel: 'low',
    purpose: 'Baking soda — releases gas to make biscuits, cakes and breads rise.',
    eNumber: '500',
    insNumber: '500',
    aliases: ['sodium bicarbonate', 'baking soda', 'bicarbonate of soda', 'sodium hydrogen carbonate'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'A common, safe leavening agent. Its main nutritional note is that it adds sodium, which matters for people watching salt intake.',
    references: [wiki('Sodium_bicarbonate', 'Sodium bicarbonate'), efsa],
  },

  // ── Oils, sugars & fats ──────────────────────────────────────────────────
  {
    id: 'palm-oil',
    name: 'Palm oil',
    category: 'refined_oil',
    riskLevel: 'moderate',
    purpose: 'A cheap, shelf-stable vegetable oil used across biscuits, snacks and spreads.',
    aliases: ['palm oil', 'palmolein', 'palm olein', 'edible vegetable oil palm', 'rbd palmolein'],
    regulatoryStatus: 'Permitted; a common edible oil.',
    countriesRestricted: [],
    scientificSummary:
      'High in saturated fat, which in excess is linked to raised cholesterol. Refining at high heat can also form some process contaminants. Fine occasionally; a concern when it is everywhere in a diet.',
    references: [wiki('Palm_oil', 'Palm oil')],
  },
  {
    id: 'partially-hydrogenated-oil',
    name: 'Partially hydrogenated oil',
    category: 'trans_fat',
    riskLevel: 'high',
    purpose: 'A solidified oil historically used in vanaspati, bakery fats and fried snacks.',
    aliases: ['partially hydrogenated oil', 'partially hydrogenated vegetable oil', 'vanaspati', 'hydrogenated vegetable oil', 'hydrogenated fat'],
    regulatoryStatus: 'Industrial trans fat is being phased out; FSSAI caps it at 2% of fats.',
    countriesRestricted: ['United States (industrial trans fat banned)', 'European Union (capped)'],
    scientificSummary:
      'The main dietary source of artificial trans fat, which clearly raises heart-disease risk by increasing bad cholesterol and lowering good cholesterol. The WHO has called for its global elimination.',
    references: [wiki('Trans_fat', 'Trans fat'), fssai],
  },
  {
    id: 'high-fructose-corn-syrup',
    name: 'High-fructose corn syrup',
    category: 'added_sugar',
    riskLevel: 'moderate',
    purpose: 'A cheap liquid sweetener used in soft drinks, sauces and confectionery.',
    aliases: ['high fructose corn syrup', 'hfcs', 'glucose fructose syrup', 'fructose syrup', 'isoglucose'],
    regulatoryStatus: 'Permitted; a form of added sugar.',
    countriesRestricted: [],
    scientificSummary:
      'Nutritionally similar to table sugar but very easy to over-consume in drinks. High added-sugar intake is linked to weight gain, type-2 diabetes and fatty liver.',
    references: [wiki('High-fructose_corn_syrup', 'High-fructose corn syrup')],
  },
  {
    id: 'maltodextrin',
    name: 'Maltodextrin',
    category: 'added_sugar',
    riskLevel: 'moderate',
    purpose: 'A highly processed starch used as a filler, thickener and sweetener carrier.',
    aliases: ['maltodextrin'],
    regulatoryStatus: 'Permitted in India, the EU and the US.',
    countriesRestricted: [],
    scientificSummary:
      'Despite not tasting sweet, it has a very high glycaemic index — it can spike blood sugar faster than table sugar. Some research links it to changes in gut bacteria.',
    references: [wiki('Maltodextrin', 'Maltodextrin')],
  },
  {
    id: 'invert-sugar',
    name: 'Invert sugar syrup',
    category: 'added_sugar',
    riskLevel: 'low',
    purpose: 'A liquid sugar used in confectionery and baking to keep products moist.',
    aliases: ['invert sugar', 'invert syrup', 'inverted sugar syrup'],
    regulatoryStatus: 'Permitted; a form of added sugar.',
    countriesRestricted: [],
    scientificSummary:
      'Chemically just glucose and fructose, i.e. plain added sugar. The usual sugar cautions apply: it counts toward daily added-sugar limits.',
    references: [wiki('Inverted_sugar_syrup', 'Invert sugar syrup')],
  },
  {
    id: 'sugar',
    name: 'Sugar',
    category: 'added_sugar',
    riskLevel: 'moderate',
    purpose: 'Common table sugar added to sweeten food and drink — the most frequent added sugar on labels.',
    aliases: [
      'sucrose',
      'cane sugar',
      'refined sugar',
      'white sugar',
      'brown sugar',
      'caster sugar',
      'icing sugar',
      'powdered sugar',
      'sugar syrup',
      'liquid sugar',
      'demerara sugar',
      'dextrose',
      'glucose',
      'glucose syrup',
      'fructose',
    ],
    regulatoryStatus: 'Permitted everywhere; counts toward added-sugar intake.',
    countriesRestricted: [],
    scientificSummary:
      'Added sugar delivers calories with no nutrients. Regularly consuming a lot is linked to weight gain, tooth decay, type-2 diabetes and heart disease. The WHO suggests keeping added sugar under about 10% — ideally 5% — of daily energy.',
    references: [wiki('Sucrose', 'Sugar (sucrose)')],
  },
];

// ── Per-region regulatory enrichment ───────────────────────────────────────
// Most additives are permitted across the major markets; we only spell out the
// exceptions. Statuses are normalised from EFSA / FDA / FSANZ / FSSAI / Codex.

const ALL_REGIONS: Region[] = ['INTL', 'IN', 'EU', 'US', 'AU'];

const permittedEverywhere = (): RegionRegulation[] =>
  ALL_REGIONS.map((region) => ({ region, status: 'permitted' }));

/** Override map keyed by dossier id — only the additives with a notable stance. */
const REG_OVERRIDES: Record<string, RegionRegulation[]> = {
  tartrazine: [
    { region: 'INTL', status: 'permitted' },
    { region: 'IN', status: 'permitted' },
    { region: 'EU', status: 'restricted', note: 'Hyperactivity warning label required' },
    { region: 'US', status: 'permitted' },
    { region: 'AU', status: 'permitted' },
  ],
  'sunset-yellow': [
    { region: 'INTL', status: 'permitted' },
    { region: 'IN', status: 'permitted' },
    { region: 'EU', status: 'restricted', note: 'Hyperactivity warning label required' },
    { region: 'US', status: 'permitted' },
    { region: 'AU', status: 'permitted' },
  ],
  'allura-red': [
    { region: 'INTL', status: 'permitted' },
    { region: 'IN', status: 'permitted' },
    { region: 'EU', status: 'restricted', note: 'Hyperactivity warning label required' },
    { region: 'US', status: 'permitted' },
    { region: 'AU', status: 'permitted' },
  ],
  carmoisine: [
    { region: 'INTL', status: 'permitted' },
    { region: 'IN', status: 'permitted' },
    { region: 'EU', status: 'restricted', note: 'Hyperactivity warning label required' },
    { region: 'US', status: 'banned', note: 'Not approved for food' },
    { region: 'AU', status: 'permitted' },
  ],
  'ponceau-4r': [
    { region: 'INTL', status: 'permitted' },
    { region: 'IN', status: 'permitted' },
    { region: 'EU', status: 'restricted', note: 'Hyperactivity warning label required' },
    { region: 'US', status: 'banned', note: 'Not approved for food' },
    { region: 'AU', status: 'permitted' },
  ],
  'sodium-nitrite': [
    { region: 'INTL', status: 'permitted_with_limits', note: 'Cured meats only' },
    { region: 'IN', status: 'permitted_with_limits', note: 'Cured meats only' },
    { region: 'EU', status: 'permitted_with_limits', note: 'Strict residual limits' },
    { region: 'US', status: 'permitted_with_limits', note: 'Cured meats only' },
    { region: 'AU', status: 'permitted_with_limits', note: 'Cured meats only' },
  ],
  'partially-hydrogenated-oil': [
    { region: 'INTL', status: 'restricted', note: 'WHO target: eliminate by 2023' },
    { region: 'IN', status: 'restricted', note: 'Capped at 2% of fats (FSSAI)' },
    { region: 'EU', status: 'restricted', note: 'Capped at 2g per 100g of fat' },
    { region: 'US', status: 'banned', note: 'Industrial trans fat (PHOs) banned' },
    { region: 'AU', status: 'restricted', note: 'Voluntary reduction targets' },
  ],
  carrageenan: [
    { region: 'INTL', status: 'permitted' },
    { region: 'IN', status: 'permitted' },
    { region: 'EU', status: 'restricted', note: 'Banned in infant formula' },
    { region: 'US', status: 'permitted' },
    { region: 'AU', status: 'permitted' },
  ],
  bha: [
    { region: 'INTL', status: 'permitted_with_limits' },
    { region: 'IN', status: 'permitted_with_limits' },
    { region: 'EU', status: 'permitted_with_limits' },
    { region: 'US', status: 'permitted_with_limits', note: 'GRAS; under review' },
    { region: 'AU', status: 'permitted_with_limits' },
  ],
  'sulphur-dioxide': [
    { region: 'INTL', status: 'permitted_with_limits', note: 'Allergen — must be declared' },
    { region: 'IN', status: 'permitted_with_limits', note: 'Allergen — must be declared' },
    { region: 'EU', status: 'permitted_with_limits', note: 'Allergen — must be declared' },
    { region: 'US', status: 'permitted_with_limits', note: 'Allergen — must be declared' },
    { region: 'AU', status: 'permitted_with_limits', note: 'Allergen — must be declared' },
  ],
  msg: [
    { region: 'INTL', status: 'permitted_with_limits' },
    { region: 'IN', status: 'permitted_with_limits', note: 'Label declaration; not in infant food' },
    { region: 'EU', status: 'permitted_with_limits' },
    { region: 'US', status: 'permitted_with_limits', note: 'Must be declared' },
    { region: 'AU', status: 'permitted_with_limits' },
  ],
};

const DOSSIERS_WITH_REGULATIONS: Ingredient[] = DOSSIERS.map((d) => ({
  ...d,
  regulations: REG_OVERRIDES[d.id] ?? permittedEverywhere(),
}));

// Merge: dossiers always win over registry rows that share an INS number or id.
const dossierIds = new Set(DOSSIERS.map((d) => d.id));
const dossierNumbers = new Set(
  DOSSIERS.flatMap((d) => [d.insNumber, d.eNumber].filter(Boolean) as string[]),
);
const REGISTRY_ONLY = INS_REGISTRY.filter(
  (r) => !dossierIds.has(r.id) && !(r.insNumber && dossierNumbers.has(r.insNumber)),
);

/**
 * The complete bundled knowledge base: rich dossiers first, then the broad INS
 * registry for everything else. Bump SEED_VERSION whenever this data changes so
 * installed apps re-seed on next launch.
 */
export const INGREDIENT_SEED: Ingredient[] = [
  ...DOSSIERS_WITH_REGULATIONS,
  ...REGISTRY_ONLY,
  ...FOOD_REGISTRY,
];

export const SEED_VERSION = 5;
