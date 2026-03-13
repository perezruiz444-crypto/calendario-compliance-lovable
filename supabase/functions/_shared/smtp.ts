export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('SMTP_FROM') || 'onboarding@resend.dev';

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  console.log(`[Resend] Sending email to ${to} from ${from}`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[Resend] Error:', JSON.stringify(data));
    throw new Error(`Resend API error: ${data.message || res.statusText}`);
  }

  console.log(`[Resend] Email sent successfully to ${to}, id: ${data.id}`);
}
