import nodemailer from "nodemailer";
import { DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettings } from "../config/workspaceDefaults.js";

const esc = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
}[character]!));

const send = (to: string, subject: string, html: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter.sendMail({
    from: `"Salesdig" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: [],
  });
};

const baseTemplate = (content: string, workspace: WorkspaceSettings) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#134e4a 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
            <div style="width:40px;height:40px;line-height:40px;border-radius:13px;margin:0 auto 12px;background:linear-gradient(135deg,#164e63,#0f172a);color:#99f6e4;font-size:22px;font-weight:800;text-align:center">S</div>
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.7);text-transform:uppercase">Salesdig</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #e8eaff;border-right:1px solid #e8eaff">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:11px;color:#64748b">© 2026 Salesdig · ${esc(workspace.companyName)} workspace</p>
            <p style="margin:6px 0 0;font-size:11px;color:#94a3b8">If you didn't expect this email, you can safely ignore it.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const sendInviteEmail = (to: string, name: string, token: string, workspace = DEFAULT_WORKSPACE_SETTINGS, workspaceSlug = "workmates") => {
  const url = `${(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/set-password/${token}?workspace=${encodeURIComponent(workspaceSlug)}`;
  return send(to, "Welcome to Salesdig", baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a">Welcome, ${esc(name)}! 👋</h1>
    <p style="margin:0 0 6px;font-size:14px;color:#64748b;line-height:1.6">
      You've been invited to <strong style="color:#0f766e">Salesdig</strong> — ${esc(workspace.companyName)}'s company research and sales intelligence workspace.
      Research target accounts, identify relevant services, and prepare customer conversations.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:inline-block">
      <span style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Your login Username</span><br>
      <span style="font-size:15px;font-weight:700;color:#0f766e">${esc(to)}</span>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      ${[
        ["🔍", "AI Research", "Deep customer profiling powered by AWS-native agents"],
        ["💰", "Funding Programs", "Match customers to the right AWS funding programs"],
        ["🗺️", "Strategic Roadmaps", "Phase-by-phase cloud adoption plans"],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:18px;margin-right:12px">${icon}</span>
            <strong style="font-size:13px;color:#0f172a">${title}</strong>
            <span style="font-size:12px;color:#94a3b8"> — ${desc}</span>
          </td>
        </tr>`).join("")}
    </table>

    <p style="margin:0 0 20px;font-size:13px;color:#64748b">Click the button below to set your password and get started. This link expires in <strong>24 hours</strong>.</p>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0891b2);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;box-shadow:0 4px 14px rgba(15,118,110,0.25)">
        Set Your Password →
      </a>
    </div>

    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">Or copy this link: <span style="color:#0f766e">${url}</span></p>
  `, workspace));
};

export const sendPasswordResetEmail = (to: string, token: string, workspace = DEFAULT_WORKSPACE_SETTINGS, workspaceSlug = "workmates") => {
  const url = `${(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/set-password/${token}?workspace=${encodeURIComponent(workspaceSlug)}`;
  return send(to, "Reset your Salesdig password", baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a">Password Reset</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
      We received a request to reset your <strong style="color:#0f766e">Salesdig</strong> password.
      Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.
    </p>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0891b2);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;box-shadow:0 4px 14px rgba(15,118,110,0.25)">
        Reset Password →
      </a>
    </div>

    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">Or copy this link: <span style="color:#0f766e">${url}</span></p>
  `, workspace));
};
