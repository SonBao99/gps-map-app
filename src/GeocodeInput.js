import React, { useState } from 'react';

export default function GeocodeInput({ onSelect, placeholder = 'Search for a place or address...' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);
    if (!value) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      // Prefer Google Places API if key is set
      const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
      if (GOOGLE_API_KEY) {
        // Google Places Autocomplete API
        const sessiontoken = window.__google_places_sessiontoken || (window.__google_places_sessiontoken = Math.random().toString(36).substring(2));
        const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(value)}&types=geocode&language=vi&components=country:VN&key=${GOOGLE_API_KEY}&sessiontoken=${sessiontoken}`;
        const res = await fetch(`/proxy?url=${encodeURIComponent(googleUrl)}`); // Needs proxy due to CORS
        const data = await res.json();
        if (data.predictions) {
          setSuggestions(data.predictions.map(pred => ({
            place_id: pred.place_id,
            display_name: pred.description,
            isGoogle: true
          })));
        } else {
          setSuggestions([]);
        }
      } else {
        // Using Nominatim for free geocoding, restricted to Vietnam
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=vn`);
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      setError('Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (item) => {
    setQuery(item.display_name);
    setSuggestions([]);
    if (onSelect) {
      if (item.isGoogle) {
        // Fetch place details for coordinates
        const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${item.place_id}&key=${GOOGLE_API_KEY}`;
        const res = await fetch(`/proxy?url=${encodeURIComponent(detailsUrl)}`); // Needs proxy due to CORS
        const data = await res.json();
        if (data.result && data.result.geometry && data.result.geometry.location) {
          onSelect({
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng,
            label: item.display_name
          });
        }
      } else {
        onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), label: item.display_name });
      }
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full p-2 border rounded focus:outline-none focus:ring"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        autoComplete="off"
      />
      {loading && <div className="absolute right-2 top-2 text-xs text-gray-400">Loading...</div>}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white dark:bg-gray-800 border rounded shadow z-10 mt-1 max-h-56 overflow-auto">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
              onClick={() => handleSelect(item)}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
