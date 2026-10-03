const exchangeRates = {
    USD: 1,
    EUR: 0.92,
    UAH: 41.5
};

const listContainer = document.querySelector('#rates-list');
const BIG_RATE_THRESHOLD = 10;

const loadingEl = document.querySelector('#loading');

function showLoading(isLoading) {
    loadingEl.hidden = !isLoading;
}

const errorEl = document.querySelector('#error');

function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
}

const API_URL = 'https://api.frankfurter.dev/v2/rate/usd/uah';

// Функція перебирає об'єкт із курсами валют і виводить кожен курс у консоль.
function showRates(ratesObj) {
    console.log('Актуальні курси валют:');
    const currencyKeys = Object.keys(ratesObj);
    for (const currency of currencyKeys) {
        console.log(`Валюта: ${currency}, курс: ${ratesObj[currency]}`);
    }
}

// Стрілкова функція, яка приймає початкову суму та курс, і повертає результат конвертації.
const convert = (amount, rate) => amount * rate;

// Функція обчислює підсумкову суму та перевіряє, чи перевищує вона заданий ліміт (5000).
function checkAmount(amount, rate) {
    const maxSum = 5000;
    const result = convert(amount, rate);
    console.log(`Результат конвертації: ${result} UAH`);
    if (result > maxSum) {
        console.log('Це занадто велика сума!');
    } else {
        console.log('Це невелика сума.');
    }
}

// Рендер списку валют: очищає #rates-list і для кожної пари [валюта, курс]
// створює li з текстом «USD: 1», атрибутом data-rate
// та класом big-rate, якщо курс більший за поріг.
function renderRates(ratesObj) {
    listContainer.innerHTML = '';

    Object.entries(ratesObj).forEach(([currency, rate]) => {
        const item = document.createElement('li');
        item.textContent = `${currency}: ${rate}`;
        item.dataset.rate = rate;

        if (rate > BIG_RATE_THRESHOLD) {
            item.classList.add('big-rate');
        }

        listContainer.append(item);
    });
}

renderRates(exchangeRates);

showRates(exchangeRates);

const ratesCount = document.querySelector('#rates-count');
ratesCount.textContent = `Кількість валют: ${Object.keys(exchangeRates).length}`;

const testResult = convert(100, exchangeRates.UAH);
console.log(`Тест Кроку 7 (100 USD у гривнях): ${testResult} UAH`);

checkAmount(150, exchangeRates.UAH);

const amountInput = document.querySelector('#amount');
const fromSelect = document.querySelector('#from');
const toSelect = document.querySelector('#to');
const form = document.querySelector('form');

const conversionHistory = [];

function convertCurrency(amount, from, to) {
    return convert(amount, exchangeRates[to] / exchangeRates[from]);
}

const historyList = document.querySelector('#history-list');

function renderHistory(records) {
    historyList.innerHTML = '';

    records.forEach(record => {
        const item = document.createElement('li');
        item.textContent = `${record.amount} ${record.from} = ${record.result.toFixed(2)} ${record.to}`;
        historyList.append(item);
    });
}

// Обробник submit: скасовує перезавантаження, рахує конвертацію,
// додає запис в історію, перемальовує список і очищає форму.
form.addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(amountInput.value);
    const from = fromSelect.value.toUpperCase();
    const to = toSelect.value.toUpperCase();

    const result = convertCurrency(amount, from, to);
    const record = { amount, from, to, result };
    conversionHistory.push(record);

    renderHistory(conversionHistory);

    form.reset();
});

// Валідація: якщо сума менша або дорівнює нулю, показуємо власне повідомлення.
amountInput.addEventListener('input', () => {
    if (amountInput.value !== '' && Number(amountInput.value) <= 0) {
        amountInput.setCustomValidity('Сума має бути додатною');
    } else {
        amountInput.setCustomValidity('');
    }
});

const resultSpan = document.querySelector('.result span');

function updateResult() {
    const amount = Number(amountInput.value);
    const from = fromSelect.value.toUpperCase();
    const to = toSelect.value.toUpperCase();

    if (amount > 0) {
        resultSpan.textContent = convertCurrency(amount, from, to).toFixed(2);
    } else {
        resultSpan.textContent = '0.00';
    }
}

// Обробники change: при зміні валюти одразу перераховуємо результат без сабміту.
fromSelect.addEventListener('change', updateResult);
toSelect.addEventListener('change', updateResult);

/**
 * Завантажує курс USD → UAH з Frankfurter API
 * (https://api.frankfurter.dev/v2), перевіряє статус відповіді,
 * виводить дані через renderRates і обробляє помилки.
 */
async function loadData() {
    showLoading(true);
    try {
        showError('');
        const response = await fetch(API_URL);
        if (response.status === 422 || response.status === 404) {
            throw new Error('INVALID_CURRENCY');
        } if (!response.ok) {
            throw new Error(`Сервер відповів кодом ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        renderRates({ [data.quote]: data.rate });
        ratesCount.textContent = `1 ${data.base} = ${data.rate} ${data.quote} (станом на ${data.date})`;
        
    } catch (error) {
        listContainer.replaceChildren();
        if (error.message === 'INVALID_CURRENCY') {
            showError('Перевірте код валюти.');
        } else {
            showError('Не вдалося завантажити курси валют. Спробуйте пізніше.');
        }
        console.error(error);
    } finally {
        showLoading(false);
    }
}
loadData();

const refreshBtn = document.querySelector('#refresh-btn');
refreshBtn.addEventListener('click', loadData);