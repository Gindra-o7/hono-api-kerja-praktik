import {z} from 'zod'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Invalid date format. Use YYYY-MM-DD",
});

const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Invalid time format. Use HH:MM",
});

export const createJadwalSchema = z.object({
  tanggal: dateSchema,
  waktu_mulai: timeSchema,
  waktu_selesai: timeSchema,
  nim: z.string().min(1, "NIM is required"),
  nama_ruangan: z.string().min(1, "Room name is required"),
  id_pendaftaran_kp: z.string().uuid("Invalid pendaftaran KP ID format"),
  nip_penguji: z.string().min(1, "NIP dosen penguji is required"),
});

export const updateJadwalSchema = z.object({
  id: z.string().uuid("Invalid jadwal ID format"),
  tanggal: dateSchema.optional(),
  waktu_mulai: timeSchema.optional(),
  waktu_selesai: timeSchema.optional(),
  status: z
    .enum(["Menunggu", "Selesai", "Jadwal_Ulang"])
    .optional(),
  nama_ruangan: z.string().min(1, "Room name is required").optional(),
  nip_penguji: z.string().min(1, "NIP dosen penguji is required").optional(),
});

export type CreateJadwalDto = z.infer<typeof createJadwalSchema>;
export type UpdateJadwalDto = z.infer<typeof updateJadwalSchema>;