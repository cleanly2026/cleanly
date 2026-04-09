import { PrismaClient, OrderStatus, OrderType, ServiceCategory, UserRole } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database for private beta...')

  // Clean existing seed data (idempotent)
  await prisma.dispute.deleteMany({})
  await prisma.orderItem.deleteMany({})
  await prisma.carpetOrderDetails.deleteMany({})
  await prisma.order.deleteMany({})
  await prisma.addOn.deleteMany({})
  await prisma.package.deleteMany({})
  await prisma.companyService.deleteMany({})
  await prisma.refreshToken.deleteMany({})
  await prisma.washerProfile.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.company.deleteMany({})
  await prisma.city.deleteMany({})

  // --- Cities ---
  const dubai = await prisma.city.create({ data: { name_en: 'Dubai', name_ar: 'دبي', country: 'AE' } })
  const abuDhabi = await prisma.city.create({ data: { name_en: 'Abu Dhabi', name_ar: 'أبو ظبي', country: 'AE' } })
  const sharjah = await prisma.city.create({ data: { name_en: 'Sharjah', name_ar: 'الشارقة', country: 'AE' } })

  // --- Admin user ---
  const admin = await prisma.user.create({
    data: {
      role: UserRole.admin,
      email: 'admin@cleanly.ae',
      google_id: 'google-admin-seed',
      preferred_language: 'en',
    },
  })

  // --- Test customer (English) ---
  const customer = await prisma.user.create({
    data: {
      role: UserRole.customer,
      phone: '+971500000001',
      preferred_language: 'en',
      wallet_balance: 5000, // AED 50.00
    },
  })

  // --- Test customer (Arabic) ---
  const customerAr = await prisma.user.create({
    data: {
      role: UserRole.customer,
      phone: '+971500000002',
      preferred_language: 'ar',
      email: 'customer.ar@test.com',
    },
  })

  // --- Company 1: Dubai Car Wash + Sofa (verified) ---
  const company1 = await prisma.company.create({
    data: {
      name_en: 'Sparkle Auto Care',
      name_ar: 'سباركل للعناية بالسيارات',
      description_en: 'Premium car wash and sofa cleaning in Dubai',
      description_ar: 'غسيل سيارات وتنظيف كنب فاخر في دبي',
      slug: 'sparkle-auto-care',
      city_id: dubai.id,
      is_verified: true,
      commission_rate: 15,
      avg_rating: 4.50,
      review_count: 23,
    },
  })

  await prisma.user.create({
    data: {
      role: UserRole.company_member,
      email: 'admin@sparkle.ae',
      password_hash: await bcryptjs.hash('password123', 10),
      totp_enabled: false,
      company_id: company1.id,
    },
  })

  const washer1 = await prisma.user.create({
    data: {
      role: UserRole.washer,
      phone: '+971500000010',
      pin_hash: await bcryptjs.hash('1234', 10),
      company_id: company1.id,
    },
  })
  await prisma.washerProfile.create({ data: { user_id: washer1.id, is_online: true } })

  const washer2 = await prisma.user.create({
    data: {
      role: UserRole.washer,
      phone: '+971500000011',
      pin_hash: await bcryptjs.hash('1234', 10),
      company_id: company1.id,
    },
  })
  await prisma.washerProfile.create({ data: { user_id: washer2.id, is_online: false } })

  await prisma.companyService.createMany({
    data: [
      { company_id: company1.id, category: ServiceCategory.car_wash },
      { company_id: company1.id, category: ServiceCategory.sofa },
    ],
  })

  const pkg1 = await prisma.package.create({
    data: {
      company_id: company1.id, category: ServiceCategory.car_wash,
      name_en: 'Basic Wash', name_ar: 'غسيل أساسي',
      description_en: 'Exterior wash and dry', description_ar: 'غسيل وتجفيف خارجي',
      base_price: 5000, // AED 50
    },
  })

  await prisma.package.create({
    data: {
      company_id: company1.id, category: ServiceCategory.car_wash,
      name_en: 'Premium Detail', name_ar: 'تفصيل فاخر',
      description_en: 'Full interior and exterior detail', description_ar: 'تفصيل داخلي وخارجي كامل',
      base_price: 15000, // AED 150
    },
  })

  const sofaPkg = await prisma.package.create({
    data: {
      company_id: company1.id, category: ServiceCategory.sofa,
      name_en: 'Sofa Deep Clean', name_ar: 'تنظيف عميق للكنب',
      description_en: 'Deep steam clean per seat', description_ar: 'تنظيف بالبخار العميق لكل مقعد',
      base_price: 8000, // AED 80
    },
  })

  // --- Company 2: Abu Dhabi Carpet (verified) ---
  const company2 = await prisma.company.create({
    data: {
      name_en: 'Gulf Carpet Masters',
      name_ar: 'خبراء السجاد الخليجي',
      description_en: 'Professional carpet cleaning with pickup and return',
      description_ar: 'تنظيف سجاد احترافي مع خدمة الاستلام والتوصيل',
      slug: 'gulf-carpet-masters',
      city_id: abuDhabi.id,
      is_verified: true,
      commission_rate: 18,
      avg_rating: 4.75,
      review_count: 41,
      carpet_lead_time_days: 3,
    },
  })

  await prisma.user.create({
    data: {
      role: UserRole.company_member,
      email: 'admin@gulfcarpet.ae',
      password_hash: await bcryptjs.hash('password123', 10),
      company_id: company2.id,
    },
  })

  const washer3 = await prisma.user.create({
    data: { role: UserRole.washer, phone: '+971500000020', pin_hash: await bcryptjs.hash('1234', 10), company_id: company2.id },
  })
  await prisma.washerProfile.create({ data: { user_id: washer3.id, is_online: true } })

  await prisma.companyService.create({ data: { company_id: company2.id, category: ServiceCategory.carpet } })

  const carpetPkg = await prisma.package.create({
    data: {
      company_id: company2.id, category: ServiceCategory.carpet,
      name_en: 'Standard Carpet Clean', name_ar: 'تنظيف سجاد قياسي',
      description_en: 'Professional machine wash per carpet', description_ar: 'غسيل آلي احترافي لكل سجادة',
      base_price: 12000, // AED 120
    },
  })

  // --- Company 3: Sharjah (PENDING — not verified, for admin review testing) ---
  const company3 = await prisma.company.create({
    data: {
      name_en: 'Sharjah Clean Co',
      name_ar: 'شركة الشارقة للنظافة',
      description_en: 'Multi-service cleaning company in Sharjah',
      description_ar: 'شركة خدمات تنظيف متعددة في الشارقة',
      slug: 'sharjah-clean-co',
      city_id: sharjah.id,
      is_verified: false, // Pending admin review
      commission_rate: 15,
    },
  })

  await prisma.user.create({
    data: {
      role: UserRole.company_member,
      email: 'admin@sharjahclean.ae',
      password_hash: await bcryptjs.hash('password123', 10),
      company_id: company3.id,
    },
  })

  // --- Sample orders in various states ---

  // 1. Completed on-site order (for dispute testing)
  const order1 = await prisma.order.create({
    data: {
      type: OrderType.on_site,
      status: OrderStatus.completed,
      customer_id: customer.id,
      company_id: company1.id,
      washer_id: washer1.id,
      amount_subtotal: 5000,
      platform_fee: 750,
      amount_total: 5750,
      payment_status: 'paid',
      completed_at: new Date(),
    },
  })
  await prisma.orderItem.create({ data: { order_id: order1.id, package_id: pkg1.id, quantity: 1, unit_price: 5000 } })

  // 2. Pending order
  await prisma.order.create({
    data: {
      type: OrderType.on_site,
      status: OrderStatus.pending,
      customer_id: customer.id,
      company_id: company1.id,
      amount_subtotal: 15000,
      platform_fee: 2250,
      amount_total: 17250,
    },
  })

  // 3. En route order
  await prisma.order.create({
    data: {
      type: OrderType.on_site,
      status: OrderStatus.washer_en_route,
      customer_id: customerAr.id,
      company_id: company1.id,
      washer_id: washer1.id,
      amount_subtotal: 8000,
      platform_fee: 1200,
      amount_total: 9200,
      payment_status: 'paid',
    },
  })

  // 4. Carpet order in cleaning
  const carpetOrder = await prisma.order.create({
    data: {
      type: OrderType.carpet,
      status: OrderStatus.in_cleaning,
      customer_id: customer.id,
      company_id: company2.id,
      washer_id: washer3.id,
      amount_subtotal: 24000,
      platform_fee: 4320,
      amount_total: 28320,
      payment_status: 'paid',
    },
  })
  await prisma.orderItem.create({ data: { order_id: carpetOrder.id, package_id: carpetPkg.id, quantity: 2, unit_price: 12000 } })
  await prisma.carpetOrderDetails.create({
    data: {
      order_id: carpetOrder.id,
      carpet_count: 2,
      pickup_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      return_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    },
  })

  // 5. Disputed completed order
  const disputedOrder = await prisma.order.create({
    data: {
      type: OrderType.on_site,
      status: OrderStatus.completed,
      customer_id: customerAr.id,
      company_id: company1.id,
      washer_id: washer2.id,
      amount_subtotal: 8000,
      platform_fee: 1200,
      amount_total: 9200,
      payment_status: 'paid',
      completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.orderItem.create({ data: { order_id: disputedOrder.id, package_id: sofaPkg.id, quantity: 1, unit_price: 8000 } })
  await prisma.dispute.create({
    data: {
      order_id: disputedOrder.id,
      customer_id: customerAr.id,
      reason: 'quality_issue',
      note: 'The sofa was not cleaned properly, stains still visible',
      status: 'open',
    },
  })

  // --- Audit log entries ---
  await prisma.auditLog.create({
    data: { admin_id: admin.id, action: 'company.verify', entity: 'Company', entity_id: company1.id, metadata: { company_name: 'Sparkle Auto Care' } },
  })
  await prisma.auditLog.create({
    data: { admin_id: admin.id, action: 'company.verify', entity: 'Company', entity_id: company2.id, metadata: { company_name: 'Gulf Carpet Masters' } },
  })

  console.log('Seed complete!')
  console.log(`  Cities: 3 (Dubai, Abu Dhabi, Sharjah)`)
  console.log(`  Companies: 3 (2 verified, 1 pending review)`)
  console.log(`  Users: 1 admin, 2 customers, 3 washers, 3 company admins`)
  console.log(`  Orders: 5 (completed, pending, en_route, in_cleaning, disputed)`)
  console.log(`  Disputes: 1 open`)
  console.log(`  Test customer phone: +971500000001`)
  console.log(`  Test washer phone: +971500000010 PIN: 1234`)
  console.log(`  Test company email: admin@sparkle.ae password: password123`)
  console.log(`  Admin email: admin@cleanly.ae (Google SSO)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
