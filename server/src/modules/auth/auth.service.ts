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
      data: { passwordHash },
    })

    return { success: true }
  }
}
