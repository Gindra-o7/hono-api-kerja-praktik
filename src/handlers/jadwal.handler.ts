import { Context } from "hono";
import JadwalService from "../services/jadwal.service";
import { createJadwalSchema, updateJadwalSchema } from "../validators/jadwal.validator";
import { APIError } from "../utils/api-error.util";

export default class JadwalHandler {
  public static async postJadwal(c: Context): Promise<Response> {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const body = await c.req.json();
    const data = createJadwalSchema.parse(body);
    const jadwal = await JadwalService.postJadwal(data);

    return c.json(jadwal);
  }

  public static async putJadwal(c: Context): Promise<Response> {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const data = await c.req.json();

    const jadwal = await JadwalService.putJadwal(data);

    return c.json(jadwal);
  }

  public static async getAllRuangan(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);
    return c.json(await JadwalService.getAllRuangan());
  }

  public static async getAllDosen(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    return c.json(await JadwalService.getAllDosen());
  }

  public static async getJadwalMahasiswaSaya(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const tahunAjaranIdParam = c.req.query("tahun_ajaran_id");
    const tahunAjaranId = tahunAjaranIdParam ? parseInt(tahunAjaranIdParam) : undefined;

    const result = await JadwalService.getJadwalMahasiswaSaya(email, tahunAjaranId);

    return c.json(result);
  }

  public static async getTahunAjaran(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    return c.json(await JadwalService.getTahunAjaran);
  }

  public static async getAllTahunAjaran(c: Context) {
    return c.json(await JadwalService.getAllTahunAjaran());
  }

  public static async getAllJadwalSeminar(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const tahunAjaranIdParam = c.req.query("tahun_ajaran_id");

    const tahunAjaranId = tahunAjaranIdParam ? parseInt(tahunAjaranIdParam) : 0;

    const allJadwal = await JadwalService.getAllJadwalSeminar(tahunAjaranId);

    return c.json(allJadwal);
  }

  public static async getLogJadwal(c: Context) {
    const tahunAjaranIdParam = c.req.query("tahun_ajaran_id");
    const tahunAjaranId = tahunAjaranIdParam ? parseInt(tahunAjaranIdParam) : 0;

    const logJadwal = await JadwalService.getLogJadwal(tahunAjaranId);

    return c.json(logJadwal);
  }

  public static async postRuangan(c: Context) {
    const data = await c.req.json();
    const ruangan = await JadwalService.postRuangan(data);

    return c.json(ruangan);
  }

  public static async deleteRuangan(c: Context) {
    const data = await c.req.json();
    if (!data.nama) throw new APIError(`Nama Ruangan harus diisi!`, 400);

    const ruangan = await JadwalService.deleteRuangan(data.nama);

    return c.json(ruangan);
  }
}
