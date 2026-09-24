# Шаг за шагом — детский конструктор программирования

Монорепозиторий (pnpm workspaces + Turborepo, TypeScript strict). Спецификация — документ «ТЗ: детский конструктор программирования «Шаг за шагом»»; этапы разработки из ТЗ отмечены в `docs/ROADMAP.md`.

## Структура

| Путь | Что там |
|------|---------|
| `packages/blocks` | AST программы, каталог блоков, zod/JSON-схемы сцены, программы, целей, озвучка блоков |
| `packages/engine` | Исполнитель AST (кооперативные потоки, виртуальное время, лимиты), клеточный мир, цели, звёзды, headless-проверка |
| `packages/stage` | Рендер сцены на PixiJS, SVG-арт героев и объектов |
| `packages/content` | Сиды миров и заданий, персонажи; CI прогоняет эталоны через headless-исполнитель |
| `apps/web` | Next.js (App Router): детская часть `/play/*`, семья `/family/*`, бэкофис `/admin/*`, BFF `/api/*` |
| `supabase` | Миграции, агрегаты схемы, RLS, SQL-тесты |

## Правила

- `engine` и `blocks` не зависят от React/DOM-рендера: engine получает от stage только модель мира и виртуальное время.
- Программа — JSON AST (`ProgramDoc`), никакого eval и кодогенерации для исполнения.
- Детский UI: цели касания ≥ 56×56 px, каждая кнопка и блок озвучиваются, нет красного цвета ошибок, работает от 360 px.
- UI-тексты — на русском; код, комментарии, коммиты — на английском.
- Иконки — lucide-react. Нативные `<select>`/checkbox/radio запрещены.
- Доступ к данным из браузера — только через BFF route handlers (`apps/web/src/app/api`), сессия Supabase в httpOnly cookies.
- Каждый новый `process.env.*` — строка в `docs/ENV.md`.

## Supabase

- `supabase/*.sql` — агрегаты (точка правды), `supabase/migrations/000NN_*.sql` — только дельты.
- Агрегаты: `table.sql`, `helper_function.sql`, `public_function.sql`, `triggers.sql`, `rls.sql`, `storage.sql`.
- Тесты БД: `pnpm test:db` поднимает временный Postgres 16 с шимом схем `auth`/`storage` (`supabase/tests/_shim.sql`) и гоняет `supabase/tests/*.sql`.

## Команды

```bash
pnpm install
pnpm dev            # apps/web на :3000
pnpm test           # юнит-тесты всех пакетов
pnpm test:coverage  # engine: порог 80%
pnpm test:db        # миграции + RLS-тесты
pnpm test:e2e       # Playwright
pnpm lint && pnpm typecheck
```
