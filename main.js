const sidebar = document.querySelector('.sidebar');
const toggle = document.querySelector('.toggle');

toggle.addEventListener('click', () => {
  sidebar.classList.toggle('close');
});

const toggleSwitch = document.querySelector('.toggle-switch');

toggleSwitch.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  toggleSwitch.classList.toggle('active');
});

const clearHistoryBtn = document.getElementById('clearHistoryBtn');

clearHistoryBtn.addEventListener('click', () => {
  // Clear the stored search history from localStorage
  localStorage.removeItem('searchHistory');

  // Clear the displayed search history UI
  renderSearchHistory(); // re-render empty history message or clear

  // Optionally clear lastCity so page refresh won't fetch last city again
  lastCity = '';
  cityInput.value = '';
});

/* fetching */

const apiKey = '096bfcf8877ff937b6a7897ada2ef40e'; // <-- Replace with your OpenWeatherMap API key
const form = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const weatherCurrent = document.getElementById('weatherCurrent');
const forecastDiv = document.getElementById('forecast');
const errorDiv = document.getElementById('error');
const unitToggle = document.getElementById('unitToggle');
const searchHistoryContainer = document.getElementById('searchHistoryContainer'); // NEW

// State variables
let currentUnit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit
let lastCity = '';

form.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    fetchWeather(city);
  }
});

unitToggle.addEventListener('change', () => {
  currentUnit = unitToggle.checked ? 'imperial' : 'metric';
  if (lastCity) {
    fetchWeather(lastCity);
  }
});

async function fetchWeather(city) {
  errorDiv.textContent = '';
  weatherCurrent.innerHTML = 'Loading current weather...';
  forecastDiv.innerHTML = '';

  try {
    // Fetch current weather data
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${currentUnit}`);
    if (!weatherResponse.ok) throw new Error('City not found');
    const weatherData = await weatherResponse.json();

    displayCurrentWeather(weatherData);
    setBackground(weatherData.weather[0].main);
    saveLastCity(city);
    saveSearchHistory(city);  // NEW - save to history
    lastCity = city;

    // Fetch 5-day forecast data
    const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${currentUnit}`);

    if (!forecastResponse.ok) throw new Error('Forecast data not available');

    const forecastData = await forecastResponse.json();

    displayForecast(forecastData);
  } catch (err) {
    weatherCurrent.innerHTML = '';
    forecastDiv.innerHTML = '';
    errorDiv.textContent = err.message;
    resetBackground();
  }
}

function displayCurrentWeather(data) {
  const { name } = data;
  const { temp, humidity } = data.main;
  const { speed } = data.wind;
  const { description, icon } = data.weather[0];

  const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
  const speedUnit = currentUnit === 'metric' ? 'm/s' : 'mph';

  weatherCurrent.innerHTML = `
    <h2>${name}</h2>
    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
    <p><strong>Temperature:</strong> ${temp.toFixed(1)} ${unitSymbol}</p>
    <p><strong>Weather:</strong> ${capitalize(description)}</p>
    <p><strong>Humidity:</strong> ${humidity}%</p>
    <p><strong>Wind Speed:</strong> ${speed} ${speedUnit}</p>
  `;
}

function displayForecast(data) {
  
  const daily = {};

  data.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    const time = item.dt_txt.split(' ')[1];

    if (time === '12:00:00') {
      daily[date] = item;
    }
  });

  let forecastDays = Object.values(daily);

  // Fallback if less than 5 days found
  if (forecastDays.length < 5) {
    const datesSeen = new Set(Object.keys(daily));
    for (const item of data.list) {
      const date = item.dt_txt.split(' ')[0];
      if (!datesSeen.has(date)) {
        forecastDays.push(item);
        datesSeen.add(date);
      }
      if (forecastDays.length >= 5) break;
    }
  }

  forecastDiv.innerHTML = '<h3>5-Day Forecast</h3>';
  const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

  forecastDays.slice(0, 5).forEach(item => {
    const dateObj = new Date(item.dt * 1000);
    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const { temp } = item.main;
    const { icon, description } = item.weather[0];

    const forecastHTML = `
      <div class="forecast-day">
        <p><strong>${dayName}</strong></p>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
        <p>${temp.toFixed(1)} ${unitSymbol}</p>
        <p>${capitalize(description)}</p>
      </div>
    `;
    forecastDiv.insertAdjacentHTML('beforeend', forecastHTML);
  });
}

function saveLastCity(city) {
  localStorage.setItem('lastCity', city);
  localStorage.setItem('lastUnit', currentUnit);
}

function loadLastCity() {
  const lastCityStored = localStorage.getItem('lastCity');
  const lastUnitStored = localStorage.getItem('lastUnit');
  
  if (lastUnitStored) {
    currentUnit = lastUnitStored;
    unitToggle.checked = currentUnit === 'imperial';
  }

  

  lastCity = lastCityStored || '';
}



function saveSearchHistory(city) {
  let history = JSON.parse(localStorage.getItem('searchHistory')) || [];

  
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());


  history.unshift(city);

  if (history.length > 10) {
    history.pop();
  }

  localStorage.setItem('searchHistory', JSON.stringify(history));
  renderSearchHistory();
}

function renderSearchHistory() {
  const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
  if (history.length === 0) {
    searchHistoryContainer.innerHTML = '<p>No search history yet.</p>';
    return;
  }

  searchHistoryContainer.innerHTML = '<h3>Search History</h3>';
  history.forEach(city => {
    const btn = document.createElement('button');
    btn.textContent = city;
    btn.className = 'history-btn';
    btn.addEventListener('click', () => {
      cityInput.value = city;
      fetchWeather(city);
    });
    searchHistoryContainer.appendChild(btn);
  });
}


function setBackground(weatherMain) {
  const body = document.body;
  switch (weatherMain.toLowerCase()) {
    case 'clear':
      body.style.background = '#888'; // blue sky
      break;
    case 'clouds':
      body.style.background = '#ffc899'; // light steel blue
      break;
    case 'rain':
    case 'drizzle':
      body.style.background = '#6e7f80'; // greyish blue
      break;
    case 'thunderstorm':
      body.style.background = '#4a4a4a'; // dark gray
      break;
    case 'snow':
      body.style.background = '#e0f7fa'; // light cyan
      break;
    case 'mist':
    case 'fog':
      body.style.background = '#cfcfcf'; // light gray
      break;
    default:
      body.style.background = '#87ceeb'; // default blue sky
  }
}

function resetBackground() {
  document.body.style.background = '#87ceeb';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.addEventListener('load', () => {
  loadLastCity();
  renderSearchHistory();
  // Input remains empty on page load, no weather loaded until user search
  cityInput.value = '';
});
