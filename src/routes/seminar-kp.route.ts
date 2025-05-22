import { Hono } from "hono";
import { RegExpRouter } from "hono/router/reg-exp-router";
import { jenis_dokumen } from "../generated/prisma";
import AuthMiddleware from "../middlewares/auth.middleware";
import SeminarKpHandler from "../handlers/seminar-kp.handler";
import JadwalSeminarKpHandler from "../handlers/jadwal.handler";
import NilaiHandler from "../handlers/nilai.handler";

const seminarKpRoute = new Hono({ router: new RegExpRouter() });

const dokumenTypes = Object.keys(jenis_dokumen).map((key) => ({
  route: key.toLowerCase().replace(/_/g, "-"),
  type: key as keyof typeof jenis_dokumen,
}));

dokumenTypes.forEach(({ route, type }) => {
  seminarKpRoute.post(`/dokumen/${route}`, (c) => SeminarKpHandler.postDokumenSeminarKP(c, jenis_dokumen[type]));
});

seminarKpRoute.get("/dokumen", AuthMiddleware.JWTBearerTokenExtraction, SeminarKpHandler.getAllDokumenSeminarKP);
seminarKpRoute.get("/dokumen/:nim", AuthMiddleware.JWTBearerTokenExtraction, SeminarKpHandler.getDokumenSeminarKPByNIM);
seminarKpRoute.get("/dokumen-saya", AuthMiddleware.JWTBearerTokenExtraction, SeminarKpHandler.getDokumenSeminarKPSaya);
seminarKpRoute.post("/dokumen/validasi", AuthMiddleware.JWTBearerTokenExtraction, SeminarKpHandler.postTerimaDokumenSeminarKP);
seminarKpRoute.post("/dokumen/ditolak", AuthMiddleware.JWTBearerTokenExtraction, SeminarKpHandler.postTolakDokumenSeminarKP);

seminarKpRoute.get("/jadwal", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.getAllJadwalSeminar)
seminarKpRoute.get("/jadwal-saya", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.getJadwalMahasiswaSaya)
seminarKpRoute.get("/jadwal-saya/tahun-ajaran", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.getTahunAjaran)
seminarKpRoute.post("/jadwal", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.postJadwal);
seminarKpRoute.put("/jadwal", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.putJadwal);
seminarKpRoute.get("/jadwal/log-jadwal", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.getLogJadwal);
seminarKpRoute.get("/dosen", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.getAllDosen);
seminarKpRoute.get("/ruangan", AuthMiddleware.JWTBearerTokenExtraction, JadwalSeminarKpHandler.getAllRuangan)

seminarKpRoute.post("/nilai/penguji", AuthMiddleware.JWTBearerTokenExtraction, NilaiHandler.createUpdateNilaiPenguji)
seminarKpRoute.post("/nilai/pembimbing", AuthMiddleware.JWTBearerTokenExtraction, NilaiHandler.createUpdateNilaiPembimbing)
seminarKpRoute.get("/nilai", AuthMiddleware.JWTBearerTokenExtraction, NilaiHandler.getAllNilai)
seminarKpRoute.post("/nilai/validasi", AuthMiddleware.JWTBearerTokenExtraction, NilaiHandler.createValidasiNilai)

export default seminarKpRoute;
