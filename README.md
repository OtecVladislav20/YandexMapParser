# YandexMapParser

# 1. Создайте виртуальное окружение
python -m venv venv

# 2. Активация виртуального окружения
.\venv\Scripts\Activate.ps1

# 3. Установите зависимости
pip install -r requirements.txt

Для запуска локального сервера 
uvicorn app.main:app --reload

Ссылка для 2gis
"https://2gis.ru/spb/firm/{id}" - "https://2gis.ru/spb/firm/5348552839380704"

Ссылка на ЯндексКарты 
https://yandex.ru/maps/org/blits_tonnel/1014186377/reviews


docker compose up -d

Выдача прав
docker compose exec -u root selenium bash -lc "chown -R seluser:seluser /home/seluser/chrome-profile && chmod -R u+rwX /home/seluser/chrome-profile"

Создание папок для 5 воркеров
docker compose exec -u root selenium bash -lc "for i in 0 1 2 3 4; do mkdir -p /home/seluser/chrome-profile/profile-$i; done; chown -R seluser:seluser /home/seluser/chrome-profile"

Показать все ключи кеша (лучше, чем KEYS):
docker compose exec redis redis-cli -a change_me --scan --pattern "cache:*"
