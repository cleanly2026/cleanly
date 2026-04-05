// Bilingual notification copy for all 14 order lifecycle events.
// Placeholder markers (e.g. {service}, {id}) are left as-is for callers to replace.

export const NOTIFICATION_COPY: Record<'en' | 'ar', Record<string, { title: string; body: string }>> = {
  en: {
    order_confirmed: {
      title: 'Booking Confirmed',
      body: 'Your {service} booking has been confirmed. Order #{id}',
    },
    washer_assigned: {
      title: 'Washer Assigned',
      body: '{washerName} has been assigned to your order',
    },
    washer_en_route: {
      title: 'Washer On The Way',
      body: '{washerName} is heading your way — arriving in {eta} minutes',
    },
    washer_arrived: {
      title: 'Washer Arrived',
      body: '{washerName} has arrived at your location',
    },
    in_progress: {
      title: 'Service Started',
      body: 'Your {service} service has started',
    },
    completed: {
      title: 'Service Complete',
      body: 'Your {service} service is complete. A receipt has been sent to your email.',
    },
    refund_issued: {
      title: 'Refund Issued',
      body: 'A refund of AED {amount} has been issued to your card',
    },
    carpet_picked_up: {
      title: 'Carpet Picked Up',
      body: 'Your carpet has been collected for cleaning',
    },
    carpet_ready_for_return: {
      title: 'Carpet Ready',
      body: 'Your carpet is clean and ready for delivery',
    },
    carpet_out_for_return: {
      title: 'Carpet On The Way',
      body: '{washerName} is delivering your carpet',
    },
    carpet_returned: {
      title: 'Carpet Returned',
      body: 'Your carpet has been returned. Service complete.',
    },
    new_job_assignment: {
      title: 'New Job',
      body: 'A new {service} job is available. {countdown} seconds to accept.',
    },
    job_cancelled: {
      title: 'Job Cancelled',
      body: 'The customer cancelled order #{id}',
    },
    company_rejected: {
      title: 'Application Rejected',
      body: 'Your company application for {companyName} was rejected. Reason: {reason}',
    },
  },
  ar: {
    order_confirmed: {
      title: 'تم تأكيد الحجز',
      body: 'تم تأكيد حجز {service} الخاص بك. رقم الطلب #{id}',
    },
    washer_assigned: {
      title: 'تم تعيين العامل',
      body: 'تم تعيين {washerName} لطلبك',
    },
    washer_en_route: {
      title: 'العامل في الطريق',
      body: '{washerName} في طريقه إليك -- يصل خلال {eta} دقيقة',
    },
    washer_arrived: {
      title: 'وصل العامل',
      body: '{washerName} وصل إلى موقعك',
    },
    in_progress: {
      title: 'بدأت الخدمة',
      body: 'بدأت خدمة {service} الخاصة بك',
    },
    completed: {
      title: 'اكتملت الخدمة',
      body: 'اكتملت خدمة {service}. تم إرسال الإيصال إلى بريدك الإلكتروني.',
    },
    refund_issued: {
      title: 'تم إصدار الاسترداد',
      body: 'تم إصدار استرداد بقيمة {amount} درهم إلى بطاقتك',
    },
    carpet_picked_up: {
      title: 'تم استلام السجاد',
      body: 'تم استلام سجادك للتنظيف',
    },
    carpet_ready_for_return: {
      title: 'السجاد جاهز',
      body: 'سجادك نظيف وجاهز للتوصيل',
    },
    carpet_out_for_return: {
      title: 'السجاد في الطريق',
      body: '{washerName} يوصل سجادك',
    },
    carpet_returned: {
      title: 'تم تسليم السجاد',
      body: 'تم إرجاع سجادك. اكتملت الخدمة.',
    },
    new_job_assignment: {
      title: 'عمل جديد',
      body: 'طلب {service} جديد متاح. {countdown} ثانية للقبول.',
    },
    job_cancelled: {
      title: 'تم إلغاء العمل',
      body: 'العميل ألغى الطلب #{id}',
    },
    company_rejected: {
      title: 'تم رفض الطلب',
      body: 'تم رفض طلب شركة {companyName}. السبب: {reason}',
    },
  },
}

/**
 * Returns bilingual copy for a notification event.
 * Placeholder markers ({service}, {id}, {washerName}, {eta}, {amount}, {countdown}, {companyName}, {reason})
 * are left as-is — callers must replace them before sending.
 */
export function getNotificationCopy(
  event: string,
  language: 'en' | 'ar'
): { title: string; body: string } {
  const copy = NOTIFICATION_COPY[language][event]
  if (!copy) {
    console.warn(`[NotificationCopy] Unknown event: ${event} — falling back to English`)
    return NOTIFICATION_COPY['en'][event] ?? { title: event, body: event }
  }
  return copy
}

// WhatsApp template name map (pre-approved Meta templates in 360dialog)
export const WHATSAPP_TEMPLATE_MAP: Record<string, string> = {
  order_confirmed: 'cleanly_order_confirmed',
  washer_en_route: 'cleanly_washer_en_route',
  completed: 'cleanly_service_completed',
  refund_issued: 'cleanly_refund_issued',
  carpet_ready_for_return: 'cleanly_carpet_ready',
}

// SMS copy for critical events (longer form for SMS/WhatsApp text body)
export const SMS_COPY: Record<'en' | 'ar', Record<string, string>> = {
  en: {
    order_confirmed: 'Cleanly: Your {service} booking #{id} is confirmed. We will notify you when your washer is assigned.',
    washer_en_route: 'Cleanly: {washerName} is on the way to you. Estimated arrival: {eta} minutes.',
    completed: 'Cleanly: Your {service} service is complete. Total: AED {amount}. Thank you!',
    refund_issued: 'Cleanly: A refund of AED {amount} has been processed to your card. Allow 5-10 business days.',
    carpet_ready_for_return: 'Cleanly: Your carpet is cleaned and ready. We will schedule delivery shortly.',
  },
  ar: {
    order_confirmed: 'Cleanly: تم تأكيد حجزك لخدمة {service} رقم #{id}. سنخبرك عند تعيين العامل.',
    washer_en_route: 'Cleanly: {washerName} في طريقه إليك. الوصول المتوقع: {eta} دقيقة.',
    completed: 'Cleanly: اكتملت خدمة {service}. الإجمالي: {amount} درهم. شكراً لك!',
    refund_issued: 'Cleanly: تمت معالجة استرداد بقيمة {amount} درهم إلى بطاقتك. انتظر 5-10 أيام عمل.',
    carpet_ready_for_return: 'Cleanly: سجادك نظيف وجاهز. سنحدد موعد التوصيل قريباً.',
  },
}
