import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { companyListQuerySchema } from '@cleanly/types'

export async function discoveryRoutes(fastify: FastifyInstance) {
  // GET /companies — public listing filtered by city + category (DISC-03, DISC-04)
  fastify.get('/', {
    schema: { querystring: companyListQuerySchema },
  }, async (request) => {
    const { city_id, category, page } = request.query as z.infer<typeof companyListQuerySchema>
    const PAGE_SIZE = 20

    const companies = await prisma.company.findMany({
      where: {
        is_verified: true,
        city_id,
        services: { some: { category } },
      },
      select: {
        id: true,
        name_en: true,
        name_ar: true,
        slug: true,
        logo_url: true,
        avg_rating: true,
        review_count: true,
        city_id: true,
        packages: {
          where: { category, is_active: true },
          orderBy: { base_price: 'asc' },
          take: 1,
          select: { base_price: true },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { avg_rating: 'desc' },
    })

    // Map to response shape with starting_price
    const items = companies.map((c: any) => ({
      id: c.id,
      name_en: c.name_en,
      name_ar: c.name_ar,
      slug: c.slug,
      logo_url: c.logo_url,
      avg_rating: Number(c.avg_rating),
      review_count: c.review_count,
      starting_price: c.packages[0]?.base_price ?? 0,
      city_id: c.city_id,
    }))

    return { companies: items, page }
  })

  // GET /companies/:slug — full company profile with packages + add-ons + reviews (DISC-05)
  fastify.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params

    const company = await prisma.company.findUnique({
      where: { slug },
      include: {
        packages: {
          where: { is_active: true },
          orderBy: { base_price: 'asc' },
          include: {
            add_ons: { where: { is_active: true } },
          },
        },
      },
    })

    if (!company) return reply.status(404).send({ error: 'Company not found' })

    // Fetch 5 most recent reviews separately
    const reviews = await prisma.review.findMany({
      where: { company_id: company.id },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { id: true, rating: true, comment: true, created_at: true },
    })

    return {
      id: company.id,
      name_en: company.name_en,
      name_ar: company.name_ar,
      description_en: company.description_en,
      description_ar: company.description_ar,
      slug: company.slug,
      logo_url: company.logo_url,
      avg_rating: Number(company.avg_rating),
      review_count: company.review_count,
      city_id: company.city_id,
      carpet_lead_time_days: company.carpet_lead_time_days,
      packages: company.packages.map((p: any) => ({
        id: p.id,
        category: p.category,
        name_en: p.name_en,
        name_ar: p.name_ar,
        description_en: p.description_en,
        description_ar: p.description_ar,
        base_price: p.base_price,
        add_ons: p.add_ons.map((a: any) => ({
          id: a.id,
          name_en: a.name_en,
          name_ar: a.name_ar,
          price: a.price,
        })),
      })),
      reviews: reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at.toISOString(),
      })),
    }
  })
}
