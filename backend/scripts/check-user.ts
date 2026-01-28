import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    })
    console.log('User found:', user)

    if (user) {
        const valid = await bcrypt.compare('123456', user.password)
        console.log('Password "123456" valid?', valid)
    }
}

main().finally(() => prisma.$disconnect())
