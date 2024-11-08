import {drizzle} from 'drizzle-orm/libsql'

const db = drizzle(Bun.env.DB_FILE_NAME!)
