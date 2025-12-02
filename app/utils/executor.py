import asyncio

# Эта функция позволяет безопасно вызывать обычный синхронный код внутри асинхронного FastAPI-эндпоинта, не блокируя сервер.
async def run_in_thread(func, *args):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, func, *args)
