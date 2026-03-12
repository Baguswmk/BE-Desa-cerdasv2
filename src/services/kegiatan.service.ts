import { PrismaClient } from "@prisma/client";
import {
  CreateKegiatanInput,
  CreateActivityUpdateInput,
  CreateExpenseReportInput,
} from "../validations/kegiatan.schema";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

type KegiatanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export const kegiatanService = {
  async getAll(status?: string) {
    const validStatuses: KegiatanStatus[] = [
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
    ];

    const whereClause =
      status === "ALL"
        ? {}
        : {
            status: validStatuses.includes(status as KegiatanStatus)
              ? (status as KegiatanStatus)
              : "ACTIVE",
          };

    let kegiatan = await prisma.kegiatan.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
    });

    // Auto-update status to COMPLETED if end_date has passed
    const now = new Date();
    const expiredKegiatanIds = kegiatan
      .filter((k) => k.status === "ACTIVE" && k.end_date && new Date(k.end_date) < now)
      .map((k) => k.id);

    if (expiredKegiatanIds.length > 0) {
      await prisma.kegiatan.updateMany({
        where: { id: { in: expiredKegiatanIds } },
        data: { status: "COMPLETED" },
      });

      // Refetch if status filter was applied to ensure correct data is returned
      if (status !== "ALL") {
        kegiatan = await prisma.kegiatan.findMany({
          where: whereClause,
          orderBy: { created_at: "desc" },
        });
      } else {
        kegiatan = kegiatan.map((k) =>
          expiredKegiatanIds.includes(k.id) ? { ...k, status: "COMPLETED" } : k
        );
      }
    }

    return kegiatan;
  },

  async getById(id: string) {
    let kegiatan = await prisma.kegiatan.findUnique({
      where: { id },
      include: {
        donations: {
          where: { status: "APPROVED" },
          select: {
            id: true,
            amount: true,
            donor_name: true,
            message: true,
            approved_at: true,
            user: { select: { nama: true } },
          },
          orderBy: { approved_at: "desc" },
        },
        activity_updates: {
          orderBy: { created_at: "desc" },
        },
        expense_reports: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!kegiatan) throw new Error("Kegiatan tidak ditemukan");

    // Auto-update status to COMPLETED if end_date has passed
    if (kegiatan.status === "ACTIVE" && kegiatan.end_date && new Date(kegiatan.end_date) < new Date()) {
      kegiatan = await prisma.kegiatan.update({
        where: { id },
        data: { status: "COMPLETED" },
        include: {
          donations: {
            where: { status: "APPROVED" },
            select: {
              id: true,
              amount: true,
              donor_name: true,
              message: true,
              approved_at: true,
              user: { select: { nama: true } },
            },
            orderBy: { approved_at: "desc" },
          },
          activity_updates: {
            orderBy: { created_at: "desc" },
          },
          expense_reports: {
            orderBy: { created_at: "desc" },
          },
        },
      });
    }

    return kegiatan;
  },

  async create(
    data: CreateKegiatanInput,
    photos: string[] = [],
    banner?: string,
    qr_image?: string,
  ) {
    const kegiatan = await prisma.kegiatan.create({
      data: {
        title: data.title,
        description: data.description,
        target_amount: data.target_amount,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        photos,
        banner: banner || null,
        jadwal: data.jadwal || undefined,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        bank_account_name: data.bank_account_name || null,
        qr_image: qr_image || null,
        village_name: (data as any).village_name || null,
        district: (data as any).district || null,
        province: (data as any).province || null,
        google_maps_link: (data as any).google_maps_link || null,
      },
    });

    logger.info(`New kegiatan created: ${kegiatan.title}`);
    return kegiatan;
  },

  async update(
    id: string,
    data: Partial<CreateKegiatanInput>,
    photos?: string[],
    banner?: string,
    qr_image?: string,
  ) {
    const existing = await prisma.kegiatan.findUnique({ where: { id } });
    if (!existing) throw new Error("Kegiatan tidak ditemukan");

    let newStatus = existing.status;
    if (existing.status !== "CANCELLED") {
      const effectiveEndDate =
        data.end_date !== undefined
          ? data.end_date
            ? new Date(data.end_date)
            : null
          : existing.end_date;

      if (effectiveEndDate && new Date(effectiveEndDate) < new Date()) {
        newStatus = "COMPLETED";
      } else {
        newStatus = "ACTIVE";
      }
    }

    const updated = await prisma.kegiatan.update({
      where: { id },
      data: {
        status: newStatus,
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.target_amount && { target_amount: data.target_amount }),
        ...(data.start_date && { start_date: new Date(data.start_date) }),
        ...(data.end_date !== undefined ? { end_date: data.end_date ? new Date(data.end_date) : null } : {}),
        // Kalau ada foto baru di-submit → ganti semua; kalau tidak → biarkan
        ...(photos && photos.length > 0 && { photos }),
        ...(banner && { banner }),
        ...(data.jadwal !== undefined && { jadwal: data.jadwal }),
        ...(data.bank_name !== undefined && {
          bank_name: data.bank_name || null,
        }),
        ...(data.bank_account_number !== undefined && {
          bank_account_number: data.bank_account_number || null,
        }),
        ...(data.bank_account_name !== undefined && {
          bank_account_name: data.bank_account_name || null,
        }),
        ...(qr_image && { qr_image }),
        ...((data as any).village_name !== undefined && {
          village_name: (data as any).village_name || null,
        }),
        ...((data as any).district !== undefined && {
          district: (data as any).district || null,
        }),
        ...((data as any).province !== undefined && {
          province: (data as any).province || null,
        }),
        ...((data as any).google_maps_link !== undefined && {
          google_maps_link: (data as any).google_maps_link || null,
        }),
      },
    });

    logger.info(`Kegiatan updated: ${id}`);
    return updated;
  },

  async updateStatus(id: string, status: KegiatanStatus) {
    const kegiatan = await prisma.kegiatan.update({
      where: { id },
      data: { status },
    });

    logger.info(`Kegiatan status updated: ${id} → ${status}`);
    return kegiatan;
  },

  // ── NEW: Tambah foto ke array photos yang sudah ada ────────────────────
  async addPhotos(id: string, newPhotos: string[]) {
    const existing = await prisma.kegiatan.findUnique({ where: { id } });
    if (!existing) throw new Error("Kegiatan tidak ditemukan");

    const kegiatan = await prisma.kegiatan.update({
      where: { id },
      data: {
        photos: [...existing.photos, ...newPhotos],
      },
    });

    logger.info(`Added ${newPhotos.length} photos to kegiatan: ${id}`);
    return kegiatan;
  },

  // ── NEW: Hapus satu foto dari array photos ─────────────────────────────
  async deletePhoto(id: string, photoName: string) {
    const existing = await prisma.kegiatan.findUnique({ where: { id } });
    if (!existing) throw new Error("Kegiatan tidak ditemukan");

    if (!existing.photos.includes(photoName)) {
      throw new Error("Foto tidak ditemukan di kegiatan ini");
    }

    const kegiatan = await prisma.kegiatan.update({
      where: { id },
      data: {
        photos: existing.photos.filter((p) => p !== photoName),
      },
    });

    logger.info(`Deleted photo ${photoName} from kegiatan: ${id}`);
    return kegiatan;
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Activity Updates (Perkembangan Kegiatan)
  // ═══════════════════════════════════════════════════════════════════

  async getActivityUpdates(kegiatanId: string) {
    return prisma.activityUpdate.findMany({
      where: { kegiatan_id: kegiatanId },
      orderBy: { created_at: "desc" },
    });
  },

  async createActivityUpdate(
    kegiatanId: string,
    data: CreateActivityUpdateInput,
    photo?: string,
  ) {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: kegiatanId },
    });
    if (!kegiatan) throw new Error("Kegiatan tidak ditemukan");

    const update = await prisma.activityUpdate.create({
      data: {
        kegiatan_id: kegiatanId,
        title: data.title,
        description: data.description,
        photo: photo || null,
      },
    });

    logger.info(
      `Activity update created for kegiatan ${kegiatanId}: ${update.id}`,
    );
    return update;
  },

  async deleteActivityUpdate(updateId: string) {
    const update = await prisma.activityUpdate.findUnique({
      where: { id: updateId },
    });
    if (!update) throw new Error("Update tidak ditemukan");

    await prisma.activityUpdate.delete({ where: { id: updateId } });
    logger.info(`Activity update deleted: ${updateId}`);
    return { deleted: true, id: updateId };
  },

  // ═══════════════════════════════════════════════════════════════════
  //  Expense Reports (Laporan Pengeluaran / Transparansi Dana)
  // ═══════════════════════════════════════════════════════════════════

  async getExpenseReports(kegiatanId: string) {
    return prisma.expenseReport.findMany({
      where: { kegiatan_id: kegiatanId },
      orderBy: { created_at: "desc" },
    });
  },

  async createExpenseReport(
    kegiatanId: string,
    data: CreateExpenseReportInput,
    receiptImage?: string,
  ) {
    const kegiatan = await prisma.kegiatan.findUnique({
      where: { id: kegiatanId },
    });
    if (!kegiatan) throw new Error("Kegiatan tidak ditemukan");

    const report = await prisma.expenseReport.create({
      data: {
        kegiatan_id: kegiatanId,
        title: data.title,
        amount: data.amount,
        receipt_image: receiptImage || null,
      },
    });

    logger.info(
      `Expense report created for kegiatan ${kegiatanId}: ${report.id}`,
    );
    return report;
  },

  async deleteExpenseReport(reportId: string) {
    const report = await prisma.expenseReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new Error("Laporan pengeluaran tidak ditemukan");

    await prisma.expenseReport.delete({ where: { id: reportId } });
    logger.info(`Expense report deleted: ${reportId}`);
    return { deleted: true, id: reportId };
  },
};
