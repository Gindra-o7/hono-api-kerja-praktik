import { dosen } from "../generated/prisma";
import prisma from "../infrastructures/db.infrastructure";
import { FindByEmailParamsInterface, FindByEmailReturnInterface, FindByNIPParamsInterface } from "../types/dosen/repository.type";

export default class DosenRepository {
  public static async findByEmail({ email }: FindByEmailParamsInterface): Promise<FindByEmailReturnInterface | null> {
    return await prisma.dosen.findUnique({
      where: {
        email: email,
      },
    });
  }

  public static async findByNIP(nip: string) {
    return await prisma.dosen.findUnique({
      where: {
        nip,
      },
      select: {
        email: true,
        nip: true,
        nama: true,
      },
    });
  }

  public static async findDosenConflicts(tanggal: Date, waktu_mulai: Date, waktu_selesai: Date, excludeJadwalId?: string): Promise<any[]> {
    return prisma.jadwal.findMany({
      where: {
        tanggal,
        waktu_mulai: {
          lt: waktu_selesai,
        },
        waktu_selesai: {
          gt: waktu_mulai,
        },
        ...(excludeJadwalId ? { id: { not: excludeJadwalId } } : {}),
      },
      include: {
        pendaftaran_kp: {
          include: {
            mahasiswa: true,
          },
        },
      },
    });
  }

  public static async getJadwalDosen(nip: string, date: Date): Promise<any[]> {
    return prisma.jadwal.findMany({
      where: {
        tanggal: date,
        OR: [
          {
            pendaftaran_kp: {
              nip_pembimbing: nip,
            },
          },
          {
            pendaftaran_kp: {
              nip_penguji: nip,
            },
          },
        ],
      },
      include: {
        ruangan: true,
        pendaftaran_kp: true,
        mahasiswa: true,
      },
    });
  }

  
  public static async getDosenByEmail(email: string) {
    return prisma.dosen.findFirst({
      where: { email },
      select: {
        nip: true,
        nama: true,
        email: true,
      },
    });
  }
  
  public static async getPendaftaranKpDosen(nim: string, email?: string) {
    const dosen = email ? await this.getDosenByEmail(email) : null;
    const nip = dosen?.nip;

    return prisma.pendaftaran_kp.findFirst({
      where: {
        nim,
      },
      select: {
        nip_pembimbing: true,
        nip_penguji: true,
        pembimbing_instansi: true,
        instansi: true,
        dokumen_seminar_kp: true
      },
      orderBy: {
        tanggal_pengajuan: 'desc'
      }
    });
  }

  public static async findNamaDosenByNip(nip: string) {
    return await prisma.dosen.findUnique({
      where: {
        nip
      },
      select: {
        nama: true,
        email: true
      }
    })
  }
}
