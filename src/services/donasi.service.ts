import { PrismaClient } from "@prisma/client";
import { CreateDonationInput } from "../validations/donasi.schema";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export const donasiService = {
  async createDonation(
    data: CreateDonationInput,
    bukti_transfer: string,
    userId?: string,
  ) {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: data.kegiatan_id },
    });

    if (!kegiatan) {
      throw new Error("Kegiatan tidak ditemukan");
    }

    if (kegiatan.status !== "ACTIVE") {
      throw new Error("Kegiatan tidak aktif");
    }

    const donation = await prisma.donation.create({
      data: {
        kegiatan_id: data.kegiatan_id,
        user_id: userId,
        donor_name: data.donor_name,
        amount: data.amount,
        message: data.message,
        bukti_transfer,
        status: "PENDING",
      },
      include: {
        kegiatan: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            nama: true,
            email: true,
          },
        },
      },
    });

    logger.info(
      `New donation created: ${donation.id} for kegiatan ${kegiatan.title}`,
    );

    return donation;
  },

  async getApprovedDonations(kegiatan_id: string) {
    const donations = await prisma.donation.findMany({
      where: {
        kegiatan_id,
        status: "APPROVED",
      },
      select: {
        id: true,
        amount: true,
        donor_name: true,
        approved_at: true,
        user: {
          select: {
            nama: true,
          },
        },
      },
      orderBy: {
        approved_at: "desc",
      },
    });

    return donations;
  },

  async getPendingDonations() {
    const donations = await prisma.donation.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        kegiatan: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            nama: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    return donations;
  },

  async approveDonation(donationId: string, adminId: string) {
    const updatedDonation = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id: donationId },
        include: { kegiatan: true },
      });

      if (!donation) {
        throw new Error("Donasi tidak ditemukan");
      }

      if (donation.status !== "PENDING") {
        throw new Error("Donasi sudah diproses");
      }

      const updateResult = await tx.donation.updateMany({
        where: { id: donationId, status: "PENDING" },
        data: {
          status: "APPROVED",
          approved_by: adminId,
          approved_at: new Date(),
          rejected_reason: null,
        },
      });

      if (updateResult.count !== 1) {
        throw new Error("Donasi sudah diproses oleh admin lain");
      }

      await tx.kegiatan.update({
        where: { id: donation.kegiatan_id },
        data: {
          current_amount: {
            increment: donation.amount,
          },
        },
      });

      return tx.donation.findUnique({ where: { id: donationId } });
    });

    if (!updatedDonation) {
      throw new Error("Gagal memperbarui donasi");
    }

    logger.info(`Donation approved: ${donationId} by admin ${adminId}`);

    return updatedDonation;
  },

  async rejectDonation(donationId: string, rejected_reason: string) {
    const updatedDonation = await prisma.$transaction(async (tx) => {
      // Atomic check-and-update: only update if status is still PENDING.
      // Using updateMany + count mirrors the approveDonation pattern and
      // prevents two admins from racing to reject the same donation.
      const updateResult = await tx.donation.updateMany({
        where: { id: donationId, status: "PENDING" },
        data: {
          status: "REJECTED",
          rejected_reason,
          approved_by: null,
          approved_at: null,
        },
      });

      if (updateResult.count === 0) {
        // Either donation not found, or already processed by another admin.
        const existing = await tx.donation.findUnique({
          where: { id: donationId },
        });
        if (!existing) {
          throw new Error("Donasi tidak ditemukan");
        }
        throw new Error("Donasi sudah diproses");
      }

      return tx.donation.findUnique({ where: { id: donationId } });
    });

    if (!updatedDonation) {
      throw new Error("Gagal memperbarui donasi");
    }

    logger.info(`Donation rejected: ${donationId}`);

    return updatedDonation;
  },

  async getUserDonations(userId: string) {
    const donations = await prisma.donation.findMany({
      where: { user_id: userId },
      include: {
        kegiatan: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return donations;
  },
};
