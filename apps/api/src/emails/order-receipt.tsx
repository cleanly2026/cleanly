import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components'

export interface OrderReceiptEmailProps {
  orderId: string
  orderNumber: string
  language: 'en' | 'ar'
  serviceName: string
  amountTotal: number   // in fils
  platformFee: number   // in fils
  companyName: string
  completedAt: string   // ISO date string
}

export function OrderReceiptEmail(props: OrderReceiptEmailProps) {
  const isAr = props.language === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const amountAed = (props.amountTotal / 100).toFixed(2)
  const feeAed = (props.platformFee / 100).toFixed(2)
  const subtotalAed = ((props.amountTotal - props.platformFee) / 100).toFixed(2)

  return (
    <Html lang={props.language} dir={dir}>
      <Head />
      <Body style={{ fontFamily: 'Cairo, Arial, sans-serif', backgroundColor: '#F8F7F4' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
          <Text style={{ fontSize: 28, fontWeight: 600, color: '#1A2744' }}>
            {isAr ? 'إيصال طلبك' : 'Your Order Receipt'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {isAr ? `رقم الطلب: #${props.orderNumber}` : `Order #${props.orderNumber}`}
          </Text>
          <Hr />
          <Section>
            <Text style={{ fontSize: 16 }}>
              {isAr ? 'الخدمة' : 'Service'}: {props.serviceName}
            </Text>
            <Text style={{ fontSize: 16 }}>
              {isAr ? 'الشركة' : 'Company'}: {props.companyName}
            </Text>
            <Text style={{ fontSize: 16 }}>
              {isAr ? 'تاريخ الإنجاز' : 'Completed'}: {props.completedAt}
            </Text>
          </Section>
          <Hr />
          <Section>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {isAr ? 'المجموع الفرعي' : 'Subtotal'}: AED {subtotalAed}
            </Text>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {isAr ? 'رسوم المنصة' : 'Platform fee'}: AED {feeAed}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 600 }}>
              {isAr ? 'الإجمالي' : 'Total'}: AED {amountAed}
            </Text>
          </Section>
          <Hr />
          <Text style={{ fontSize: 12, color: '#999' }}>
            {isAr ? 'شكرا لاستخدامك Cleanly' : 'Thank you for using Cleanly'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
