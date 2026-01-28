// ===== VALIDATORS =====

/**
 * Validate CPF number
 */
export function isValidCPF(cpf: string): boolean {
    const numbers = cpf.replace(/\D/g, '')

    if (numbers.length !== 11) return false
    if (/^(\d)\1+$/.test(numbers)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers.charAt(i)) * (10 - i)
    }
    let digit = (sum * 10) % 11
    if (digit === 10) digit = 0
    if (digit !== parseInt(numbers.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
        sum += parseInt(numbers.charAt(i)) * (11 - i)
    }
    digit = (sum * 10) % 11
    if (digit === 10) digit = 0
    if (digit !== parseInt(numbers.charAt(10))) return false

    return true
}

/**
 * Validate barcode (EAN-13 format)
 */
export function isValidBarcode(barcode: string): boolean {
    const numbers = barcode.replace(/\D/g, '')
    return numbers.length === 13 || numbers.length === 8
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: number): boolean {
    return typeof value === 'number' && value > 0 && isFinite(value)
}

/**
 * Validate non-empty string
 */
export function isNonEmptyString(value: string): boolean {
    return typeof value === 'string' && value.trim().length > 0
}
