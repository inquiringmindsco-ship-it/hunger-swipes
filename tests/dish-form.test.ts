import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { normalizeDishAllergens, normalizeDishIngredients, normalizeServingSize } from '../lib/dish-details.ts'
import { dishDraftKey, readDishDraft } from '../lib/dish-form-draft.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('dish details keep valid ingredient values and reject empty or oversized input', () => {
  assert.deepEqual(normalizeDishIngredients([
    { quantity: ' 2 ', unit: ' cups ', name: ' flour ' },
    { quantity: '1', unit: '', name: '   ' },
    null,
  ]), [{ quantity: '2', unit: 'cups', name: 'flour' }])
  assert.deepEqual(normalizeDishAllergens(['Milk', ' Milk ', '', 'Eggs']), ['Milk', 'Eggs'])
  assert.equal(normalizeServingSize(' Serves 2 '), 'Serves 2')
})

test('dish draft parsing is versioned and seller-specific', () => {
  const draft = {
    version: 1 as const,
    form: { name: 'Tacos', description: '', price: '', category: 'Mexican', tags: '', availability: 'available', photo_url: '' },
    ingredients: [{ quantity: '2', unit: '', name: 'tortillas' }],
    ingredientsOpen: true,
    allergens: [],
    servingSize: 'Serves 1',
    addRecipeNext: false,
    offerForSale: false,
  }
  assert.deepEqual(readDishDraft(JSON.stringify(draft)), draft)
  assert.equal(readDishDraft('{bad json'), null)
  assert.equal(dishDraftKey('seller-1'), 'hs:add-dish-draft:v1:seller-1')
})

test('Add a Dish stays compact and separates posting from selling', () => {
  const page = read('../app/seller/dishes/new/page.tsx')
  assert.match(page, /Ingredients/)
  assert.match(page, /Add ingredient/)
  assert.match(page, /About this dish/)
  assert.match(page, /Offer this dish for sale/)
  assert.match(page, /Allergy information may be incomplete\. Check before eating\./)
  assert.doesNotMatch(page, /Add the recipe next/)
  assert.doesNotMatch(page, /customers should know/)
})

test('dish APIs persist structured food details', () => {
  const route = read('../app/api/dishes/route.ts')
  assert.match(route, /ingredients: normalizeDishIngredients\(ingredients\)/)
  assert.match(route, /allergens: normalizeDishAllergens\(allergens\)/)
  assert.match(route, /serving_size: normalizeServingSize\(serving_size\)/)
})
