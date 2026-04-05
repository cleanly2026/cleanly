import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components'

export interface CompanyRejectionEmailProps {
  companyName: string
  reason: string
  language: 'en' | 'ar'
}

export function CompanyRejectionEmail(props: CompanyRejectionEmailProps) {
  const isAr = props.language === 'ar'

  return (
    <Html lang={props.language} dir={isAr ? 'rtl' : 'ltr'}>
      <Head />
      <Body style={{ fontFamily: 'Cairo, Arial, sans-serif', backgroundColor: '#F8F7F4' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
          <Text style={{ fontSize: 28, fontWeight: 600, color: '#1A2744' }}>
            {isAr ? '\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0634\u0631\u0643\u062A\u0643\u0645' : 'Company Application Rejected'}
          </Text>
          <Text style={{ fontSize: 16 }}>
            {isAr ? `\u0627\u0644\u0634\u0631\u0643\u0629: ${props.companyName}` : `Company: ${props.companyName}`}
          </Text>
          <Hr />
          <Section>
            <Text style={{ fontSize: 16, fontWeight: 600 }}>
              {isAr ? '\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636' : 'Reason for Rejection'}
            </Text>
            <Text style={{ fontSize: 14, color: '#333' }}>
              {props.reason}
            </Text>
          </Section>
          <Hr />
          <Text style={{ fontSize: 12, color: '#999' }}>
            {isAr
              ? '\u064A\u0645\u0643\u0646\u0643\u0645 \u062A\u0642\u062F\u064A\u0645 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F \u0628\u0639\u062F \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0623\u0639\u0644\u0627\u0647'
              : 'You may reapply after addressing the above feedback'}
          </Text>
          <Text style={{ fontSize: 12, color: '#999' }}>
            {isAr ? '\u0641\u0631\u064A\u0642 Cleanly' : 'The Cleanly Team'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
