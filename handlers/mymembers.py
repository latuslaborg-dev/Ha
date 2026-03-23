from aiogram import Router
from db import get_db

router = Router()

def register_handlers(dp):
    dp.include_router(router)

@router.message(commands=['mymembers'])
async def mymembers(msg):
    db = await get_db()
    async with db.execute("SELECT count FROM stats WHERE user_id=? AND chat_id=?", (msg.from_user.id, msg.chat.id)) as c:
        row = await c.fetchone()
        count = row[0] if row else 0
    await msg.reply(f"Sizning guruhdagi count: {count}")