import "dotenv/config";

function need(name: string): string {
    const v = process.env[name];
    if (!v) {
        console.error(`Missing env var: ${name}`);
        process.exit(1);
    }
    return v;
}

export const config = {
    port: Number(process.env.PORT ?? 4000),
    mongoUri: need("MONGODB_URI"),
    jwtSecret: need("JWT_SECRET"),
    clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:3000").split(",").map((s) => s.trim()),
};