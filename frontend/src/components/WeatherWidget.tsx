import { useState, useEffect } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Loader2, MapPin, Moon, Sun } from 'lucide-react';
import { getBestLocation } from '@/lib/location';

interface WeatherData {
    temperature: number;
    weathercode: number;
    is_day: number;
}

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const getWeatherIcon = (code: number, isDay: number) => {
    if (code === 0) return isDay ? <Sun className="h-4 w-4 text-orange-500" /> : <Moon className="h-4 w-4 text-blue-200" />;
    if (code === 1 || code === 2 || code === 3) return <Cloud className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    if (code >= 45 && code <= 48) return <CloudFog className="h-4 w-4 text-gray-400" />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="h-4 w-4 text-blue-400" />;
    if (code >= 61 && code <= 67) return <CloudRain className="h-4 w-4 text-blue-500" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="h-4 w-4 text-blue-200" />;
    if (code >= 80 && code <= 82) return <CloudRain className="h-4 w-4 text-blue-600" />;
    if (code >= 95 && code <= 99) return <CloudLightning className="h-4 w-4 text-yellow-500" />;

    return <Cloud className="h-4 w-4 text-gray-500" />;
};

const getWeatherDesc = (code: number) => {
    if (code === 0) return 'Clear';
    if (code === 1 || code === 2 || code === 3) return 'Cloudy';
    if (code >= 45 && code <= 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Unknown';
};

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [locationName, setLocationName] = useState<string>("Local");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                // Fetch weather data
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();

                if (data && data.current_weather) {
                    setWeather(data.current_weather);
                } else {
                    setError(true);
                }

                // Optional: Try to reverse geocode city name (using a free API like nominatim)
                try {
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=en`, {
                        headers: {
                            'User-Agent': 'UrbanReportAI/1.0'
                        }
                    });
                    const geoData = await geoRes.json();
                    if (geoData && geoData.address) {
                        const area = geoData.address.neighbourhood ||
                            geoData.address.suburb ||
                            geoData.address.village ||
                            geoData.address.city_district ||
                            geoData.address.town ||
                            geoData.address.city ||
                            geoData.address.county ||
                            "Local";
                        setLocationName(area);
                    }
                } catch (e) {
                    // completely ignore reverse geocoding failure, it's not critical
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        const updateWeather = async () => {
            try {
                const loc = await getBestLocation(5000);
                await fetchWeather(loc.lat, loc.lng);
            } catch {
                await fetchWeather(28.6139, 77.2090);
            }
        };

        updateWeather();

        // Refresh every 30 minutes
        const interval = setInterval(updateWeather, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    if (error) return null;

    return (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-900/5 border border-red-900/20 dark:bg-red-900/20 dark:border-red-400/30 shadow-sm text-sm font-medium transition-all hover:bg-red-900/10 dark:hover:bg-red-900/30">
            <MapPin className="h-4 w-4 text-[#800000] dark:text-[#ff8080]" />
            <span className="text-[#800000] dark:text-[#ff8080] font-bold mr-1 truncate max-w-[120px]">{locationName}</span>

            {loading || !weather ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#800000] dark:text-[#ff8080]" />
            ) : (
                <div className="flex items-center gap-1.5 pl-2 border-l border-[#800000]/20 dark:border-[#ff8080]/30">
                    {getWeatherIcon(weather.weathercode, weather.is_day)}
                    <span className="text-[#800000] dark:text-[#ff8080] font-bold">{Math.round(weather.temperature)}°C</span>
                    <span className="text-[#800000]/80 dark:text-[#ff8080]/80 font-medium text-xs hidden xl:inline-block">
                        {getWeatherDesc(weather.weathercode)}
                    </span>
                </div>
            )}
        </div>
    );
}
