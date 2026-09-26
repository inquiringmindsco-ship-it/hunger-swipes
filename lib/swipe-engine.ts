export type SwipeDirection = 'left' | 'right'
export type GestureIntent = 'undecided' | 'horizontal' | 'vertical'

export interface GesturePoint {
  x: number
  y: number
}

export interface GestureSample {
  intent: GestureIntent
  deltaX: number
  deltaY: number
  displayX: number
  progress: number
}

export const INTENT_DISTANCE_PX = 10
export const HORIZONTAL_DOMINANCE = 1.2

export function swipeThreshold(viewportWidth: number) {
  return Math.round(Math.min(112, Math.max(72, viewportWidth * 0.24)))
}

export function sampleGesture(
  start: GesturePoint,
  current: GesturePoint,
  previousIntent: GestureIntent,
  viewportWidth: number,
): GestureSample {
  const deltaX = current.x - start.x
  const deltaY = current.y - start.y
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  let intent = previousIntent

  if (intent === 'undecided' && Math.hypot(deltaX, deltaY) >= INTENT_DISTANCE_PX) {
    if (absX > absY * HORIZONTAL_DOMINANCE) intent = 'horizontal'
    else if (absY > absX * HORIZONTAL_DOMINANCE) intent = 'vertical'
  }

  const threshold = swipeThreshold(viewportWidth)
  const displayX = intent === 'horizontal' ? deltaX : 0
  return {
    intent,
    deltaX,
    deltaY,
    displayX,
    progress: Math.min(1, Math.abs(displayX) / threshold),
  }
}

export function committedDirection(sample: GestureSample, viewportWidth: number): SwipeDirection | null {
  if (sample.intent !== 'horizontal') return null
  if (Math.abs(sample.deltaX) < swipeThreshold(viewportWidth)) return null
  return sample.deltaX > 0 ? 'right' : 'left'
}

export function isSystemEdgeStart(clientX: number, viewportWidth: number, inset = 18) {
  return clientX <= inset || clientX >= viewportWidth - inset
}
