import prisma from "../infrastructures/db.infrastructure";
import { jadwal, log_jadwal, status_jadwal } from "../generated/prisma";
import { CreateJadwalInput, UpdateJadwalInput, LogJadwalInput, JadwalWithRelations, JadwalSayaParams, DataJadwalSeminar } from "../types/seminar-kp/jadwal.type";
import { APIError } from "../utils/api-error.util";
import MahasiswaHelper from "../helpers/mahasiswa.helper";
import JadwalHelper from "../helpers/jadwal.helper";

export default class JadwalRepository {
  public static async postJadwal(data: CreateJadwalInput): Promise<jadwal> {
    const waktu_mulai = new Date(data.waktu_mulai);
    const waktu_selesai = new Date(waktu_mulai);
    waktu_selesai.setHours(waktu_selesai.getHours() + 1);

    const jadwal = await prisma.jadwal.create({
      data: {
        tanggal: data.tanggal,
        waktu_mulai,
        waktu_selesai,
        status: "Menunggu" as status_jadwal,
        nim: data.nim,
        nama_ruangan: data.nama_ruangan,
        id_pendaftaran_kp: data.id_pendaftaran_kp,
      },
    });

    if (data.nip_penguji) {
      await prisma.pendaftaran_kp.update({
        where: { id: data.id_pendaftaran_kp },
        data: {
          nip_penguji: data.nip_penguji,
        },
      });
    }

    return jadwal;
  }

  public static async putJadwal(data: UpdateJadwalInput): Promise<jadwal> {
    if (!data.id) {
      throw new APIError("Waduh, ID jadwal diperlukan! 😭", 400);
    }

    const existingJadwal = await prisma.jadwal.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!existingJadwal) {
      throw new APIError("Waduh, Jadwal tidak ditemukan! 😭", 404);
    }

    const updateData: any = {
      tanggal: data.tanggal || existingJadwal.tanggal,
      waktu_mulai: data.waktu_mulai || existingJadwal.waktu_mulai,
      waktu_selesai: data.waktu_selesai || existingJadwal.waktu_selesai,
      nama_ruangan: data.nama_ruangan || existingJadwal.nama_ruangan,
    };

    const jadwal = await prisma.jadwal.update({
      where: { id: data.id },
      data: updateData,
    });

    if (data.nip_penguji) {
      const jadwal = await prisma.jadwal.findUnique({
        where: { id: data.id },
        select: { id_pendaftaran_kp: true },
      });

      if (jadwal?.id_pendaftaran_kp) {
        await prisma.pendaftaran_kp.update({
          where: { id: jadwal.id_pendaftaran_kp },
          data: {
            nip_penguji: data.nip_penguji,
          },
        });
      }
    }

    return jadwal;
  }

  public static async getJadwalById(id: string): Promise<JadwalWithRelations | null> {
    return prisma.jadwal.findUnique({
      where: { id },
      include: {
        mahasiswa: {
          select: {
            nim: true,
            nama: true,
            email: true,
          },
        },
        pendaftaran_kp: {
          include: {
            dosen_pembimbing: {
              select: {
                nip: true,
                nama: true,
              },
            },
            dosen_penguji: {
              select: {
                nip: true,
                nama: true,
              },
            },
          },
        },
        ruangan: true,
      },
    });
  }

  public static async getJadwalByPendaftaranKpId(id_pendaftaran_kp: string): Promise<jadwal | null> {
    return prisma.jadwal.findFirst({
      where: { id_pendaftaran_kp },
    });
  }

  public static async logJadwalChanges(data: LogJadwalInput): Promise<log_jadwal> {
    return prisma.log_jadwal.create({
      data: {
        log_type: data.log_type,
        tanggal_lama: data.tanggal_lama || null,
        tanggal_baru: data.tanggal_baru,
        ruangan_lama: data.ruangan_lama || null,
        ruangan_baru: data.ruangan_baru,
        keterangan: data.keterangan,
        id_jadwal: data.id_jadwal,
        nip_penguji_baru: data.nip_penguji_baru,
        nip_penguji_lama: data.nip_penguji_lama,
        created_at: new Date(),
      },
    });
  }

  public static async getAllRuangan() {
    const ruangan = prisma.ruangan.findMany({
      select: {
        nama: true,
      },
    });
    return ruangan;
  }

  public static async getAllDosen() {
    const dosen = prisma.dosen.findMany({
      select: {
        nip: true,
        nama: true,
      },
    });
    return dosen;
  }

  public static async checkRuanganAvailability(nama_ruangan: string, tanggal: Date, waktu_mulai: Date, waktu_selesai: Date, excludeJadwalId?: string): Promise<boolean> {
    const conflicts = await prisma.jadwal.findMany({
      where: {
        nama_ruangan,
        tanggal,
        AND: [
          {
            waktu_mulai: {
              lt: waktu_selesai,
            },
          },
          {
            waktu_selesai: {
              gt: waktu_mulai,
            },
          },
          ...(excludeJadwalId ? [{ id: { not: excludeJadwalId } }] : []),
        ],
      },
    });

    return conflicts.length === 0;
  }

  public static async getJadwalByPendaftaranId(id_pendaftaran_kp: string) {
    return await prisma.jadwal.findFirst({
      where: {
        id_pendaftaran_kp: id_pendaftaran_kp,
      },
      include: {
        ruangan: true,
      },
    });
  }

  public static async getPendaftaranKpById(id_pendaftaran_kp: string) {
    return await prisma.pendaftaran_kp.findFirst({
      where: {
        id: id_pendaftaran_kp,
      },
    });
  }

  public static async getJadwalMahasiswaSaya(nip: string) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const jadwal = {
      where: {
        pendaftaran_kp: {
          nip_penguji: nip,
        },
      },
      include: {
        pendaftaran_kp: {
          include: {
            mahasiswa: true,
            dosen_pembimbing: {
              select: {
                nama: true,
                nip: true,
              },
            },
            pembimbing_instansi: {
              select: {
                nama: true,
                email: true,
              },
            },
            instansi: {
              select: {
                nama: true,
                alamat: true,
              },
            },
            tahun_ajaran: {
              select: {
                nama: true,
              },
            },
          },
        },
        ruangan: true,
        nilai: {
          select: {
            id: true,
            nilai_penguji: true,
            komponen_penilaian_penguji: {
              select: {
                id: true,
                penguasaan_keilmuan: true,
                kemampuan_presentasi: true,
                kesesuaian_urgensi: true,
                catatan: true,
                created_at: true,
              },
            },
          },
        }
      },
    };

    const allJadwal = await prisma.jadwal.findMany(jadwal);

    const todayJadwal = await prisma.jadwal.findMany({
      ...jadwal,
      where: {
        ...jadwal.where,
        tanggal: currentDate,
      },
    });

    const mahasiswaNimList = allJadwal.map((jadwal) => jadwal.pendaftaran_kp?.mahasiswa?.nim).filter(Boolean) as string[];

    const nilai = await prisma.nilai.findMany({
      where: {
        nim: {
          in: mahasiswaNimList,
        },
        nip,
      },
      select: {
        id: true,
        nim: true,
        nilai_penguji: true,
      },
    });

    const mahasiswaDinilaiMap = new Map();
    nilai.forEach((nilai) => {
      if (nilai.nilai_penguji !== null && nilai.nim) {
        mahasiswaDinilaiMap.set(nilai.nim, true);
      }
    });

    const totalMahasiswa = allJadwal.length;
    const mahasiswaDinilai = mahasiswaDinilaiMap.size;
    const mahasiswaBelumDinilai = totalMahasiswa - mahasiswaDinilai;
    const persentaseDinilai = totalMahasiswa ? Math.round((mahasiswaDinilai / totalMahasiswa) * 100) : 0;

    return {
      statistics: {
        totalMahasiswa,
        mahasiswaDinilai,
        mahasiswaBelumDinilai,
        persentaseDinilai,
      },
      jadwalHariIni: todayJadwal,
      semuaJadwal: allJadwal,
      mahasiswaDinilaiMap: Object.fromEntries(mahasiswaDinilaiMap),
    };
  }

  public static async getTahunAjaran() {
    return prisma.tahun_ajaran.findFirst({
      orderBy: {
        id: "desc",
      },
    });
  }

  public static async getAllJadwalSeminar(tahunAjaranId: number = 1) {
    const tahunAjaran = await prisma.tahun_ajaran.findUnique({
      where: {
        id: tahunAjaranId,
      },
    });
    if (!tahunAjaran) {
      throw new APIError(`Waduh, Tahun ajaran tidak ditemukan, 😭`, 404);
    }

    const dataJadwal = await prisma.jadwal.findMany({
      select: {
        id: true,
        mahasiswa: true,
        ruangan: true,
        status: true,
        waktu_mulai: true,
        waktu_selesai: true,
        tanggal: true,
        pendaftaran_kp: {
          select: {
            instansi: true,
            pembimbing_instansi: true,
            status: true,
            dosen_pembimbing: true,
            dosen_penguji: true,
          },
        },
      },
      orderBy: {
        tanggal: "asc",
      },
    });

    const totalJadwalUlang = dataJadwal.filter((jadwal) => jadwal.status === "Jadwal_Ulang").length;

    const formattedJadwalList: DataJadwalSeminar[] = dataJadwal.map((jadwal) => {
      return {
        id: jadwal.id,
        mahasiswa: {
          nama: jadwal.mahasiswa?.nama || "N/A",
          nim: jadwal.mahasiswa?.nim || "N/A",
          semester: MahasiswaHelper.getSemesterByNIM(jadwal.mahasiswa?.nim || ""),
        },
        status_kp: jadwal.pendaftaran_kp?.status || "N/A",
        ruangan: jadwal.ruangan?.nama || "N/A",
        jam: jadwal.waktu_mulai ? `${jadwal.waktu_mulai.getHours().toString().padStart(2, "0")}:${jadwal.waktu_mulai.getMinutes().toString().padStart(2, "0")}` : "N/A",
        tanggal: jadwal.tanggal ? JadwalHelper.formatTanggal(jadwal.tanggal) : "N/A",
        dosen_penguji: jadwal.pendaftaran_kp?.dosen_penguji?.nama || "N/A",
        dosen_pembimbing: jadwal.pendaftaran_kp?.dosen_pembimbing?.nama || "N/A",
        instansi: jadwal.pendaftaran_kp?.instansi?.nama || "N/A",
        pembimbing_instansi: jadwal.pendaftaran_kp?.pembimbing_instansi?.nama || "N/A",
        status: jadwal.status || "N/A",
      };
    });

    return {
      totalSeminar: dataJadwal.length,
      totalSeminarMingguIni: JadwalHelper.jumlahJadwalMingguIni(dataJadwal),
      totalJadwalUlang,
      jadwalList: formattedJadwalList,
      tahunAjaran: {
        id: tahunAjaran.id,
        nama: tahunAjaran.nama,
      },
    };
  }

  public static async getLogJadwal(tahunAjaranId: number = 1) {
    const tahunAjaran = await prisma.tahun_ajaran.findUnique({
      where: {
        id: tahunAjaranId,
      },
      select: {
        id: true,
        nama: true,
      },
    });

    const logJadwal = await prisma.log_jadwal.findMany({
      select: {
        id: true,
        log_type: true,
        tanggal_lama: true,
        tanggal_baru: true,
        ruangan_lama: true,
        ruangan_baru: true,
        keterangan: true,
        created_at: true,
        nip_penguji_lama: true,
        nip_penguji_baru: true,
        id_jadwal: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const logJadwalWithJadwal = await Promise.all(
    logJadwal.map(async (log) => {
      const jadwal = log.id_jadwal ? await this.findJadwalById(log.id_jadwal) : null;
      return {
        ...log,
        jadwal: jadwal
      };
    })
  );

    return {
      logJadwal,
      logJadwalWithJadwal,
      tahunAjaran
    }
  }

  public static async findJadwalById(id: string) {
    return await prisma.jadwal.findUnique({
      where: {
        id: id
      },
      select: {
        id: true,
        tanggal: true,
        waktu_mulai: true,
        waktu_selesai: true,
        status: true,
        nama_ruangan: true,
        pendaftaran_kp: {
          select: {
            dosen_pembimbing: {
              select: {
                nip: true,
                nama: true
              }
            },
            dosen_penguji: {
              select: {
                nip: true,
                nama: true
              }
            }
          }
        }
      }
    })
  }
}
