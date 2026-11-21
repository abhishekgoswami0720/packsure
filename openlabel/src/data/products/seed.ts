/**
 * Offline product catalogue for barcode scanning.
 *
 * These are representative Indian shelf products with realistic ingredient
 * lists, chosen to exercise all three verdict bands. Barcodes are placeholder
 * EAN-13 values for the demo catalogue — in production this table would be
 * backed by a synced product database.
 */
import { Product } from '@/domain/products';

export const PRODUCT_SEED: Product[] = [
  {
    barcode: '8901058000016',
    name: 'Masala Crunch Namkeen',
    brand: 'ShelfDemo',
    category: 'Savoury snack',
    ingredients: [
      'Rice Meal',
      'Edible Vegetable Oil (Palm Oil)',
      'Gram Flour',
      'Spices & Condiments',
      'Iodised Salt',
      'Flavour Enhancer (INS 621)',
      'Acidity Regulator (INS 330)',
      'Antioxidant (INS 319)',
      'Colour (INS 110)',
    ],
  },
  {
    barcode: '8901058000023',
    name: 'Diet Cola 330ml',
    brand: 'ShelfDemo',
    category: 'Soft drink',
    ingredients: [
      'Carbonated Water',
      'Caramel Colour (INS 150d)',
      'Acidity Regulator (INS 338)',
      'Sweeteners (Aspartame, Acesulfame Potassium)',
      'Preservative (INS 211)',
      'Caffeine',
      'Added Flavours',
    ],
  },
  {
    barcode: '8901058000030',
    name: 'Glucose Biscuits',
    brand: 'ShelfDemo',
    category: 'Biscuits',
    ingredients: [
      'Refined Wheat Flour (Maida)',
      'Sugar',
      'Edible Vegetable Oil (Palm)',
      'Invert Sugar Syrup',
      'Raising Agents (INS 503(ii), INS 500(ii))',
      'Salt',
      'Emulsifier (INS 322)',
      'Added Flavours',
    ],
  },
  {
    barcode: '8901058000047',
    name: 'Tropical Mango Drink',
    brand: 'ShelfDemo',
    category: 'Fruit beverage',
    ingredients: [
      'Water',
      'Mango Pulp',
      'Sugar',
      'Acidity Regulator (Citric Acid)',
      'Stabiliser (Xanthan Gum)',
      'Preservative (Potassium Sorbate)',
      'Colour (Sunset Yellow FCF)',
      'Added Flavours',
    ],
  },
  {
    barcode: '8901058000054',
    name: 'Iodised Table Salt',
    brand: 'ShelfDemo',
    category: 'Staple',
    ingredients: ['Iodised Salt'],
  },
  {
    barcode: '8901058000061',
    name: 'Rolled Oats',
    brand: 'ShelfDemo',
    category: 'Breakfast',
    ingredients: ['Whole Grain Rolled Oats'],
  },
  {
    barcode: '8901058000078',
    name: 'Instant Noodles Masala',
    brand: 'ShelfDemo',
    category: 'Instant food',
    ingredients: [
      'Refined Wheat Flour (Maida)',
      'Palm Oil',
      'Salt',
      'Wheat Gluten',
      'Thickeners (INS 508, INS 412)',
      'Flavour Enhancers (INS 621, INS 627, INS 631)',
      'Acidity Regulators (INS 330, INS 500)',
      'Antioxidant (INS 319)',
      'Colour (INS 102)',
    ],
  },
  {
    barcode: '8901058000085',
    name: 'Dark Chocolate 55%',
    brand: 'ShelfDemo',
    category: 'Confectionery',
    ingredients: [
      'Cocoa Mass',
      'Sugar',
      'Cocoa Butter',
      'Emulsifier (Soy Lecithin)',
      'Natural Vanilla Flavour',
    ],
  },
];
