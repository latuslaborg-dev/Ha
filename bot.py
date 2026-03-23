from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor
import os

API_TOKEN = os.getenv("TOKEN")

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=['start'])
async def start(message: types.Message):
    await message.reply("Bot ishlayapti 🚀")

if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True)
