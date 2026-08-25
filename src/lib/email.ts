// Minimal email-sending abstraction, used only for password reset links.
// No email SDK dependency is added -- Resend's HTTP API is a single fetch
// call, so pulling in a full client library for one call wasn't worth it.
//
// IMPORTANT: without RESEND_API_KEY configured, this falls back to logging
// the reset link to the server console instead of silently doing nothing.
// That fallback is fine for local development but is NOT a substitute for
// real email delivery in production -- see SECURITY_CASE_STUDY.md and
// README "Known limitations" for the explicit disclosure. Nothing here
// touches production Vercel environment variables automatically; enabling
// real delivery requires the operator to set RESEND_API_KEY and EMAIL_FROM
// themselves.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "[email] RESEND_API_KEY/EMAIL_FROM not configured -- password reset link " +
        `for ${to} was NOT emailed. Link (for local testing only): ${resetUrl}`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your ReimburseIt password",
      html: `
        <p>A password reset was requested for your ReimburseIt account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 30 minutes and can only be used once.</p>
        <p>If you didn't request this, you can safely ignore this email -- your password will not be changed.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to send password reset email: ${res.status} ${body}`);
  }
}
