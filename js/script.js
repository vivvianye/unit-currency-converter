const exchangeRates = {
    USD: 1,
    EUR: 0.92,
    UAH: 41.5
};

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

showRates(exchangeRates);

const testResult = convert(100, exchangeRates.UAH);
console.log(`Тест Кроку 7 (100 USD у гривнях): ${testResult} UAH`);

checkAmount(150, exchangeRates.UAH);