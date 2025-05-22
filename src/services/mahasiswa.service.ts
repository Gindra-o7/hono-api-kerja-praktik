import { mahasiswa } from "../generated/prisma";
import DateHelper from "../helpers/date.helper";
import MahasiswaRepository from "../repositories/mahasiswa.repository";
import { APIError } from "../utils/api-error.util";

export default class MahasiswaService {
  public static async checkLevelAccess(email: string) {
    const { nim } = await MahasiswaRepository.findNIMByEmail(email);
    const { id, level_akses } = await MahasiswaRepository.getPendaftaranKP(nim);

    return {
      response: true,
      message: level_akses >= 5 ? "Sudah bisa diakses! 😁" : "Belum bisa diakses! 😡",
      data: {
        id: id,
        nim: nim,
        accessLevel: level_akses,
        hasAccess: level_akses >= 5,
      },
    };
  }

  public static async checkSeminarDocumentsValidation(nim: string): Promise<{
    canScheduleSeminar: boolean;
    pendaftaranId: string;
    missingOrInvalidDocuments: string[];
  }> {
    const { id: pendaftaranId } = await MahasiswaRepository.getPendaftaranKP(nim);

    const { allDokumenDivalidasi, statusDokumen } = await MahasiswaRepository.cekDokumenSeminarKP(nim, pendaftaranId);

    const missingOrInvalidDocuments = statusDokumen.filter((doc) => !doc.exists || !doc.validated).map((doc) => doc.type);

    return {
      canScheduleSeminar: allDokumenDivalidasi,
      pendaftaranId,
      missingOrInvalidDocuments,
    };
  }

  public static async validateMahasiswaExists(nim: string): Promise<mahasiswa> {
    const mahasiswa = await MahasiswaRepository.findByNIM({ nim });
    if (!mahasiswa) {
      throw new APIError(`Waduh, mahasiswa tidak ditemukan! 😭`, 404);
    }
    return mahasiswa;
  }

  public static async cekJadwalKonflikMahasiswa(
    nim: string,
    tanggal: Date,
    waktu_mulai: Date,
    waktu_selesai: Date
  ): Promise<{
    hasConflict: boolean;
    conflicts: any[];
  }> {
    await this.validateMahasiswaExists(nim);

    const jadwal = await MahasiswaRepository.getJadwalMahasiswa(nim, tanggal);

    const conflicts = jadwal.filter((jadwal) => {
      return DateHelper.isTimeOverlapping(waktu_mulai, waktu_selesai, jadwal.waktu_mulai, jadwal.waktu_selesai);
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  public static async validasiMurojaah(email: string) {}

  public static async validasiPersyaratanSeminarKp(nim: string) {
    const pendaftaranKp = await MahasiswaRepository.getPendaftaranKP(nim);

    const masihTerdaftarKP = pendaftaranKp && ["Baru", "Lanjut"].includes(pendaftaranKp.status || "");

    const jumlahBimbingan = await MahasiswaRepository.countBimbinganByNIM(nim);
    const cukupBimbingan = jumlahBimbingan >= 5;

    const { level_akses } = await MahasiswaRepository.getPendaftaranKP(nim);
    if (level_akses < 5) {
      throw new APIError(`Waduh, anda belum memiliki akses untuk mengupload dokumen seminar KP! 😭`, 403);
    }

    const dailyReports = await MahasiswaRepository.getDailyReportsByNIM(nim);
    const semuaDailyReportDisetujui = dailyReports.length > 0 && dailyReports.every((report) => report.status === "Disetujui");

    const nilai = await MahasiswaRepository.getNilaiByNIM(nim);
    const sudahNilaiInstansi = nilai && nilai.nilai_instansi !== null;

    return {
      masih_terdaftar_kp: masihTerdaftarKP,
      minimal_lima_bimbingan: cukupBimbingan,
      daily_report_sudah_approve: semuaDailyReportDisetujui,
      sudah_mendapat_nilai_instansi: sudahNilaiInstansi,
      semua_syarat_terpenuhi: masihTerdaftarKP && cukupBimbingan && semuaDailyReportDisetujui && sudahNilaiInstansi,
    };
  }
}
