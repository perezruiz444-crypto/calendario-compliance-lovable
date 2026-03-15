import nodemailer from "npm:nodemailer@6.9.10";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const host = Deno.env.get('SMTP_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') || '465');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASSWORD');
  const from = Deno.env.get('SMTP_FROM') || user || '';

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration incomplete: SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required');
  }

  console.log(`[SMTP] Sending email to ${to} from ${from} via ${host}:${port}`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, html });
  console.log(`[SMTP] Email sent successfully to ${to}`);
}
