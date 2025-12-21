# 💇 Salon Booking App — Telegram Mini App

Telegram Mini App для записи клиентов в салон красоты.

---

## 📁 Структура проекта

```
C:\Projects\salon-booking-app\
├── src/
│   ├── App.tsx              # Главный компонент приложения
│   ├── main.tsx             # Точка входа React
│   ├── firebase.ts          # Конфигурация Firebase
│   ├── index.css            # Глобальные стили (Tailwind)
│   ├── components/          # React компоненты
│   │   ├── admin/           # Админ-панель (AdminDashboard, AdminSchedule, etc.)
│   │   ├── ui/              # UI компоненты (shadcn/ui)
│   │   ├── dev/             # Dev-инструменты
│   │   ├── BookingCalendar.tsx
│   │   ├── ServiceList.tsx
│   │   ├── UserOnboarding.tsx
│   │   └── ...
│   ├── services/            # Сервисы для работы с данными
│   │   ├── firebaseService.ts  # Работа с Firestore
│   │   └── mockData.ts         # Mock данные для разработки
│   ├── store/
│   │   └── bookingStore.ts  # Zustand store (состояние приложения)
│   ├── contexts/
│   │   └── SalonContext.tsx # Контекст конфигурации салона
│   ├── types/
│   │   └── index.ts         # TypeScript типы
│   └── utils/
│       └── scheduleUtils.ts # Утилиты для работы с расписанием
├── public/
│   └── brand_header.png     # Логотип салона
├── dist/                    # Собранный production билд
├── firebase.json            # Конфигурация Firebase Hosting
├── firestore.rules          # Правила безопасности Firestore
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 🛠 Технологии

| Технология | Назначение |
|------------|-----------|
| **React 18** | UI фреймворк |
| **TypeScript** | Типизация |
| **Vite** | Сборка и dev-сервер |
| **Tailwind CSS** | Стилизация |
| **Zustand** | Управление состоянием |
| **Firebase Firestore** | База данных |
| **Firebase Hosting** | Хостинг |
| **@twa-dev/sdk** | Telegram WebApp SDK (legacy) |
| **@telegram-apps/sdk** | Telegram Apps SDK (новый, для fullscreen) |
| **shadcn/ui** | UI компоненты |

---

## 🔧 Настройка окружения

### Требования
- Node.js 18+
- npm или yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/garantyut/salon-booking-app.git
cd salon-booking-app

# Установка зависимостей
npm install
```

### Переменные окружения

Firebase конфигурация находится в `src/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC1QEAzhImoDygxUySObZt4nfXKjvyPUOA",
  authDomain: "salon-booking-28300.firebaseapp.com",
  projectId: "salon-booking-28300",
  storageBucket: "salon-booking-28300.firebasestorage.app",
  messagingSenderId: "1097118595498",
  appId: "1:1097118595498:web:b59f0988d0ded5172e53d3"
};
```

> ⚠️ Для своего проекта замените эти значения на свои из Firebase Console.

---

## 🚀 Запуск

### Локальная разработка

```bash
npm run dev
```

Откроется на `http://localhost:5173`

**В режиме разработки (DEV)**:
- Данные сохраняются в `localStorage` (не в Firebase)
- Можно тестировать без Telegram
- URL параметр `?role=admin` — переключает в режим админа
- URL параметр `?force_prod=true` — использует реальный Firebase

### Production сборка

```bash
npm run build
```

Результат в папке `dist/`

---

## 📤 Деплой

### Firebase Hosting

```bash
# Авторизация (один раз)
firebase login

# Деплой приложения
firebase deploy --only hosting

# Деплой правил Firestore
firebase deploy --only firestore:rules

# Деплой всего
firebase deploy
```

**Production URL**: https://salon-booking-28300.web.app

### GitHub

```bash
git add -A
git commit -m "Описание изменений"
git push origin main
```

**Репозиторий**: https://github.com/garantyut/salon-booking-app

---

## 🗄 База данных (Firestore)

### Коллекции

| Коллекция | Описание |
|-----------|----------|
| `users` | Профили пользователей (клиенты) |
| `appointments` | Записи на приём |
| `services` | Услуги салона |
| `masters` | Мастера |
| `config` | Настройки приложения (admin IDs, etc.) |

### Структура документов

**users/{userId}**
```json
{
  "id": "123456789",
  "firstName": "Андрей",
  "lastName": "Юр",
  "phone": "+7 9232782510",
  "createdAt": 1734789600000,
  "telegramId": 123456789,
  "username": "username"
}
```

**appointments/{appointmentId}**
```json
{
  "clientId": "123456789",
  "masterId": "master-1",
  "serviceId": "w1",
  "date": "2025-12-25",
  "timeSlot": "14:30",
  "status": "confirmed",
  "price": 2500,
  "notes": "Комментарий",
  "createdAt": 1734789600000
}
```

### Правила безопасности

Файл `firestore.rules` разрешает чтение/запись для всех коллекций.

> ⚠️ Для production рекомендуется ограничить доступ!

---

## 📱 Telegram Bot настройка

### Создание бота

1. Откройте @BotFather в Telegram
2. `/newbot` → введите имя и username
3. Сохраните токен бота

### Настройка Mini App

1. @BotFather → `/mybots` → выберите бота
2. **Bot Settings** → **Menu Button** → **Configure Menu Button**
3. URL: `https://salon-booking-28300.web.app`
4. Текст кнопки: `Записаться`

### Настройка Admin ID

В Firebase Console → Firestore → коллекция `config` → документ `settings`:

```json
{
  "adminTelegramIds": ["123456789"]
}
```

ID админа получаем из Telegram (можно через @userinfobot).

---

## 👥 Роли пользователей

| Роль | Описание |
|------|----------|
| **Client** | Обычный пользователь — просмотр услуг, запись, история |
| **Admin** | Администратор — управление записями, клиентами, финансами |

Роль определяется по Telegram ID в `config/settings.adminTelegramIds`.

---

## 📂 Ключевые файлы

| Файл | Описание |
|------|----------|
| `src/App.tsx` | Главный компонент, роутинг, определение ролей |
| `src/services/firebaseService.ts` | Все операции с Firestore |
| `src/store/bookingStore.ts` | Zustand store — состояние приложения |
| `src/components/UserOnboarding.tsx` | Регистрация нового пользователя |
| `src/components/admin/AdminDashboard.tsx` | Админ-панель |
| `src/contexts/SalonContext.tsx` | Конфигурация салона (брендинг) |

---

## 🔄 Workflow разработки

```
1. git pull origin main          # Получить последние изменения
2. npm run dev                   # Запустить dev-сервер
3. [Работа над кодом]
4. npm run build                 # Проверить сборку
5. firebase deploy --only hosting # Задеплоить
6. git add -A && git commit -m "..." && git push origin main
```

---

## ⚙️ Для переноса на другой сервер

1. **Создать новый Firebase проект**:
   - Firebase Console → Create Project
   - Включить Firestore Database
   - Включить Hosting
   
2. **Обновить конфигурацию**:
   - Скопировать новые ключи в `src/firebase.ts`
   - Обновить `.firebaserc` с новым project ID
   
3. **Задеплоить**:
   ```bash
   firebase login
   firebase deploy
   ```

4. **Настроить бота**:
   - Создать нового бота через @BotFather
   - Настроить Menu Button с новым URL

---

## 📞 Контакты

- **GitHub**: https://github.com/garantyut/salon-booking-app
- **Production**: https://salon-booking-28300.web.app
- **Firebase Console**: https://console.firebase.google.com/project/salon-booking-28300
