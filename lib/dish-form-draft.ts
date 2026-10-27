import type { DishIngredient } from '@/lib/dish-details'

export const DISH_DRAFT_VERSION = 1

export type DishFormDraft = {
  version: typeof DISH_DRAFT_VERSION
  form: {
    name: string
    description: string
    price: string
    category: string
    tags: string
    availability: string
    photo_url: string
  }
  ingredients: DishIngredient[]
  ingredientsOpen: boolean
  allergens: string[]
  servingSize: string
  addRecipeNext: boolean
  offerForSale: boolean
}

export function dishDraftKey(sellerId: string) {
  return `hs:add-dish-draft:v${DISH_DRAFT_VERSION}:${sellerId}`
}

export function readDishDraft(value: string | null): DishFormDraft | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<DishFormDraft>
    if (parsed.version !== DISH_DRAFT_VERSION || !parsed.form || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.allergens)) return null
    return parsed as DishFormDraft
  } catch {
    return null
  }
}
