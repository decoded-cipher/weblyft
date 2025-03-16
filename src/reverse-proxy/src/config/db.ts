import dotenv from "dotenv";
import knex from "knex";

dotenv.config();

const db = knex({
    client: "pg",
    connection: {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
    },
});

export default db;
