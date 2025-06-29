import prisma from "../src/infrastructures/db.infrastructure";

console.log("[INFO] Seeding database...");

async function main() {
	console.log("[DEBUG] Running createMany...");
	const result = await prisma.ruangan.createMany({
		data: [
			{ nama: "FST-301" },
			{ nama: "FST-302" },
			{ nama: "FST-303" },
			{ nama: "FST-304" },
			{ nama: "FST-305" },
		],
		skipDuplicates: true,
	});

	const keahlian = await prisma.keahlian.createMany({
		data: [
			{ nama_keahlian: "Kecerdasan Buatan" },
			{ nama_keahlian: "Sistem Cerdas" },
			{ nama_keahlian: "Sistem Informasi" },
			{ nama_keahlian: "Sistem Multimedia" },
			{ nama_keahlian: "Sistem Rekomendasi" },
		],
		skipDuplicates: true,
	});

	console.log("[DEBUG] Result of inserted ruangan createMany:", result.count > 0 ? result : "Data was inserted previously, no new data inserted.");
	console.log("[DEBUG] Keahlian of inserted keahlian createMany:", keahlian.count > 0 ? keahlian : "Data was inserted previously, no new data inserted.");
}

main()
	.catch((e) => {
		console.error(`[ERROR] ${e.message}`);
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		console.log("[INFO] Seeding finished, disconnecting...");
		await prisma.$disconnect();
		process.exit(0);
	});