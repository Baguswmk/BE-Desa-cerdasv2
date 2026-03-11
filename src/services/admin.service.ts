import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function formatRupiah(
  amount: number | { toNumber: () => number } | any,
): string {
  const numAmount = typeof amount === "number" ? amount : Number(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(numAmount);
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export const adminService = {
  async getDashboardStats() {
    const [
      totalUsers,
      totalKegiatan,
      totalDonationsApproved,
      totalDonationsPending,
      totalAIQueries,
      totalSmartFarms,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "WARGA" } }),
      prisma.kegiatan.count(),
      prisma.donation.count({ where: { status: "APPROVED" } }),
      prisma.donation.count({ where: { status: "PENDING" } }),
      prisma.aIQuery.count(),
      prisma.smartFarm.count(),
    ]);

    const donationSum = await prisma.donation.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    });

    return {
      total_users: totalUsers,
      total_kegiatan: totalKegiatan,
      total_donations: totalDonationsApproved,
      pending_donations: totalDonationsPending,
      total_donation_amount: donationSum._sum.amount || 0,
      total_ai_queries: totalAIQueries,
      total_smart_farms: totalSmartFarms,
    };
  },

  async getActivityLogs(limit: number = 50) {
    return prisma.activityLog.findMany({
      take: limit,
      orderBy: { created_at: "desc" },
    });
  },

  async logActivity(
    adminId: string,
    action: string,
    description: string,
    metadata?: any,
  ) {
    const log = await prisma.activityLog.create({
      data: { admin_id: adminId, action, description, metadata },
    });
    logger.info(`Admin activity logged: ${action} by ${adminId}`);
    return log;
  },

  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        no_hp: true,
        role: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });
  },

  async updateUserStatus(
    userId: string,
    status: "ACTIVE" | "BANNED",
    adminId: string,
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    await this.logActivity(
      adminId,
      "UPDATE_USER_STATUS",
      `Updated user ${user.email} status to ${status}`,
      { userId, status },
    );

    return user;
  },

  async createUser(data: any, adminId: string) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        nama: data.nama,
        email: data.email,
        password_hash: hashedPassword,
        no_hp: data.no_hp || null,
        role: data.role || "WARGA",
        status: data.status || "ACTIVE",
      },
    });

    await this.logActivity(
      adminId,
      "CREATE_USER",
      `Created new user ${user.email}`,
      { userId: user.id }
    );

    return user;
  },

  async updateUser(userId: string, data: any, adminId: string) {
    const updateData: any = {
      nama: data.nama,
      email: data.email,
      no_hp: data.no_hp || null,
      role: data.role,
      status: data.status,
    };
    
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.logActivity(
      adminId,
      "UPDATE_USER",
      `Updated user ${user.email}`,
      { userId: user.id }
    );

    return user;
  },

  async deleteUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Pengguna tidak ditemukan");

    await prisma.user.delete({ where: { id: userId } });

    await this.logActivity(
      adminId,
      "DELETE_USER",
      `Deleted user ${user.email}`,
      { userId, email: user.email }
    );

    return { success: true, email: user.email };
  },

  // GAP 6: Export donasi ke Excel
  async exportDonationsToExcel(status: string) {
    const where = status === "ALL" ? {} : { status: status as any };
    const donations = await prisma.donation.findMany({
      where,
      include: {
        kegiatan: { select: { title: true } },
        user: { select: { nama: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistem Desa";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Laporan Donasi");

    // Header styling
    sheet.columns = [
      { header: "No", key: "no", width: 6 },
      { header: "Tanggal", key: "date", width: 18 },
      { header: "Kegiatan", key: "kegiatan", width: 30 },
      { header: "Nama Donor", key: "donor", width: 25 },
      { header: "Email", key: "email", width: 28 },
      { header: "Nominal", key: "amount", width: 20 },
      { header: "Status", key: "status", width: 14 },
      { header: "Tgl Disetujui", key: "approved", width: 18 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D6A4F" }, // hijau desa
    };
    headerRow.alignment = { horizontal: "center" };

    // Data rows
    donations.forEach((d, index) => {
      const donorName = d.donor_name || d.user?.nama || "Anonim";
      const row = sheet.addRow({
        no: index + 1,
        date: formatDate(d.created_at),
        kegiatan: d.kegiatan?.title || "-",
        donor: donorName,
        email: d.user?.email || "-",
        amount: d.amount,
        status: d.status,
        approved: formatDate(d.approved_at),
      });

      // Format nominal sebagai currency
      row.getCell("amount").numFmt = '"Rp "#,##0';

      // Warna baris berdasarkan status
      const statusColors: Record<string, string> = {
        APPROVED: "FFD8F3DC",
        PENDING: "FFFFF3CD",
        REJECTED: "FFFFD6D6",
      };
      const fillColor = statusColors[d.status] || "FFFFFFFF";
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
    });

    // Total row
    sheet.addRow({});
    const totalRow = sheet.addRow({
      no: "",
      date: "",
      kegiatan: "TOTAL",
      donor: "",
      email: "",
      amount: donations.reduce((sum, d) => sum + Number(d.amount), 0),
      status: `${donations.length} transaksi`,
      approved: "",
    });
    totalRow.font = { bold: true };
    totalRow.getCell("amount").numFmt = '"Rp "#,##0';

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    return workbook.xlsx.writeBuffer() as any as Buffer;
  },

  async exportDonationsToPDF(status: string) {
    const where = status === "ALL" ? {} : { status: status as any };
    const donations = await prisma.donation.findMany({
      where,
      include: {
        kegiatan: { select: { title: true } },
        user: { select: { nama: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("LAPORAN DONASI DESA", { align: "center" });
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Status: ${status} | Dicetak: ${formatDate(new Date())}`, {
          align: "center",
        });
      doc.moveDown();

      // Summary box
      const totalAmount = donations
        .filter((d) => d.status === "APPROVED")
        .reduce((sum, d) => sum + Number(d.amount), 0);

      doc
        .fontSize(10)
        .text(`Total Transaksi: ${donations.length}`)
        .text(`Total Donasi Disetujui: ${formatRupiah(totalAmount)}`);
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const colWidths = [30, 80, 120, 110, 90, 70];
      const cols = ["No", "Tanggal", "Kegiatan", "Donor", "Nominal", "Status"];
      let x = 40;

      doc.font("Helvetica-Bold").fontSize(9);
      doc.rect(40, tableTop, 515, 16).fill("#2D6A4F");
      doc.fillColor("white");

      cols.forEach((col, i) => {
        doc.text(col, x + 3, tableTop + 3, {
          width: colWidths[i],
          align: "left",
        });
        x += colWidths[i];
      });

      doc.fillColor("black").font("Helvetica").fontSize(8);
      let rowY = tableTop + 18;

      donations.forEach((d, index) => {
        // Alternate row color
        if (index % 2 === 0) {
          doc.rect(40, rowY, 515, 15).fill("#F0F7F4");
          doc.fillColor("black");
        }

        x = 40;
        const rowData = [
          String(index + 1),
          formatDate(d.created_at),
          (d.kegiatan?.title || "-").substring(0, 20),
          (d.donor_name || d.user?.nama || "Anonim").substring(0, 18),
          formatRupiah(d.amount),
          d.status,
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, x + 3, rowY + 3, {
            width: colWidths[i] - 4,
            align: "left",
          });
          x += colWidths[i];
        });

        rowY += 15;

        if (rowY > 750) {
          doc.addPage();
          rowY = 40;
        }
      });

      doc.end();
    });
  },
};
