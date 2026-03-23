import os
from aiogram import Bot, Dispatcher
from handlers import start, tracker, mymembers, chat_member

BOT_TOKEN = os.environ['BOT_TOKEN']  # Railway Variables dan o'qiladi
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Register handlers
start.register_handlers(dp)
tracker.register_handlers(dp)
mymembers.register_handlers(dp)
chat_member.register_handlers(dp)

if __name__ == '__main__':
    import asyncio
    asyncio.run(dp.start_polling(bot))