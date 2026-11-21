/**
 * The INS additive registry — the broad "identification" tier.
 *
 * Each row maps an internationally-recognised INS/E number to its canonical
 * name and functional category. INS numbers are harmonised across Codex, the
 * EU, FSSAI, FSANZ and (mostly) the FDA, so one table resolves additives on
 * labels worldwide. Registry rows don't carry a full evidence dossier — they
 * resolve the additive and score it via its category, which is honest and
 * already far more coverage than a hand-written list of "scary" additives.
 *
 * Where a number also has a full dossier (see seed.ts), the dossier wins on
 * merge — so the rich entries here are deliberately omitted or overridden.
 */
import {
  IngredientCategory,
  Ingredient,
  RiskLevel,
} from '@/domain/ingredients/types';

/** [INS, name, category, risk, aliases?, penaltyOverride?] */
type Row = [string, string, IngredientCategory, RiskLevel, string[]?, number?];

const CATEGORY_PURPOSE: Record<IngredientCategory, string> = {
  artificial_color: 'A colour added to make food look more appealing.',
  colour_natural: 'A naturally-derived colour used to tint food.',
  preservative: 'Helps stop spoilage so the food keeps for longer.',
  antioxidant: 'Slows fats and oils from going rancid.',
  acidity_regulator: 'Controls how acidic or alkaline the food is.',
  emulsifier: 'Keeps oil and water mixed so the texture stays smooth.',
  stabiliser: 'Thickens or stabilises texture and consistency.',
  anticaking_agent: 'Keeps powders free-flowing and stops clumping.',
  glazing_agent: 'Adds shine or a protective surface coating.',
  flavour_enhancer: 'Boosts the savoury (umami) taste of food.',
  artificial_sweetener: 'Adds sweetness with few or no calories.',
  raising_agent: 'Releases gas to help baked goods rise.',
  added_sugar: 'A form of added sugar or sweet bulking agent.',
  refined_oil: 'A processed edible oil or fat.',
  trans_fat: 'A hardened oil that can contain artificial trans fat.',
  flour_treatment: 'A processing agent that conditions flour or dough.',
  natural: 'A recognised food ingredient.',
};

// prettier-ignore
const ROWS: Row[] = [
  // ── Colours (100–199) ────────────────────────────────────────────────────
  ['100', 'Curcumin', 'colour_natural', 'low', ['turmeric colour']],
  ['101', 'Riboflavin', 'colour_natural', 'low', ['vitamin b2']],
  ['104', 'Quinoline Yellow', 'artificial_color', 'high', [], 30],
  ['120', 'Cochineal / Carmines', 'colour_natural', 'low', ['carmine', 'carminic acid']],
  ['123', 'Amaranth', 'artificial_color', 'high'],
  ['127', 'Erythrosine', 'artificial_color', 'moderate', ['red 3']],
  ['129', 'Allura Red AC', 'artificial_color', 'high', ['red 40', 'allura red'], 30],
  ['132', 'Indigotine', 'artificial_color', 'low', ['indigo carmine', 'blue 2']],
  ['142', 'Green S', 'artificial_color', 'moderate'],
  ['150a', 'Caramel I (plain)', 'artificial_color', 'low', ['caramel colour']],
  ['150b', 'Caramel II', 'artificial_color', 'low'],
  ['150c', 'Caramel III', 'artificial_color', 'moderate'],
  ['150d', 'Caramel IV', 'artificial_color', 'moderate', ['sulphite ammonia caramel']],
  ['151', 'Brilliant Black BN', 'artificial_color', 'high', ['black pn'], 25],
  ['153', 'Vegetable Carbon', 'colour_natural', 'low', ['carbon black']],
  ['155', 'Brown HT', 'artificial_color', 'moderate'],
  ['160a', 'Carotenes (Beta-carotene)', 'colour_natural', 'low', ['beta carotene']],
  ['160b', 'Annatto', 'colour_natural', 'low', ['bixin', 'norbixin']],
  ['160c', 'Paprika Extract', 'colour_natural', 'low'],
  ['161b', 'Lutein', 'colour_natural', 'low'],
  ['162', 'Beetroot Red', 'colour_natural', 'low', ['betanin']],
  ['163', 'Anthocyanins', 'colour_natural', 'low'],
  ['170', 'Calcium Carbonate', 'anticaking_agent', 'low'],
  ['171', 'Titanium Dioxide', 'artificial_color', 'high', ['titanium dioxide']],
  ['172', 'Iron Oxides', 'colour_natural', 'low'],

  // ── Preservatives (200–290) ──────────────────────────────────────────────
  ['200', 'Sorbic Acid', 'preservative', 'low'],
  ['210', 'Benzoic Acid', 'preservative', 'moderate'],
  ['212', 'Potassium Benzoate', 'preservative', 'moderate'],
  ['221', 'Sodium Sulphite', 'preservative', 'moderate'],
  ['223', 'Sodium Metabisulphite', 'preservative', 'moderate', ['metabisulphite']],
  ['224', 'Potassium Metabisulphite', 'preservative', 'moderate'],
  ['234', 'Nisin', 'preservative', 'low'],
  ['235', 'Natamycin', 'preservative', 'moderate', ['pimaricin']],
  ['249', 'Potassium Nitrite', 'preservative', 'high'],
  ['251', 'Sodium Nitrate', 'preservative', 'high'],
  ['252', 'Potassium Nitrate', 'preservative', 'high', ['saltpetre']],
  ['260', 'Acetic Acid', 'acidity_regulator', 'low'],
  ['262', 'Sodium Acetate', 'acidity_regulator', 'low'],
  ['270', 'Lactic Acid', 'acidity_regulator', 'low'],
  ['280', 'Propionic Acid', 'preservative', 'low'],
  ['281', 'Sodium Propionate', 'preservative', 'low'],
  ['282', 'Calcium Propionate', 'preservative', 'moderate'],
  ['290', 'Carbon Dioxide', 'acidity_regulator', 'low'],
  ['296', 'Malic Acid', 'acidity_regulator', 'low'],
  ['297', 'Fumaric Acid', 'acidity_regulator', 'low'],

  // ── Antioxidants & acidity regulators (300–385) ──────────────────────────
  ['300', 'Ascorbic Acid', 'antioxidant', 'low', ['vitamin c']],
  ['301', 'Sodium Ascorbate', 'antioxidant', 'low'],
  ['302', 'Calcium Ascorbate', 'antioxidant', 'low'],
  ['304', 'Ascorbyl Palmitate', 'antioxidant', 'low'],
  ['306', 'Tocopherols', 'antioxidant', 'low', ['vitamin e', 'tocopherol']],
  ['307', 'Alpha-Tocopherol', 'antioxidant', 'low'],
  ['310', 'Propyl Gallate', 'antioxidant', 'moderate'],
  ['325', 'Sodium Lactate', 'acidity_regulator', 'low'],
  ['327', 'Calcium Lactate', 'acidity_regulator', 'low'],
  ['331', 'Sodium Citrates', 'acidity_regulator', 'low', ['sodium citrate']],
  ['332', 'Potassium Citrates', 'acidity_regulator', 'low'],
  ['333', 'Calcium Citrate', 'acidity_regulator', 'low'],
  ['334', 'Tartaric Acid', 'acidity_regulator', 'low'],
  ['336', 'Potassium Tartrate', 'acidity_regulator', 'low', ['cream of tartar']],
  ['338', 'Phosphoric Acid', 'acidity_regulator', 'moderate'],
  ['339', 'Sodium Phosphates', 'acidity_regulator', 'moderate'],
  ['340', 'Potassium Phosphates', 'acidity_regulator', 'moderate'],
  ['341', 'Calcium Phosphates', 'acidity_regulator', 'low'],

  // ── Thickeners, emulsifiers & stabilisers (400–499) ──────────────────────
  ['400', 'Alginic Acid', 'stabiliser', 'low'],
  ['401', 'Sodium Alginate', 'stabiliser', 'low'],
  ['406', 'Agar', 'stabiliser', 'low'],
  ['410', 'Locust Bean Gum', 'stabiliser', 'low', ['carob gum']],
  ['412', 'Guar Gum', 'stabiliser', 'low'],
  ['413', 'Tragacanth Gum', 'stabiliser', 'low'],
  ['414', 'Acacia Gum', 'stabiliser', 'low', ['gum arabic']],
  ['416', 'Karaya Gum', 'stabiliser', 'low'],
  ['417', 'Tara Gum', 'stabiliser', 'low'],
  ['418', 'Gellan Gum', 'stabiliser', 'low'],
  ['420', 'Sorbitol', 'artificial_sweetener', 'low', ['sorbitol syrup'], 3],
  ['421', 'Mannitol', 'artificial_sweetener', 'low', [], 3],
  ['422', 'Glycerol', 'emulsifier', 'low', ['glycerine', 'glycerin']],
  ['440', 'Pectin', 'stabiliser', 'low'],
  ['441', 'Gelatine', 'stabiliser', 'low', ['gelatin']],
  ['442', 'Ammonium Phosphatides', 'emulsifier', 'low'],
  ['443', 'Brominated Vegetable Oil', 'emulsifier', 'high', ['bvo', 'brominated vegetable oil'], 25],
  ['450', 'Diphosphates', 'acidity_regulator', 'moderate', ['pyrophosphates']],
  ['451', 'Triphosphates', 'acidity_regulator', 'moderate'],
  ['452', 'Polyphosphates', 'acidity_regulator', 'moderate'],
  ['460', 'Microcrystalline Cellulose', 'stabiliser', 'low', ['cellulose']],
  ['461', 'Methyl Cellulose', 'stabiliser', 'low'],
  ['463', 'Hydroxypropyl Cellulose', 'stabiliser', 'low'],
  ['464', 'Hydroxypropyl Methyl Cellulose', 'stabiliser', 'low', ['hpmc']],
  ['466', 'Carboxymethyl Cellulose', 'stabiliser', 'low', ['cmc', 'cellulose gum']],
  ['472e', 'DATEM', 'emulsifier', 'low', ['diacetyltartaric acid esters']],
  ['481', 'Sodium Stearoyl Lactylate', 'emulsifier', 'low', ['ssl']],
  ['482', 'Calcium Stearoyl Lactylate', 'emulsifier', 'low'],
  ['491', 'Sorbitan Monostearate', 'emulsifier', 'low'],

  // ── Acidity regulators, anticaking & raising agents (500–599) ────────────
  ['501', 'Potassium Carbonates', 'acidity_regulator', 'low'],
  ['503', 'Ammonium Carbonates', 'raising_agent', 'low'],
  ['504', 'Magnesium Carbonate', 'anticaking_agent', 'low'],
  ['507', 'Hydrochloric Acid', 'acidity_regulator', 'low'],
  ['508', 'Potassium Chloride', 'acidity_regulator', 'low', ['salt substitute']],
  ['509', 'Calcium Chloride', 'acidity_regulator', 'low'],
  ['511', 'Magnesium Chloride', 'acidity_regulator', 'low'],
  ['515', 'Potassium Sulphate', 'acidity_regulator', 'low'],
  ['516', 'Calcium Sulphate', 'acidity_regulator', 'low'],
  ['524', 'Sodium Hydroxide', 'acidity_regulator', 'low'],
  ['526', 'Calcium Hydroxide', 'acidity_regulator', 'low'],
  ['528', 'Magnesium Hydroxide', 'acidity_regulator', 'low'],
  ['535', 'Sodium Ferrocyanide', 'anticaking_agent', 'moderate'],
  ['536', 'Potassium Ferrocyanide', 'anticaking_agent', 'moderate'],
  ['541', 'Sodium Aluminium Phosphate', 'raising_agent', 'moderate', ['aluminium phosphate']],
  ['551', 'Silicon Dioxide', 'anticaking_agent', 'low', ['silica']],
  ['552', 'Calcium Silicate', 'anticaking_agent', 'low'],
  ['553', 'Magnesium Silicate', 'anticaking_agent', 'low', ['talc']],
  ['554', 'Sodium Aluminosilicate', 'anticaking_agent', 'moderate'],
  ['558', 'Bentonite', 'anticaking_agent', 'low'],
  ['575', 'Glucono Delta-Lactone', 'acidity_regulator', 'low', ['gdl']],

  // ── Flavour enhancers (600s) ─────────────────────────────────────────────
  ['620', 'Glutamic Acid', 'flavour_enhancer', 'moderate'],
  ['622', 'Monopotassium Glutamate', 'flavour_enhancer', 'moderate'],
  ['635', 'Disodium 5′-Ribonucleotides', 'flavour_enhancer', 'low', ['ribonucleotides']],
  ['640', 'Glycine', 'flavour_enhancer', 'low'],

  // ── Glazing agents, sweeteners & misc (900s) ─────────────────────────────
  ['900', 'Polydimethylsiloxane', 'anticaking_agent', 'low', ['dimethylpolysiloxane', 'antifoaming agent']],
  ['901', 'Beeswax', 'glazing_agent', 'low'],
  ['903', 'Carnauba Wax', 'glazing_agent', 'low'],
  ['904', 'Shellac', 'glazing_agent', 'low'],
  ['905', 'Microcrystalline Wax', 'glazing_agent', 'moderate', ['mineral oil']],
  ['917', 'Potassium Iodate', 'flour_treatment', 'moderate', ['iodate']],
  ['920', 'L-Cysteine', 'stabiliser', 'low', ['cysteine']],
  ['924', 'Potassium Bromate', 'flour_treatment', 'high', ['bromate', 'potassium bromate'], 35],
  ['927a', 'Azodicarbonamide', 'flour_treatment', 'high', ['ada'], 20],
  ['952', 'Cyclamate', 'artificial_sweetener', 'high', ['sodium cyclamate', 'cyclamic acid'], 30],
  ['957', 'Thaumatin', 'artificial_sweetener', 'low', [], 3],
  ['960', 'Steviol Glycosides', 'artificial_sweetener', 'low', ['stevia'], 3],
  ['961', 'Neotame', 'artificial_sweetener', 'moderate'],
  ['965', 'Maltitol', 'artificial_sweetener', 'low', ['maltitol syrup'], 3],
  ['966', 'Lactitol', 'artificial_sweetener', 'low', [], 3],
  ['967', 'Xylitol', 'artificial_sweetener', 'low', [], 3],
  ['968', 'Erythritol', 'artificial_sweetener', 'low', [], 2],

  // ── Enzymes, modified starches & solvents (1100+) ────────────────────────
  ['1100', 'Amylase', 'natural', 'low'],
  ['1200', 'Polydextrose', 'stabiliser', 'low'],
  ['1400', 'Dextrin', 'added_sugar', 'low', ['roasted starch']],
  ['1404', 'Oxidised Starch', 'stabiliser', 'low'],
  ['1412', 'Distarch Phosphate', 'stabiliser', 'low', ['modified starch']],
  ['1414', 'Acetylated Distarch Phosphate', 'stabiliser', 'low'],
  ['1420', 'Acetylated Starch', 'stabiliser', 'low'],
  ['1422', 'Acetylated Distarch Adipate', 'stabiliser', 'low', ['modified starch']],
  ['1442', 'Hydroxypropyl Distarch Phosphate', 'stabiliser', 'low'],
  ['1450', 'Starch Sodium Octenyl Succinate', 'stabiliser', 'low'],
  ['1505', 'Triethyl Citrate', 'stabiliser', 'low'],
  ['1520', 'Propylene Glycol', 'emulsifier', 'low'],

  // ── Common additives that were missing (the workhorses of Indian labels) ──
  // Colours
  ['102', 'Tartrazine', 'artificial_color', 'high', ['tartrazine', 'yellow 5', 'fd&c yellow 5'], 30],
  ['110', 'Sunset Yellow FCF', 'artificial_color', 'high', ['sunset yellow', 'yellow 6'], 30],
  ['122', 'Carmoisine', 'artificial_color', 'high', ['azorubine'], 30],
  ['124', 'Ponceau 4R', 'artificial_color', 'high', ['ponceau', 'cochineal red a'], 30],
  ['133', 'Brilliant Blue FCF', 'artificial_color', 'moderate', ['blue 1', 'brilliant blue']],
  ['143', 'Fast Green FCF', 'artificial_color', 'moderate', ['green 3']],
  // Preservatives
  ['202', 'Potassium Sorbate', 'preservative', 'low', ['potassium sorbate']],
  ['211', 'Sodium Benzoate', 'preservative', 'moderate', ['sodium benzoate']],
  ['220', 'Sulphur Dioxide', 'preservative', 'moderate', ['sulphur dioxide', 'sulfur dioxide', 'so2']],
  ['222', 'Sodium Bisulphite', 'preservative', 'moderate'],
  ['250', 'Sodium Nitrite', 'preservative', 'high', ['sodium nitrite'], 12],
  ['218', 'Methyl Paraben', 'preservative', 'moderate', ['methylparaben', 'paraben']],
  ['385', 'Calcium Disodium EDTA', 'preservative', 'low', ['edta']],
  // Antioxidants
  ['319', 'TBHQ', 'antioxidant', 'moderate', ['tbhq', 'tertiary butylhydroquinone']],
  ['320', 'BHA', 'antioxidant', 'high', ['bha', 'butylated hydroxyanisole'], 12],
  ['321', 'BHT', 'antioxidant', 'moderate', ['bht', 'butylated hydroxytoluene']],
  ['330', 'Citric Acid', 'acidity_regulator', 'low', ['citric acid']],
  // Emulsifiers, stabilisers & raising agents
  ['322', 'Lecithins', 'emulsifier', 'low', ['lecithin', 'soya lecithin', 'soy lecithin', 'sunflower lecithin']],
  ['407', 'Carrageenan', 'stabiliser', 'moderate', ['carrageenan']],
  ['415', 'Xanthan Gum', 'stabiliser', 'low', ['xanthan gum', 'xanthan']],
  ['471', 'Mono- and Diglycerides', 'emulsifier', 'low', ['mono and diglycerides', 'monoglycerides', 'diglycerides']],
  ['472b', 'Lactic Acid Esters of Mono- and Diglycerides', 'emulsifier', 'low'],
  ['472c', 'Citric Acid Esters of Mono- and Diglycerides', 'emulsifier', 'low'],
  ['476', 'Polyglycerol Polyricinoleate', 'emulsifier', 'low', ['pgpr']],
  ['433', 'Polysorbate 80', 'emulsifier', 'low', ['polysorbate']],
  ['500', 'Sodium Carbonates', 'raising_agent', 'low', ['baking soda', 'sodium bicarbonate', 'sodium carbonate']],
  // Flavour enhancers
  ['621', 'Monosodium Glutamate', 'flavour_enhancer', 'moderate', ['msg', 'monosodium glutamate', 'ajinomoto', 'aji no moto']],
  ['627', 'Disodium Guanylate', 'flavour_enhancer', 'low', ['guanylate']],
  ['631', 'Disodium Inosinate', 'flavour_enhancer', 'low', ['inosinate']],
];

function rowToIngredient([ins, name, category, risk, aliases, penalty]: Row): Ingredient {
  return {
    id: `ins-${ins.toLowerCase()}`,
    name,
    category,
    riskLevel: risk,
    purpose: CATEGORY_PURPOSE[category],
    eNumber: ins,
    insNumber: ins,
    aliases: aliases ?? [],
    regulatoryStatus: `Permitted as a food additive (INS ${ins}) within regulated limits in major markets.`,
    scorePenalty: penalty,
  };
}

/** The full registry as domain ingredients. */
export const INS_REGISTRY: Ingredient[] = ROWS.map(rowToIngredient);
