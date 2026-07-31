import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common"
import * as bcrypt from "bcryptjs"

import { PrismaService } from "../../prisma/prisma.service"

import { ChangePasswordDto } from "./dto/change-password.dto"
import { LoginDto } from "./dto/login.dto"

const SALT_ROUNDS = 10

const LOGIN_INCLUDE = {
  position: { include: { department: true } },
  branch: true,
} as const

/**
 * Real credential-based auth against Employee.passwordHash — replaces the
 * client's old hardcoded DEMO_USERS map. Deliberately simple: no JWTs, no
 * session table. The Next.js client still just carries an unsigned mock
 * session cookie (see client/lib/session.ts) built from whatever this
 * returns; only the credential check itself is real. Revisit if/when this
 * app needs actual bearer-token auth for a non-browser client.
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

    const { passwordHash: _passwordHash, ...safeEmployee } = employee
    return safeEmployee
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
