
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Connecting to database...')
        const count = await prisma.customer.count()
        console.log(`Total customers in database: ${count}`)

        if (count > 0) {
            const customers = await prisma.customer.findMany({ take: 5 })
            console.log('First 5 customers:', JSON.stringify(customers, null, 2))
        } else {
            console.log('No customers found. Database seems empty.')
        }
    } catch (error) {
        console.error('Error querying database:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
