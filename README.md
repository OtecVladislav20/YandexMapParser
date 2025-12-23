# YandexMapParser

Ссылка для 2gis
"https://2gis.ru/spb/firm/{id}" - "https://2gis.ru/spb/firm/5348552839380704"

Ссылка на ЯндексКарты 
https://yandex.ru/maps/org/blits_tonnel/1014186377/reviews


Запуск в дев режиме для автоматической пересборки контейнеров
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

Создание каталогов профилей для каждого воркера
docker compose exec -u root selenium bash -c 'for i in 0 1 2 3 4; do mkdir -p /home/seluser/chrome-profile/profile-$i; done; chown -R seluser:seluser /home/seluser/chrome-profile'

Посмотреть логи 
docker compose logs -f api

Очистка базы редис
docker compose exec redis redis-cli -a root FLUSHALL

Перезапуск контейнера после изменений
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart api
