from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram import Router
from aiogram.filters import CommandStart

router = Router()

def register_handlers(dp):
    dp.include_router(router)

@router.message(CommandStart())
async def start(msg):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Guruhga qo‘shish", url="https://t.me/aqlliyrobot?startgroup=true")]
    ])
    await msg.answer("🤖 Botdan foydalanish uchun uni guruhga qo‘shing!", reply_markup=kb)
