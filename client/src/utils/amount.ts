/**
 * Convert microAlgos to ALGO
 * @param microAlgos Amount in microAlgos
 * @returns Amount in ALGO
 */
export function microAlgosToAlgo(microAlgos: number): number {
  return microAlgos / 1000000
}

/**
 * Format microAlgos as a human-readable ALGO amount
 * @param microAlgos Amount in microAlgos
 * @returns Formatted string like "1.23 ALGO"
 */
export function formatAlgoAmount(microAlgos: number): string {
  const algo = microAlgosToAlgo(microAlgos)
  
  if (algo === 0) {
    return '0.00 ALGO'
  }
  
  const absAlgo = Math.abs(algo)
  
  // For whole ALGO amounts (>= 1), show 2 decimal places
  if (absAlgo >= 1) {
    return `${algo.toFixed(2)} ALGO`
  }
  
  // For fractional ALGO amounts, determine how many decimal places we need
  // We need to show enough decimal places to represent the exact microAlgos value
  const fractionalMicroAlgos = Math.abs(microAlgos % 1000000)
  
  // Count trailing zeros in the fractional part
  let decimalPlaces = 6
  let temp = fractionalMicroAlgos
  
  while (temp > 0 && temp % 10 === 0) {
    decimalPlaces--
    temp /= 10
  }
  
  // Ensure at least 2 decimal places
  decimalPlaces = Math.max(decimalPlaces, 2)
  
  return `${algo.toFixed(decimalPlaces)} ALGO`
}

/**
 * Convert ALGO to microAlgos
 * @param algo Amount in ALGO
 * @returns Amount in microAlgos (rounded to integer)
 */
export function algoToMicroAlgo(algo: number): number {
  return Math.round(algo * 1000000)
}