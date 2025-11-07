# YandexMapParser

# 1. Создайте виртуальное окружение
python -m venv venv

# 2. Активация виртуального окружения
.\venv\Scripts\Activate.ps1

# 3. Установите зависимости
pip install -r requirements.txt

Для запуска локального сервера 
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload