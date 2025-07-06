import { status_dokumen } from "../generated/prisma";
import { StatusNilai } from "../types/seminar-kp/nilai.type";
import { APIError } from "../utils/api-error.util";

const BOBOT_PENGUJI = {
    PENGUASAAN_KEILMUAN: 0.4,
    KEMAMPUAN_PRESENTASI: 0.2,
    KESESUAIAN_URGENSI: 0.4,
};

const BOBOT_NILAI_AKHIR = {
    NILAI_PENGUJI: 0.2,
    NILAI_PEMBIMBING: 0.4,
    NILAI_INSTANSI: 0.4,
};

export default class NilaiHelper {
  public static async validateNilaiInput(nilai: number, fieldName: string) {
    if (nilai < 0 || nilai > 100) {
      throw new APIError(`${fieldName} harus bernilai dari 0 hingga 100!`, 400);
    }
  }

  public static async calculateNilaiPenguji(penguasaanKeilmuan: number, kemampuanPresentasi: number, kesesuaianUrgensi: number) {
    await this.validateNilaiInput(penguasaanKeilmuan, "Penguasaan Keilmuan");
    await this.validateNilaiInput(kemampuanPresentasi, "Kemampuan Presentasi");
    await this.validateNilaiInput(kesesuaianUrgensi, "Kesesuaian Urgensi");

    return parseFloat((
      penguasaanKeilmuan * BOBOT_PENGUJI.PENGUASAAN_KEILMUAN + 
      kemampuanPresentasi * BOBOT_PENGUJI.KEMAMPUAN_PRESENTASI + 
      kesesuaianUrgensi * BOBOT_PENGUJI.KESESUAIAN_URGENSI)
      .toFixed(2)
    );
  }

  public static async calculateNilaiPembimbing(penyelesaianMasalah: number, bimbinganSikap: number, kualitasLaporan: number) {
    await this.validateNilaiInput(penyelesaianMasalah, "Penyelesaian Masalah");
    await this.validateNilaiInput(bimbinganSikap, "Bimbingan Sikap");
    await this.validateNilaiInput(kualitasLaporan, "Kualitas Laporan");

    return penyelesaianMasalah * 0.4 + bimbinganSikap * 0.35 + kualitasLaporan * 0.25;
  }

  public static async calculateNilaiAkhir(nilaiPenguji: number | null = 0, nilaiPembimbing: number | null = 0, nilaiInstansi: number | null = 0) {
    if (nilaiPenguji === null || nilaiPembimbing === null || nilaiInstansi === null) {
      return null;
    }
    
    return parseFloat((
      nilaiPenguji * BOBOT_NILAI_AKHIR.NILAI_PENGUJI + 
      nilaiPembimbing * BOBOT_NILAI_AKHIR.NILAI_PEMBIMBING + 
      nilaiInstansi * BOBOT_NILAI_AKHIR.NILAI_INSTANSI)
      .toFixed(2));
  }

  public static formatStatusNilai(status: StatusNilai): string {
    switch (status) {
      case StatusNilai.NILAI_BELUM_VALID:
        return "Nilai Belum Valid";
      case StatusNilai.NILAI_VALID:
        return "Nilai Valid";
      case StatusNilai.NILAI_APPROVE:
        return "Nilai Approve";
      default:
        return "Unknown";
    }
  }

  public static getNilaiHuruf(nilai: number | null | undefined): string {
    if (nilai === null || nilai === undefined) return "-";

    if (nilai >= 85) return "A";
    if (nilai >= 80) return "A-";
    if (nilai >= 75) return "B+";
    if (nilai >= 70) return "B";
    if (nilai >= 65) return "B-";
    if (nilai >= 60) return "C+";
    if (nilai >= 55) return "C";
    if (nilai >= 50) return "D";
    return "E";
  }

  public static canInputNilai(waktuMulai: Date | null): boolean {
    if (!waktuMulai) return false;

    const now = new Date();
    return now > waktuMulai;
  }

  public static canValidateNilai(nilaiPenguji: number | null, nilaiPembimbing: number | null, nilaiInstansi: number | null, dokumenSeminarKp: { status: status_dokumen }[]) {
    if (nilaiPenguji === null) {
      return {
        valid: false,
        message: "Nilai dari penguji belum diinput",
      };
    }

    if (nilaiPembimbing === null) {
      return {
        valid: false,
        message: "Nilai dari pembimbing belum diinput",
      };
    }

    if (nilaiInstansi === null) {
      return {
        valid: false,
        message: "Nilai dari instansi belum diinput",
      };
    }

    const unvalidatedDocuments = dokumenSeminarKp.filter((doc) => doc.status !== status_dokumen.Divalidasi);
    if (unvalidatedDocuments.length > 0) {
      return {
        valid: false,
        message: `${unvalidatedDocuments.length} dokumen seminar belum divalidasi`,
      };
    }

    return {
      valid: true,
      message: "Semua persyaratan validasi terpenuhi",
    };
  }
}
