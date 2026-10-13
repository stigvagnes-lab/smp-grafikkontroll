/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation 
} from 'react-router-dom';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Thermometer, 
  ArrowUp,
  Settings, 
  Eye, 
  Monitor,
  Image as ImageIcon,
  Map as MapIcon,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  HelpCircle,
  Server,
  Globe,
  Info,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Types ---

interface WeatherData {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            air_temperature: number;
            wind_speed: number;
            wind_from_direction: number;
          };
        };
        next_1_hours?: {
          summary: {
            symbol_code: string;
          };
        };
        next_6_hours?: {
          summary: {
            symbol_code: string;
          };
        };
        next_12_hours?: {
          summary: {
            symbol_code: string;
          };
        };
      };
    }>;
  };
}

interface OverlayState {
  activeGraphic: string;
  showWeather: boolean;
  showWind: boolean;
  showTemp: boolean;
  showBackground: boolean;
  showWidget: boolean;
  showSmpLogo: boolean;
  smpLogoUrl?: string;
  mapTileProvider?: 'esri' | 'kartverket' | 'osm';
  superName?: string;
  superTitle?: string;
}

const TILE_PROVIDERS: Record<string, { name: string; url: string; attribution: string; maxZoom?: number }> = {
  esri: {
    name: 'Esri Nøytral Grå',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  },
  kartverket: {
    name: 'Kartverket Gråtone',
    url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png',
    attribution: '&copy; Kartverket',
    maxZoom: 18
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

interface MapWeatherData {
  name: string;
  lat: number;
  lon: number;
  offsetX?: number;
  offsetY?: number;
  data: WeatherData;
}

// --- Helpers ---

const getWeatherIcon = (symbolCode: string) => {
  if (symbolCode.includes('clearsky')) return <Sun className="w-full h-full text-yellow-400" />;
  if (symbolCode.includes('fair') || symbolCode.includes('partlycloudy')) return <Cloud className="w-full h-full text-gray-300" />;
  if (symbolCode.includes('cloudy')) return <Cloud className="w-full h-full text-gray-400" />;
  if (symbolCode.includes('rain')) return <CloudRain className="w-full h-full text-blue-400" />;
  if (symbolCode.includes('snow')) return <CloudSnow className="w-full h-full text-white" />;
  if (symbolCode.includes('lightning')) return <CloudLightning className="w-full h-full text-purple-400" />;
  return <Cloud className="w-full h-full text-gray-300" />;
};

const CyclingWeatherWidget = ({ state }: { state: OverlayState }) => {
  const [mapData, setMapData] = useState<MapWeatherData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMapData = async () => {
    try {
      const res = await axios.get('/api/weather/map');
      setMapData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const fetchInterval = setInterval(fetchMapData, 300000); // 5 mins
    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    if (mapData.length === 0) return;
    const cycleInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mapData.length);
    }, 5000); // 5 seconds cycle
    return () => clearInterval(cycleInterval);
  }, [mapData]);

  if (loading || mapData.length === 0) return null;

  const currentLoc = mapData[currentIndex];
  const details = currentLoc.data?.properties?.timeseries?.[0]?.data?.instant?.details;
  const getSymbol = (data: any) => 
    data.next_1_hours?.summary?.symbol_code || 
    data.next_6_hours?.summary?.symbol_code || 
    data.next_12_hours?.summary?.symbol_code || 
    '';
  const symbol = currentLoc.data?.properties?.timeseries?.[0]?.data ? getSymbol(currentLoc.data.properties.timeseries[0].data) : '';

  return (
    <motion.div
      key={currentLoc.name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute bottom-12 left-12 bg-black/60 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] flex items-center gap-10 shadow-2xl min-w-[400px]"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-24 h-24">
          {symbol && getWeatherIcon(symbol)}
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-blue-400">{currentLoc.name}</p>
      </div>
      
      <div className="flex gap-12">
        {state.showTemp && details && (
          <div>
            <p className="text-6xl font-black tracking-tighter">{details.air_temperature}°</p>
            <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Temperatur</p>
          </div>
        )}
        {state.showWind && details && (
          <div className="flex gap-6">
            <div>
              <p className="text-6xl font-black tracking-tighter">{details.wind_speed}</p>
              <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Vind m/s</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div 
                className="w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center"
                style={{ transform: `rotate(${details.wind_from_direction + 180}deg)` }}
              >
                <ArrowUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SunnmoreMap = ({ state }: { state?: OverlayState }) => {
  const [mapData, setMapData] = useState<MapWeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMapData = async () => {
    try {
      const res = await axios.get('/api/weather/map');
      setMapData(res.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Kunne ikke hente kartdata');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const createCustomIcon = (loc: MapWeatherData) => {
    const current = loc.data?.properties?.timeseries?.[0]?.data?.instant?.details;
    const getSymbol = (data: any) => 
      data.next_1_hours?.summary?.symbol_code || 
      data.next_6_hours?.summary?.symbol_code || 
      data.next_12_hours?.summary?.symbol_code || 
      '';
    const symbol = loc.data?.properties?.timeseries?.[0]?.data ? getSymbol(loc.data.properties.timeseries[0].data) : '';
    
    if (!current || !symbol) return L.divIcon({ className: 'hidden' });

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="bg-white/20 hover:bg-white/30 border border-white/30 p-2 md:p-3 rounded-lg md:rounded-xl backdrop-blur-xl transition-all cursor-default shadow-2xl inline-flex flex-col items-center justify-center min-w-[100px]">
          <div class="flex items-center gap-2 md:gap-3">
            <div class="w-7 h-7 md:w-11 md:h-11 shrink-0">
              <img src="https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${symbol}.svg" class="w-full h-full drop-shadow-lg" />
            </div>
            <div class="flex flex-col">
              <h4 class="text-[10px] md:text-sm font-black leading-tight text-blue-900 whitespace-nowrap">${loc.name}</h4>
              <div class="flex items-baseline gap-2">
                <p class="text-sm md:text-xl font-black text-blue-600">${current.air_temperature}°</p>
                ${state?.showWind ? `<p class="text-[7px] md:text-[10px] font-bold text-blue-900/60 whitespace-nowrap">${current.wind_speed} m/s</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      `,
      iconSize: [115, 72],
      iconAnchor: [57, 36],
    });
  };

  if (loading) return (
    <div className="relative w-[96vw] max-w-[1840px] h-[94vh] max-h-[1000px] bg-sky-200/90 backdrop-blur-md border border-blue-300/50 rounded-[3rem] p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col items-center justify-center gap-4">
      <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
      <p className="text-xl font-black uppercase tracking-widest text-blue-900/40">Henter værdata for Sunnmøre...</p>
    </div>
  );

  if (error) return (
    <div className="relative w-[96vw] max-w-[1840px] h-[94vh] max-h-[1000px] bg-sky-200/90 backdrop-blur-md border border-blue-300/50 rounded-[3rem] p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
        <Settings className="w-8 h-8" />
      </div>
      <p className="text-xl font-black uppercase tracking-widest text-red-400">{error}</p>
      <button onClick={fetchMapData} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all">Prøv igjen</button>
    </div>
  );

  return (
    <div className="relative w-[96vw] max-w-[1840px] h-[94vh] max-h-[1000px] bg-sky-200/90 backdrop-blur-md border border-blue-300/50 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
      <div className="absolute top-8 left-8 z-[1000] pointer-events-none">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none text-blue-900">Sunnmøre</h2>
        <p className="text-blue-600 font-bold tracking-widest uppercase text-[10px] md:text-sm mt-2">Væroversikt Sunnmøre</p>
        
        <div className="mt-4 bg-blue-900/10 px-4 py-2 rounded-xl border border-blue-900/10 backdrop-blur-md inline-block">
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-900/40">Sist oppdatert</p>
          <p className="font-mono text-sm md:text-lg text-blue-900">{new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <MapContainer 
        center={[62.4, 6.3]} 
        zoom={9} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {(() => {
          const tileConfig = TILE_PROVIDERS[state?.mapTileProvider || 'esri'] || TILE_PROVIDERS.esri;
          return (
            <TileLayer
              key={state?.mapTileProvider || 'esri'}
              url={tileConfig.url}
              attribution={tileConfig.attribution}
              maxZoom={tileConfig.maxZoom}
            />
          );
        })()}
        {mapData.map((loc) => (
          <Marker 
            key={loc.name} 
            position={[loc.lat, loc.lon]} 
            icon={createCustomIcon(loc)}
          />
        ))}
      </MapContainer>
    </div>
  );
};

const SunnmoreMapCombined = ({ state }: { state?: OverlayState }) => {
  const [mapData, setMapData] = useState<MapWeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMapData = async () => {
    try {
      const res = await axios.get('/api/weather/map');
      // Filter out Molde from this specific graphic choice
      const filteredData = res.data.filter((loc: any) => loc.name !== "Molde");
      setMapData(filteredData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 300000);
    return () => clearInterval(interval);
  }, []);

  const createCustomIcon = (loc: MapWeatherData) => {
    const current = loc.data?.properties?.timeseries?.[0]?.data?.instant?.details;
    const getSymbol = (data: any) => 
      data.next_1_hours?.summary?.symbol_code || 
      data.next_6_hours?.summary?.symbol_code || 
      data.next_12_hours?.summary?.symbol_code || 
      '';
    const symbol = loc.data?.properties?.timeseries?.[0]?.data ? getSymbol(loc.data.properties.timeseries[0].data) : '';
    
    if (!current || !symbol) return L.divIcon({ className: 'hidden' });

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="bg-white/20 border border-white/30 p-2 rounded-lg backdrop-blur-xl shadow-2xl inline-flex flex-col items-center justify-center min-w-[80px]">
          <div class="flex items-center gap-1.5">
            <div class="w-6 h-6 shrink-0">
              <img src="https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${symbol}.svg" class="w-full h-full drop-shadow-lg" />
            </div>
            <div class="flex flex-col">
              <h4 class="text-[8px] font-black leading-tight text-blue-900 whitespace-nowrap">${loc.name}</h4>
              <p class="text-xs font-black text-blue-600">${current.air_temperature}°</p>
            </div>
          </div>
        </div>
      `,
      iconSize: [80, 50],
      iconAnchor: [40, 25],
    });
  };

  if (loading) return (
    <div className="relative w-[96vw] max-w-[1840px] h-[94vh] max-h-[1000px] bg-sky-200/90 backdrop-blur-md border border-blue-300/50 rounded-[3rem] p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col items-center justify-center">
      <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="relative w-[96vw] max-w-[1840px] h-[94vh] max-h-[1000px] bg-sky-200/90 backdrop-blur-md border border-blue-300/50 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="absolute top-8 left-8 z-[1000] pointer-events-none">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none text-blue-900">Sunnmøre</h2>
        <p className="text-blue-600 font-bold tracking-widest uppercase text-[10px] md:text-sm mt-2">Kombinert oversikt</p>
        
        <div className="mt-4 bg-blue-900/10 px-4 py-2 rounded-xl border border-blue-900/10 backdrop-blur-md inline-block">
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-900/40">Sist oppdatert</p>
          <p className="font-mono text-sm md:text-lg text-blue-900">{new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* 3-Day List Box */}
        <div className="mt-6 bg-white/30 backdrop-blur-2xl border border-white/40 rounded-3xl p-4 shadow-2xl w-[260px] pointer-events-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-blue-900/60 mb-3 flex items-center gap-2">
            <Cloud className="w-3 h-3" /> 3-døgns varsel
          </h3>
          <div className="space-y-4">
            {mapData.map((loc) => {
              const d1 = loc.data?.properties?.timeseries?.[24]?.data;
              const d2 = loc.data?.properties?.timeseries?.[48]?.data;
              const d3 = loc.data?.properties?.timeseries?.[72]?.data;
              if (!d1 || !d2 || !d3) return null;

              const getSymbol = (data: any) => 
                data.next_1_hours?.summary?.symbol_code || 
                data.next_6_hours?.summary?.symbol_code || 
                data.next_12_hours?.summary?.symbol_code || 
                '';

              return (
                <div key={loc.name} className="flex items-center justify-between bg-blue-900/5 p-1.5 rounded-lg border border-blue-900/5">
                  <span className="text-[10px] font-black text-blue-900 w-14 truncate">{loc.name}</span>
                  <div className="flex gap-1">
                    {[d1, d2, d3].map((day, i) => (
                      <div key={i} className="flex flex-col items-center w-8">
                        <span className="text-[5px] font-bold uppercase text-blue-900/40">{i === 0 ? 'Imorg' : `D${i+1}`}</span>
                        <img 
                          src={`https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${getSymbol(day)}.svg`} 
                          className="w-4 h-4 drop-shadow-sm" 
                        />
                        <span className="text-[8px] font-black text-blue-600">{day.instant.details.air_temperature}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <MapContainer 
        center={[62.4, 6.3]} 
        zoom={9} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {(() => {
          const tileConfig = TILE_PROVIDERS[state?.mapTileProvider || 'esri'] || TILE_PROVIDERS.esri;
          return (
            <TileLayer
              key={state?.mapTileProvider || 'esri'}
              url={tileConfig.url}
              attribution={tileConfig.attribution}
              maxZoom={tileConfig.maxZoom}
            />
          );
        })()}
        {mapData.map((loc) => (
          <Marker 
            key={loc.name} 
            position={[loc.lat, loc.lon]} 
            icon={createCustomIcon(loc)}
          />
        ))}
      </MapContainer>
    </div>
  );
};

// --- Components ---

const Controller = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<OverlayState>({
    activeGraphic: 'none',
    showWeather: true,
    showWind: true,
    showTemp: true,
    showBackground: false,
    showWidget: false,
    showSmpLogo: false,
    mapTileProvider: 'esri',
    superName: 'Navn',
    superTitle: 'Tittel',
  });
  const [loading, setLoading] = useState(true);
  
  // Modal state for "Super"
  const [isSuperModalOpen, setIsSuperModalOpen] = useState(false);
  const [tempSuperName, setTempSuperName] = useState('Navn');
  const [tempSuperTitle, setTempSuperTitle] = useState('Tittel');
  const [copied, setCopied] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/overlay`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchWeather = async () => {
    try {
      const res = await axios.get('/api/weather');
      setWeather(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchState = async () => {
    try {
      const res = await axios.get('/api/overlay/state');
      setState(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateState = async (newState: Partial<OverlayState>) => {
    try {
      const res = await axios.post('/api/overlay/state', newState);
      setState(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWeather();
    fetchState();
    setLoading(false);
    const interval = setInterval(fetchWeather, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const current = weather?.properties.timeseries[0].data.instant.details;
  const getSymbol = (data: any) => 
    data.next_1_hours?.summary?.symbol_code || 
    data.next_6_hours?.summary?.symbol_code || 
    data.next_12_hours?.summary?.symbol_code || 
    '';
  const symbol = weather?.properties.timeseries[0].data ? getSymbol(weather.properties.timeseries[0].data) : '';

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 font-sans">
      <header className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 mb-12">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">SMP Grafikk-kontroll</h1>
            <p className="text-[10px] md:text-xs font-medium text-blue-400 uppercase tracking-widest">Sunnmøre / Ålesund</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end items-center">
          <a 
            href="/api/download-zip" 
            download="smp-vaergrafikk-kildekode.zip"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs md:text-sm font-bold transition-all shadow-sm"
            title="Last ned hele kildekoden som en ferdig ZIP-fil"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Last ned kode (ZIP)</span>
          </a>
          <Link 
            to="/overlay" 
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs md:text-sm font-semibold transition-all border border-white/10"
          >
            <ExternalLink className="w-4 h-4" /> Åpne Overlay
          </Link>
          <button 
            onClick={fetchWeather}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/10"
            title="Oppdater værdata"
          >
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-8">
          {/* Weather Status Card */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Sun className="w-4 h-4" /> Sanntidsdata
            </h2>
            {current ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16">
                    {symbol && getWeatherIcon(symbol)}
                  </div>
                  <div>
                    <p className="text-4xl font-black">{current.air_temperature}°C</p>
                    <p className="text-xs text-white/40 uppercase font-bold">Temperatur</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 flex items-center justify-center text-blue-400">
                    <Wind className="w-12 h-12" />
                  </div>
                  <div>
                    <p className="text-4xl font-black">{current.wind_speed} <span className="text-lg">m/s</span></p>
                    <p className="text-xs text-white/40 uppercase font-bold">Vindstyrke</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 flex items-center justify-center text-emerald-400">
                    <div 
                      className="w-12 h-12 border-4 border-current rounded-full flex items-center justify-center"
                      style={{ transform: `rotate(${current.wind_from_direction}deg)` }}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-4xl font-black">{current.wind_from_direction}°</p>
                    <p className="text-xs text-white/40 uppercase font-bold">Vindretning</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-white/20 italic">Laster værdata...</div>
            )}
          </section>

          {/* Graphic Controls */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6">Grafikkvalg</h3>
              <div className="space-y-3">
                {[
                  { id: 'none', label: 'Ingen grafikk', icon: <Monitor className="w-5 h-5" /> },
                  { id: 'weather-widget', label: 'Vær-widget (Fast)', icon: <Sun className="w-5 h-5" /> },
                  { id: 'cycling-widget', label: 'By-veksler (Widget)', icon: <RefreshCw className="w-5 h-5" /> },
                  { id: 'sunnmore-map', label: 'Sunnmøre Kart', icon: <MapIcon className="w-5 h-5" /> },
                  { id: 'sunnmore-combined', label: 'Kart + 3-døgns liste', icon: <RefreshCw className="w-5 h-5" /> },
                  { id: 'super', label: 'Super (Navneskilt)', icon: <ImageIcon className="w-5 h-5" /> },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => updateState({ activeGraphic: g.id })}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${
                      state.activeGraphic === g.id 
                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {g.icon}
                      <span className="font-bold">{g.label}</span>
                    </div>
                    {state.activeGraphic === g.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>
                ))}

                {/* Uavhengig lag: SMP-logo bug */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Uavhengig lag (Bug)</span>
                    <span className="text-[10px] text-white/40">Oppe til høyre</span>
                  </div>
                  <button
                    onClick={() => updateState({ showSmpLogo: !state.showSmpLogo })}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${
                      state.showSmpLogo 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 shadow-lg shadow-blue-500/20 text-white' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs ${
                        state.showSmpLogo ? 'bg-white text-blue-700 border-white shadow-md' : 'bg-white/10 border-white/20 text-white'
                      }`}>
                        S
                      </div>
                      <div className="text-left">
                        <span className="font-bold block text-sm">SMP-logo</span>
                        <span className="text-[10px] opacity-70 block">
                          {state.showSmpLogo ? 'Aktiv på overlay (PÅ)' : 'Skjult (AV)'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md transition-colors ${
                        state.showSmpLogo ? 'bg-white/25 text-white' : 'bg-white/5 text-white/40'
                      }`}>
                        {state.showSmpLogo ? 'PÅ' : 'AV'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6">Innstillinger</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-[10px] font-black text-blue-300">
                      S
                    </div>
                    <div>
                      <span className="font-bold block">SMP-logo</span>
                      <span className="text-[10px] text-white/40 block">Hjørnelogo øverst til høyre</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => updateState({ showSmpLogo: !state.showSmpLogo })}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.showSmpLogo ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.showSmpLogo ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Thermometer className="w-5 h-5 text-red-400" />
                    <span className="font-bold">Vis Temperatur</span>
                  </div>
                  <button 
                    onClick={() => updateState({ showTemp: !state.showTemp })}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.showTemp ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.showTemp ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wind className="w-5 h-5 text-blue-400" />
                    <span className="font-bold">Vis Vind</span>
                  </div>
                  <button 
                    onClick={() => updateState({ showWind: !state.showWind })}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.showWind ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.showWind ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    <span className="font-bold">Mørk Bakgrunn</span>
                  </div>
                  <button 
                    onClick={() => updateState({ showBackground: !state.showBackground })}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.showBackground ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.showBackground ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold">Vær-widget (Vekslende)</span>
                  </div>
                  <button 
                    onClick={() => updateState({ showWidget: !state.showWidget })}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.showWidget ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.showWidget ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {/* Kartlag / Bakgrunn uten vannmerker */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="font-bold text-xs block">Kartstil (uten vannmerker)</span>
                      <span className="text-[10px] text-white/40 block">Vennlig for TV-sending</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { id: 'esri', label: 'Esri Grå (Anbefalt)' },
                      { id: 'kartverket', label: 'Kartverket Grå' },
                      { id: 'osm', label: 'OpenStreetMap' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateState({ mapTileProvider: item.id as any })}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border ${
                          (state.mapTileProvider || 'esri') === item.id
                            ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valgfritt: Bytt/last opp egendefinert bildefil for logo */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <label className="text-xs text-white/60 hover:text-white cursor-pointer flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Last opp logo-bilde...</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) {
                              updateState({ smpLogoUrl: reader.result as string, showSmpLogo: true });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {state.smpLogoUrl && state.smpLogoUrl !== '/smp-logo.png' && (
                    <button 
                      onClick={() => updateState({ smpLogoUrl: '/smp-logo.png' })}
                      className="text-[10px] text-white/40 hover:text-white/80 underline"
                    >
                      Bruk standard
                    </button>
                  )}
                </div>
                
                {/* Super Settings - Always visible for preparation */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Gjeldende Super-tekst</p>
                    <div className="space-y-1">
                      <p className="text-sm font-bold truncate">{state.superName || 'Navn'}</p>
                      <p className="text-[10px] text-white/40 truncate uppercase tracking-wider">{state.superTitle || 'Tittel'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setTempSuperName(state.superName || 'Navn');
                      setTempSuperTitle(state.superTitle || 'Tittel');
                      setIsSuperModalOpen(true);
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Settings className="w-4 h-4" /> Endre Super-tekst
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal for Super Graphic */}
        <AnimatePresence>
          {isSuperModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSuperModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#1E293B] border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  Rediger Super
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase text-white/40 mb-2 tracking-widest">Navn</label>
                    <input 
                      type="text" 
                      value={tempSuperName}
                      onChange={(e) => setTempSuperName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-lg font-bold focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Skriv navn..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-white/40 mb-2 tracking-widest">Tittel</label>
                    <input 
                      type="text" 
                      value={tempSuperTitle}
                      onChange={(e) => setTempSuperTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-lg font-bold focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="Skriv tittel..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-10">
                  <button 
                    onClick={() => setIsSuperModalOpen(false)}
                    className="py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all border border-white/10"
                  >
                    Avbryt
                  </button>
                  <button 
                    onClick={() => {
                      updateState({ 
                        superName: tempSuperName, 
                        superTitle: tempSuperTitle 
                      });
                      setIsSuperModalOpen(false);
                    }}
                    className="py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    Lagre (OK)
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isDeployGuideOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeployGuideOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#1E293B] border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">Hvorfor ber Schibsted Stream om Google-login?</h3>
                      <p className="text-xs text-white/50">Forklaring og løsning for offentlig HTML5-overlay</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDeployGuideOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6 text-sm text-white/80">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <h4 className="font-bold text-amber-300 mb-1 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Hvorfor skjer dette selv om du er innlogget?
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Lenken du ser i kontrollpanelet nå (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">ais-pre-...run.app</code>) er Google AI Studio sitt interne testmiljø. 
                      I din egen nettleser er du innlogget med din personlige Google-konto. 
                      Når <strong>Schibsted Stream CDN</strong> (eller en annen ekstern skymikser) forsøker å hente siden, er det Schibsteds automatiserte server som henter den – og den har ikke dine Google-cookies. Google krever derfor innlogging.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-white uppercase text-xs tracking-wider">Slik løser du det permanent for Schibsted Stream:</h4>

                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 font-bold text-white">
                          <Download className="w-5 h-5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300 font-bold">Finner du ikke «Export to GitHub» under Share?</span>
                        </div>
                        <a
                          href="/api/download-zip"
                          download="smp-vaergrafikk-kildekode.zip"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Last ned kildekode (.ZIP)
                        </a>
                      </div>
                      <div className="text-xs text-white/80 space-y-2 leading-relaxed">
                        <p>
                          <strong>Hvorfor finnes ikke GitHub under «Share»?</strong><br />
                          I Google AI Studio brukes <em>Share</em> kun til å dele forhåndsvisningslenken med andre Google-brukere. Det eksporterer ikke filer.
                        </p>
                        <p>
                          <strong>Løsning for å få koden:</strong>
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-white/70">
                          <li>
                            <strong>Last ned ZIP direkte (anbefalt):</strong> Trykk på den grønne knappen over! Da får du hele prosjektet pakket ned med <code>Dockerfile</code>, <code>render.yaml</code>, <code>server.ts</code> og alle filer.
                          </li>
                          <li>
                            <strong>I Google AI Studio:</strong> Koden eksporteres via kode-ikonet (<strong>&lt;/&gt;</strong>) eller menyen med tre prikker (<strong>⋮</strong>) helt øverst i verktøylinjen ved prosjektnavnet – ikke inne i «Share».
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Server className="w-4 h-4 text-blue-400" />
                        <span>Alternativ 1: Schibsteds / SMPs egne servere (Anbefalt)</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        Prosjektet har nå en fiks ferdig produksjonsklar <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">Dockerfile</code> og Node.js-server.
                        Teknisk avdeling eller IT i Sunnmørsposten/Schibsted kan rulle ut containeren direkte på Schibsteds infrastruktur (f.eks. på et eget subdomene som <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">grafikk.smp.no</code>).
                        Da har den en 100% åpen URL uten Google-hindring.
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <span>Alternativ 2: Rask sky-hosting (Google Cloud Run / Render / Railway)</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        Du eller IT kan deploye koden med 1 klikk til <strong>Google Cloud Run</strong> (med offentlig tilgang uten IAP), <strong>Render.com</strong>, eller <strong>Railway</strong>.
                        Kommando for å starte er <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-300">npm run build && npm start</code>.
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Monitor className="w-4 h-4 text-indigo-400" />
                        <span>Alternativ 3: OBS Studio på lokal maskin (for direktesending)</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        Hvis dere streamer via OBS Studio installert på samme maskin som du er innlogget på:
                        Legg til en <em>Browser Source</em> med overlay-URL-en, høyreklikk kilden og velg <strong>«Interact» (Samhandle)</strong>. 
                        Logg inn med Google-kontoen din i OBS-vinduet én gang. OBS vil huske innloggingen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                  <button 
                    onClick={() => setIsDeployGuideOpen(false)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-xs"
                  >
                    Forstått, lukk
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Sidebar / Info */}
        <aside className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Forhåndsvisning (Overlay)</h3>
            <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative group">
               {state.activeGraphic === 'sunnmore-map' || state.activeGraphic === 'sunnmore-combined' ? (
                 <div className="w-full h-full scale-[0.3] origin-top-left" style={{ width: '333%', height: '333%' }}>
                   {state.activeGraphic === 'sunnmore-map' ? <SunnmoreMap state={state} /> : <SunnmoreMapCombined state={state} />}
                 </div>
               ) : (
                 <iframe src="/overlay" className="w-full h-full border-none scale-[0.25] origin-top-left" style={{ width: '400%', height: '400%' }} />
               )}
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                 <p className="text-[10px] font-bold uppercase tracking-widest">Live Forhåndsvisning</p>
               </div>
            </div>
            <p className="text-[10px] text-white/20 mt-4 italic">Dette er hva som sendes til OBS. Bruk URL-en /overlay i din nettleserkilde.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 shadow-xl shadow-blue-500/20">
            <h3 className="text-lg font-black mb-1">Overlay-link</h3>
            <p className="text-xs text-white/80 mb-4">Bruk denne linken i OBS Studio, Schibsted Stream CDN eller andre HTML5-grafikkmotorer.</p>
            
            <div className="bg-black/30 rounded-xl p-3 font-mono text-xs break-all border border-white/10 mb-4 select-all">
              {window.location.origin}/overlay
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-blue-900 font-bold rounded-xl text-xs hover:bg-white/90 transition-all shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Kopier overlay-lenke
                  </>
                )}
              </button>

              <Link
                to="/overlay"
                target="_blank"
                className="flex items-center justify-center p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs transition-all border border-white/10"
                title="Åpne fullskjerm overlay i ny fane"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-1 text-[11px] text-white/70">
              <p className="flex items-center gap-1.5 font-medium text-white/90">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Klar for direkte innbygging
              </p>
              <p>• 100% gjennomsiktig bakgrunn (alpha channel)</p>
              <p>• Anbefalt kildestørrelse: 1920 × 1080 px</p>
              <p>• CSP &amp; CORS er åpnet for eksterne iFrames/nettleserkilder</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
              <button
                onClick={() => setIsDeployGuideOpen(true)}
                className="w-full flex items-center justify-between gap-2 p-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all text-left"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Schibsted Stream viser Google-login?</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
              </button>

              <a
                href="/api/download-zip"
                download="smp-vaergrafikk-kildekode.zip"
                className="w-full flex items-center justify-between gap-2 p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all text-left"
                title="Last ned hele kildekoden som en ZIP-fil for utrulling"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Last ned prosjektkode (.ZIP)</span>
                </span>
                <span className="text-[10px] bg-emerald-600/50 px-2 py-0.5 rounded text-white font-bold uppercase">ZIP</span>
              </a>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Om appen</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Denne appen henter værdata fra MET.no for Sunnmøre-området. Du kan styre innholdet i sanntid for bruk som grafikk-overlay.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

const Overlay = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<OverlayState | null>(null);

  const [debug, setDebug] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch state independently so weather failures don't block the graphic
      const stateRes = await axios.get('/api/overlay/state');
      setState(stateRes.data);
    } catch (err) {
      console.error('Error fetching overlay state:', err);
    }

    try {
      const weatherRes = await axios.get('/api/weather');
      setWeather(weatherRes.data);
    } catch (err) {
      console.error('Error fetching general weather:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Poll every 2s for state changes
    
    // Toggle debug with 'd' key
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'd') setDebug(prev => !prev);
    };
    window.addEventListener('keydown', handleKey);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (!state) return (
    <div className="h-screen w-screen bg-transparent flex items-center justify-center text-white/20 font-sans italic">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p>Kobler til kontrollpanel...</p>
      </div>
    </div>
  );

  const current = weather?.properties.timeseries[0].data.instant.details;
  const getSymbol = (data: any) => 
    data.next_1_hours?.summary?.symbol_code || 
    data.next_6_hours?.summary?.symbol_code || 
    data.next_12_hours?.summary?.symbol_code || 
    '';
  const symbol = weather?.properties.timeseries[0].data ? getSymbol(weather.properties.timeseries[0].data) : '';

  return (
    <div className={`h-screen w-screen overflow-hidden relative font-sans text-white transition-colors duration-500 ${state.showBackground ? 'bg-slate-950' : 'bg-transparent'}`}>
        {debug && (
          <div className="absolute top-4 left-4 bg-black/80 p-4 rounded-xl border border-white/20 text-[10px] font-mono z-[10000]">
            <p>Active: {state.activeGraphic}</p>
            <p>Weather: {weather ? 'Loaded' : 'Missing'}</p>
            <p>URL: {window.location.href}</p>
          </div>
        )}
      <AnimatePresence mode="wait">
        {state.activeGraphic === 'weather-widget' && (
          <motion.div
            key="weather-widget"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="absolute bottom-12 left-12 bg-black/60 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] flex items-center gap-10 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24">
                {symbol && getWeatherIcon(symbol)}
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-400">Ålesund</p>
            </div>
            
            <div className="flex gap-12">
              {state.showTemp && current && (
                <div>
                  <p className="text-6xl font-black tracking-tighter">{current.air_temperature}°</p>
                  <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Temperatur</p>
                </div>
              )}
              {state.showWind && current && (
                <div className="flex gap-6">
                  <div>
                    <p className="text-6xl font-black tracking-tighter">{current.wind_speed}</p>
                    <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Vind m/s</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div 
                      className="w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center"
                      style={{ transform: `rotate(${current.wind_from_direction + 180}deg)` }}
                    >
                      <ArrowUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(state.activeGraphic === 'cycling-widget' || (state.showWidget && state.activeGraphic === 'none')) && (
          <CyclingWeatherWidget state={state} />
        )}

        {state.activeGraphic === 'sunnmore-map' && (
          <motion.div
            key="sunnmore-map"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SunnmoreMap state={state} />
          </motion.div>
        )}

        {state.activeGraphic === 'sunnmore-combined' && (
          <motion.div
            key="sunnmore-combined"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SunnmoreMapCombined state={state} />
          </motion.div>
        )}

        {state.activeGraphic === 'super' && (
          <motion.div
            key="super"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute bottom-12 left-12 flex flex-col items-start z-[9999]"
          >
            {/* Name Part (Blue) */}
            <div className="bg-blue-600 px-8 py-3 shadow-2xl border-l-8 border-white">
              <h2 className="text-4xl font-black tracking-tight uppercase italic text-white drop-shadow-md">
                {state.superName || 'Navn'}
              </h2>
            </div>
            {/* Title Part (White) */}
            <div className="bg-white px-8 py-2 shadow-2xl min-w-[300px]">
              <p className="text-xl font-bold uppercase tracking-widest text-blue-900">
                {state.superTitle || 'Tittel'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uavhengig grafisk element (Bug): SMP-logo øverst til høyre */}
      <AnimatePresence>
        {state.showSmpLogo && (
          <motion.div
            key="smp-logo-bug"
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute top-8 right-8 z-[9999] pointer-events-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] flex items-center justify-center"
          >
            <img 
              src={state.smpLogoUrl || "/smp-logo.png"} 
              alt="SMP-logo" 
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-contain drop-shadow-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Controller />} />
        <Route path="/overlay" element={<Overlay />} />
      </Routes>
    </Router>
  );
}
