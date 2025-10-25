import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  console.log('🧹 Clearing existing data...')
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()
  await prisma.outlet.deleteMany()

  // Hash password untuk semua user
  const hashedPassword = await hash('password', 12)

  // Create outlets
  console.log('🏪 Creating outlets...')
  const outlets = await Promise.all([
    prisma.outlet.create({
      data: {
        namaOutlet: 'Jakarta Pusat',
        alamat: 'Jl. Thamrin No. 123, Jakarta Pusat',
        whatsappNumber: '+62 812 3456 7890'
      }
    }),
    prisma.outlet.create({
      data: {
        namaOutlet: 'Bandung Center',
        alamat: 'Jl. Braga No. 45, Bandung',
        whatsappNumber: '+62 822 9876 5432'
      }
    }),
    prisma.outlet.create({
      data: {
        namaOutlet: 'Surabaya Mall',
        alamat: 'Jl. Pemuda No. 67, Surabaya',
        whatsappNumber: '+62 831 5555 6666'
      }
    }),
    prisma.outlet.create({
      data: {
        namaOutlet: 'Medan Plaza',
        alamat: 'Jl. Guru Patimpus No. 89, Medan',
        whatsappNumber: '+62 821 7777 8888'
      }
    }),
    prisma.outlet.create({
      data: {
        namaOutlet: 'Yogya Heritage',
        alamat: 'Jl. Malioboro No. 12, Yogyakarta',
        whatsappNumber: '+62 812 9999 0000'
      }
    })
  ])

  console.log(`✅ Created ${outlets.length} outlets`)

  // Create users dengan berbagai role
  console.log('👤 Creating users...')
  const users = await Promise.all([
    // SUPERADMIN
    prisma.user.create({
      data: {
        name: 'Super Administrator',
        noHp: '081234567890',
        password: hashedPassword,
        role: 'SUPERADMIN',
        email: 'superadmin@example.com',
      }
    }),
    // ADMIN users
    prisma.user.create({
      data: {
        name: 'Admin Jakarta',
        noHp: '081234567891',
        password: hashedPassword,
        role: 'ADMIN',
        outletId: outlets[0].id, // Jakarta
        email: 'admin.jakarta@example.com',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Admin Bandung',
        noHp: '081234567892',
        password: hashedPassword,
        role: 'ADMIN',
        outletId: outlets[1].id, // Bandung
        email: 'admin.bandung@example.com',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Admin Surabaya',
        noHp: '081234567893',
        password: hashedPassword,
        role: 'ADMIN',
        outletId: outlets[2].id, // Surabaya
        email: 'admin.surabaya@example.com',
      }
    }),
    // USER (Marketing staff) - satu per outlet
    prisma.user.create({
      data: {
        name: 'Marketing Jakarta',
        noHp: '081234567894',
        password: hashedPassword,
        role: 'USER',
        outletId: outlets[0].id, // Jakarta
        email: 'user.jakarta@example.com',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Marketing Bandung',
        noHp: '081234567895',
        password: hashedPassword,
        role: 'USER',
        outletId: outlets[1].id, // Bandung
        email: 'user.bandung@example.com',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Marketing Surabaya',
        noHp: '081234567896',
        password: hashedPassword,
        role: 'USER',
        outletId: outlets[2].id, // Surabaya
        email: 'user.surabaya@example.com',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Marketing Medan',
        noHp: '081234567897',
        password: hashedPassword,
        role: 'USER',
        outletId: outlets[3].id, // Medan
        email: 'user.medan@example.com',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Marketing Yogya',
        noHp: '081234567898',
        password: hashedPassword,
        role: 'USER',
        outletId: outlets[4].id, // Yogya
        email: 'user.yogya@example.com',
      }
    })
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create sample customers untuk setiap outlet
  console.log('👥 Creating customers...')
  const customerData = [
    // Jakarta customers (8 customers)
    { nama: 'Budi Santoso', noWa: '081211111111', outletId: outlets[0].id },
    { nama: 'Siti Rahayu', noWa: '081322222222', outletId: outlets[0].id },
    { nama: 'Ahmad Yani', noWa: '081433333333', outletId: outlets[0].id },
    { nama: 'Dewi Lestari', noWa: '081544444444', outletId: outlets[0].id },
    { nama: 'Rini Susanti', noWa: '081655555555', outletId: outlets[0].id },
    { nama: 'Tono Wijaya', noWa: '081766666666', outletId: outlets[0].id },
    { nama: 'Maya Sari', noWa: '081877777777', outletId: outlets[0].id },
    { nama: 'Edi Gunawan', noWa: '081988888888', outletId: outlets[0].id },

    // Bandung customers (6 customers)
    { nama: 'Indra Pratama', noWa: '082211111111', outletId: outlets[1].id },
    { nama: 'Lina Marlina', noWa: '082322222222', outletId: outlets[1].id },
    { nama: 'Joko Susilo', noWa: '082433333333', outletId: outlets[1].id },
    { nama: 'Ratna Dewi', noWa: '082544444444', outletId: outlets[1].id },
    { nama: 'Bambang Eko', noWa: '082655555555', outletId: outlets[1].id },
    { nama: 'Sri Mulyani', noWa: '082766666666', outletId: outlets[1].id },

    // Surabaya customers (5 customers)
    { nama: 'Agus Salim', noWa: '083111111111', outletId: outlets[2].id },
    { nama: 'Fitri Handayani', noWa: '083222222222', outletId: outlets[2].id },
    { nama: 'Dedi Kurniawan', noWa: '083333333333', outletId: outlets[2].id },
    { nama: 'Yuni Astuti', noWa: '083444444444', outletId: outlets[2].id },
    { nama: 'Hendra Saputra', noWa: '083555555555', outletId: outlets[2].id },

    // Medan customers (4 customers)
    { nama: 'Rizki Amelia', noWa: '082111111111', outletId: outlets[3].id },
    { nama: 'Bayu Setiawan', noWa: '082122222222', outletId: outlets[3].id },
    { nama: 'Citra Kirana', noWa: '082133333333', outletId: outlets[3].id },
    { nama: 'Wahyu Hidayat', noWa: '082144444444', outletId: outlets[3].id },

    // Yogya customers (3 customers)
    { nama: 'Fajar Nugroho', noWa: '081299991111', outletId: outlets[4].id },
    { nama: 'Diah Permata', noWa: '081299992222', outletId: outlets[4].id },
    { nama: 'Gilang Ramadan', noWa: '081299993333', outletId: outlets[4].id }
  ]

  // Insert customers
  await prisma.customer.createMany({
    data: customerData,
    skipDuplicates: true
  })

  console.log(`✅ Created ${customerData.length} customers`)

  // Summary
  console.log(`
🎉 Database seeded successfully!

📱 LOGIN CREDENTIALS (Phone Numbers):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 SUPERADMIN: 081234567890 / password
🟡 ADMIN Jakarta: 081234567891 / password  
🟡 ADMIN Bandung: 081234567892 / password
🟡 ADMIN Surabaya: 081234567893 / password
🔵 USER Jakarta: 081234567894 / password
🔵 USER Bandung: 081234567895 / password
🔵 USER Surabaya: 081234567896 / password
🔵 USER Medan: 081234567897 / password
🔵 USER Yogya: 081234567898 / password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DATA SUMMARY:
• ${outlets.length} Outlets
• ${users.length} Users  
• ${customerData.length} Customers

📍 OUTLET DISTRIBUTION:
• Jakarta: 8 customers
• Bandung: 6 customers  
• Surabaya: 5 customers
• Medan: 4 customers
• Yogya: 3 customers

🎯 Ready to test all features!
`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })