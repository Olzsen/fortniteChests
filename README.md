# Fortnite Chest Tracker

Сайт для статистики открытых сундуков Fortnite по никнейму.

## Уже работает
- поиск игрока по нику;
- общее количество сундуков;
- сундуки за текущий сезон;
- количество матчей;
- среднее число сундуков за матч;
- история по сезонам;
- адаптивный интерфейс;
- GitHub Pages deployment.

## Важное ограничение
Fortnite не предоставляет публичную статистику «сколько сундуков открыл игрок за всё время» по одному Epic Games nickname. Поэтому сайт читает нашу собственную базу data/players.json.

Следующий этап — desktop tracker, который будет получать данные из replay-файлов Fortnite и обновлять эту базу. Сам сайт останется статическим.

## GitHub Pages
Repository -> Settings -> Pages -> Source: GitHub Actions.

После push workflow из .github/workflows/pages.yml публикует сайт автоматически.

## Формат игрока
{
  "nickname": "PlayerName",
  "all_time_chests": 100,
  "current_season_chests": 25,
  "matches": 20,
  "updated_at": "2026-11-20T00:00:00Z",
  "seasons": [
    {"name":"Текущий сезон","chests":25,"matches":5}
  ]
}

## План
1. desktop tracker;
2. обработка replay;
3. определение открытий сундуков;
4. привязка событий к Epic nickname;
5. обновление players.json;
6. лидерборд друзей.
