import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import RideTracker from './RideTracker';
import { getCachedRoute, setCachedRoute } from './routeCache';
import GeocodeInput from './GeocodeInput';
import MusicApp from './MusicApp';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SunIcon, MoonIcon, MenuIcon, XIcon } from '@heroicons/react/solid';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to recenter the map when user location changes
function LocationMarker({ onLocation }) {
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [errorLogged, setErrorLogged] = useState(false);
  const map = useMap();
  const lastPositionRef = useRef(null);

  useEffect(() => {
    const updatePosition = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const newPos = [latitude, longitude];
            setPosition(newPos);
            setLocationError(null);
            setErrorLogged(false);
            if (onLocation) onLocation(newPos);
            if (
              map &&
              (!lastPositionRef.current ||
                lastPositionRef.current[0] !== latitude ||
                lastPositionRef.current[1] !== longitude)
            ) {
              map.flyTo(newPos, map.getZoom());
              lastPositionRef.current = newPos;
            }
          },
          (error) => {
            if (!errorLogged) {
              console.error('Error getting location:', error);
              setErrorLogged(true);
            }
            setLocationError('Location access denied. Using default Hanoi position.');
            if (onLocation) onLocation([21.0285, 105.8542]);
            setPosition([21.0285, 105.8542]);
          }
        );
      } else {
        setLocationError('Geolocation is not supported by your browser');
      }
    };
    updatePosition();
    const intervalId = setInterval(updatePosition, 10000);
    return () => clearInterval(intervalId);
  }, [map, onLocation, errorLogged]);

  return position ? (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  ) : locationError ? (
    <Popup position={[21.0285, 105.8542]} isOpen>
      {locationError}
    </Popup>
  ) : null;
}


function DestinationMarker({ destination, onGetDirections, showPopup, distance, duration, directionsError }) {
  const markerRef = useRef();
  useEffect(() => {
    if (showPopup && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [showPopup, destination]);
  return destination ? (
    <Marker position={destination} ref={markerRef} icon={L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })}>
      <Popup>
        <div className="flex flex-col gap-2">
          <span>Destination</span>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
            onClick={onGetDirections}
          >
            Get Directions
          </button>
          {directionsError && <span className="text-xs text-red-500">{directionsError}</span>}
          {(distance !== null && duration !== null) && (
            <div className="mt-2">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">Distance: {(distance/1000).toFixed(2)} km</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">Estimated time: {Math.floor(duration/60)} min {Math.round(duration%60)} sec</div>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  ) : null;
}

function DirectionsPolyline({ route }) {
  return route && route.length > 0 ? (
    <Polyline positions={route} color="blue" weight={4} />
  ) : null;
}

function MapClickHandler({ onClick }) {
  useMapEvent('click', (e) => {
    onClick([e.latlng.lat, e.latlng.lng]);
  });
  return null;
}

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userPosition, setUserPosition] = useState([21.0285, 105.8542]);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState([]);
  const [directionsError, setDirectionsError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  const [destinationPopup, setDestinationPopup] = useState(false);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [lastRouteKey, setLastRouteKey] = useState("");
  const [musicOpen, setMusicOpen] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [rideStats, setRideStats] = useState({ positions: [], distance: 0, duration: 0, speed: 0 });
  const [demoMode, setDemoMode] = useState(false);
  const [rideHistory, setRideHistory] = useState(() => {
    const stored = localStorage.getItem('rideHistory');
    return stored ? JSON.parse(stored) : [];
  });
  const mapRef = useRef();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // When user location updates, update state
  const handleLocation = (pos) => {
    setUserPosition(pos);
  };

  // Handle geocode selection
  const handleGeocodeSelect = ({ lat, lng, label }) => {
    setDestination([lat, lng]);
    setDirectionsError(null);
    setDistance(null);
    setDuration(null);
    setRoute([]);
    setDestinationPopup(true);
  };


  // Fetch directions from OSRM or Mapbox, with caching and loading
  const fetchDirections = async () => {
    if (!userPosition || !destination) return;
    const from = `${userPosition[0]},${userPosition[1]}`;
    const to = `${destination[0]},${destination[1]}`;
    const routeKey = `${from}|${to}`;
    if (routeKey === lastRouteKey && distance !== null && duration !== null && route.length) {
      // Already fetched this route, do nothing
      setDestinationPopup(true);
      return;
    }
    setDirectionsError(null);
    setRoute([]);
    setDistance(null);
    setDuration(null);
    setLoadingDirections(true);
    setLastRouteKey(routeKey);
    // Check cache
    const cached = getCachedRoute(routeKey);
    if (cached) {
      setRoute(cached.route);
      setDistance(cached.distance);
      setDuration(cached.duration);
      setLoadingDirections(false);
      setDestinationPopup(true);
      return;
    }
    try {
      let coords, dist, dur;
      let data;
      // Prefer Mapbox if token is set
      const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
      if (MAPBOX_TOKEN) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userPosition[1]},${userPosition[0]};${destination[1]},${destination[0]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(url);
        data = await response.json();
        if (data.routes && data.routes.length > 0) {
          coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          dist = data.routes[0].distance;
          dur = data.routes[0].duration;
        } else {
          throw new Error('No route found.');
        }
      } else {
        // Fallback to OSRM
        const url = `https://router.project-osrm.org/route/v1/foot/${userPosition[1]},${userPosition[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        data = await response.json();
        if (data.routes && data.routes.length > 0) {
          coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          dist = data.routes[0].distance;
          dur = data.routes[0].duration;
        } else {
          throw new Error('No route found.');
        }
      }
      setRoute(coords);
      setDistance(dist);
      setDuration(dur);
      setCachedRoute(routeKey, { route: coords, distance: dist, duration: dur });
    } catch (err) {
      setDirectionsError('Failed to fetch directions.');
    } finally {
      setLoadingDirections(false);
      setDestinationPopup(true);
    }
  };

  // Handle map click to set destination
  const handleMapClick = (latlng) => {
    setDestination(latlng);
    setDirectionsError(null);
    setDistance(null);
    setDuration(null);
    setRoute([]);
    setDestinationPopup(true);
  };

  // Handle finish ride
  const handleFinishRide = (ride) => {
    setTracking(false);
    const newRide = {
      ...ride,
      date: new Date().toISOString(),
    };
    const updatedHistory = [newRide, ...rideHistory];
    setRideHistory(updatedHistory);
    localStorage.setItem('rideHistory', JSON.stringify(updatedHistory));
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Ride Tracking Controls */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1100] flex gap-3 items-center">
        <button
          className={`px-6 py-2 rounded-lg shadow-md font-bold text-lg ${tracking ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
          onClick={() => setTracking((t) => !t)}
        >
          {tracking ? 'Stop Ride' : 'Start Ride'}
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-bold text-sm ${demoMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setDemoMode((d) => !d)}
        >
          {demoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF'}
        </button>
      </div>
      {/* Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute top-24 left-4 z-[1000] bg-white dark:bg-gray-800 p-2 rounded-md shadow-md"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        </button>
      )}
      {/* Music App Open Button */}
      <button
        onClick={() => setMusicOpen(true)}
        className="absolute top-4 right-4 z-[1000] bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md"
        aria-label="Open music app"
      >
        {/* Music Note Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </button>
      <MusicApp open={musicOpen} onClose={() => setMusicOpen(false)} />

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          transform transition-transform duration-300 ease-in-out
          fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-lg z-[999]
          flex flex-col p-4`}
      >
        {/* Close Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-4 z-[1001] bg-gray-200 dark:bg-gray-700 p-2 rounded-full shadow-md"
          aria-label="Close sidebar"
        >
          <XIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">GPS Map App</h1>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2 items-center">
            <button onClick={toggleDarkMode} className="p-1 rounded-full bg-gray-200 dark:bg-gray-700">
              {darkMode ? (
                <SunIcon className="h-5 w-5 text-yellow-500" />
              ) : (
                <MoonIcon className="h-5 w-5 text-gray-800" />
              )}
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-200">{darkMode ? 'Dark' : 'Light'} Mode</span>
          </div>
        </div>

        {/* Destination Search Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Destination Search</label>
          <GeocodeInput onSelect={handleGeocodeSelect} placeholder="Search for a place or address..." />
        </div>

        {/* Directions */}
        <div className="mb-4">
          <button
            className="w-full bg-green-500 hover:bg-green-600 text-white py-1 rounded"
            onClick={fetchDirections}
            disabled={!userPosition || !destination}
          >
            Get Directions
          </button>
          {loadingDirections && <LoadingSpinner />}
          {directionsError && (
            <p className="text-xs text-red-500 mt-2">{directionsError}</p>
          )}
          {(distance !== null && duration !== null && !loadingDirections) && (
            <div className="mt-2">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">Distance: {(distance/1000).toFixed(2)} km</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">Estimated time: {Math.floor(duration/60)} min {Math.round(duration%60)} sec</div>
            </div>
          )}
        </div>

        {/* Ride History Section */}
        <div className="mb-6">
          <h2 className="font-bold text-base mb-2 text-gray-800 dark:text-white">Ride History</h2>
          <div className="max-h-52 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {rideHistory.length === 0 && <div className="text-gray-400 italic">No rides yet.</div>}
            {rideHistory.map((ride, idx) => (
              <div key={ride.date + idx} className="py-2">
                <div className="font-semibold text-blue-700 dark:text-blue-300">{new Date(ride.date).toLocaleString()}</div>
                <div className="text-sm">Distance: {(ride.distance / 1000).toFixed(2)} km</div>
                <div className="text-sm">Duration: {Math.floor(ride.duration / 60)}:{(ride.duration % 60).toString().padStart(2, '0')}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto text-sm text-gray-600 dark:text-gray-400">
          <p>Position updates every 10 seconds</p>
          <p className="mt-2">© {new Date().getFullYear()} GPS Map App</p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {/* Current Location Button */}
        <button
          className="fixed bottom-8 right-8 z-[1100] bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg focus:outline-none"
          title="Go to current location"
          onClick={() => {
            if (userPosition && mapRef.current) {
              mapRef.current.setView(userPosition, 16, { animate: true });
            }
          }}
        >
          {/* Location SVG Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2" />
          </svg>
        </button>
        <MapContainer
          center={[21.0285, 105.8542]}
          zoom={13}
          className="h-full w-full z-0"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocation={handleLocation} />
          <DestinationMarker 
            destination={destination} 
            onGetDirections={fetchDirections} 
            showPopup={destinationPopup} 
            distance={distance} 
            duration={duration} 
            directionsError={directionsError}
          />
          <DirectionsPolyline route={route} />
          {/* Live Ride Tracker Polyline and Marker */}
          <RideTracker tracking={tracking} onRideUpdate={setRideStats} demoMode={demoMode} directionRoute={route} onFinishRide={handleFinishRide} />
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
