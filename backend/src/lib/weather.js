export async function geocodeCity(name) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
  const data = await res.json();
  const match = data.results?.[0];
  if (!match) throw new Error(`Could not find location "${name}"`);
  return { latitude: match.latitude, longitude: match.longitude };
}

export async function getDailyForecast({ latitude, longitude, startDate, endDate }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: "precipitation_probability_max,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Forecast unavailable for these dates (likely too far in the future — Open-Meteo's free tier only forecasts ~16 days ahead)");

  const data = await res.json();
  return data.daily.time.map((date, i) => ({
    date,
    precipitationProbability: data.daily.precipitation_probability_max[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
  }));
}