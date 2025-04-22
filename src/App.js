import React, { useState, useEffect, useRef } from 'react';
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
            if (onLocation) onLocation(newPos);
            // Only flyTo if position changed and map is ready
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
            console.error('Error getting location:', error);
            setLocationError(`Error getting location: ${error.message}`);
          }
        );
      } else {
        setLocationError('Geolocation is not supported by your browser');
      }
    };
    updatePosition();
    const intervalId = setInterval(updatePosition, 10000);
    return () => clearInterval(intervalId);
  }, [map, onLocation]);

  return position ? (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  ) : locationError ? (
    <Popup position={[0, 0]} isOpen>
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
    <Marker position={destination} ref={markerRef}>
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
            <div className="text-xs text-gray-800 dark:text-gray-200">
              <div>Distance: {(distance/1000).toFixed(2)} km</div>
              <div>Estimated time: {Math.floor(duration/60)} min {Math.round(duration%60)} sec</div>
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
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defaultPosition, setDefaultPosition] = useState([51.505, -0.09]);
  const [userPosition, setUserPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState([]);
  const [directionsError, setDirectionsError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [destInput, setDestInput] = useState({ lat: '', lng: '' });
  const [destinationPopup, setDestinationPopup] = useState(false);
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
    setDefaultPosition(pos);
  };

  // Handle destination input changes
  const handleDestInputChange = (e) => {
    setDestInput({ ...destInput, [e.target.name]: e.target.value });
  };

  // Set destination from sidebar input
  const handleSetDestination = () => {
    if (!isNaN(Number(destInput.lat)) && !isNaN(Number(destInput.lng))) {
      setDestination([parseFloat(destInput.lat), parseFloat(destInput.lng)]);
    }
  };

  // Fetch directions from OSRM
  const fetchDirections = async () => {
    if (!userPosition || !destination) return;
    setDirectionsError(null);
    setRoute([]);
    setDistance(null);
    setDuration(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${userPosition[1]},${userPosition[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRoute(coords);
        setDistance(data.routes[0].distance); // meters
        setDuration(data.routes[0].duration); // seconds
      } else {
        setDirectionsError('No route found.');
      }
    } catch (err) {
      setDirectionsError('Failed to fetch directions.');
    }
    setDestinationPopup(true);
  };

  // Handle map click to set destination
  const handleMapClick = (latlng) => {
    setDestination(latlng);
    setDestInput({ lat: latlng[0].toFixed(6), lng: latlng[1].toFixed(6) });
    setDirectionsError(null);
    setDistance(null);
    setDuration(null);
    setRoute([]);
    setDestinationPopup(true);
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 p-2 rounded-md shadow-md"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <XIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        ) : (
          <MenuIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          transform transition-transform duration-300 ease-in-out
          fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-lg z-[999]
          flex flex-col p-4`}
      >
        <h1 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">GPS Map App</h1>

        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5 text-yellow-500" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-700" />
            )}
          </button>
        </div>

        {/* Destination Creator */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Set Destination</h2>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              name="lat"
              className="w-1/2 px-2 py-1 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              placeholder="Latitude"
              value={destInput.lat}
              onChange={handleDestInputChange}
            />
            <input
              type="number"
              name="lng"
              className="w-1/2 px-2 py-1 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
              placeholder="Longitude"
              value={destInput.lng}
              onChange={handleDestInputChange}
            />
          </div>
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-1 rounded mb-2"
            onClick={handleSetDestination}
          >
            Set Destination
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Or click on the map to set destination.</p>
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
          {directionsError && (
            <p className="text-xs text-red-500 mt-2">{directionsError}</p>
          )}
          {(distance !== null && duration !== null) && (
            <div className="mt-2 text-xs text-gray-800 dark:text-gray-200">
              <div>Distance: {(distance/1000).toFixed(2)} km</div>
              <div>Estimated time: {Math.floor(duration/60)} min {Math.round(duration%60)} sec</div>
            </div>
          )}
        </div>

        <div className="mt-auto text-sm text-gray-600 dark:text-gray-400">
          <p>Position updates every 10 seconds</p>
          <p className="mt-2">© {new Date().getFullYear()} GPS Map App</p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultPosition}
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
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
