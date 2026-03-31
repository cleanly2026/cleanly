import { PrismaClient } from '../generated/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[seed] Starting...')

  // Seed UAE cities (I18N-03: bilingual — D-03)
  const cities = [
    { name_en: 'Dubai', name_ar: 'دبي' },
    { name_en: 'Abu Dhabi', name_ar: 'أبوظبي' },
    { name_en: 'Sharjah', name_ar: 'الشارقة' },
    { name_en: 'Ajman', name_ar: 'عجمان' },
    { name_en: 'Ras Al Khaimah', name_ar: 'رأس الخيمة' },
    { name_en: 'Fujairah', name_ar: 'الفجيرة' },
    { name_en: 'Umm Al Quwain', name_ar: 'أم القيوين' },
  ]

  for (const city of cities) {
    await prisma.city.upsert({
      where: { id: city.name_en.toLowerCase().replace(/\s+/g, '-') },
      update: city,
      create: {
        id: city.name_en.toLowerCase().replace(/\s+/g, '-'),
        ...city,
      },
    })
  }

  console.log(`[seed] Seeded ${cities.length} cities`)
  console.log('[seed] Done.')
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
