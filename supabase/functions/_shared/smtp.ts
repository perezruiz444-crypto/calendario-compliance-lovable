import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const hostname = Deno.env.get('SMTP_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') || '465');
  const username = Deno.env.get('SMTP_USER');
  const password = Deno.env.get('SMTP_PASSWORD');
  const from = Deno.env.get('SMTP_FROM') || username || '';

  if (!hostname || !username || !password) {
    throw new Error('SMTP configuration incomplete: SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required');
  }

  console.log(`[SMTP] Sending email to ${to} from ${from} via ${hostname}:${port}`);

  const client = new SMTPClient({
    connection: {
      hostname,
      port,
      tls: port === 465,
      auth: {
        username,
        password,
      },
    },
  });

  try {
    await client.send({
      from,
      to,
      subject,
      content: "text/html",
      html,
    });
    console.log(`[SMTP] Email sent successfully to ${to}`);
  } finally {
    await client.close();
  }
}
