import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.PS_DBHOST,
  port: Number(process.env.PS_DBPORT),
  username: process.env.PS_DBUSERNAME,
  password: process.env.PS_DBPASSWORD,
  database: process.env.PS_DATABASE,

  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],

  synchronize: false,
});