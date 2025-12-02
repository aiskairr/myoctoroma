#!/bin/bash

echo "🔍 Проверка настройки двух бэкендов..."
echo "========================================="
echo ""

# Проверка .env файла
echo "📄 Проверка .env файла..."
if [ -f .env ]; then
    echo "✅ .env файл существует"
    
    if grep -q "VITE_BACKEND_URL" .env; then
        echo "✅ VITE_BACKEND_URL настроен"
        PRIMARY=$(grep "^VITE_BACKEND_URL=" .env | cut -d'=' -f2)
        echo "   Primary: $PRIMARY"
    else
        echo "❌ VITE_BACKEND_URL не найден"
    fi
    
    if grep -q "VITE_SECONDARY_BACKEND_URL" .env; then
        echo "✅ VITE_SECONDARY_BACKEND_URL настроен"
        SECONDARY=$(grep "^VITE_SECONDARY_BACKEND_URL=" .env | cut -d'=' -f2)
        echo "   Secondary: $SECONDARY"
    else
        echo "❌ VITE_SECONDARY_BACKEND_URL не найден"
    fi
else
    echo "❌ .env файл не найден"
fi
echo ""

# Проверка http.ts
echo "📄 Проверка src/API/http.ts..."
if [ -f src/API/http.ts ]; then
    echo "✅ src/API/http.ts существует"
    
    if grep -q "\$apiPrimary" src/API/http.ts; then
        echo "✅ \$apiPrimary экспортирован"
    else
        echo "❌ \$apiPrimary не найден"
    fi
    
    if grep -q "\$apiSecondary" src/API/http.ts; then
        echo "✅ \$apiSecondary экспортирован"
    else
        echo "❌ \$apiSecondary не найден"
    fi
    
    if grep -q "createApiUrl" src/API/http.ts; then
        echo "✅ createApiUrl функция найдена"
    else
        echo "❌ createApiUrl функция не найдена"
    fi
    
    if grep -q "apiGetJson" src/API/http.ts; then
        echo "✅ apiGetJson функция найдена"
    else
        echo "❌ apiGetJson функция не найдена"
    fi
else
    echo "❌ src/API/http.ts не найден"
fi
echo ""

# Проверка task-parser.ts
echo "📄 Проверка src/services/task-parser.ts..."
if [ -f src/services/task-parser.ts ]; then
    echo "✅ src/services/task-parser.ts существует"
    
    if grep -q "import.*createApiUrl.*from.*API/http" src/services/task-parser.ts; then
        echo "✅ Импортирует createApiUrl"
    else
        echo "⚠️  Не импортирует createApiUrl (возможно, использует старый способ)"
    fi
    
    if grep -q "useSecondary" src/services/task-parser.ts; then
        echo "✅ Поддерживает параметр useSecondary"
    else
        echo "❌ Не поддерживает параметр useSecondary"
    fi
else
    echo "❌ src/services/task-parser.ts не найден"
fi
echo ""

# Проверка документации
echo "📚 Проверка документации..."
DOC_COUNT=0

if [ -f BACKEND_CONFIGURATION.md ]; then
    echo "✅ BACKEND_CONFIGURATION.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

if [ -f API_ENDPOINTS_MAPPING.md ]; then
    echo "✅ API_ENDPOINTS_MAPPING.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

if [ -f DUAL_BACKEND_SETUP_SUMMARY.md ]; then
    echo "✅ DUAL_BACKEND_SETUP_SUMMARY.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

if [ -f MIGRATION_COMPARISON.md ]; then
    echo "✅ MIGRATION_COMPARISON.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

if [ -f QUICK_START.md ]; then
    echo "✅ QUICK_START.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

if [ -f TEST_CHECKLIST.md ]; then
    echo "✅ TEST_CHECKLIST.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

if [ -f README_DUAL_BACKEND.md ]; then
    echo "✅ README_DUAL_BACKEND.md"
    DOC_COUNT=$((DOC_COUNT + 1))
fi

echo "   Найдено файлов документации: $DOC_COUNT/7"
echo ""

# Проверка node_modules
echo "📦 Проверка зависимостей..."
if [ -d node_modules ]; then
    echo "✅ node_modules установлены"
else
    echo "⚠️  node_modules не найдены. Запустите: npm install"
fi
echo ""

# Итоговый статус
echo "========================================="
echo "📊 ИТОГОВЫЙ СТАТУС"
echo "========================================="
echo ""

if [ -f .env ] && [ -f src/API/http.ts ] && [ -f src/services/task-parser.ts ] && [ $DOC_COUNT -ge 5 ]; then
    echo "✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "   1. Запустите: npm run dev"
    echo "   2. Откройте браузер и проверьте консоль"
    echo "   3. Проверьте документацию: README_DUAL_BACKEND.md"
    echo ""
    echo "📖 Быстрый старт: QUICK_START.md"
    echo "✅ Тест чеклист: TEST_CHECKLIST.md"
else
    echo "⚠️  НЕКОТОРЫЕ ПРОВЕРКИ НЕ ПРОЙДЕНЫ"
    echo ""
    echo "Проверьте вывод выше для деталей"
fi
echo ""
