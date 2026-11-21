/**
 * Base-food registry — the whole foods that make up most of an ingredient list.
 *
 * These aren't additives, so most are the neutral `natural` category: they exist
 * so a scanned list resolves to real names ("we read: oats, cocoa, milk solids…")
 * instead of a wall of unknowns. Their health impact is already captured by the
 * Nutri-Score nutrition axis, so they carry no double-counted penalty — with one
 * exception: hydrogenated / vanaspati fats, flagged as trans fat because that
 * specific harm is NOT in the nutrition numbers.
 */
import { Ingredient, IngredientCategory, RiskLevel } from '@/domain/ingredients/types';

/** [name, category, risk, aliases?] */
type FoodRow = [string, IngredientCategory, RiskLevel, string[]?];

const PURPOSE: Partial<Record<IngredientCategory, string>> = {
  natural: 'A recognised food ingredient.',
  trans_fat:
    'A hardened (hydrogenated) fat that can contain artificial trans fat — best limited.',
};

// prettier-ignore
const FOODS: FoodRow[] = [
  // Grains & flours
  ['Wheat Flour', 'natural', 'low', ['atta', 'whole wheat flour', 'wheat atta', 'whole wheat']],
  ['Refined Wheat Flour', 'natural', 'low', ['maida', 'refined flour']],
  ['Rice', 'natural', 'low', ['rice flour', 'basmati rice', 'parboiled rice']],
  ['Oats', 'natural', 'low', ['rolled oats', 'oat flour', 'oatmeal']],
  ['Maize', 'natural', 'low', ['corn', 'corn flour', 'cornflour', 'maize flour', 'corn starch', 'maize starch', 'corn flakes']],
  ['Semolina', 'natural', 'low', ['suji', 'sooji', 'rava', 'rawa']],
  ['Barley', 'natural', 'low', ['barley flour']],
  ['Ragi', 'natural', 'low', ['finger millet']],
  ['Bajra', 'natural', 'low', ['pearl millet']],
  ['Jowar', 'natural', 'low', ['sorghum']],
  ['Millet', 'natural', 'low', ['millets']],
  ['Wheat Bran', 'natural', 'low', ['bran']],
  ['Vermicelli', 'natural', 'low'],
  ['Starch', 'natural', 'low', ['modified starch', 'tapioca starch', 'potato starch', 'edible starch']],
  // Pulses & plant proteins
  ['Gram Flour', 'natural', 'low', ['besan', 'bengal gram flour', 'chickpea flour']],
  ['Bengal Gram', 'natural', 'low', ['chana', 'chickpea']],
  ['Green Gram', 'natural', 'low', ['moong', 'mung']],
  ['Black Gram', 'natural', 'low', ['urad', 'urad dal']],
  ['Lentil', 'natural', 'low', ['dal', 'dhal', 'lentils', 'masoor', 'toor', 'arhar']],
  ['Soya', 'natural', 'low', ['soy', 'soya bean', 'soybean', 'soya bean extract']],
  ['Soy Protein', 'natural', 'low', ['soya protein', 'soy protein isolate', 'soya protein isolate', 'textured soy protein']],
  ['Pea Protein', 'natural', 'low', ['pea protein isolate']],
  // Dairy
  ['Milk', 'natural', 'low', ['toned milk', 'cow milk']],
  ['Milk Solids', 'natural', 'low', ['milk solid', 'milk powder']],
  ['Skimmed Milk Powder', 'natural', 'low', ['skim milk powder', 'smp']],
  ['Whole Milk Powder', 'natural', 'low', ['wmp']],
  ['Whey', 'natural', 'low', ['whey protein', 'whey protein concentrate', 'whey powder', 'whey protein isolate']],
  ['Casein', 'natural', 'low', ['caseinate', 'sodium caseinate', 'milk protein', 'calcium caseinate']],
  ['Cheese', 'natural', 'low', ['cheese solids', 'processed cheese']],
  ['Paneer', 'natural', 'low', ['cottage cheese']],
  ['Cream', 'natural', 'low', ['milk cream', 'dairy cream']],
  ['Butter', 'natural', 'low', ['white butter', 'butter fat', 'milk fat']],
  ['Curd', 'natural', 'low', ['yogurt', 'yoghurt', 'dahi']],
  ['Ghee', 'natural', 'low', ['clarified butter', 'desi ghee']],
  // Oils & fats
  ['Palm Oil', 'natural', 'low', ['palmolein', 'palm olein', 'refined palm oil']],
  ['Vegetable Oil', 'natural', 'low', ['refined vegetable oil', 'edible vegetable oil', 'vegetable fat']],
  ['Sunflower Oil', 'natural', 'low', ['refined sunflower oil']],
  ['Soybean Oil', 'natural', 'low', ['refined soybean oil', 'soya oil']],
  ['Groundnut Oil', 'natural', 'low', ['peanut oil']],
  ['Coconut Oil', 'natural', 'low'],
  ['Rice Bran Oil', 'natural', 'low'],
  ['Mustard Oil', 'natural', 'low', ['kachi ghani']],
  ['Sesame Oil', 'natural', 'low', ['til oil', 'gingelly oil']],
  ['Cocoa Butter', 'natural', 'low', ['cocoa butter substitute', 'cbs']],
  ['Interesterified Vegetable Fat', 'natural', 'moderate', ['interesterified fat']],
  ['Hydrogenated Vegetable Oil', 'trans_fat', 'high', ['vanaspati', 'partially hydrogenated', 'hydrogenated fat', 'hydrogenated oil', 'hydrogenated vegetable fat']],
  // Sugars & sweet bases (nutrition axis handles the sugar load)
  ['Sugar', 'natural', 'low', ['sucrose', 'refined sugar', 'cane sugar']],
  ['Glucose Syrup', 'natural', 'low', ['glucose', 'liquid glucose', 'glucose solids']],
  ['Invert Sugar', 'natural', 'low', ['invert syrup', 'invert sugar syrup']],
  ['Dextrose', 'natural', 'low', ['dextrose monohydrate']],
  ['Fructose', 'natural', 'low'],
  ['High Fructose Corn Syrup', 'natural', 'low', ['hfcs', 'corn syrup', 'fructose syrup']],
  ['Jaggery', 'natural', 'low', ['gur']],
  ['Honey', 'natural', 'low'],
  ['Maltodextrin', 'natural', 'low'],
  ['Malt Extract', 'natural', 'low', ['malt', 'barley malt', 'malted barley']],
  ['Molasses', 'natural', 'low'],
  // Cocoa, coffee & flavour bases
  ['Cocoa Solids', 'natural', 'low', ['cocoa', 'cocoa powder', 'cocoa mass', 'cocoa liquor']],
  ['Chocolate', 'natural', 'low', ['milk chocolate', 'dark chocolate', 'compound chocolate']],
  ['Coffee', 'natural', 'low', ['instant coffee', 'coffee solids']],
  ['Vanilla', 'natural', 'low', ['vanilla extract', 'vanillin', 'vanilla flavour']],
  // Nuts & seeds
  ['Peanut', 'natural', 'low', ['groundnut', 'peanuts', 'roasted peanut']],
  ['Almond', 'natural', 'low', ['almonds', 'badam']],
  ['Cashew', 'natural', 'low', ['cashewnut', 'cashew nut', 'kaju']],
  ['Sesame', 'natural', 'low', ['til', 'sesame seed']],
  ['Sunflower Seed', 'natural', 'low', ['sunflower seeds']],
  // Common produce
  ['Tomato', 'natural', 'low', ['tomato paste', 'tomato powder', 'tomato puree']],
  ['Onion', 'natural', 'low', ['onion powder', 'dehydrated onion']],
  ['Garlic', 'natural', 'low', ['garlic powder']],
  ['Ginger', 'natural', 'low', ['ginger powder']],
  ['Potato', 'natural', 'low', ['potato flakes', 'dehydrated potato']],
  ['Coconut', 'natural', 'low', ['desiccated coconut', 'coconut milk']],
  ['Raisin', 'natural', 'low', ['raisins', 'kishmish']],
  ['Fruit', 'natural', 'low', ['fruit pulp', 'fruit concentrate', 'mixed fruit']],
  // Salt, water & misc
  ['Salt', 'natural', 'low', ['iodised salt', 'iodized salt', 'common salt', 'edible salt', 'rock salt']],
  ['Water', 'natural', 'low', ['potable water', 'purified water']],
  ['Yeast', 'natural', 'low', ['yeast extract', 'baker\'s yeast']],
  ['Egg', 'natural', 'low', ['egg powder', 'egg white', 'egg solids', 'whole egg']],
  ['Spices', 'natural', 'low', ['spice', 'mixed spices', 'spice extract', 'condiments']],
  ['Flavour', 'natural', 'low', ['natural flavour', 'artificial flavour', 'added flavour', 'permitted flavour', 'nature identical flavour', 'flavouring']],
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toFood([name, category, risk, aliases]: FoodRow): Ingredient {
  return {
    id: `food-${slugify(name)}`,
    name,
    category,
    riskLevel: risk,
    purpose: PURPOSE[category] ?? 'A recognised food ingredient.',
    aliases: aliases ?? [],
  };
}

export const FOOD_REGISTRY: Ingredient[] = FOODS.map(toFood);
