    let lastLat = null, lastLon = null;

    function fetchWeather(lat, lon) {
      lastLat = lat; lastLon = lon;
      function prefersFahrenheit(lat, lon) {
        if (lat > 18 && lat < 50 && lon < -50 && lon > -130) return true;
        if (lat > 20 && lat < 28 && lon > -80 && lon < -72) return true;
        if (lat > 18 && lat < 21 && lon > -82 && lon < -79) return true;
        if (lat > 4 && lat < 9 && lon > -12 && lon < -7) return true;
        return false;
      }
      const useF = prefersFahrenheit(lat, lon);
      const tempUnit = useF ? "fahrenheit" : "celsius";
      const windUnit = useF ? "mph" : "kmh";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,precipitation,weathercode,cloudcover,windspeed_10m,winddirection_10m,relativehumidity_2m,dewpoint_2m,visibility,uv_index,pressure_msl&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,weathercode,uv_index_max,windgusts_10m_max&temperature_unit=${tempUnit}&windspeed_unit=${windUnit}&precipitation_unit=mm&timezone=auto`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (!data.current_weather) {
            showError("Weather data not available for your location.");
            return;
          }
          showWeather(data, useF, lat, lon);
        })
        .catch(() => showError("Could not fetch weather data."));
    }

    function getWeatherIcon(code) {
      if ([0, 1].includes(code)) return "☀️";
      if ([2].includes(code)) return "🌤️";
      if ([3].includes(code)) return "☁️";
      if ([45, 48].includes(code)) return "🌫️";
      if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
      if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
      if ([95, 96, 99].includes(code)) return "⛈️";
      return "🌡️";
    }

    function showWeather(data, useF, lat, lon) {
      const w = data.current_weather;
      const daily = data.daily;
      const weatherDiv = document.getElementById('weather');
      const weatherCodes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
        56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Slight rain", 63: "Rain", 65: "Heavy rain",
        66: "Freezing rain", 67: "Freezing rain", 71: "Slight snow", 73: "Snow", 75: "Heavy snow",
        77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Violent rain showers",
        85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm hail", 99: "Thunderstorm hail"
      };
      const tempUnit = useF ? "°F" : "°C";
      const windUnit = useF ? "mph" : "km/h";
      // Find current hour index
      const now = new Date();
      const hourIdx = data.hourly.time.findIndex(t => t.slice(0,13) === now.toISOString().slice(0,13));
      // Map
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.06},${lat-0.04},${lon+0.06},${lat+0.04}&layer=mapnik&marker=${lat},${lon}`;
      // Address (reverse geocode)
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(r=>r.json())
        .then(addrData => {
          const address = addrData.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
          weatherDiv.innerHTML = `
            <div class="weather-section">
              <div class="weather-icon">${getWeatherIcon(w.weathercode)}</div>
              <div class="weather-title">${weatherCodes[w.weathercode] || "Unknown"}</div>
              <div class="weather-row weather-detail"><span class="label">Location:</span> ${address}</div>
              <div class="weather-row weather-detail"><span class="label">Coordinates:</span> ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
              <div class="weather-row weather-detail"><span class="label">Time:</span> ${now.toLocaleString()}</div>
            </div>
            <div class="map-wrap">
              <iframe class="map-frame" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
            <div class="weather-section">
              <div class="weather-row weather-detail"><span class="label">Temperature:</span> ${w.temperature}${tempUnit} (feels like ${data.hourly.apparent_temperature[hourIdx]}${tempUnit})</div>
              <div class="weather-row weather-detail"><span class="label">Humidity:</span> ${data.hourly.relativehumidity_2m[hourIdx]}%</div>
              <div class="weather-row weather-detail"><span class="label">Dew Point:</span> ${data.hourly.dewpoint_2m[hourIdx]}${tempUnit}</div>
              <div class="weather-row weather-detail"><span class="label">Wind:</span> ${w.windspeed} ${windUnit} (${w.winddirection}°)</div>
              <div class="weather-row weather-detail"><span class="label">Wind Gusts:</span> ${daily.windgusts_10m_max[0]} ${windUnit}</div>
              <div class="weather-row weather-detail"><span class="label">Cloud Cover:</span> ${data.hourly.cloudcover[hourIdx]}%</div>
              <div class="weather-row weather-detail"><span class="label">Visibility:</span> ${data.hourly.visibility[hourIdx] ? (data.hourly.visibility[hourIdx]/1000).toFixed(1) + " km" : "N/A"}</div>
              <div class="weather-row weather-detail"><span class="label">Pressure:</span> ${data.hourly.pressure_msl[hourIdx]} hPa</div>
              <div class="weather-row weather-detail"><span class="label">Precipitation:</span> ${data.hourly.precipitation[hourIdx]} mm</div>
              <div class="weather-row weather-detail"><span class="label">UV Index:</span> ${data.hourly.uv_index[hourIdx] || daily.uv_index_max[0] || "N/A"}</div>
              <div class="weather-row weather-detail"><span class="label">Sunrise:</span> ${daily.sunrise[0].slice(11,16)}</div>
              <div class="weather-row weather-detail"><span class="label">Sunset:</span> ${daily.sunset[0].slice(11,16)}</div>
              <div class="weather-row weather-detail"><span class="label">Today's High:</span> ${daily.temperature_2m_max[0]}${tempUnit}</div>
              <div class="weather-row weather-detail"><span class="label">Today's Low:</span> ${daily.temperature_2m_min[0]}${tempUnit}</div>
              <div class="weather-row weather-detail"><span class="label">Today's Precipitation:</span> ${daily.precipitation_sum[0]} mm</div>
            </div>
            <div class="weather-section">
              <div class="weather-title" style="margin-bottom:0.5em;">5-Day Forecast</div>
              <table class="forecast-table">
                <tr>
                  <th>Date</th>
                  <th>Weather</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Precip</th>
                  <th>UV Max</th>
                  <th>Wind Gust</th>
                </tr>
                ${daily.time.slice(0,5).map((date,i) => `
                  <tr>
                    <td>${new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td>${getWeatherIcon(daily.weathercode[i])} ${weatherCodes[daily.weathercode[i]] || ""}</td>
                    <td>${daily.temperature_2m_max[i]}${tempUnit}</td>
                    <td>${daily.temperature_2m_min[i]}${tempUnit}</td>
                    <td>${daily.precipitation_sum[i]} mm</td>
                    <td>${daily.uv_index_max ? daily.uv_index_max[i] : "N/A"}</td>
                    <td>${daily.windgusts_10m_max ? daily.windgusts_10m_max[i] + " " + windUnit : "N/A"}</td>
                  </tr>
                `).join("")}
              </table>
            </div>
          `;
          document.getElementById('refresh-btn').style.display = 'inline-block';
          document.getElementById('error').textContent = '';
        })
        .catch(() => {
          weatherDiv.innerHTML = `<div class="weather-row weather-detail"><span class="label">Coordinates:</span> ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>`;
        });
    }

    function showError(msg) {
      document.getElementById('weather').innerHTML = '';
      document.getElementById('error').textContent = msg;
      document.getElementById('refresh-btn').style.display = 'inline-block';
    }

    function getLocationAndWeather() {
      document.getElementById('weather').innerHTML = '<div style="text-align:center;color:#64748b;">Loading weather...</div>';
      document.getElementById('error').textContent = '';
      if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => showError("Could not get your location. Please allow location access.")
      );
    }

    document.getElementById('refresh-btn').onclick = getLocationAndWeather;

    // Initial load
    getLocationAndWeather();
// ...existing code...

function setSkyBackground(code) {
  // Remove previous sky classes
  document.body.classList.remove(
    "sky-clear", "sky-mainly-clear", "sky-partly-cloudy", "sky-overcast",
    "sky-fog", "sky-rain", "sky-snow", "sky-thunder"
  );
  // Map weather code to sky class
  let skyClass = "sky-clear";
  if ([0].includes(code)) skyClass = "sky-clear";
  else if ([1].includes(code)) skyClass = "sky-mainly-clear";
  else if ([2].includes(code)) skyClass = "sky-partly-cloudy";
  else if ([3].includes(code)) skyClass = "sky-overcast";
  else if ([45, 48].includes(code)) skyClass = "sky-fog";
  else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) skyClass = "sky-rain";
  else if ([71, 73, 75, 77, 85, 86].includes(code)) skyClass = "sky-snow";
  else if ([95, 96, 99].includes(code)) skyClass = "sky-thunder";
  document.body.classList.add(skyClass);
}

function getAqiClass(aqi) {
  if (aqi <= 50) return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-unhealthy";
  if (aqi <= 200) return "aqi-very-unhealthy";
  if (aqi > 200) return "aqi-hazardous";
  return "aqi-unknown";
}

function getAqiDesc(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi > 200) return "Very Unhealthy/Hazardous";
  return "Unknown";
}

function showWeather(data, useF, lat, lon) {
  const w = data.current_weather;
  const daily = data.daily;
  const weatherDiv = document.getElementById('weather');
  const weatherCodes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
    56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Slight rain", 63: "Rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Freezing rain", 71: "Slight snow", 73: "Snow", 75: "Heavy snow",
    77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Violent rain showers",
    85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm hail", 99: "Thunderstorm hail"
  };
  const tempUnit = useF ? "°F" : "°C";
  const windUnit = useF ? "mph" : "km/h";
  const now = new Date();
  const hourIdx = data.hourly.time.findIndex(t => t.slice(0,13) === now.toISOString().slice(0,13));
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.06},${lat-0.04},${lon+0.06},${lat+0.04}&layer=mapnik&marker=${lat},${lon}`;
  setSkyBackground(w.weathercode);

  // Fetch address and air quality in parallel
  Promise.all([
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).then(r=>r.json()).catch(()=>null),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`).then(r=>r.json()).catch(()=>null)
  ]).then(([addrData, airData]) => {
    const address = addrData && addrData.display_name ? addrData.display_name : `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
    // Air Quality
    let airHtml = '';
    if (airData && airData.hourly && airData.hourly.us_aqi) {
      // Find closest hour
      const aqHourIdx = airData.hourly.time.findIndex(t => t.slice(0,13) === now.toISOString().slice(0,13));
      const aqi = airData.hourly.us_aqi[aqHourIdx] || airData.hourly.us_aqi[0];
      airHtml = `
        <div class="air-quality-section">
          <div class="air-quality-title">Air Quality Index</div>
          <span class="aqi-badge ${getAqiClass(aqi)}">${aqi}</span>
          <div class="air-quality-detail">${getAqiDesc(aqi)}</div>
          <div class="air-quality-detail">PM2.5: ${airData.hourly.pm2_5[aqHourIdx] || "N/A"} μg/m³, PM10: ${airData.hourly.pm10[aqHourIdx] || "N/A"} μg/m³</div>
          <div class="air-quality-detail">O₃: ${airData.hourly.ozone[aqHourIdx] || "N/A"} μg/m³, NO₂: ${airData.hourly.nitrogen_dioxide[aqHourIdx] || "N/A"} μg/m³</div>
        </div>
      `;
    }

    weatherDiv.innerHTML = `
      <div class="weather-section">
        <div class="weather-icon">${getWeatherIcon(w.weathercode)}</div>
        <div class="weather-title">${weatherCodes[w.weathercode] || "Unknown"}</div>
        <div class="weather-row weather-detail"><span class="label">Location:</span> ${address}</div>
        <div class="weather-row weather-detail"><span class="label">Coordinates:</span> ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
        <div class="weather-row weather-detail"><span class="label">Time:</span> ${now.toLocaleString()}</div>
      </div>
      ${airHtml}
      <div class="map-wrap">
        <iframe class="map-frame" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
      <div class="weather-section">
        <div class="weather-row weather-detail"><span class="label">Temperature:</span> ${w.temperature}${tempUnit} (feels like ${data.hourly.apparent_temperature[hourIdx]}${tempUnit})</div>
        <div class="weather-row weather-detail"><span class="label">Humidity:</span> ${data.hourly.relativehumidity_2m[hourIdx]}%</div>
        <div class="weather-row weather-detail"><span class="label">Dew Point:</span> ${data.hourly.dewpoint_2m[hourIdx]}${tempUnit}</div>
        <div class="weather-row weather-detail"><span class="label">Wind:</span> ${w.windspeed} ${windUnit} (${w.winddirection}°)</div>
        <div class="weather-row weather-detail"><span class="label">Wind Gusts:</span> ${daily.windgusts_10m_max[0]} ${windUnit}</div>
        <div class="weather-row weather-detail"><span class="label">Cloud Cover:</span> ${data.hourly.cloudcover[hourIdx]}%</div>
        <div class="weather-row weather-detail"><span class="label">Visibility:</span> ${data.hourly.visibility[hourIdx] ? (data.hourly.visibility[hourIdx]/1000).toFixed(1) + " km" : "N/A"}</div>
        <div class="weather-row weather-detail"><span class="label">Pressure:</span> ${data.hourly.pressure_msl[hourIdx]} hPa</div>
        <div class="weather-row weather-detail"><span class="label">Precipitation:</span> ${data.hourly.precipitation[hourIdx]} mm</div>
        <div class="weather-row weather-detail"><span class="label">UV Index:</span> ${data.hourly.uv_index[hourIdx] || daily.uv_index_max[0] || "N/A"}</div>
        <div class="weather-row weather-detail"><span class="label">Sunrise:</span> ${daily.sunrise[0].slice(11,16)}</div>
        <div class="weather-row weather-detail"><span class="label">Sunset:</span> ${daily.sunset[0].slice(11,16)}</div>
        <div class="weather-row weather-detail"><span class="label">Today's High:</span> ${daily.temperature_2m_max[0]}${tempUnit}</div>
        <div class="weather-row weather-detail"><span class="label">Today's Low:</span> ${daily.temperature_2m_min[0]}${tempUnit}</div>
        <div class="weather-row weather-detail"><span class="label">Today's Precipitation:</span> ${daily.precipitation_sum[0]} mm</div>
      </div>
      <div class="weather-section">
        <div class="weather-title" style="margin-bottom:0.5em;">5-Day Forecast</div>
        <table class="forecast-table">
          <tr>
            <th>Date</th>
            <th>Weather</th>
            <th>High</th>
            <th>Low</th>
            <th>Precip</th>
            <th>UV Max</th>
            <th>Wind Gust</th>
          </tr>
          ${daily.time.slice(0,5).map((date,i) => `
            <tr>
              <td>${new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
              <td>${getWeatherIcon(daily.weathercode[i])} ${weatherCodes[daily.weathercode[i]] || ""}</td>
              <td>${daily.temperature_2m_max[i]}${tempUnit}</td>
              <td>${daily.temperature_2m_min[i]}${tempUnit}</td>
              <td>${daily.precipitation_sum[i]} mm</td>
              <td>${daily.uv_index_max ? daily.uv_index_max[i] : "N/A"}</td>
              <td>${daily.windgusts_10m_max ? daily.windgusts_10m_max[i] + " " + windUnit : "N/A"}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    `;
    document.getElementById('refresh-btn').style.display = 'inline-block';
    document.getElementById('error').textContent = '';
  }).catch(() => {
    weatherDiv.innerHTML = `<div class="weather-row weather-detail"><span class="label">Coordinates:</span> ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>`;
  });
}

// ...existing code...

function renderWeatherEffects(skyClass) {
  // Remove old effects
  document.querySelectorAll('.weather-bg-clouds, .weather-bg-snow, .weather-bg-rain').forEach(e => e.remove());

  // Clouds
  if (["sky-mainly-clear", "sky-partly-cloudy", "sky-overcast", "sky-fog"].includes(skyClass)) {
    const clouds = document.createElement('div');
    clouds.className = 'weather-bg-clouds';
    clouds.innerHTML = `
      <div class="cloud small"></div>
      <div class="cloud medium"></div>
      <div class="cloud large"></div>
      <div class="cloud tiny"></div>
    `;
    document.body.prepend(clouds);
  }
  // Snow
  if (skyClass === "sky-snow") {
    const snow = document.createElement('div');
    snow.className = 'weather-bg-snow';
    let flakes = '';
    for (let i = 0; i < 18; i++) {
      flakes += `<span class="snowflake" style="left:${Math.random()*100}vw;animation-delay:${Math.random()*8}s;">❄️</span>`;
    }
    snow.innerHTML = flakes;
    document.body.prepend(snow);
  }
  // Rain
  if (skyClass === "sky-rain") {
    const rain = document.createElement('div');
    rain.className = 'weather-bg-rain';
    let drops = '';
    for (let i = 0; i < 24; i++) {
      drops += `<span class="raindrop" style="left:${Math.random()*100}vw;animation-delay:${Math.random()*2.5}s;"></span>`;
    }
    rain.innerHTML = drops;
    document.body.prepend(rain);
  }
}

// Update setSkyBackground to call renderWeatherEffects
function setSkyBackground(code) {
  document.body.classList.remove(
    "sky-clear", "sky-mainly-clear", "sky-partly-cloudy", "sky-overcast",
    "sky-fog", "sky-rain", "sky-snow", "sky-thunder"
  );
  let skyClass = "sky-clear";
  if ([0].includes(code)) skyClass = "sky-clear";
  else if ([1].includes(code)) skyClass = "sky-mainly-clear";
  else if ([2].includes(code)) skyClass = "sky-partly-cloudy";
  else if ([3].includes(code)) skyClass = "sky-overcast";
  else if ([45, 48].includes(code)) skyClass = "sky-fog";
  else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) skyClass = "sky-rain";
  else if ([71, 73, 75, 77, 85, 86].includes(code)) skyClass = "sky-snow";
  else if ([95, 96, 99].includes(code)) skyClass = "sky-thunder";
  document.body.classList.add(skyClass);
  renderWeatherEffects(skyClass);
}
