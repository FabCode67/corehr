import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcryptjs"
import { createHash, randomBytes } from "crypto"

import { buildClientUrl } from "../../common/client-url.util"
import { PrismaService } from "../../prisma/prisma.service"
import { MailerService } from "../email/mailer.service"

import { ChangePasswordDto } from "./dto/change-password.dto"
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/forgot-password.dto"
import { LoginDto } from "./dto/login.dto"
import type { SessionClaims } from "./session-claims.type"

const SALT_ROUNDS = 10
const RESET_TOKEN_MINUTES = 30

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

const LOGIN_INCLUDE = {
  position: { include: { department: true, level: true } },
  branch: true,
} as const

/**
 * Real credential-based auth against Employee.passwordHash — replaces the
 * client's old hardcoded DEMO_USERS map. login() now also signs a JWT
 * (see jwt.constants.ts/jwt-auth.guard.ts) that both ends treat as the one
 * source of truth for the session: the Next.js client stores this exact
 * token as its session cookie (client/lib/session.ts) and forwards it as
 * `Authorization: Bearer <token>` on every API call, closing the previous
 * "every endpoint trusts the caller with no server-side check at all" gap.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailer: MailerService
  ) {}

  async login(dto: LoginDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: LOGIN_INCLUDE,
      omit: { passwordHash: false },
    })

    // Same generic error whether the email doesn't exist, the account has
    // no password yet, the account is inactive, or the password is wrong —
    // never tell an attacker which one it was.
    if (!employee || !employee.isActive || !employee.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.")
    }

    const matches = await bcrypt.compare(dto.password, employee.passwordHash)
    if (!matches) {
      throw new UnauthorizedException("Invalid email or password.")
    }

    // First Login Security: a temporary password (mustChangePassword still
    // true) is only valid for TEMPORARY_PASSWORD_EXPIRY_DAYS from account
    // creation. This is a deliberate hard block, not just a client-side
    // nudge banner — an expired default password (Staff@123, the same
    // value for every new hire) is a real credential-stuffing risk if left
    // valid indefinitely, and "please change your password" banners are
    // easy for a user to dismiss and never come back to. Once expired, the
    // only way back in is HR resetting the account (no self-service
    // "forgot password" flow exists in this app yet).
    if (employee.mustChangePassword && employee.temporaryPasswordExpiresAt && employee.temporaryPasswordExpiresAt < new Date()) {
      throw new UnauthorizedException("Your temporary password has expired. Please contact HR to have your account reset.")
    }

    const claims: SessionClaims = {
      id: employee.employeeNumber,
      employeeId: employee.employeeNumber,
      name: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" "),
      email: employee.email,
      role: employee.isAdmin ? "admin" : "staff",
      jobTitle: employee.position?.title ?? "Not yet assigned",
      department: employee.position?.department.name ?? "Not yet assigned",
      branch: employee.branch?.name ?? "Not assigned",
      mustChangePassword: employee.mustChangePassword,
      isDirector: employee.position?.level?.code === "E1",
      isDeputyDirector: employee.position?.level?.name?.trim().toLowerCase() === "deputy director",
    }
    const accessToken = this.jwtService.sign(claims)

    return { accessToken }
  }

  async changePassword(dto: ChangePasswordDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: dto.employeeId },
      omit: { passwordHash: false },
    })
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`)
    }
    if (!employee.passwordHash) {
      throw new BadRequestException("This account has no password set yet. Contact HR.")
    }

    const matches = await bcrypt.compare(dto.currentPassword, employee.passwordHash)
    if (!matches) {
      throw new UnauthorizedException("Current password is incorrect.")
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS)
    await this.prisma.employee.update({
      where: { employeeNumber: dto.employeeId },
      // A successful change always clears mustChangePassword — including
      // for an admin-initiated reset, not just the forced first-login
      // flow — there's no scenario where we'd want to keep forcing it
      // after the employee has just proven they know a new password.
      data: { passwordHash, mustChangePassword: false, temporaryPasswordExpiresAt: null },
    })

    return { success: true }
  }

  /**
   * Starts a password reset: emails a single-use link valid for 30 minutes.
   * Always reports success, whether or not the email matches an account, so
   * the endpoint can't be used to discover who has one.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = { success: true }
    const employee = await this.prisma.employee.findUnique({ where: { email: dto.email.trim().toLowerCase() } })
    if (!employee || !employee.isActive) return generic

    const token = randomBytes(32).toString("hex")
    await this.prisma.$transaction([
      // Only the newest link works.
      this.prisma.passwordResetToken.deleteMany({ where: { employeeNumber: employee.employeeNumber } }),
      this.prisma.passwordResetToken.create({
        data: {
          employeeNumber: employee.employeeNumber,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000),
        },
      }),
    ])

    const link = buildClientUrl(`/reset-password?token=${token}`)
    const firstName = employee.firstName ?? "there"
    try {
      await this.mailer.send({
        to: employee.email,
        subject: "Reset your NCBA Rwanda PeopleSuite password",
        html: `<p>Hello ${firstName},</p>
<p>We received a request to reset your PeopleSuite password. Use the button below within ${RESET_TOKEN_MINUTES} minutes:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#b8860b;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>
<p>Or paste this link into your browser:<br>${link}</p>
<p>If you didn't ask for this, you can ignore this email — your password stays the same.</p>`,
      })
    } catch {
      // Never reveal delivery problems to the requester; the link can't be
      // used by anyone who doesn't receive it. Check the server logs / SMTP settings.
    }
    return generic
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(dto.token) } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("This reset link is invalid or has expired. Please request a new one.")
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS)
    await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { employeeNumber: record.employeeNumber },
        data: { passwordHash, mustChangePassword: false, temporaryPasswordExpiresAt: null },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { employeeNumber: record.employeeNumber } }),
    ])
    return { success: true }
  }

  /** Single checkbox acceptance recorded on first login — see
   *  Employee.termsAcceptedAt's doc comment in schema.prisma. Not a
   *  versioned policy-acknowledgement log, just a timestamp. */
  async acceptTerms(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId } })
    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`)
    }
    await this.prisma.employee.update({
      where: { employeeNumber: employeeId },
      data: { termsAcceptedAt: new Date() },
    })
    return { success: true }
  }
}
