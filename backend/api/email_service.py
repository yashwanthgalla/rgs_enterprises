import os
import json
import base64
import secrets
import smtplib
import datetime
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from django.conf import settings
import jwt
import bcrypt

# Authorized 4 admin emails allowed to authenticate or initiate password resets
ALLOWED_RESET_EMAILS = [
    'rgsenterprise2026@gmail.com',
    'bschandrasekhar4@gmail.com',
    'gprabhakar024@gmail.com',
    'nagayashwanthgalla@gmail.com',
]


def send_brevo_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None,
    attachments: list = None,
    cc: str = None
) -> bool:
    """
    Sends an email using Brevo SMTP Relay (port 587) with fallback to Brevo REST API v3.
    Supports file/picture/folder attachments and CC recipients.
    Sender: nagayashwanthgalla@outlook.com
    SMTP Host: smtp-relay.brevo.com:587
    """
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(getattr(settings, 'BASE_DIR', ''), '.env')
        if os.path.exists(env_path):
            load_dotenv(env_path, override=True)
    except Exception:
        pass

    sender_email = os.getenv('BREVO_SENDER_EMAIL') or getattr(settings, 'BREVO_SENDER_EMAIL', 'nagayashwanthgalla@outlook.com')
    sender_name = os.getenv('BREVO_SENDER_NAME') or getattr(settings, 'BREVO_SENDER_NAME', 'RGS Enterprises')

    smtp_key = os.getenv('BREVO_SMTP_KEY') or getattr(settings, 'BREVO_SMTP_KEY', '')
    smtp_user = os.getenv('BREVO_SMTP_USER') or getattr(settings, 'BREVO_SMTP_USER', 'c106ae001@smtp-brevo.com')
    smtp_host = os.getenv('BREVO_SMTP_HOST') or getattr(settings, 'BREVO_SMTP_HOST', 'smtp-relay.brevo.com')
    smtp_port = int(os.getenv('BREVO_SMTP_PORT') or getattr(settings, 'BREVO_SMTP_PORT', 587))

    # 1. Primary: Brevo SMTP Relay
    if smtp_key and smtp_user:
        try:
            key_preview = f"{smtp_key[:8]}...{smtp_key[-6:]}" if len(smtp_key) > 14 else "***"
            print(f"[Brevo SMTP Relay]: Connecting to {smtp_host}:{smtp_port} as {smtp_user} (key: {key_preview})...")

            if attachments:
                msg = MIMEMultipart('mixed')
                alt_part = MIMEMultipart('alternative')
                if text_content:
                    alt_part.attach(MIMEText(text_content, 'plain'))
                alt_part.attach(MIMEText(html_content, 'html'))
                msg.attach(alt_part)

                for att in attachments:
                    name = att.get('name', 'attachment')
                    raw_b64 = att.get('content', '')
                    if ',' in raw_b64 and raw_b64.startswith('data:'):
                        raw_b64 = raw_b64.split(',', 1)[1]
                    try:
                        file_data = base64.b64decode(raw_b64)
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(file_data)
                        encoders.encode_base64(part)
                        part.add_header('Content-Disposition', f'attachment; filename="{name}"')
                        msg.attach(part)
                    except Exception as att_err:
                        print(f"[Attachment Error]: Failed to attach {name}: {att_err}")
            else:
                msg = MIMEMultipart('alternative')
                if text_content:
                    msg.attach(MIMEText(text_content, 'plain'))
                msg.attach(MIMEText(html_content, 'html'))

            msg['Subject'] = subject
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = to_email

            recipients = [to_email]
            if cc:
                msg['Cc'] = cc
                recipients.extend([c.strip() for c in cc.split(',') if c.strip()])

            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.starttls()
                server.login(smtp_user, smtp_key)
                server.sendmail(sender_email, recipients, msg.as_string())
            print(f"[Email Service]: Email Sent to {to_email}")
            return True
        except Exception as e:
            print(f"[Brevo SMTP Relay Error]: {e}, trying HTTP API fallback...")

    # 2. Fallback: Brevo HTTP REST API v3
    api_key = os.getenv('BREVO_API_KEY') or getattr(settings, 'BREVO_API_KEY', '')
    if api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            payload = {
                "sender": {
                    "name": sender_name,
                    "email": sender_email
                },
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content
            }
            if cc:
                payload["cc"] = [{"email": c.strip()} for c in cc.split(',') if c.strip()]
            if text_content:
                payload["textContent"] = text_content
            if attachments:
                brevo_attachments = []
                for att in attachments:
                    name = att.get('name', 'attachment')
                    raw_b64 = att.get('content', '')
                    if ',' in raw_b64 and raw_b64.startswith('data:'):
                        raw_b64 = raw_b64.split(',', 1)[1]
                    brevo_attachments.append({
                        "name": name,
                        "content": raw_b64
                    })
                payload["attachment"] = brevo_attachments

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "accept": "application/json",
                    "api-key": api_key,
                    "content-type": "application/json"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=20) as response:
                resp_body = response.read().decode('utf-8')
                print(f"[Brevo HTTP API Success]: Status {response.status}, Response: {resp_body}")
                if response.status in (200, 201, 202):
                    return True
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"[Brevo HTTP API HTTPError]: {e.code} - {err_body}")
        except Exception as e:
            print(f"[Brevo HTTP API Error]: {e}")

    return False


def generate_otp_session(email: str, exp_minutes: int = 10):
    """
    Generates a 6-digit OTP and encodes it in a signed, tamper-proof JWT token.
    This eliminates database OTP storage completely while enforcing strict expiry.
    """
    otp = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = bcrypt.hashpw(otp.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=exp_minutes)
    token_payload = {
        "email": email.strip().lower(),
        "otp_hash": otp_hash,
        "exp": int(exp.timestamp()),
        "scope": "pwd_reset"
    }

    session_token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm="HS256")
    return otp, session_token


def verify_otp_session(session_token: str, submitted_email: str, submitted_otp: str) -> bool:
    """
    Verifies that the session token is valid, unexpired, and matches the submitted email and OTP.
    """
    try:
        payload = jwt.decode(session_token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("scope") != "pwd_reset":
            return False

        token_email = payload.get("email", "").lower()
        if token_email != submitted_email.strip().lower():
            return False

        otp_hash = payload.get("otp_hash", "").encode('utf-8')
        return bcrypt.checkpw(submitted_otp.strip().encode('utf-8'), otp_hash)
    except (jwt.PyJWTError, Exception):
        return False


def send_bill_notification_email(
    hub_name: str,
    hub_location: str,
    bill_type: str,
    amount: str,
    payment_status: str
) -> bool:
    """
    Sends a formatted bill notification email to rgsenterprise2026@gmail.com
    dispatched by admin Sai Babu P using the template requested by user.
    """
    to_email = getattr(settings, 'BILLING_ALERT_EMAIL', 'rgsenterprise2026@gmail.com')
    subject = f"New Bill Added - {bill_type} ({hub_name})"

    text_content = f"""Hello Admin,

A new bill has been added to your hub management system. Please review the details below.

**Hub Details**
- Hub Name: {hub_name}
- Hub Location: {hub_location}

**Bill Information**
- Bill Type: {bill_type}
- Bill Amount: {amount}
- Payment Status: {payment_status}

Please review the bill details and take the necessary action.

Regards,  
Hub Management System
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f9fafb; margin: 0; padding: 24px; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .header {{ background: #0071E3; padding: 24px; text-align: left; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
    .header p {{ margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }}
    .content {{ padding: 24px; font-size: 14px; color: #374151; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }}
    .card-title {{ font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; }}
    .badge {{ display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1; }}
    .footer {{ padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="vertical-align: middle; width: 44px; padding-right: 12px;">
            <img src="https://raw.githubusercontent.com/yashwanthgalla/rgs_enterprises/main/frontend/public/2.jpeg" alt="RGS Enterprises Logo" style="width: 44px; height: 44px; object-fit: contain; border-radius: 8px; background: #ffffff; padding: 2px; display: block;" />
          </td>
          <td style="vertical-align: middle;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Hub Management System</h1>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #ffffff; opacity: 0.9;">Bill Alert Notification • RGS Enterprises</p>
          </td>
        </tr>
      </table>
    </div>
    <div class="content">
      <p>Hello Admin,</p>
      <p>A new bill has been added to your hub management system. Please review the details below.</p>
      
      <div class="card">
        <div class="card-title">Hub Details</div>
        <p style="margin: 4px 0;"><strong>• Hub Name:</strong> {hub_name}</p>
        <p style="margin: 4px 0;"><strong>• Hub Location:</strong> {hub_location}</p>
      </div>

      <div class="card">
        <div class="card-title">Bill Information</div>
        <p style="margin: 4px 0;"><strong>• Bill Type:</strong> {bill_type}</p>
        <p style="margin: 4px 0;"><strong>• Bill Amount:</strong> ₹{amount}</p>
        <p style="margin: 4px 0;"><strong>• Payment Status:</strong> <span class="badge">{payment_status}</span></p>
      </div>

      <p>Please review the bill details and take the necessary action.</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Regards,<br><strong>Hub Management System</strong><br><span style="font-size: 11px; color: #94a3b8;">Dispatched by Administrator Sai Babu P</span></p>
    </div>
  </div>
</body>
</html>"""

    return send_brevo_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)
