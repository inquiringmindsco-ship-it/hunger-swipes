import { describe, expect, it } from 'vitest'
import { committedDirection, sampleGesture, swipeThreshold } from '@/lib/swipe-engine'

const start = { x: 160, y: 240 }

describe('swipe gesture intent', () => {
  it('commits a right swipe after a dominant horizontal drag', () => {
    const sample = sampleGesture(start, { x: 270, y: 250 }, 'undecided', 390)
    expect(sample.intent).toBe('horizontal')
    expect(committedDirection(sample, 390)).toBe('right')
  })

  it('commits a left swipe after a dominant horizontal drag', () => {
    const sample = sampleGesture(start, { x: 50, y: 230 }, 'undecided', 390)
    expect(committedDirection(sample, 390)).toBe('left')
  })

  it('returns below-threshold horizontal drags to center', () => {
    const sample = sampleGesture(start, { x: start.x + swipeThreshold(390) - 1, y: 242 }, 'undecided', 390)
    expect(committedDirection(sample, 390)).toBeNull()
  })

  it('locks diagonal movement to the horizontal axis when horizontal intent wins', () => {
    const sample = sampleGesture(start, { x: 260, y: 285 }, 'undecided', 390)
    expect(sample.intent).toBe('horizontal')
    expect(sample.displayX).toBe(100)
  })

  it('does not translate or swipe for vertical intent', () => {
    const sample = sampleGesture(start, { x: 190, y: 360 }, 'undecided', 390)
    expect(sample.intent).toBe('vertical')
    expect(sample.displayX).toBe(0)
    expect(committedDirection(sample, 390)).toBeNull()
  })

  it('keeps an established intent stable', () => {
    const sample = sampleGesture(start, { x: 180, y: 360 }, 'horizontal', 390)
    expect(sample.intent).toBe('horizontal')
  })
})
