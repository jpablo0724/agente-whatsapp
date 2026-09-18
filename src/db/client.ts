import Database from "better-sqlite3";
import { env } from "../config/env.js";

export const db = new Database(env.DATABASE_PATH);
db.pragma("journal_mode = WAL");
