import nodemailer from "npm:nodemailer@^9";

const transport = nodemailer.createTransport({
  host: Deno.env.get("SMTP_HOST"),
  port: Number(Deno.env.get("SMTP_PORT") || 465),
  secure: Deno.env.get("SMTP_SECURE") === "true",
  auth: {
    user: Deno.env.get("SMTP_USER"),
    pass: Deno.env.get("SMTP_PASS"),
  },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "GET") {
    try {
      await transport.verify();
      return json({ ok: true, ready: true });
    } catch (error) {
      return json({ ok: true, ready: false, error: error instanceof Error ? error.message : "SMTP not ready" });
    }
  }

  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  let payload: { recipient?: string; subject?: string; body?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Malformed JSON body" }, 400);
  }

  const to = payload.recipient?.trim() ?? "";
  const subject = payload.subject?.trim() ?? "";
  const body = payload.body?.trim() ?? "";

  if (!to.includes("@") || !subject || !body) {
    return json({ ok: false, error: "recipient, subject and body are required" }, 400);
  }

  try {
    const info = await transport.sendMail({
      from: Deno.env.get("SMTP_FROM"),
      to,
      subject,
      text: body,
    });
    return json({ ok: true, messageId: info.messageId, recipient: to });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Email delivery failed" }, 502);
  }
};

export default { fetch: handler };