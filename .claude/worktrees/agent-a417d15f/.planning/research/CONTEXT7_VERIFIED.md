# Context7 Verified Stack Patterns — ROFAN

**Pulled:** 2026-03-31
**Source:** Context7 MCP (latest official docs)

These are verified, copy-paste-ready patterns for ROFAN's stack. Use these as the authoritative reference when building each phase.

---

## 1. Fastify — TypeScript + Plugins + Route Structure

**Library:** `/fastify/fastify` (v5.x, Score: 85.43)

### App Setup Pattern
```typescript
import Fastify from 'fastify'
import fp from 'fastify-plugin'

const fastify = Fastify()

// Shared plugin (no encapsulation — decorators visible everywhere)
const dbPlugin = fp(async (fastify, options) => {
  fastify.decorate('db', await connectDatabase(options.connectionString))
}, { name: 'database-plugin', fastify: '5.x' })

fastify.register(dbPlugin, { connectionString: process.env.DATABASE_URL })

// Versioned API routes with prefix
fastify.register(require('./routes/v1'), { prefix: '/v1' })
```

### Route with TypeBox Schema Validation (replaces Zod for Fastify)
```typescript
import Fastify from 'fastify'
import { Type } from 'typebox'

fastify.post<{ Body: UserType, Reply: UserType }>(
  '/',
  {
    schema: {
      body: User,
      response: { 200: User },
    },
  },
  (request, reply) => {
    const { name, mail } = request.body;
    reply.status(200).send({ name, mail });
  }
)
```

### Plugin Pattern
```typescript
const fp = require('fastify-plugin')

function myPlugin(instance, options, done) {
  instance.decorate('myPluginFunc', (input) => input.toUpperCase())
  done()
}

module.exports = fp(myPlugin, { fastify: '5.x', name: 'my-plugin' })
```

**Key finding:** Fastify v5 uses TypeBox natively for schema validation (not Zod). The blueprint specified Zod — we can use either, but TypeBox integrates more tightly with Fastify's serialization. Decision: use Zod for shared validation (packages/shared-types) and TypeBox for Fastify route schemas if needed, or use `@fastify/type-provider-zod` to keep Zod everywhere.

### JWT Plugin
**Library:** `/fastify/fastify-jwt` (Score: 94.85)
Available for JWT auth — register as plugin, decorates `request.jwtVerify()`.

---

## 2. Prisma + Neon — Serverless Adapter + Connection Pooling

**Library:** `/llmstxt/prisma_io_llms_txt` (Score: 81.77)

### Neon Serverless Adapter (for Next.js API routes / serverless)
```typescript
import { PrismaClient } from "../prisma/generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

### Singleton Pattern (for Fastify long-running server)
```typescript
import { PrismaClient } from "../prisma/generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Export singleton — never instantiate inside request handlers
export default prisma;
```

**Key finding:** Prisma v6+ requires `@prisma/adapter-neon` for Neon. Use the pooled connection string (`-pooler` endpoint) for serverless (Next.js), and direct connection for Fastify singleton. The generated client path changed to `../prisma/generated/client` in v6+.

---

## 3. Next.js — App Router + i18n + Arabic Font

**Library:** `/vercel/next.js` (Score: 88.49, v16.1.6 available)

### Locale Detection Middleware
```typescript
import { NextResponse } from "next/server";

let locales = ['en', 'ar']

function getLocale(request) {
  // Check cookie → Accept-Language header → default 'en'
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  if (pathnameHasLocale) return
  
  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: ['/((?!_next|api|_vercel).*)'],
}
```

### Google Font Loading (Cairo for Arabic)
```typescript
import { Cairo } from 'next/font/google'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
})

export default function RootLayout({ children, params: { locale } }) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  return (
    <html lang={locale} dir={dir} className={cairo.className}>
      <body>{children}</body>
    </html>
  )
}
```

**Key finding:** Next.js App Router removed built-in i18n — use `next-intl` for route-based locale detection. Cairo font from Google Fonts supports both Arabic and Latin subsets. Set `dir` attribute on `<html>` based on locale. Use CSS logical properties throughout.

---

## 4. Expo — Router + Background GPS + Camera

**Library:** `/expo/expo` (Score: 83.78)

### Background Location Requirements
```
Prerequisites:
1. Location permissions granted (iOS: must be 'Always')
2. Background task defined via TaskManager.defineTask (top-level scope)
3. iOS: 'location' background mode in Info.plist
4. Development build required (NOT Expo Go)

Key limitations:
- Background location STOPS if user terminates app
- Android: terminated app does NOT auto-restart on location event
- iOS: system WILL restart terminated app on geofence events
- Android vendor power-saving aggressively kills background processes
```

### Camera Photo Capture
```tsx
import { useState, useRef } from 'react';
import { View, Button, StyleSheet, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default function CameraScreen() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission?.granted) {
    return <Button title="Grant Camera Permission" onPress={requestPermission} />;
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhoto(photo?.uri ?? null);
    }
  };

  return (
    <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
      <Button title="Take Photo" onPress={takePicture} />
    </CameraView>
  );
}
```

**Key finding:** Expo docs explicitly recommend `react-native-background-geolocation` (transistorsoft) for production GPS tracking. Expo's built-in background location is "provided as-is" with no reliability guarantee. Budget ~$400/year for the transistorsoft license for production washer GPS.

---

## 5. Socket.io — Redis Adapter + Rooms

**Library:** `/websites/socket_io` (Score: 72.9)

### Server with Redis Adapter (required from day 1)
```typescript
import { createClient } from "redis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

const io = new Server({
  adapter: createAdapter(pubClient, subClient)
});

io.listen(3000);
```

### Room Pattern for Per-Order GPS Tracking
```typescript
// Washer joins order room
socket.on('washer:join-order', (orderId) => {
  socket.join(`order:${orderId}`);
});

// Customer joins same room
socket.on('customer:join-order', (orderId) => {
  socket.join(`order:${orderId}`);
});

// Washer broadcasts GPS — only reaches customer in same room
socket.on('washer:location', ({ orderId, lat, lng }) => {
  io.to(`order:${orderId}`).emit('location:update', { lat, lng });
});
```

**Key finding:** Redis adapter uses pub/sub with two clients (publisher + subscriber). Default adapter is in-memory only — cannot scale past one instance. Must use Redis adapter from first production deploy. Set Redis `maxmemory-policy noeviction`.

---

## 6. Stripe Connect — Destination Charges + Refund Reversal

**Library:** `/websites/stripe` (Score: 75.52)

### Create PaymentIntent with Destination Charge
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,          // AED 100.00 in fils
  currency: 'aed',
  automatic_payment_methods: { enabled: true },
  application_fee_amount: 1500,  // 15% platform commission
  transfer_data: {
    destination: connectedAccountId,  // Company's Stripe Connect ID
  },
});
```

### Refund with Transfer Reversal (critical for disputes)
```typescript
const refund = await stripe.refunds.create({
  charge: chargeId,
  reverse_transfer: true,          // Pull funds back from company
  refund_application_fee: true,    // Return platform fee too
});
```

### Webhook Events to Handle
```
Required webhooks for marketplace:
- checkout.session.completed — payment authorized
- checkout.session.async_payment_succeeded — payment confirmed
- checkout.session.async_payment_failed — payment failed
- charge.dispute.created — customer disputed charge
- account.updated — company Connect account status changed
- payout.failed — company payout failed
- transfer.reversed — transfer clawed back
```

**Key finding:** Use `destination charges` (not `on_behalf_of` for UAE). `application_fee_amount` extracts platform commission atomically. Always set `reverse_transfer: true` on refunds to pull funds back from the connected company account. Implement 7-14 day payout delay.

---

## Version Summary (Context7 Verified)

| Technology | Version | Library ID |
|-----------|---------|------------|
| Fastify | v5.x | `/fastify/fastify` |
| Fastify JWT | latest | `/fastify/fastify-jwt` |
| Prisma | v6.19+ / v7.x | `/llmstxt/prisma_io_llms_txt` |
| Next.js | v16.1.6 | `/vercel/next.js` |
| Expo | SDK 54-55 | `/expo/expo` |
| Socket.io | v4.x | `/websites/socket_io` |
| Stripe Node | v19.x | `/websites/stripe` |

---
*Verified via Context7 MCP on 2026-03-31*
