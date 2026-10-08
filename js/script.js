// Фреймворк: Vue 3 (CDN). Обрано, бо v-model дає двостороннє зв'язування полів форми
// без зайвого коду, а computed автоматично перераховує результат конвертації.
// Ручний DOM-код з практикумів 7-9 (renderRates, renderHistory, обробники submit/change,
// querySelector/innerHTML) ЗАМІНЕНО Vue-компонентами нижче.

/*
 * Ручний DOM-код практикумів 7–9 замінено компонентами Vue:
 * renderRates / renderHistory  -> v-for у шаблоні;
 * convertCurrency / updateResult -> computed result у ConverterForm;
 * submit-обробник -> @submit.prevent + $emit('convert');
 * showLoading / showError -> стани loading і error + v-if.
 * querySelector та innerHTML для цієї ділянки більше не використовуються.
 */

/*
 * Модель запису історії конвертацій (ПР11, варіант 6):
 * {
 *id: число, унікальний ідентифікатор,
 *from: рядок, одиниця «З» (наприклад, "USD"),
 *to: рядок, одиниця «В» (наприклад, "UAH"),
 *amount: число, введена сума,
 *result: рядок, відформатований результат,
 *timestamp: число, час створення в мілісекундах (Date.now())
 * }
 */

const { createApp } = Vue;
const formatNumber = n => (n === 0 ? '0.00' : String(Number(n.toPrecision(6))));
const API_URL = 'https://api.frankfurter.dev/v2/rate/usd/uah';

const LS_KEY = 'converterHistory';

function saveToLocalStorage(items) {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

const DB_NAME = 'ConverterDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';
let dbPromise = null;

// Відкриває базу ConverterDB (створює сховище history при першому запуску), повертає Promise з db.
function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB недоступна'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
}

// Додає запис у сховище (id генерує база); повертає згенерований id.
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Оновлює наявний запис: put із тим самим id перезаписує його без дубліката.
async function updateItem(item) {
    return addItem(item);
}

// Читає всі записи зі сховища транзакцією readonly.
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Видаляє запис за ключем id.
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

async function migrateFromLocalStorage() {
    if (localStorage.getItem('historyMigrated') === 'true') return;

    const existing = await getAllItems();
    const oldRecords = loadFromLocalStorage();

    if (existing.length === 0 && oldRecords.length > 0) {
        for (const record of oldRecords) {
            await addItem(record);
        }
    }
    localStorage.setItem('historyMigrated', 'true');
}

const ConverterForm = {
    props: ['units'],
    emits: ['convert'],
    data() {
        return {
            amount: '',
            fromUnit: this.units[0].id,
            toUnit: this.units[1].id
        };
    },
    computed: {
        fromData() {
            return this.units.find(unit => unit.id === this.fromUnit);
        },
        toData() {
            return this.units.find(unit => unit.id === this.toUnit);
        },
        result() {
            const amount = Number(this.amount);
            if (!(amount > 0)) return 0;
            return amount / this.fromData.rate * this.toData.rate;
        },
        resultText() {
            return formatNumber(this.result);
        }
    },
    methods: {
        swap() {
            [this.fromUnit, this.toUnit] = [this.toUnit, this.fromUnit];
        },
        submit() {
            const amount = Number(this.amount);
            if (!(amount > 0)) return;
            this.$emit('convert', {
                amount,
                from: this.fromData.label,
                to: this.toData.label,
                result: this.result
            });
            this.amount = '';
        }
    },
    template: `
        <section>
            <h2>Форма конвертації</h2>
            <form @submit.prevent="submit">
                <label for="amount">Значення:</label>
                <input type="number" id="amount" name="amount" min="0.01" step="any" required
                       v-model.number="amount">

                <div class="fields">
                    <label for="from">З:</label>
                    <select id="from" name="from" v-model="fromUnit">
                        <option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.label }}</option>
                    </select>
                    <button type="button" class="swap-btn" aria-label="Поміняти місцями" @click="swap">⇄</button>
                    <label for="to">В:</label>
                    <select id="to" name="to" v-model="toUnit">
                        <option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.label }}</option>
                    </select>
                </div>

                <button type="submit" class="submit-btn">Конвертувати</button>
            </form>

            <section class="result">
                <h3>Результат: <span>{{ resultText }}</span> {{ toData.label }}</h3>
            </section>
        </section>`
};

const HistoryChart = {
    props: ['records'],
    data() {
        return { frameId: null };
    },
    computed: {
        // Результати конвертацій від найстаршої до найновішої
        values() {
            return [...this.records].reverse().map(record => Number(record.result));
        }
    },
    watch: {
        records() {
            this.animate();
        }
    },
    mounted() {
        this.animate();
    },
    beforeUnmount() {
        this.stop();
    },
    methods: {
        // Малює один кадр; progress (0..1) - яка частина лінії вже намальована
        draw(progress) {
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext('2d');
            const values = this.values;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (values.length === 0) return;

            const pad = 20;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const points = values.map((value, i) => ({
                x: values.length > 1
                    ? pad + (canvas.width - 2 * pad) * i / (values.length - 1)
                    : canvas.width / 2,
                y: max === min
                    ? canvas.height / 2
                    : canvas.height - pad - (value - min) / (max - min) * (canvas.height - 2 * pad)
            }));
            // Лінія, що з'єднує точки; малюємо лише частину, відповідну progress
            const drawn = progress * (points.length - 1);
            const full = Math.floor(drawn);
            ctx.strokeStyle = '#2f7d32';
            ctx.fillStyle = '#2f7d32';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i <= full; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            if (full < points.length - 1) {
                const t = drawn - full;
                const a = points[full];
                const b = points[full + 1];
                ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
            }
            ctx.stroke();
            points.forEach((point, i) => {
                if (i <= drawn) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        },
        // Цикл анімації: оновлюємо progress, перемальовуємо кадр, плануємо наступний
        animate() {
            this.stop();
            let start = null;
            const step = timestamp => {
                if (start === null) start = timestamp;
                const progress = Math.min((timestamp - start) / 700, 1);
                this.draw(progress);
                if (progress < 1) {
                    this.frameId = requestAnimationFrame(step);
                } else {
                    this.frameId = null;
                }
            };
            this.frameId = requestAnimationFrame(step);
        },
        // Зупиняє поточний цикл анімації
        stop() {
            if (this.frameId !== null) {
                cancelAnimationFrame(this.frameId);
                this.frameId = null;
            }
        }
    },
    template: `
        <section class="chart">
            <h2>Графік історії конвертацій</h2>
            <canvas ref="canvas" width="400" height="200"></canvas>
            <button type="button" @click="animate">Програти знову</button>
        </section>`
};

createApp({
    components: { ConverterForm, HistoryChart },
    data() {
        return {
            types: [
                {
                    id: 'currency',
                    name: 'Валюта',
                    units: [
                        { id: 'usd', label: 'USD', rate: 1 },
                        { id: 'eur', label: 'EUR', rate: 0.92 },
                        { id: 'uah', label: 'UAH', rate: 41.5 }
                    ]
                },
                {
                    id: 'length',
                    name: 'Довжина',
                    units: [
                        { id: 'm', label: 'м', rate: 1 },
                        { id: 'km', label: 'км', rate: 0.001 },
                        { id: 'cm', label: 'см', rate: 100 },
                        { id: 'mi', label: 'милі', rate: 0.000621371 },
                        { id: 'ft', label: 'фути', rate: 3.28084 }
                    ]
                },
                {
                    id: 'weight',
                    name: 'Вага',
                    units: [
                        { id: 'kg', label: 'кг', rate: 1 },
                        { id: 'g', label: 'г', rate: 1000 },
                        { id: 'lb', label: 'фунти', rate: 2.20462 },
                        { id: 'oz', label: 'унції', rate: 35.274 }
                    ]
                }
            ],
            activeTypeId: 'currency',
            history: [],
            dbError: '',
            loading: false,
            error: '',
            ratesInfo: ''
        };
    },
    computed: {
        activeType() {
            return this.types.find(type => type.id === this.activeTypeId);
        }
    },
    methods: {
        setType(id) {
            this.activeTypeId = id;
        },
        async refreshHistory() {
            const all = await getAllItems();
            all.sort((a, b) => b.timestamp - a.timestamp);
            this.history = all.slice(0, 10);
        },
        async addHistory(record) {
            try {
                await addItem({
                    amount: record.amount,
                    from: record.from,
                    to: record.to,
                    result: formatNumber(record.result),
                    timestamp: Date.now()
                });
                await this.refreshHistory();
            } catch (error) {
                this.dbError = 'Не вдалося зберегти запис: сховище IndexedDB недоступне (можливо, увімкнений приватний режим).';
                console.error(error);
            }
        },
        async initHistory() {
            try {
                await migrateFromLocalStorage();
                await this.refreshHistory();
            } catch (error) {
                this.dbError = 'Історія недоступна: сховище IndexedDB не вдалося відкрити.';
                console.error(error);
            }
        },
        async loadData() {
            this.loading = true;
            this.error = '';
            try {
                const response = await fetch(API_URL);
                if (response.status === 422 || response.status === 404) {
                    throw new Error('INVALID_CURRENCY');
                }
                if (!response.ok) {
                    throw new Error(`Сервер відповів кодом ${response.status}`);
                }
                const data = await response.json();
                const currency = this.types.find(type => type.id === 'currency');
                currency.units.find(unit => unit.id === 'uah').rate = data.rate;
                this.ratesInfo = `1 ${data.base} = ${data.rate} ${data.quote} (станом на ${data.date})`;
            } catch (error) {
                this.error = error.message === 'INVALID_CURRENCY'
                    ? 'Перевірте код валюти.'
                    : 'Не вдалося завантажити курси валют. Спробуйте пізніше.';
                console.error(error);
            } finally {
                this.loading = false;
            }
        }
    },
    mounted() {
        this.initHistory();
        this.loadData();
    }
}).mount('#app');


