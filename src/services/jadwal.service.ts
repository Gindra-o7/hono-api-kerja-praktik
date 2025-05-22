import { jadwal } from "../generated/prisma";
import JadwalRepository from "../repositories/jadwal.repository";
import MahasiswaService from "./mahasiswa.service";
import DosenService from "./dosen.service";
import { CreateJadwalDto, UpdateJadwalDto } from "../validators/jadwal.validator";
import { APIError } from "../utils/api-error.util";
import DateHelper from "../helpers/date.helper";
import { CreateJadwalInput, JadwalSeminarResponse, UpdateJadwalInput } from "../types/seminar-kp/jadwal.type";
import JadwalHelper from "../helpers/jadwal.helper";
import NilaiRepository from "../repositories/nilai.repository";

export default class JadwalService {
  public static async postJadwal(data: CreateJadwalDto): Promise<jadwal> {
    const tanggal = new Date(data.tanggal);
    const waktu_mulai = DateHelper.createDateTimeFromStrings(data.tanggal, data.waktu_mulai);

    let waktu_selesai: Date;
    if (data.waktu_selesai) {
      waktu_selesai = DateHelper.createDateTimeFromStrings(data.tanggal, data.waktu_selesai);
    } else {
      waktu_selesai = new Date(waktu_mulai);
      waktu_selesai.setHours(waktu_selesai.getHours() + 1);
    }

    if (waktu_selesai <= waktu_mulai) {
      throw new APIError(`Waduh, Waktu selesai harus setelah waktu mulai nih! 😭`, 400);
    }

    const isStudentEligible = await JadwalHelper.isEligibleForScheduling(data.id_pendaftaran_kp);
    if (!isStudentEligible) {
      throw new APIError(`Waduh, dokumen nya belum divalidasi ni! 😭`, 404);
    }

    const pendaftaran = await JadwalRepository.getPendaftaranKpById(data.id_pendaftaran_kp);
    if (!pendaftaran) {
      throw new APIError(`Waduh, pendaftaran KP tidak ditemukan! 😭`, 404);
    }

    await DosenService.getDosenByNIP(data.nip_penguji);

    await MahasiswaService.validateMahasiswaExists(data.nim);

    const { hasConflict: studentHasConflict, conflicts: studentConflicts } = await MahasiswaService.cekJadwalKonflikMahasiswa(data.nim, tanggal, waktu_mulai, waktu_selesai);

    if (studentHasConflict) {
      throw new APIError(
        `Jadwal mahasiswa konflik: ${studentConflicts.map((c) => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString()} - ${new Date(c.waktu_selesai).toLocaleTimeString()}`).join(", ")}`,
        400
      );
    }

    const { hasConflict: pengujiHasConflict, conflicts: pengujiConflicts } = await DosenService.cekJadwalKonflikDosen(data.nip_penguji, tanggal, waktu_mulai, waktu_selesai);

    if (pengujiHasConflict) {
      throw new APIError(
        `Jadwal dosen penguji konflik: ${pengujiConflicts.map((c) => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString()} - ${new Date(c.waktu_selesai).toLocaleTimeString()}`).join(", ")}`,
        400
      );
    }

    if (pendaftaran.nip_pembimbing) {
      const { hasConflict: pembimbingHasConflict, conflicts: pembimbingConflicts } = await DosenService.cekJadwalKonflikDosen(pendaftaran.nip_pembimbing, tanggal, waktu_mulai, waktu_selesai);

      if (pembimbingHasConflict) {
        throw new APIError(
          `Jadwal dosen pembimbing konflik: ${pembimbingConflicts.map((c) => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString()} - ${new Date(c.waktu_selesai).toLocaleTimeString()}`).join(", ")}`,
          400
        );
      }
    }

    const isRoomAvailable = await JadwalRepository.checkRuanganAvailability(data.nama_ruangan, tanggal, waktu_mulai, waktu_selesai);

    if (!isRoomAvailable) {
      throw new APIError("Ruangan tidak tersedia pada waktu yang dipilih", 400);
    }

    const jadwalInput: CreateJadwalInput = {
      tanggal,
      waktu_mulai,
      waktu_selesai,
      nim: data.nim,
      nama_ruangan: data.nama_ruangan,
      id_pendaftaran_kp: data.id_pendaftaran_kp,
      nip_penguji: data.nip_penguji,
    };

    const createdJadwal = await JadwalRepository.postJadwal(jadwalInput);

    await JadwalRepository.logJadwalChanges({
      log_type: "CREATE",
      tanggal_lama: null,
      tanggal_baru: tanggal,
      ruangan_lama: null,
      ruangan_baru: data.nama_ruangan,
      keterangan: `Pembuatan jadwal baru untuk NIM ${data.nim}`,
      id_jadwal: createdJadwal.id,
      nip_penguji_baru: data.nip_penguji,
      nip_penguji_lama: null,
    });

    return createdJadwal;
  }

  public static async putJadwal(data: UpdateJadwalDto): Promise<jadwal> {
    const existingJadwal = await JadwalRepository.getJadwalById(data.id);
    if (!existingJadwal) {
      throw new APIError("Waduh, Jadwal tidak ditemukan", 404);
    }

    const nilaiExist = await NilaiRepository.findNilaiByJadwalId(data.id);
    if (nilaiExist) {
      const hasNilaiPenguji = nilaiExist.nilai_penguji !== null && nilaiExist.nilai_penguji !== undefined;
      const hasNilaiPembimbing = nilaiExist.nilai_pembimbing !== null && nilaiExist.nilai_pembimbing !== undefined;

      if (hasNilaiPenguji || hasNilaiPembimbing) {
        const inputtedNilai = [];
        if (hasNilaiPenguji) inputtedNilai.push("nilai penguji");
        if (hasNilaiPembimbing) inputtedNilai.push("nilai pembimbing");
        throw new APIError(`Waduh, jadwal tidak dapat diubah karena ${inputtedNilai.join(", ")} sudah diinputkan! 😭`, 400);
      }
    }

    let tanggal = existingJadwal.tanggal;
    let waktu_mulai = existingJadwal.waktu_mulai;
    let waktu_selesai = existingJadwal.waktu_selesai;
    let nama_ruangan = existingJadwal.nama_ruangan;

    if (data.tanggal) {
      tanggal = new Date(data.tanggal);
    }

    if (data.waktu_mulai) {
      const tanggalStr = tanggal ? tanggal.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      waktu_mulai = DateHelper.createDateTimeFromStrings(tanggalStr, data.waktu_mulai);

      if (!data.waktu_selesai) {
        waktu_selesai = new Date(waktu_mulai);
        waktu_selesai.setHours(waktu_selesai.getHours() + 1);
      }
    }

    if (data.waktu_selesai) {
      const tanggalStr = tanggal ? tanggal.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      waktu_selesai = DateHelper.createDateTimeFromStrings(tanggalStr, data.waktu_selesai);
    }

    if (!tanggal || !waktu_mulai || !waktu_selesai || !nama_ruangan) {
      throw new APIError("Waduh, Tanggal dan waktu mulai harus diisi", 400);
    }

    if (waktu_selesai <= waktu_mulai) {
      throw new APIError(`Waduh, Waktu selesai harus setelah waktu mulai nih! 😭`, 400);
    }

    if (data.nama_ruangan) {
      nama_ruangan = data.nama_ruangan;
    }

    if (data.nip_penguji) {
      await DosenService.getDosenByNIP(data.nip_penguji);
    }

    if (existingJadwal.nim) {
      const { hasConflict: studentHasConflict, conflicts: studentConflicts } = await MahasiswaService.cekJadwalKonflikMahasiswa(existingJadwal.nim, tanggal, waktu_mulai, waktu_selesai);

      if (studentHasConflict) {
        const filteredConflicts = studentConflicts.filter((c) => c.id !== data.id);
        if (filteredConflicts.length > 0) {
          throw new APIError(
            `Jadwal mahasiswa konflik: ${filteredConflicts.map((c) => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString()} - ${new Date(c.waktu_selesai).toLocaleTimeString()}`).join(", ")}`,
            400
          );
        }
      }
    }

    const nipPenguji = data.nip_penguji || existingJadwal.pendaftaran_kp?.nip_penguji;
    if (nipPenguji) {
      const { hasConflict: pengujiHasConflict, conflicts: pengujiConflicts } = await DosenService.cekJadwalKonflikDosen(nipPenguji, tanggal, waktu_mulai, waktu_selesai);

      if (pengujiHasConflict) {
        const filteredConflicts = pengujiConflicts.filter((c) => c.id !== data.id);
        if (filteredConflicts.length > 0) {
          throw new APIError(
            `Jadwal dosen penguji konflik: ${filteredConflicts.map((c) => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString()} - ${new Date(c.waktu_selesai).toLocaleTimeString()}`).join(", ")}`,
            400
          );
        }
      }
    }

    if (existingJadwal.pendaftaran_kp?.nip_pembimbing) {
      const nipPembimbing = existingJadwal.pendaftaran_kp.nip_pembimbing;
      const { hasConflict: pembimbingHasConflict, conflicts: pembimbingConflicts } = await DosenService.cekJadwalKonflikDosen(nipPembimbing, tanggal, waktu_mulai, waktu_selesai);

      if (pembimbingHasConflict) {
        const filteredConflicts = pembimbingConflicts.filter((c) => c.id !== data.id);
        if (filteredConflicts.length > 0) {
          throw new APIError(
            `Jadwal dosen pembimbing konflik: ${filteredConflicts.map((c) => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString()} - ${new Date(c.waktu_selesai).toLocaleTimeString()}`).join(", ")}`,
            400
          );
        }
      }
    }

    const isRoomAvailable = await JadwalRepository.checkRuanganAvailability(nama_ruangan, tanggal, waktu_mulai, waktu_selesai, data.id);

    if (!isRoomAvailable) {
      throw new APIError("Ruangan tidak tersedia pada waktu yang dipilih", 400);
    }

    const updateInput: UpdateJadwalInput = {
      id: data.id,
      tanggal: tanggal,
      waktu_mulai: waktu_mulai,
      waktu_selesai: waktu_selesai,
      status: data.status,
      nama_ruangan: nama_ruangan,
      nip_penguji: data.nip_penguji,
    };

    const updatedJadwal = await JadwalRepository.putJadwal(updateInput);

    await JadwalRepository.logJadwalChanges({
      log_type: "UPDATE",
      tanggal_lama: existingJadwal.tanggal,
      tanggal_baru: tanggal,
      ruangan_lama: existingJadwal.nama_ruangan,
      ruangan_baru: nama_ruangan || "Unknown",
      keterangan: `Perubahan jadwal ${existingJadwal.nim || "unknown"}${data.nip_penguji ? ` dengan pembaruan dosen penguji ${data.nip_penguji}` : ""}`,
      id_jadwal: existingJadwal.id,
      nip_penguji_lama: existingJadwal.pendaftaran_kp?.nip_penguji,
      nip_penguji_baru: data.nip_penguji
    });

    return updatedJadwal;
  }

  public static async getAllRuangan() {
    const ruangan = await JadwalRepository.getAllRuangan();
    return ruangan;
  }

  public static async getAllDosen() {
    const dosen = await JadwalRepository.getAllDosen();
    return dosen;
  }

  public static async getJadwalMahasiswaSaya(email: string) {
    const dosen = await DosenService.getDosenByEmail(email);

    const { statistics, jadwalHariIni, semuaJadwal, mahasiswaDinilaiMap } = await JadwalRepository.getJadwalMahasiswaSaya(dosen.nip);

    const formattedJadwalHariIni = jadwalHariIni.map((jadwal) => JadwalHelper.formatJadwalData(jadwal, mahasiswaDinilaiMap));

    const formattedSemuaJadwal = semuaJadwal.map((jadwal) => JadwalHelper.formatJadwalData(jadwal, mahasiswaDinilaiMap));

    const resolvedSemuaJadwal = await Promise.all(formattedSemuaJadwal);
    resolvedSemuaJadwal.sort((a, b) => {
      if (!a.tanggal || !b.tanggal) return 0;
      return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    });

    return {
      statistics,
      jadwalHariIni: formattedJadwalHariIni,
      semuaJadwal: formattedSemuaJadwal,
    };
  }

  public static async getTahunAjaran() {
    return JadwalRepository.getTahunAjaran();
  }

  public static async getAllJadwalSeminar(tahunAjaranId: number): Promise<JadwalSeminarResponse> {
    if (!tahunAjaranId) {
      const tahunAjaranSekarang = await JadwalRepository.getTahunAjaran();
      if (!tahunAjaranSekarang) {
        throw new APIError(`Waduh, Tahun ajaran tidak ditemukan`);
      }
      tahunAjaranId = tahunAjaranSekarang.id;
    }

    const { totalSeminar, totalSeminarMingguIni, totalJadwalUlang, jadwalList, tahunAjaran } = await JadwalRepository.getAllJadwalSeminar(tahunAjaranId);

    const hariIni = JadwalHelper.filterJadwalHariIni(jadwalList);
    const mingguIni = JadwalHelper.filterJadwalMingguIni(jadwalList);

    return {
      total_seminar: totalSeminar,
      total_seminar_minggu_ini: totalSeminarMingguIni,
      total_jadwal_ulang: totalJadwalUlang,
      jadwal: {
        semua: jadwalList,
        hari_ini: hariIni,
        minggu_ini: mingguIni,
      },
      tahun_ajaran: { ...tahunAjaran, nama: tahunAjaran.nama ?? "Unknown" },
    };
  }

  public static async getLogJadwal(tahunAjaranId: number = 1) {
    if (!tahunAjaranId) {
      const tahunAjaranSekarang = await JadwalRepository.getTahunAjaran();
      if (!tahunAjaranSekarang) {
        throw new APIError(`Waduh, Tahun ajaran tidak ditemukan`);
      }
      tahunAjaranId = tahunAjaranSekarang.id;
    }

    const result = await JadwalRepository.getLogJadwal(tahunAjaranId);
    if (!result.logJadwal || result.logJadwal.length === 0) {
      throw new APIError(`Waduh, Log jadwal tidak ditemukan, 😭`, 404);
    }

    return {
      logJadwal: result.logJadwalWithJadwal,
      tahunAjaran: result.tahunAjaran,
    };
  }
}
