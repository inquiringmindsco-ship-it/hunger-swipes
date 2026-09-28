'use client'

type RecipeAccess = 'none' | 'preview' | 'purchase'

interface RecipeBadgeProps {
  access?: RecipeAccess
  type?: 'free' | 'fixed_price' | 'proud_to_pay' | null
  price?: number
  recipeAvailable?: boolean
}

export function RecipeBadge({ access, type, price, recipeAvailable }: RecipeBadgeProps) {
  if (!recipeAvailable) return null

  const isFree = type === 'free' || (type == null && price === 0)
  const label = isFree ? 'Free Recipe' : type === 'proud_to_pay' ? 'Proud to Pay' : 'Recipe'

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-hs-gold text-hs-black border border-hs-gold">
      {label}
    </span>
  )
}
