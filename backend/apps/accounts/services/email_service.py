import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_otp_email(recipient_email: str, recipient_name: str, otp_code: str) -> bool:
    """
    Sends transactional OTP email via Brevo REST API v3 with fallback to Brevo SMTP Relay.
    """
    subject = f"{otp_code} is your RGS Enterprises verification code"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-top: 0;">Password Reset Verification</h2>
            <p style="color: #475569; font-size: 15px;">Hello {recipient_name},</p>
            <p style="color: #475569; font-size: 15px;">You recently requested to reset your password for your RGS Enterprises Hub Management account. Use the verification code below:</p>
            <div style="text-align: center; margin: 28px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7; background: #f0f9ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #38bdf8;">
                    {otp_code}
                </span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">RGS Enterprises &bull; Automated Security Service</p>
        </div>
    </body>
    </html>
    """

    # 1. Attempt Brevo REST API v3
    api_key = getattr(settings, 'BREVO_API_KEY', '')
    if api_key and api_key.startswith('xkeysib-'):
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json"
            }
            payload = {
                "sender": {
                    "name": getattr(settings, 'BREVO_SENDER_NAME', 'RGS Enterprises'),
                    "email": getattr(settings, 'BREVO_SENDER_EMAIL', 'rgsenterprise2026@gmail.com')
                },
                "to": [{"email": recipient_email, "name": recipient_name}],
                "subject": subject,
                "htmlContent": html_content
            }
            res = requests.post(url, json=payload, headers=headers, timeout=8)
            if res.status_code in (200, 201, 202):
                logger.info(f"OTP successfully dispatched via Brevo REST API to {recipient_email}")
                return True
            else:
                logger.warning(f"Brevo REST API returned {res.status_code}: {res.text}. Falling back to SMTP...")
        except Exception as e:
            logger.warning(f"Brevo REST API failed ({e}). Falling back to SMTP...")

    # 2. Fallback to Brevo SMTP Relay
    smtp_server = getattr(settings, 'BREVO_SMTP_SERVER', 'smtp-relay.brevo.com')
    smtp_port = getattr(settings, 'BREVO_SMTP_PORT', 587)
    smtp_login = getattr(settings, 'BREVO_SMTP_LOGIN', '')
    smtp_password = getattr(settings, 'BREVO_SMTP_PASSWORD', '')

    if smtp_login and smtp_password:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{getattr(settings, 'BREVO_SENDER_NAME', 'RGS Enterprises')} <{getattr(settings, 'BREVO_SENDER_EMAIL', 'rgsenterprise2026@gmail.com')}>"
            msg['To'] = recipient_email
            msg.attach(MIMEText(html_content, 'html'))

            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_login, smtp_password)
                server.send_message(msg)

            logger.info(f"OTP successfully dispatched via Brevo SMTP to {recipient_email}")
            return True
        except Exception as smtp_err:
            logger.error(f"Brevo SMTP Relay dispatch failed: {smtp_err}")

    logger.warning(f"Email could not be delivered to {recipient_email} - check Brevo credentials.")
    return False
