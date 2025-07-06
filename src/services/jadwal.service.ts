import { jadwal } from "../generated/prisma";
import JadwalRepository from "../repositories/jadwal.repository";
import MahasiswaService from "./mahasiswa.service";
import DosenService from "./dosen.service";
import { CreateJadwalDto, UpdateJadwalDto } from "../validators/jadwal.validator";
import { APIError } from "../utils/api-error.util";
import DateHelper from "../helpers/date.helper";
import { CreateJadwalInput, JadwalSeminarResponse, UpdateJadwalInput, DataJadwalSeminar, CreateRuanganInput } from "../types/seminar-kp/jadwal.type";
import JadwalHelper from "../helpers/jadwal.helper";
import NilaiRepository from "../repositories/nilai.repository";
import DosenRepository from "../repositories/dosen.repository";

export default class JadwalService {
  private static async validateScheduleConflicts(
    nim: string,
    nipPenguji: string,
    nipPembimbing: string | null,
    ruangan: string,
    tanggal: Date,
    waktuMulai: Date,
    waktuSelesai: Date,
    excludeJadwalId?: string
) {
    const [
        studentConflictResult,
        pengujiConflictResult,
        pembimbingConflictResult,
        isRoomAvailable
    ] = await Promise.all([
        MahasiswaService.cekJadwalKonflikMahasiswa(nim, tanggal, waktuMulai, waktuSelesai),

        DosenService.cekJadwalKonflikDosen(nipPenguji, tanggal, waktuMulai, waktuSelesai),

        nipPembimbing
            ? DosenService.cekJadwalKonflikDosen(nipPembimbing, tanggal, waktuMulai, waktuSelesai)
            : Promise.resolve({ hasConflict: false, conflicts: [] }),

        JadwalRepository.checkRuanganAvailability(ruangan, tanggal, waktuMulai, waktuSelesai, excludeJadwalId)
    ]);

    const formatConflictMessage = (conflicts: any[]): string => {
        return conflicts
            .map(c => `${new Date(c.tanggal).toLocaleDateString()} ${new Date(c.waktu_mulai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(c.waktu_selesai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
            .join(", ");
    };

    if (studentConflictResult.hasConflict) {
        const filteredConflicts = studentConflictResult.conflicts.filter(c => c.id !== excludeJadwalId);
        if (filteredConflicts.length > 0) {
            throw new APIError(
                `Jadwal mahasiswa konflik: ${formatConflictMessage(filteredConflicts)}`,
                409
            );
        }
    }

    if (pengujiConflictResult.hasConflict) {
        const filteredConflicts = pengujiConflictResult.conflicts.filter(c => c.id !== excludeJadwalId);
        if (filteredConflicts.length > 0) {
            throw new APIError(
                `Jadwal dosen penguji konflik: ${formatConflictMessage(filteredConflicts)}`,
                409
            );
        }
    }

    if (pembimbingConflictResult.hasConflict) {
        const filteredConflicts = pembimbingConflictResult.conflicts.filter(c => c.id !== excludeJadwalId);
        if (filteredConflicts.length > 0) {
            throw new APIError(
                `Jadwal dosen pembimbing konflik: ${formatConflictMessage(filteredConflicts)}`,
                409
            );
        }
    }

    if (!isRoomAvailable) {
        throw new APIError("Ruangan tidak tersedia pada waktu yang dipilih", 409);
    }
}

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
      throw new APIError(`Waktu selesai tidak boleh melebihi waktu mulai!`, 400);
    }

    const isStudentEligible = await JadwalHelper.isEligibleForScheduling(data.id_pendaftaran_kp);
    if (!isStudentEligible) {
      throw new APIError(`Dokumen belum divalidasi!`, 404);
    }

    const pendaftaran = await JadwalRepository.getPendaftaranKpById(data.id_pendaftaran_kp);
    if (!pendaftaran) {
      throw new APIError(`Pendaftaran KP tidak ditemukan!`, 404);
    }

    if (pendaftaran.nip_pembimbing && data.nip_penguji === pendaftaran.nip_pembimbing) {
      throw new APIError(`Dosen penguji tidak boleh sama dengan dosen pembimbing! 😭`, 400);
    }

    await DosenService.getDosenByNIP(data.nip_penguji);

    const mahasiswa = await MahasiswaService.validateMahasiswaExists(data.nim);

    if (waktu_mulai && waktu_mulai < new Date()) {
      throw new APIError(`Waktu selesai tidak boleh lebih awal dari waktu saat ini.`, 400);
    }

    await this.validateScheduleConflicts(
      data.nim,
      data.nip_penguji,
      pendaftaran.nip_pembimbing,
      data.nama_ruangan,
      tanggal,
      waktu_mulai,
      waktu_selesai
    );

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
      keterangan: `Pembuatan jadwal baru mahasiswa ${mahasiswa.nama}`,
      id_jadwal: createdJadwal.id,
      nip_penguji_baru: data.nip_penguji,
      nip_penguji_lama: null,
    });

    return createdJadwal;
  }

  public static async putJadwal(data: UpdateJadwalDto): Promise<jadwal> {
    const existingJadwal = await JadwalRepository.getJadwalById(data.id);
    if (!existingJadwal) {
      throw new APIError("Jadwal tidak ditemukan", 404);
    }

    const nilaiExist = await NilaiRepository.findNilaiByJadwalId(data.id);
    if (nilaiExist) {
      const hasNilaiPenguji = nilaiExist.nilai_penguji !== null && nilaiExist.nilai_penguji !== undefined;
      const hasNilaiPembimbing = nilaiExist.nilai_pembimbing !== null && nilaiExist.nilai_pembimbing !== undefined;

      if (hasNilaiPenguji || hasNilaiPembimbing) {
        const inputtedNilai = [];
        if (hasNilaiPenguji) inputtedNilai.push("nilai penguji");
        if (hasNilaiPembimbing) inputtedNilai.push("nilai pembimbing");
        throw new APIError(`Jadwal tidak dapat diubah karena ${inputtedNilai.join(", ")} sudah diinputkan!`, 400);
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
      throw new APIError(`Tanggal dan waktu harus diisi.`, 400);
    }

    if (waktu_selesai <= waktu_mulai) {
      throw new APIError(`Waktu selesai tidak boleh melebihi waktu mulai!`, 400);
    }

    if (data.nama_ruangan) {
      nama_ruangan = data.nama_ruangan;
    }

    if (waktu_selesai && waktu_selesai < new Date()) {
      throw new APIError(`Waktu selesai tidak boleh lebih awal dari waktu saat ini.`, 400);
    }

    if (data.nip_penguji) {
      await DosenService.getDosenByNIP(data.nip_penguji);

      if (existingJadwal.pendaftaran_kp?.nip_pembimbing && data.nip_penguji === existingJadwal.pendaftaran_kp.nip_pembimbing) {
        throw new APIError(`Dosen penguji tidak boleh sama dengan dosen pembimbing! 😭`, 400);
      }
    }

    const nipPenguji = data.nip_penguji || existingJadwal.pendaftaran_kp?.nip_penguji;
    const nim = existingJadwal.nim;

    if (nim && nipPenguji) {
      await this.validateScheduleConflicts(
        nim,
        nipPenguji,
        existingJadwal.pendaftaran_kp?.nip_pembimbing || null,
        nama_ruangan,
        tanggal,
        waktu_mulai,
        waktu_selesai,
        data.id
      );
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

    const mahasiswa = existingJadwal.nim ? await MahasiswaService.validateMahasiswaExists(existingJadwal.nim) : null;
    const dosen = existingJadwal.pendaftaran_kp?.dosen_penguji && existingJadwal.pendaftaran_kp.nip_penguji
      ? await DosenService.getNamaByNip(existingJadwal.pendaftaran_kp.nip_penguji): null;

    await JadwalRepository.logJadwalChanges({
      log_type: "UPDATE",
      tanggal_lama: existingJadwal.tanggal,
      tanggal_baru: tanggal,
      ruangan_lama: existingJadwal.nama_ruangan,
      ruangan_baru: nama_ruangan || "Unknown",
      keterangan: `Perubahan jadwal ${mahasiswa?.nama || "unknown"}${data.nip_penguji ? ` dengan pembaruan dosen penguji ${dosen?.nama}` : ""}`,
      id_jadwal: existingJadwal.id,
      nip_penguji_lama: existingJadwal.pendaftaran_kp?.nip_penguji,
      nip_penguji_baru: data.nip_penguji,
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

  public static async getJadwalMahasiswaSaya(email: string, tahunAjaranId: number = 1) {
    const dosen = await DosenService.getDosenByEmail(email);

    let tahunAjaran;
    if (tahunAjaranId && tahunAjaranId > 0) {
      tahunAjaran = await JadwalRepository.getTahunAjaranById(tahunAjaranId);
    } else {
      tahunAjaran = await JadwalRepository.getTahunAjaran();
    }

    if (!tahunAjaran) {
      throw new APIError(`TTahun ajaran tidak ditemukan`, 404);
    }

    const { statistics, jadwalHariIni, semuaJadwal, mahasiswaDinilaiMap } = await JadwalRepository.getJadwalMahasiswaSaya(dosen.nip, tahunAjaranId);

    const formattedJadwalHariIni = jadwalHariIni.map((jadwal) => JadwalHelper.formatJadwalData(jadwal, mahasiswaDinilaiMap));

    const formattedSemuaJadwal = semuaJadwal.map((jadwal) => JadwalHelper.formatJadwalData(jadwal, mahasiswaDinilaiMap));

    const resolvedSemuaJadwal = await Promise.all(formattedSemuaJadwal);
    resolvedSemuaJadwal.sort((a, b) => {
      if (!a.tanggal || !b.tanggal) return 0;
      return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    });

    return {
      tahun_ajaran: {
        id: tahunAjaran.id,
        nama: tahunAjaran.nama,
      },
      statistics,
      jadwalHariIni: formattedJadwalHariIni,
      semuaJadwal: formattedSemuaJadwal,
    };
  }

  public static async getAllTahunAjaran() {
    return await JadwalRepository.getAllTahunAjaran();
  }

  public static async getTahunAjaran() {
    return JadwalRepository.getTahunAjaran();
  }

  public static async getAllJadwalSeminar(tahunAjaranId: number = 1): Promise<JadwalSeminarResponse> {
    if (!tahunAjaranId) {
      const tahunAjaranSekarang = await JadwalRepository.getTahunAjaran();
      if (!tahunAjaranSekarang) {
        throw new APIError(`Tahun ajaran tidak ditemukan`, 404);
      }
      tahunAjaranId = tahunAjaranSekarang.id;
    }

    const tahunAjaran = await JadwalRepository.getTahunAjaranById(tahunAjaranId)
    if (!tahunAjaran) {
      throw new APIError(`Tahun ajaran tidak ditemukan`, 404);
    }

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const startOfWeek = new Date(todayStart);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const [
        semuaDataResult,
        hariIniResult,
        mingguIniResult
    ] = await Promise.all([
        JadwalRepository.getAllJadwalSeminar(tahunAjaranId),
        JadwalRepository.getAllJadwalSeminar(tahunAjaranId, { from: todayStart, to: todayEnd }),
        JadwalRepository.getAllJadwalSeminar(tahunAjaranId, { from: startOfWeek, to: endOfWeek })
    ]);

    return {
      total_seminar: semuaDataResult.totalSeminar,
      total_seminar_minggu_ini: mingguIniResult.totalSeminar,
      total_jadwal_ulang: semuaDataResult.totalJadwalUlang,
      jadwal: {
        semua: semuaDataResult.jadwalList,
        hari_ini: hariIniResult.jadwalList,
        minggu_ini: mingguIniResult.jadwalList,
        by_ruangan: {
          semua: semuaDataResult.jadwalByRuangan,
          hari_ini: hariIniResult.jadwalByRuangan,
          minggu_ini: mingguIniResult.jadwalByRuangan,
        },
      },
      tahun_ajaran: { ...tahunAjaran, nama: tahunAjaran.nama ?? "Unknown" },
    };
  }

  public static async getLogJadwal(tahunAjaranId: number = 1) {
    if (!tahunAjaranId) {
      const tahunAjaranSekarang = await JadwalRepository.getTahunAjaran();
      if (!tahunAjaranSekarang) {
        throw new APIError(`Tahun ajaran tidak ditemukan`);
      }
      tahunAjaranId = tahunAjaranSekarang.id;
    }

    const result = await JadwalRepository.getLogJadwal(tahunAjaranId);
    if (!result.logJadwal || result.logJadwal.length === 0) {
      throw new APIError(`Perubahan jadwal tidak ditemukan.`, 404);
    }

    const logJadwalWithNames = await Promise.all(
      result.logJadwalWithJadwal.map(async (log) => {
        const pengujiLama = log.nip_penguji_lama ? await DosenRepository.findNamaDosenByNip(log.nip_penguji_lama) : null;
        const pengujiBaru = log.nip_penguji_baru ? await DosenRepository.findNamaDosenByNip(log.nip_penguji_baru) : null;

        return {
          ...log,
          nama_penguji_lama: pengujiLama?.nama || null,
          nama_penguji_baru: pengujiBaru?.nama || null,
        };
      })
    );

    return {
      logJadwal: logJadwalWithNames,
      tahunAjaran: result.tahunAjaran,
    };
  }

  public static async postRuangan(data: CreateRuanganInput) {
    const ruangan = await JadwalRepository.findRuanganByName(data.nama);
    if (ruangan) {
      throw new APIError(`Ruangan sudah ada.`, 400);
    }

    await JadwalRepository.postRuangan(data);
    return {
      message: `Ruangan '${data.nama}' berhasil ditambahkan!`,
    };
  }

  public static async deleteRuangan(nama: string) {
    const ruangan = await JadwalRepository.findRuanganByName(nama);
    if (!ruangan) {
      throw new APIError(`Ruangan '${nama}' tidak ditemukan!`, 404);
    }

    await JadwalRepository.deleteRuangan(nama);

    return {
      message: `Ruangan '${nama}' berhasil dihapus!`,
    };
  }
}
