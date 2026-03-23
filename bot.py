from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils import executor
import asyncio
from config import API_TOKEN, ADMIN_ID

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

users = {}
forced_settings = {}

keyboard = InlineKeyboardMarkup().add(
    InlineKeyboardButton(text="Guruhga qo'shish ➕", url="https://t.me/Obunabolrobot?startgroup=true")
)

start_message = "ObunabolBot ishga tushdi!"

def is_admin(user_id):
    return user_id == ADMIN_ID

@dp.message_handler(commands=['start'])
async def start(message: types.Message):
    user_id = message.from_user.id
    if user_id not in users:
        users[user_id] = {'mymembers': 0}
    await message.answer(start_message, reply_markup=keyboard)

@dp.message_handler(commands=['mymembers'])
async def my_members(message: types.Message):
    user_id = message.from_user.id
    count = users.get(user_id, {}).get('mymembers', 0)
    await message.reply(f"Siz qo‘shgan odamlar soni: {count}")

@dp.message_handler(commands=['obuna'])
async def obuna(message: types.Message):
    if not is_admin(message.from_user.id):
        await message.reply("Siz admin emassiz!")
        return
    await message.reply(f"Foydalanuvchilar: {len(users)}")

if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True)
