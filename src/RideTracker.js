import React, { useState, useEffect, useRef } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

/**
 * RideTracker component
 * Tracks live GPS positions, calculates stats, and draws the route.
 * Props:
 *   onRideUpdate: function({ positions, distance, duration, speed })
 *   tracking: boolean (start/stop tracking)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3; // metres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Hoan Kiem Lake loop (real road route from OSRM)
const SAMPLE_ROUTE = [
  [21.028511, 105.852017], // Start: Hoan Kiem Lake
  [21.028759, 105.853158],
  [21.028936, 105.854340],
  [21.028870, 105.855309],
  [21.028570, 105.856195],
  [21.028084, 105.857021],
  [21.027471, 105.857663],
  [21.026819, 105.858102],
  [21.026187, 105.858261],
  [21.025452, 105.858185],
  [21.024783, 105.857851],
  [21.024244, 105.857315],
  [21.023868, 105.856610],
  [21.023703, 105.855786],
  [21.023807, 105.854946],
  [21.024175, 105.854175],
  [21.024776, 105.853551],
  [21.025529, 105.853181],
  [21.026343, 105.853091],
  [21.027135, 105.853282],
  [21.027868, 105.853751],
  [21.028511, 105.854439],
  [21.028936, 105.855309], // Loop back
];

const RideTracker = ({ tracking, onRideUpdate, demoMode, directionRoute = [], onFinishRide = () => {} }) => {
  const [positions, setPositions] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const demoIndexRef = useRef(0);
  const demoTimerRef = useRef(null);

  useEffect(() => {
    if (tracking && demoMode) {
      // Use the provided route (directions) if available, else fallback to SAMPLE_ROUTE
      const demoRoute = directionRoute && directionRoute.length > 1 ? directionRoute : SAMPLE_ROUTE;
      setPositions([demoRoute[0]]);
      setDuration(0);
      setDistance(0);
      setSpeed(0);
      startTimeRef.current = Date.now();
      demoIndexRef.current = 1;
      demoTimerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        setPositions((prev) => {
          if (demoIndexRef.current < demoRoute.length) {
            const next = demoRoute[demoIndexRef.current];
            demoIndexRef.current += 1;
            return [...prev, next];
          } else {
            clearInterval(demoTimerRef.current);
            return prev;
          }
        });
      }, 2200); // Slower animation (2.2s per segment)
      return () => {
        clearInterval(demoTimerRef.current);
      };
    }
    if (tracking && !demoMode) {
      setPositions([]);
      setDistance(0);
      setDuration(0);
      setSpeed(0);
      startTimeRef.current = Date.now();
      // Real GPS tracking
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            setPositions((prev) => {
              const newPos = [pos.coords.latitude, pos.coords.longitude];
              if (prev.length === 0) return [newPos];
              const last = prev[prev.length - 1];
              if (haversineDistance(last[0], last[1], newPos[0], newPos[1]) > 5) {
                return [...prev, newPos];
              }
              return prev;
            });
          },
          (err) => {},
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );
        timerRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
        return () => {
          navigator.geolocation.clearWatch(watchId);
          clearInterval(timerRef.current);
        };
      }
    }
    if (!tracking) {
      clearInterval(timerRef.current);
      clearInterval(demoTimerRef.current);
    }
  }, [tracking, demoMode, directionRoute]);

  // Calculate distance and speed
  useEffect(() => {
    if (positions.length > 1) {
      let total = 0;
      for (let i = 1; i < positions.length; i++) {
        total += haversineDistance(
          positions[i - 1][0],
          positions[i - 1][1],
          positions[i][0],
          positions[i][1]
        );
      }
      setDistance(total);
      setSpeed(total / (duration || 1));
    }
    if (onRideUpdate) {
      onRideUpdate({ positions, distance, duration, speed });
    }
  }, [positions, duration, distance, onRideUpdate, speed]);

  // Bike icon for current position, color and size change in demo mode
  const bikeIcon = new L.DivIcon({
    html: demoMode
      ? `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="38" r="7" fill="#f59e42" stroke="#d97706" stroke-width="3"/><circle cx="34" cy="38" r="7" fill="#f59e42" stroke="#d97706" stroke-width="3"/><rect x="23" y="14" width="3" height="10" fill="#d97706"/><path d="M14 38 L24 22 L34 38" stroke="#d97706" stroke-width="3" fill="none"/><rect x="21" y="7" width="6" height="6" rx="3" fill="#f59e42" stroke="#d97706" stroke-width="2"/></svg>`
      : `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="28" r="5" fill="#2563eb" stroke="#1e40af" stroke-width="2"/><circle cx="26" cy="28" r="5" fill="#2563eb" stroke="#1e40af" stroke-width="2"/><rect x="17" y="10" width="2" height="7" fill="#1e40af"/><path d="M10 28 L18 17 L26 28" stroke="#1e40af" stroke-width="2" fill="none"/><rect x="16" y="6" width="4" height="4" rx="2" fill="#2563eb" stroke="#1e40af" stroke-width="1.5"/></svg>`,
    iconSize: demoMode ? [48, 48] : [36, 36],
    iconAnchor: demoMode ? [24, 24] : [18, 18],
    className: ''
  });

  // Determine if ride is finished (at end of route in demo mode)
  const rideFinished = demoMode && directionRoute && directionRoute.length > 1 && positions.length === directionRoute.length;

  // Local state to hide modal after finish is pressed
  const [hideStats, setHideStats] = useState(false);
  useEffect(() => {
    if (tracking) setHideStats(false);
  }, [tracking]);

  // Show stats overlay if tracking OR if ride just finished and not yet logged, and not hidden
  const showStats = (tracking || (positions.length > 1 && !tracking)) && !hideStats;

  if (!showStats) return null;

  return (
    <>
      <Polyline positions={positions} color="lime" weight={5} />
      {positions.length > 0 && tracking && (
        <Marker position={positions[positions.length - 1]} icon={bikeIcon}>
          <Popup>Current position</Popup>
        </Marker>
      )}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-900/95 rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center z-[1000] font-sans text-base sm:text-lg backdrop-blur-md border border-gray-200 dark:border-gray-700">
        <div className="font-extrabold text-2xl tracking-wide mb-2 text-blue-700 dark:text-blue-300 font-poppins drop-shadow">
          Live Ride Tracking
        </div>
        <div className="mb-1 text-gray-800 dark:text-gray-200 font-medium text-lg">
          Distance: <span className="font-semibold">{(distance / 1000).toFixed(2)} km</span>
        </div>
        <div className="mb-1 text-gray-800 dark:text-gray-200 font-medium text-lg">
          Duration: <span className="font-semibold">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
        </div>
        <div className="mb-2 text-gray-800 dark:text-gray-200 font-medium text-lg">
          Avg Speed: <span className="font-semibold">{((distance / (duration || 1)) * 3.6).toFixed(1)} km/h</span>
        </div>
        {(rideFinished || (!tracking && positions.length > 1)) && (
          <button className="mt-3 px-8 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-md transition-colors duration-150" onClick={() => { setHideStats(true); onFinishRide({ positions, distance, duration, speed }); }}>
            Finish Ride
          </button>
        )}
      </div>
    </>
  );
};

export default RideTracker;
