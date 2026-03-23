import aiosqlite

DB_PATH = 'bot.db'

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
        CREATE TABLE IF NOT EXISTS stats(
            user_id INTEGER,
            chat_id INTEGER,
            count INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, chat_id)
        )
        ''')
        await db.commit()

async def get_db():
    return await aiosqlite.connect(DB_PATH)