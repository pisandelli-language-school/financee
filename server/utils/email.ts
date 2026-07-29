import { Resend } from 'resend'

interface InternalNotificationEmailInput {
  to: string
  title: string
  message: string
  ctaLabel?: string
  ctaUrl?: string | null
}

let resendClient: Resend | null | undefined

function getResendClient() {
  if (resendClient !== undefined) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()

  resendClient = apiKey ? new Resend(apiKey) : null
  return resendClient
}

export async function sendInternalNotificationEmail(input: InternalNotificationEmailInput) {
  const client = getResendClient()
  const from = process.env.RESEND_FROM_EMAIL?.trim()

  if (!client || !from) {
    return {
      delivered: false,
      reason: 'provider-not-configured',
    } as const
  }

  const actionBlock = input.ctaUrl
    ? `
      <p style="margin:24px 0 0;">
        <a href="${input.ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0a51cf;color:#ffffff;text-decoration:none;font-weight:600;">
          ${input.ctaLabel ?? 'Abrir no Financee'}
        </a>
      </p>
    `
    : ''

  await client.emails.send({
    from,
    to: input.to,
    subject: `[Financee] ${input.title}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#1f2940;">
        <h2 style="margin:0 0 12px;">${input.title}</h2>
        <p style="margin:0 0 12px;">${input.message}</p>
        ${actionBlock}
      </div>
    `,
  })

  return {
    delivered: true,
  } as const
}
