import 'dotenv/config';
import { DataSource } from 'typeorm';

const dbUrl = process.env.DATABASE_URL;
const host = process.env.DB_HOST || 'localhost';
const isNeon = host.includes('neon.tech') || (dbUrl && dbUrl.includes('neon.tech'));

export default new DataSource(
  dbUrl
    ? {
        type: 'postgres',
        url: dbUrl,
        entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
        migrations: ['src/migrations/*.ts', 'dist/migrations/*.js'],
        synchronize: false,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        type: 'postgres',
        host: host,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,

        entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
        migrations: ['src/migrations/*.ts', 'dist/migrations/*.js'],

        synchronize: false,
        ssl: isNeon ? { rejectUnauthorized: false } : false,
      },
);