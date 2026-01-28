/**
 * Calculate composed interest for overdue debts
 * Rule: 40% per month
 * Formula: Amount * (1.40 ^ months)
 */
export function calculateInterest(amount: number, dueDate: Date): { interest: number, total: number, daysOverdue: number } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)

    // If not overdue, return 0 interest
    if (today <= due) {
        return { interest: 0, total: amount, daysOverdue: 0 }
    }

    // Calculate difference in milliseconds
    const diffTime = Math.abs(today.getTime() - due.getTime())
    // Calculate difference in days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Calculate months (approximate) or use days for precision? 
    // The prompt example: "vencida há 2 meses = R$ 100 * 1,40²". This implies full months or fractional?
    // Usually financial math uses fractional.
    const months = diffDays / 30

    // Calculate factor: 1.40 ^ months
    const factor = Math.pow(1.40, months)

    const total = amount * factor
    const interest = total - amount

    return {
        interest,
        total,
        daysOverdue: diffDays
    }
}
