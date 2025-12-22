
import React, { useState, useEffect } from 'react';
import { WeatherData } from '../../types';

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Buscando local...');
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max&timezone=auto`);
      const data = await response.json();

      const weatherCodes: Record<number, { condition: string, icon: string }> = {
        0: { condition: 'Céu Limpo', icon: '☀️' },
        1: { condition: 'Predom. Ensolarado', icon: '🌤️' },
        2: { condition: 'Parcialm. Nublado', icon: '⛅' },
        3: { condition: 'Nublado', icon: '☁️' },
        45: { condition: 'Nevoeiro', icon: '🌫️' },
        51: { condition: 'Garoa Leve', icon: '🌦️' },
        61: { condition: 'Chuva', icon: '🌧️' },
        80: { condition: 'Pancadas de Chuva', icon: '🚿' },
        95: { condition: 'Tempestade', icon: '⛈️' },
      };

      const currentCode = data.current.weather_code;
      const nextCode = data.daily.weather_code[1];

      setWeather({
        temp: Math.round(data.current.temperature_2m),
        condition: weatherCodes[currentCode]?.condition || 'Variável',
        icon: weatherCodes[currentCode]?.icon || '🌡️',
        forecastNextDay: {
          temp: Math.round(data.daily.temperature_2m_max[1]),
          condition: weatherCodes[nextCode]?.condition || 'Estável'
        }
      });
      
      // Nome aproximado baseado na lat/lon
      if (lat.toFixed(1) === "-23.9" || lat.toFixed(1) === "-24.0") {
        setLocationName('Santos/SP');
      } else {
        setLocationName('Sua Região');
      }
    } catch (error) {
      console.error("Erro ao buscar clima:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(-23.9608, -46.3339) // Fallback Santos
      );
    } else {
      fetchWeather(-23.9608, -46.3339);
    }
    
    return () => clearInterval(clockInterval);
  }, []);

  const dayOfWeek = currentTime.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateFormatted = currentTime.toLocaleDateString('pt-BR');
  const timeFormatted = currentTime.toLocaleTimeString('pt-BR');

  return (
    <div className="space-y-3">
      {/* Relógio de Turno */}
      <div className="bg-slate-800/40 p-3 rounded-2xl border border-white/5 animate-in fade-in duration-500">
        <div className="flex justify-between items-center text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">
          <span className="capitalize">{dayOfWeek}</span>
          <span>{dateFormatted}</span>
        </div>
        <div className="text-xl font-black text-white font-mono tracking-tighter leading-none">
          {timeFormatted}
        </div>
      </div>

      {/* Widget de Clima */}
      {loading ? (
        <div className="animate-pulse bg-slate-800/30 h-16 rounded-2xl border border-slate-700/30"></div>
      ) : weather ? (
        <div className="bg-gradient-to-br from-blue-600/10 to-indigo-900/30 p-3 rounded-2xl border border-blue-500/10 shadow-lg backdrop-blur-sm animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-1">
            <div>
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none">{locationName}</span>
              <p className="text-xl font-black text-white leading-none mt-1">{weather.temp}°C</p>
            </div>
            <span className="text-2xl">{weather.icon}</span>
          </div>
          <div className="flex justify-between items-end border-t border-white/5 pt-1.5 mt-1">
            <p className="text-[7px] font-bold text-slate-400 uppercase leading-none">{weather.condition}</p>
            <div className="text-right">
              <p className="text-[7px] font-black text-slate-500 uppercase leading-none mb-0.5">Amanhã</p>
              <p className="text-[9px] font-black text-blue-400/90 leading-none">{weather.forecastNextDay.temp}°C</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeatherWidget;
