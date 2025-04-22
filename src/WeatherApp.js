import React from 'react';

function WeatherApp({ open, onClose, darkMode }) {
  if (!open) return null;

  // Static sample data for Hanoi
  const weather = {
    name: 'Hanoi',
    weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
    main: { temp: 28, feels_like: 30, humidity: 50 },
    wind: { speed: 2.5 },
  };
  const forecast = [
    { dt: Date.now() / 1000, main: { temp: 28 }, weather: [{ main: 'Clear', icon: '01d' }] },
    { dt: Date.now() / 1000 + 3 * 3600, main: { temp: 27 }, weather: [{ main: 'Clouds', icon: '02d' }] },
    { dt: Date.now() / 1000 + 6 * 3600, main: { temp: 26 }, weather: [{ main: 'Clouds', icon: '03d' }] },
    { dt: Date.now() / 1000 + 9 * 3600, main: { temp: 25 }, weather: [{ main: 'Rain', icon: '10d' }] },
    { dt: Date.now() / 1000 + 12 * 3600, main: { temp: 24 }, weather: [{ main: 'Rain', icon: '10d' }] },
    { dt: Date.now() / 1000 + 15 * 3600, main: { temp: 23 }, weather: [{ main: 'Clear', icon: '01n' }] },
    { dt: Date.now() / 1000 + 18 * 3600, main: { temp: 22 }, weather: [{ main: 'Clear', icon: '01n' }] },
    { dt: Date.now() / 1000 + 21 * 3600, main: { temp: 21 }, weather: [{ main: 'Clouds', icon: '02n' }] },
  ];

  // Dynamic background gradient based on weather


  const textColor = darkMode ? "text-white" : "text-gray-900";
  const subTextColor = darkMode ? "text-blue-200" : "text-blue-800";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center pointer-events-none" >
      <div className={`relative w-full max-w-xs sm:max-w-md rounded-3xl shadow-2xl p-0 overflow-hidden pointer-events-auto flex flex-col items-center`}>
        {/* Close button */}
        <button className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-2 shadow-lg border border-gray-200 dark:bg-gray-900 dark:text-white dark:border-gray-700 transition-colors" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Weather Card Content */}
        <div className={`w-full flex flex-col items-center px-4 py-6 sm:px-8 sm:py-8 ${darkMode ? 'bg-gray-900/70' : 'bg-white/60'} rounded-3xl shadow-lg glassy-card`} style={{backdropFilter:'blur(8px)'}}>
          {/* Weather Icon */}
          <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`} alt="icon" className="w-24 h-24 mb-2" />
          {/* City and Condition */}
          <div className={`text-xl font-bold ${textColor} mb-1`}>{weather.name}</div>
          <div className={`text-base font-semibold ${subTextColor} mb-2`}>{weather.weather[0].main}</div>
          {/* Temperature */}
          <div className={`text-6xl font-extralight ${textColor} mb-1`}>{Math.round(weather.main.temp)}°</div>
          {/* Details Pills */}
          <div className="flex gap-2 justify-center mb-4">
            <div className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium flex items-center gap-1">
              <span>Feels</span> <span className="font-bold">{Math.round(weather.main.feels_like)}°</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium flex items-center gap-1">
              <span>Humidity</span> <span className="font-bold">{weather.main.humidity}%</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium flex items-center gap-1">
              <span>Wind</span> <span className="font-bold">{weather.wind.speed} m/s</span>
            </div>
          </div>
          {/* Forecast Bar */}
          <div className="w-full overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-[350px]">
              {forecast.map((f, i) => (
                <div key={i} className={`flex flex-col items-center min-w-[56px] p-2 rounded-xl ${darkMode ? 'bg-gray-800/70' : 'bg-white/80'} shadow-sm`} style={{backdropFilter:'blur(4px)'}}>
                  <div className={`text-xs mb-1 ${textColor}`}>{new Date(f.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <img src={`https://openweathermap.org/img/wn/${f.weather[0].icon}.png`} alt="icon" className="w-7 h-7" />
                  <div className={`text-base font-bold ${textColor}`}>{Math.round(f.main.temp)}°</div>
                  <div className={`text-xs ${subTextColor}`}>{f.weather[0].main}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeatherApp;
