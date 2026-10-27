export type DishIngredient = {
  quantity: string
  unit: string
  name: string
}

const MAX_INGREDIENTS = 100
const MAX_ALLERGENS = 20

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function normalizeDishIngredients(value: unknown): DishIngredient[] {
  if (!Array.isArray(value)) return []

  return value.slice(0, MAX_INGREDIENTS).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const ingredient = item as Record<string, unknown>
    const name = cleanText(ingredient.name, 160)
    if (!name) return []
    return [{
      quantity: cleanText(ingredient.quantity, 40),
      unit: cleanText(ingredient.unit, 40),
      name,
    }]
  })
}

export function normalizeDishAllergens(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => cleanText(item, 80)).filter(Boolean))].slice(0, MAX_ALLERGENS)
}

export function normalizeServingSize(value: unknown): string | null {
  return cleanText(value, 160) || null
}
