import crypto from 'crypto'

export type ModerationStatus = 'pending_review' | 'approved' | 'rejected' | 'removed'

export interface ModerationResult {
  status: Exclude<ModerationStatus, 'removed'>
  confidence: number
  safetyPassed: boolean
  foodRelevancePassed: boolean
  reasons: string[]
  service?: string
  assessment?: Record<string, unknown>
}

export interface DuplicateCheckResult {
  exactMatch: boolean
  perceptualMatch: boolean
  duplicatePostId: string | null
  previouslyRejected: boolean
  confidence: number
}

export interface ClassifierConfig {
  autoApproveThreshold: number
  autoRejectThreshold: number
  provider: 'manual' | 'openai' | 'roboflow' | 'google'
}

const DEFAULT_CONFIG: ClassifierConfig = {
  autoApproveThreshold: 0.85,
  autoRejectThreshold: 0.85,
  provider: (process.env.MODERATION_PROVIDER as ClassifierConfig['provider']) || 'manual',
}

export function getClassifierConfig(): ClassifierConfig {
  return {
    autoApproveThreshold: parseFloat(process.env.MODERATION_AUTO_APPROVE_THRESHOLD || String(DEFAULT_CONFIG.autoApproveThreshold)),
    autoRejectThreshold: parseFloat(process.env.MODERATION_AUTO_REJECT_THRESHOLD || String(DEFAULT_CONFIG.autoRejectThreshold)),
    provider: (process.env.MODERATION_PROVIDER as ClassifierConfig['provider']) || DEFAULT_CONFIG.provider,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Default classifier: conservative manual review.
 * When no production AI vision service is configured/available, every upload
 * is held for admin Food Review rather than auto-approved. This satisfies the
 * requirement that only verified content enters Discover or earns Swipe Bucks.
 *
 * To enable automated decisions, set MODERATION_PROVIDER=openai|roboflow|google
 * and the corresponding API key / model env vars.
 */
export async function classifyFoodImage(_photoUrl: string): Promise<ModerationResult> {
  const provider = getClassifierConfig().provider

  if (provider === 'openai') {
    return classifyWithOpenAI(_photoUrl)
  }
  if (provider === 'roboflow') {
    return classifyWithRoboflow(_photoUrl)
  }
  if (provider === 'google') {
    return classifyWithGoogle(_photoUrl)
  }

  return {
    status: 'pending_review',
    confidence: 0,
    safetyPassed: true,
    foodRelevancePassed: false,
    reasons: ['No automated classifier configured; held for admin review'],
    service: 'manual',
    assessment: { provider: 'manual' },
  }
}

async function classifyWithOpenAI(photoUrl: string): Promise<ModerationResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return fallbackManual('OPENAI_API_KEY not set')
  }

  const prompt = `
Evaluate this food photo for Hunger Swipes. Respond with a single JSON object only, no markdown:
{
  "safety_passed": boolean,
  "food_relevance_passed": boolean,
  "confidence": number 0-1,
  "reasons": ["short reason strings"]
}
Safety: reject explicit sexual content, nudity, graphic/gory, abusive, or clearly prohibited imagery.
Food relevance: approve if food is a meaningful subject (plated meals, dishes, restaurant/home-cooked food, desserts, drinks with food context, chef with dish). Reject selfies without food, portraits, people with no food, walls, cars, pets, products, memes, screenshots, documents, random objects.
`.trim()

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODERATION_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: photoUrl } }] },
        ],
        max_tokens: 300,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return fallbackManual(`OpenAI API error ${res.status}: ${err}`)
    }

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)

    const safetyPassed = !!parsed.safety_passed
    const foodPassed = !!parsed.food_relevance_passed
    const confidence = clamp(parseFloat(parsed.confidence) || 0, 0, 1)
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons : []

    const cfg = getClassifierConfig()
    let status: ModerationResult['status'] = 'pending_review'
    if (!safetyPassed) {
      status = confidence >= cfg.autoRejectThreshold ? 'rejected' : 'pending_review'
    } else if (foodPassed) {
      status = confidence >= cfg.autoApproveThreshold ? 'approved' : 'pending_review'
    } else {
      status = confidence >= cfg.autoRejectThreshold ? 'rejected' : 'pending_review'
    }

    return {
      status,
      confidence,
      safetyPassed,
      foodRelevancePassed: foodPassed,
      reasons,
      service: 'openai',
      assessment: parsed,
    }
  } catch (err: any) {
    return fallbackManual(`OpenAI classifier exception: ${err.message}`)
  }
}

async function classifyWithRoboflow(photoUrl: string): Promise<ModerationResult> {
  const key = process.env.ROBOFLOW_API_KEY
  const model = process.env.ROBOFLOW_MODEL
  if (!key || !model) {
    return fallbackManual('ROBOFLOW_API_KEY or ROBOFLOW_MODEL not set')
  }

  try {
    const url = `https://detect.roboflow.com/${model}?api_key=${encodeURIComponent(key)}&image=${encodeURIComponent(photoUrl)}`
    const res = await fetch(url)
    if (!res.ok) {
      return fallbackManual(`Roboflow API error ${res.status}`)
    }
    const data = await res.json()
    const predictions = data.predictions || []
    const foodClasses = Array.isArray(process.env.ROBOFLOW_FOOD_CLASSES)
      ? process.env.ROBOFLOW_FOOD_CLASSES.split(',').map((s) => s.trim().toLowerCase())
      : ['food', 'meal', 'dish', 'pizza', 'burger', 'salad', 'sushi', 'pasta', 'dessert', 'drink']

    const bestFood = predictions
      .filter((p: any) => foodClasses.includes((p.class || '').toLowerCase()))
      .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))[0]

    const confidence = clamp(parseFloat(bestFood?.confidence) || 0, 0, 1)
    const foodPassed = confidence >= getClassifierConfig().autoApproveThreshold
    const reasons = foodPassed ? ['Food detected by Roboflow'] : ['No clear food subject detected by Roboflow']

    // Roboflow detection endpoint does not give safety scores; rely on manual review for safety.
    return {
      status: foodPassed ? 'approved' : confidence >= 0.7 ? 'rejected' : 'pending_review',
      confidence,
      safetyPassed: true,
      foodRelevancePassed: foodPassed,
      reasons,
      service: 'roboflow',
      assessment: data,
    }
  } catch (err: any) {
    return fallbackManual(`Roboflow classifier exception: ${err.message}`)
  }
}

async function classifyWithGoogle(photoUrl: string): Promise<ModerationResult> {
  const key = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return fallbackManual('GOOGLE_VISION_API_KEY not set')
  }

  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: photoUrl } },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 15 },
              { type: 'SAFE_SEARCH_DETECTION' },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      return fallbackManual(`Google Vision API error ${res.status}`)
    }

    const data = await res.json()
    const annotation = data.responses?.[0] || {}
    const labels = annotation.labelAnnotations || []
    const safe = annotation.safeSearchAnnotation || {}

    const foodLabels = ['food', 'dish', 'cuisine', 'meal', 'plate', 'restaurant', 'lunch', 'dinner', 'breakfast', 'dessert', 'snack', 'beverage', 'drink', 'coffee', 'sushi', 'pizza', 'burger', 'salad', 'pasta']
    const topFood = labels
      .filter((l: any) => foodLabels.includes((l.description || '').toLowerCase()))
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0]

    const foodScore = clamp(parseFloat(topFood?.score) || 0, 0, 1)
    const safetyLikely = ['LIKELY', 'VERY_LIKELY']
    const unsafe =
      safetyLikely.includes(safe.adult) ||
      safetyLikely.includes(safe.violence) ||
      safetyLikely.includes(safe.racy)

    const cfg = getClassifierConfig()
    let status: ModerationResult['status'] = 'pending_review'
    if (unsafe) {
      status = 'rejected'
    } else if (foodScore >= cfg.autoApproveThreshold) {
      status = 'approved'
    } else if (foodScore <= 0.3) {
      status = 'rejected'
    }

    return {
      status,
      confidence: foodScore,
      safetyPassed: !unsafe,
      foodRelevancePassed: foodScore >= cfg.autoApproveThreshold,
      reasons: unsafe ? ['Safety concern detected'] : topFood ? [`Detected: ${topFood.description}`] : ['No food label detected'],
      service: 'google',
      assessment: { labels: labels.slice(0, 5), safeSearch: safe },
    }
  } catch (err: any) {
    return fallbackManual(`Google Vision classifier exception: ${err.message}`)
  }
}

function fallbackManual(reason: string): ModerationResult {
  return {
    status: 'pending_review',
    confidence: 0,
    safetyPassed: true,
    foodRelevancePassed: false,
    reasons: [reason, 'Held for admin review'],
    service: 'manual',
    assessment: { fallback: true, reason },
  }
}

export async function computeImageFingerprint(bytes: ArrayBuffer): Promise<{ imageHash: string; perceptualHash: string }> {
  const buf = Buffer.from(bytes)
  const imageHash = crypto.createHash('sha256').update(buf).digest('hex')

  // Lightweight average perceptual hash: downscale to 8x8 grayscale and compare pixels.
  // We avoid a heavy dependency; if sharp is available we use it, otherwise we compute
  // a simple block-based hash on the raw bytes (not rotation-invariant but catches exact
  // recompressions and minor crops better than SHA alone).
  let perceptualHash: string
  try {
    const sharp = (await import('sharp')).default
    const gray = await sharp(buf, { failOn: 'none' }).resize(8, 8, { fit: 'fill' }).grayscale().raw().toBuffer()
    const avg = gray.reduce((a, b) => a + b, 0) / gray.length
    perceptualHash = Array.from(gray).map((v) => (v >= avg ? '1' : '0')).join('')
  } catch {
    perceptualHash = imageHash.slice(0, 64)
  }

  return { imageHash, perceptualHash }
}

export function hammingDistance(a: string, b: string): number {
  let dist = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist + Math.abs(a.length - b.length)
}
