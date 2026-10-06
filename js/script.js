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

const { createApp } = Vue;
const formatNumber = n => (n === 0 ? '0.00' : String(Number(n.toPrecision(6))));
const API_URL = 'https://api.frankfurter.dev/v2/rate/usd/uah';

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

createApp({
    components: { ConverterForm },
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
            nextHistoryId: 1,
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
        addHistory(record) {
            this.history.push({
                id: this.nextHistoryId++,
                amount: record.amount,
                from: record.from,
                to: record.to,
                result: formatNumber(record.result)
            });
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
        this.loadData();
    }
}).mount('#app');