from aiogram import Router
from aiogram.types import ChatMemberUpdated

router = Router()

def register_handlers(dp):
    dp.include_router(router)

@router.my_chat_member()
async def added(event: ChatMemberUpdated):
    if event.new_chat_member.status == "member":
        await event.bot.send_message(event.chat.id, "🤖 Bot ishga tayyor!\nAdmin qiling!")