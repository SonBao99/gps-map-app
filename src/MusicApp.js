import React, { useState, useRef } from 'react';

const DEMO_TRACKS = [
  {
    title: 'Chill Vibes',
    artist: 'Lo-Fi Artist',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    title: 'Morning Sun',
    artist: 'Acoustic Band',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'Night Drive',
    artist: 'Synthwave',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

export default function MusicApp({ open, onClose }) {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef();

  const playTrack = (idx) => {
    setPlaying(false);
    setCurrentTrack(idx);
  };

  // Effect to auto-play when currentTrack changes
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      if (playing) {
        const playPromise = audioRef.current.play();
        if (playPromise) playPromise.catch(() => {});
      }
    }
    // eslint-disable-next-line
  }, [currentTrack]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      setPlaying(true);
      if (playPromise) playPromise.catch(() => {});
    }
  };

  // Slide up animation
  return (
    <div
      className={`fixed left-0 right-0 bottom-0 z-[2000] bg-white dark:bg-gray-900 shadow-2xl rounded-t-2xl transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'} flex flex-col items-center p-4`}
      style={{ minHeight: '320px', maxHeight: '60vh' }}
    >
      <button
        className="absolute top-2 right-4 text-gray-600 dark:text-gray-300 text-2xl font-bold focus:outline-none"
        onClick={onClose}
        aria-label="Close music app"
      >
        ×
      </button>
      <h2 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-200">Music Player</h2>
      <div className="w-full flex flex-col items-center">
        <div className="mb-4">
          <div className="text-lg font-extrabold text-blue-800 dark:text-blue-200">{DEMO_TRACKS[currentTrack].title}</div>
          <div className="text-base font-semibold text-pink-600 dark:text-pink-400">{DEMO_TRACKS[currentTrack].artist}</div>
        </div>
        <audio
          ref={audioRef}
          src={DEMO_TRACKS[currentTrack].url}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          controls={false}
        />
        <div className="flex items-center gap-4 mt-2">
          <button
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-xl"
            onClick={() => playTrack((currentTrack - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length)}
            aria-label="Previous track"
          >
            ◀
          </button>
          <button
            className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl"
            onClick={handlePlayPause}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-xl"
            onClick={() => playTrack((currentTrack + 1) % DEMO_TRACKS.length)}
            aria-label="Next track"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="w-full mt-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Playlist</div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {DEMO_TRACKS.map((track, idx) => (
            <li
              key={track.url}
              className={`py-2 px-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-900 dark:text-blue-100 ${idx === currentTrack ? 'bg-blue-50 dark:bg-blue-800 font-bold' : ''}`}
              onClick={() => playTrack(idx)}
            >
              {track.title} <span className="text-xs text-pink-600 dark:text-pink-400">- {track.artist}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
