import { status_dokumen } from "../generated/prisma";
import MahasiswaHelper from "../helpers/mahasiswa.helper";
import NilaiRepository from "../repositories/nilai.repository";
import { NilaiPengujiInput, NilaiPembimbingInput, AllNilaiResponse, DetailMahasiswaNilai, StatusNilai, KomponenNilaiInstansi, KomponenNilaiPembimbing, KomponenNilaiPenguji } from "../types/seminar-kp/nilai.type";
import { APIError } from "../utils/api-error.util";
import NilaiHelper from "../helpers/nilai.helper";
import MahasiswaRepository from "../repositories/mahasiswa.repository";
import DosenRepository from "../repositories/dosen.repository";
import { string } from "zod";
import prisma from "../infrastructures/db.infrastructure";

export default class NilaiService {
  public static async createUpdateNilaiPenguji(input: NilaiPengujiInput, id?: string, email?: string) {
    if (input.idJadwalSeminar) {
      const jadwal = await NilaiRepository.getJadwalById(input.idJadwalSeminar);
      if (!jadwal) {
        throw new APIError(`Waduh, Jadwal tidak ditemukan ni! 😭`, 404);
      }

      if (!NilaiHelper.canInputNilai(jadwal.waktu_mulai)) {
        throw new APIError(`Waduh, Nilai penguji tidak bisa diinput setelah seminar dimulai! 😭`, 400);
      }
    }

    let nipPenguji: string;

    if (email) {
      const dosen = await DosenRepository.getDosenByEmail(email);
      if (!dosen) {
        throw new APIError(`Waduh, Email Dosen tidak ditemukan ni! 😭`, 404);
      }

      const pendaftaranKp = await DosenRepository.getPendaftaranKpDosen(input.nim);
      if (!pendaftaranKp) {
        throw new APIError(`Waduh, Pendaftaran KP untuk mahasiswa dengan NIM ${input.nim} tidak ditemukan`, 404);
      }

      if (pendaftaranKp.nip_penguji !== dosen.nip) {
        throw new APIError(`Waduh, Anda bukan penguji untuk mahasiswa ini`, 403);
      }

      nipPenguji = dosen.nip;
    } else {
      const pendaftaranKp = await DosenRepository.getPendaftaranKpDosen(input.nim);
      if (!pendaftaranKp) {
        throw new APIError(`Waduh, Pendaftaran KP untuk mahasiswa dengan NIM ${input.nim} tidak ditemukan`, 404);
      }

      if (!pendaftaranKp.nip_penguji) {
        throw new APIError(`Waduh, Dosen tersebut bukan penguji untuk mahasiswa ini`, 403);
      }

      nipPenguji = pendaftaranKp.nip_penguji;
    }

    const nilaiPenguji = await NilaiHelper.calculateNilaiPenguji(input.penguasaanKeilmuan, input.kemampuanPresentasi, input.kesesuaianUrgensi);

    let nilaiId: string;
    let isUpdate = false;

    if (id) {
      const existingNilai = await NilaiRepository.getNilaiById(id);
      if (existingNilai) {
        nilaiId = id;
        isUpdate = true;
      } else {
        nilaiId = id;
      }
    } else {
      const existingNilai = await prisma.nilai.findFirst({
        where: { nim: input.nim },
      });

      if (existingNilai) {
        nilaiId = existingNilai.id;
        isUpdate = true;
      } else {
        nilaiId = crypto.randomUUID();
      }
    }

    const nilai = await NilaiRepository.createNilaiPenguji(nilaiId, input.penguasaanKeilmuan, input.kemampuanPresentasi, input.kesesuaianUrgensi, input.catatan || null, nilaiPenguji, input.nim, nipPenguji, input.idJadwalSeminar);

    const mahasiswa = await MahasiswaRepository.getNamaByNIM(input.nim);

    await this.updateNilaiAkhir(nilai.id);
    return {
      nilai,
      message: `Nilai ${mahasiswa?.nama} berhasil ${isUpdate ? "diperbarui" : "disimpan"} dengan nilai ${nilaiPenguji}`,
    };
  }

  public static async createUpdateNilaiPembimbing(input: NilaiPembimbingInput, id?: string, email?: string) {
    if (input.idJadwalSeminar) {
      const jadwal = await NilaiRepository.getJadwalById(input.idJadwalSeminar);
      if (!jadwal) {
        throw new APIError(`Waduh, Jadwal tidak ditemukan ni! 😭`, 404);
      }

      if (!NilaiHelper.canInputNilai(jadwal.waktu_mulai)) {
        throw new APIError(`Waduh, Nilai pembimbing tidak bisa diinput sebelum seminar dimulai! 😭`, 400);
      }
    }

    let nipPembimbing: string;

    if (email) {
      const dosen = await DosenRepository.getDosenByEmail(email);
      if (!dosen) {
        throw new APIError(`Waduh, Email Dosen tidak ditemukan ni! 😭`, 404);
      }

      const pendaftaranKp = await DosenRepository.getPendaftaranKpDosen(input.nim);
      if (!pendaftaranKp) {
        throw new APIError(`Waduh, Pendaftaran KP untuk mahasiswa dengan NIM ${input.nim} tidak ditemukan`, 404);
      }

      if (pendaftaranKp.nip_pembimbing !== dosen.nip) {
        throw new APIError(`Waduh, Anda bukan pembimbing untuk mahasiswa ini`, 403);
      }

      nipPembimbing = dosen.nip;
    } else {
      const pendaftaranKp = await DosenRepository.getPendaftaranKpDosen(input.nim);
      if (!pendaftaranKp) {
        throw new APIError(`Waduh, Pendaftaran KP untuk mahasiswa dengan NIM ${input.nim} tidak ditemukan`, 404);
      }

      if (!pendaftaranKp.nip_pembimbing) {
        throw new APIError(`Waduh, Dosen bukan pembimbing untuk mahasiswa ini`, 403);
      }

      nipPembimbing = pendaftaranKp.nip_pembimbing;
    }

    const nilaiPembimbing = await NilaiHelper.calculateNilaiPembimbing(input.penyelesaianMasalah, input.bimbinganSikap, input.kualitasLaporan);

    let nilaiId: string;
    let isUpdate = false;

    if (id) {
      const existingNilai = await NilaiRepository.getNilaiById(id);
      if (existingNilai) {
        nilaiId = id;
        isUpdate = true;
      } else {
        nilaiId = id;
      }
    } else {
      const existingNilai = await prisma.nilai.findFirst({
        where: { nim: input.nim },
      });

      if (existingNilai) {
        nilaiId = existingNilai.id;
        isUpdate = true;
      } else {
        nilaiId = crypto.randomUUID();
      }
    }

    const nilai = await NilaiRepository.createNilaiPembimbing(nilaiId, input.penyelesaianMasalah, input.bimbinganSikap, input.kualitasLaporan, input.catatan || null, nilaiPembimbing, input.nim, nipPembimbing, input.idJadwalSeminar);

    const mahasiswa = await MahasiswaRepository.getNamaByNIM(input.nim);

    await this.updateNilaiAkhir(nilai.id);
    return {
      nilai,
      message: `Nilai ${mahasiswa?.nama} berhasil ${isUpdate ? "diperbarui" : "disimpan"} dengan nilai ${nilaiPembimbing}`,
    };
  }

  public static async updateNilaiAkhir(id: string) {
    const nilai = await NilaiRepository.getNilaiById(id);
    if (!nilai) {
      throw new APIError(`Waduh, Nilai tidak ditemukan ni! 😭`, 404);
    }

    const nilaiPenguji = nilai.nilai_penguji ?? 0;
    const nilaiPembimbing = nilai.nilai_pembimbing ?? 0;
    const nilaiInstansi = nilai.nilai_instansi ?? 0;

    const nilaiAkhir = await NilaiHelper.calculateNilaiAkhir(nilaiPenguji, nilaiPembimbing, nilaiInstansi);

    if (nilaiAkhir != null) {
      await NilaiRepository.updateNilaiAkhir(id, nilaiAkhir);
    }

    return {
      nilai,
      nilaiAkhir,
    };
  }

  public static async getNilaiById(id: string) {
    return NilaiRepository.getNilaiById(id);
  }

  public static async getAllNilai(tahunAjaranId: number = 0): Promise<AllNilaiResponse> {
    const { mahasiswaData, tahunAjaran } = await NilaiRepository.getAllMahasiswaNilai(tahunAjaranId);

    const detailMahasiswa: DetailMahasiswaNilai[] = mahasiswaData
      .map((mahasiswa) => {
        const pendaftaranKp = mahasiswa.pendaftaran_kp[0];

        if (!pendaftaranKp) {
          return null;
        }

        let nilaiInstansi: number | undefined = undefined;
        let nilaiPembimbing: number | undefined = undefined;
        let nilaiPenguji: number | undefined = undefined;
        let nilaiAkhir: number | undefined = undefined;
        let nilaiHuruf: string | undefined = undefined;
        let komponenNilaiInstansi: KomponenNilaiInstansi | undefined = undefined;
        let komponenNilaiPembimbing: KomponenNilaiPembimbing | undefined = undefined;
        let komponenNilaiPenguji: KomponenNilaiPenguji | undefined = undefined;

        const nilaiData = mahasiswa.nilai[0];

        if (nilaiData) {
          nilaiInstansi = nilaiData.nilai_instansi ? Number(nilaiData.nilai_instansi) : undefined;
          nilaiPembimbing = nilaiData.nilai_pembimbing ? Number(nilaiData.nilai_pembimbing) : undefined;
          nilaiPenguji = nilaiData.nilai_penguji ? Number(nilaiData.nilai_penguji) : undefined;
          nilaiAkhir = nilaiData.nilai_akhir ? Number(nilaiData.nilai_akhir) : undefined;

          nilaiHuruf = NilaiHelper.getNilaiHuruf(nilaiAkhir);

          if (nilaiData.komponen_penilaian_instansi !== null) {
            const komponen = nilaiData.komponen_penilaian_instansi;
            komponenNilaiInstansi = {
              deliverables: komponen.deliverables ? Number(komponen.deliverables) : undefined,
              ketepatan_waktu: komponen.ketepatan_waktu ? Number(komponen.ketepatan_waktu) : undefined,
              kedisiplinan: komponen.kedisiplinan ? Number(komponen.kedisiplinan) : undefined,
              attitude: komponen.attitude ? Number(komponen.attitude) : undefined,
              kerjasama_tim: komponen.kerjasama_tim ? Number(komponen.kerjasama_tim) : undefined,
              inisiatif: komponen.inisiatif ? Number(komponen.inisiatif) : undefined,
              masukan: komponen.masukan || undefined,
            };
          }

          if (nilaiData.komponen_penilaian_pembimbing !== null) {
            const komponen = nilaiData.komponen_penilaian_pembimbing;
            komponenNilaiPembimbing = {
              penyelesaian_masalah: komponen.penyelesaian_masalah ? Number(komponen.penyelesaian_masalah) : undefined,
              bimbingan_sikap: komponen.bimbingan_sikap ? Number(komponen.bimbingan_sikap) : undefined,
              kualitas_laporan: komponen.kualitas_laporan ? Number(komponen.kualitas_laporan) : undefined,
              catatan: komponen.catatan || undefined,
            };
          }

          if (nilaiData.komponen_penilaian_penguji !== null) {
            const komponen = nilaiData.komponen_penilaian_penguji;
            komponenNilaiPenguji = {
              penguasaan_keilmuan: komponen.penguasaan_keilmuan ? Number(komponen.penguasaan_keilmuan) : undefined,
              kemampuan_presentasi: komponen.kemampuan_presentasi ? Number(komponen.kemampuan_presentasi) : undefined,
              kesesuaian_urgensi: komponen.kesesuaian_urgensi ? Number(komponen.kesesuaian_urgensi) : undefined,
              catatan: komponen.catatan || undefined,
            };
          }
        }

        let statusNilai = StatusNilai.NILAI_BELUM_VALID;

        const hasAllNilai = nilaiInstansi !== undefined && nilaiPembimbing !== undefined && nilaiPenguji !== undefined;

        if (hasAllNilai) {
          const allDocumentsValidated = pendaftaranKp?.dokumen_seminar_kp.every((doc) => doc.status === status_dokumen.Divalidasi);

          if (allDocumentsValidated) {
            statusNilai = StatusNilai.NILAI_APPROVE;
          } else {
            statusNilai = StatusNilai.NILAI_VALID;
          }
        }

        const formattedStatusNilai = NilaiHelper.formatStatusNilai(statusNilai);

        return {
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          kelas: pendaftaranKp?.kelas_kp || undefined,
          status_nilai: formattedStatusNilai,
          status_daftar_kp: pendaftaranKp?.status || undefined,
          semester: MahasiswaHelper.getSemesterByNIM(mahasiswa.nim).toString(),
          instansi: pendaftaranKp?.instansi?.nama || undefined,
          pembimbing_instansi: pendaftaranKp?.pembimbing_instansi?.nama || undefined,
          dosen_pembimbing: pendaftaranKp?.dosen_pembimbing?.nama || undefined,
          dosen_penguji: pendaftaranKp?.dosen_penguji?.nama || undefined,
          nilai_instansi: nilaiInstansi,
          nilai_pembimbing: nilaiPembimbing,
          nilai_penguji: nilaiPenguji,
          nilai_akhir: nilaiAkhir,
          nilai_huruf: nilaiHuruf,
          komponen_nilai_instansi: komponenNilaiInstansi,
          komponen_nilai_pembimbing: komponenNilaiPembimbing,
          komponen_nilai_penguji: komponenNilaiPenguji,
        };
      })
      .filter((mahasiswa): mahasiswa is DetailMahasiswaNilai => mahasiswa !== null);

    const jumlahNilaiBelumValid = detailMahasiswa.filter((m) => m.status_nilai === StatusNilai.NILAI_BELUM_VALID).length;
    const jumlahNilaiValid = detailMahasiswa.filter((m) => m.status_nilai === StatusNilai.NILAI_VALID).length;
    const jumlahNilaiApprove = detailMahasiswa.filter((m) => m.status_nilai === StatusNilai.NILAI_APPROVE).length;

    return {
      tahunAjaran: tahunAjaran.nama || "",
      jumlahNilaiBelumValid,
      jumlahNilaiValid,
      jumlahNilaiApprove,
      detailMahasiswa,
    };
  }

  public static async createValidasiNilai(idNilai: string) {
    const nilai = await NilaiRepository.getNilaiById(idNilai);
    if (!nilai) {
      throw new APIError(`Waduh, Nilai tidak ditemukan ni! 😭`, 404);
    }

    const validasi = await NilaiRepository.getValidasiNilaiById(idNilai);
    if (validasi && validasi.is_approve) {
      throw new APIError(`Waduh, Nilai ini sudah divalidasi sebelumnya! 😭`, 400);
    }

    let pendaftaran_kp;
    if (nilai.nim) {
      pendaftaran_kp = await DosenRepository.getPendaftaranKpDosen(nilai.nim);
      if (!pendaftaran_kp) {
        throw new APIError(`Waduh, Pendaftaran KP untuk mahasiswa dengan NIM ${nilai.nim} tidak ditemukan`, 404);
      }
    } else {
      throw new APIError(`Waduh, Nilai tidak ditemukan ni! 😭`, 404);
    }

    const validasiStatus = NilaiHelper.canValidateNilai(nilai.nilai_penguji, nilai.nilai_pembimbing, nilai.nilai_instansi, pendaftaran_kp.dokumen_seminar_kp.filter((doc) => doc.status !== null) as { status: status_dokumen }[]);

    if (!validasiStatus.valid) {
      throw new APIError(`Waduh, ${validasiStatus.message}! 😭`, 400);
    }

    let validasiNilai;
    if (validasi) {
      validasiNilai = await NilaiRepository.updateValidasiNilai(validasi.id, true);
    } else {
      const validasiId = crypto.randomUUID();
      validasiNilai = await NilaiRepository.createValidasiNilai(validasiId, idNilai, true);
    }

    return {
      validasiNilai,
      nilai,
      status: `Nilai mahasiswa dengan nim ${nilai.nim} berhasil divalidasi`,
    };
  }
}
