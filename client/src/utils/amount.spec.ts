import { microAlgosToAlgo, formatAlgoAmount, algoToMicroAlgo } from './amount'

describe('microAlgosToAlgo', () => {
  it('should convert microAlgos to ALGO by dividing by 1,000,000', () => {
    expect(microAlgosToAlgo(1000000)).toBe(1)
    expect(microAlgosToAlgo(5000000)).toBe(5)
    expect(microAlgosToAlgo(2500000)).toBe(2.5)
    expect(microAlgosToAlgo(100000)).toBe(0.1)
  })

  it('should handle zero', () => {
    expect(microAlgosToAlgo(0)).toBe(0)
  })

  it('should handle negative numbers', () => {
    expect(microAlgosToAlgo(-1000000)).toBe(-1)
  })
})

describe('formatAlgoAmount', () => {
  it('should format microAlgos as ALGO with 2 decimal places', () => {
    expect(formatAlgoAmount(1000000)).toBe('1.00 ALGO')
    expect(formatAlgoAmount(5000000)).toBe('5.00 ALGO')
    expect(formatAlgoAmount(1234567)).toBe('1.23 ALGO')
  })

  it('should show up to 6 decimal places for fractional ALGO', () => {
    expect(formatAlgoAmount(100000)).toBe('0.10 ALGO')
    expect(formatAlgoAmount(10000)).toBe('0.01 ALGO')
    expect(formatAlgoAmount(1)).toBe('0.000001 ALGO')
    expect(formatAlgoAmount(123456)).toBe('0.123456 ALGO')
  })

  it('should handle zero', () => {
    expect(formatAlgoAmount(0)).toBe('0.00 ALGO')
  })

  it('should handle negative numbers', () => {
    expect(formatAlgoAmount(-1000000)).toBe('-1.00 ALGO')
    expect(formatAlgoAmount(-1234567)).toBe('-1.23 ALGO')
  })
})

describe('algoToMicroAlgo', () => {
  it('should convert ALGO to microAlgos by multiplying by 1,000,000', () => {
    expect(algoToMicroAlgo(1)).toBe(1000000)
    expect(algoToMicroAlgo(5)).toBe(5000000)
    expect(algoToMicroAlgo(2.5)).toBe(2500000)
    expect(algoToMicroAlgo(0.1)).toBe(100000)
  })

  it('should round to integer', () => {
    expect(algoToMicroAlgo(0.1234567)).toBe(123457)
    expect(algoToMicroAlgo(0.000001)).toBe(1)
    expect(algoToMicroAlgo(0.0000001)).toBe(0)
  })

  it('should handle zero', () => {
    expect(algoToMicroAlgo(0)).toBe(0)
  })

  it('should handle negative numbers', () => {
    expect(algoToMicroAlgo(-1)).toBe(-1000000)
    expect(algoToMicroAlgo(-2.5)).toBe(-2500000)
  })
})