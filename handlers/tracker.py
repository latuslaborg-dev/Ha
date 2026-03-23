from aiogram import Router
from db import get_db

router = Router()

def register_handlers(dp):
    dp.include_router(router)

async def track_user(inviter, chat_id):
    db = await get_db()
    await db.execute('''
    INSERT INTO stats(user_id, chat_id, count)
    VALUES(?,?,1)
    ON CONFLICT(user_id, chat_id)
    DO UPDATE SET count = count + 1
    ''', (inviter, chat_id))
    await db.commit()