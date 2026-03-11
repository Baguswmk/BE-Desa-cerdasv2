import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import { logger } from "../utils/logger";
import { RegisterInput, LoginInput } from "../validations/auth.schema";

const prisma = new PrismaClient();

export const authService = {
  async register(data: RegisterInput) {
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new Error("Email sudah terdaftar");
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        nama: data.nama,
        email: data.email,
        no_hp: data.no_hp,
        password_hash,
        role: "WARGA", // Default role
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`New user registered: ${user.email}`);

    return { user, token };
  },

  async login(data: LoginInput) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("Email atau password salah");
    }

    // Check if user is banned
    if (user.status === "BANNED") {
      throw new Error("Akun Anda telah diblokir");
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      data.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new Error("Email atau password salah");
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nama: true,
        email: true,
        no_hp: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new Error("User tidak ditemukan");
    }

    return user;
  },
};
