# Path: app/services/email_service.py
# Summary: Implements SMTP email delivery for transactional auth messages.

from email.message import EmailMessage
import logging
import smtplib

from app.core.config import settings


logger = logging.getLogger(__name__)


class EmailService:
    @property
    def is_configured(self) -> bool:
        return bool(settings.EMAIL_SMTP_HOST and settings.EMAIL_SMTP_FROM)

    def send_email_verification(self, to_email: str, verification_url: str) -> bool:
        subject = "Verify your Waypoint account"
        body = (
            "Welcome to Waypoint.\n\n"
            "Please verify your email address by opening this link:\n"
            f"{verification_url}\n\n"
            "If you did not create this account, you can ignore this message."
        )
        return self._send_message(to_email=to_email, subject=subject, body=body)

    def _send_message(self, *, to_email: str, subject: str, body: str) -> bool:
        if not self.is_configured:
            logger.info(
                "Email delivery skipped: SMTP not configured (to=%s, subject=%s)",
                to_email,
                subject,
            )
            return False

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.EMAIL_SMTP_FROM
        message["To"] = to_email
        message.set_content(body)

        try:
            if settings.EMAIL_SMTP_USE_SSL:
                with smtplib.SMTP_SSL(
                    settings.EMAIL_SMTP_HOST,
                    settings.EMAIL_SMTP_PORT,
                    timeout=settings.EMAIL_SMTP_TIMEOUT_SECONDS,
                ) as smtp:
                    self._authenticate_if_needed(smtp)
                    smtp.send_message(message)
                return True

            with smtplib.SMTP(
                settings.EMAIL_SMTP_HOST,
                settings.EMAIL_SMTP_PORT,
                timeout=settings.EMAIL_SMTP_TIMEOUT_SECONDS,
            ) as smtp:
                smtp.ehlo()
                if settings.EMAIL_SMTP_USE_TLS:
                    smtp.starttls()
                    smtp.ehlo()
                self._authenticate_if_needed(smtp)
                smtp.send_message(message)
            return True
        except Exception:
            logger.exception("Failed to send email (to=%s, subject=%s)", to_email, subject)
            return False

    @staticmethod
    def _authenticate_if_needed(smtp: smtplib.SMTP) -> None:
        if settings.EMAIL_SMTP_USERNAME:
            smtp.login(settings.EMAIL_SMTP_USERNAME, settings.EMAIL_SMTP_PASSWORD)
