import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import * as nodemailer from "nodemailer"

/**
 * Thin Gmail-SMTP wrapper around Nodemailer, configured entirely from
 * environment variables (never source code — see .env.example):
 *
 *   MAIL_HOST=smtp.gmail.com
 *   MAIL_PORT=587
 *   MAIL_SECURE=false
 *   MAIL_USER=<company email>
 *   MAIL_PASSWORD=<gmail app password>
 *   MAIL_FROM="NCBA Rwanda HR Hub" <company email>
 *
 * If those aren't set (e.g. local dev, or before an admin has configured
 * SMTP), this service simply reports itself as unconfigured rather than
 * throwing on boot — EmailQueueProcessor checks `isConfigured` and marks
 * queued emails FAILED with a clear reason instead of crashing the app or
 * retrying forever against a transporter that will never work.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name)
  private transporter: nodemailer.Transporter | null = null

  onModuleInit() {
    const host = process.env.MAIL_HOST
    const user = process.env.MAIL_USER
    const password = process.env.MAIL_PASSWORD

    if (!host || !user || !password) {
      this.logger.warn(
        "MAIL_HOST/MAIL_USER/MAIL_PASSWORD are not all set — outgoing email is disabled. Emails will still be queued and logged in Email History, but will end up FAILED until SMTP is configured."
      )
      return
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.MAIL_PORT ?? 587),
      // STARTTLS on 587 (MAIL_SECURE=false) is the standard Gmail SMTP
      // setup; true would be implicit TLS on 465. Either way the
      // connection to Gmail is always encrypted — nodemailer negotiates
      // STARTTLS automatically on 587 even with secure:false.
      secure: process.env.MAIL_SECURE === "true",
      auth: { user, pass: password },
    })
    this.logger.log(`Mailer configured — sending via ${host}:${process.env.MAIL_PORT ?? 587} as ${user}.`)
  }

  get isConfigured(): boolean {
    return this.transporter !== null
  }

  async send(params: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      throw new Error("SMTP is not configured (MAIL_HOST/MAIL_USER/MAIL_PASSWORD missing).")
    }
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? process.env.MAIL_USER,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
  }
}
