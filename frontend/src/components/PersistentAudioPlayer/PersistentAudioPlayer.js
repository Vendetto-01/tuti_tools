import React, { useRef, useEffect, useState } from 'react';
import './PersistentAudioPlayer.css';

const PersistentAudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        setError('');
      } catch (err) {
        console.warn('Autoplay was prevented:', err);
        setError('Autoplay prevented. Click play to start.');
        setIsPlaying(false);
      }
    };

    // Autoplay is often restricted by browsers until user interaction.
    // We attempt it, but provide controls.
    if (isUserInteracted) { // Only attempt play if user has interacted
        playAudio();
    } else {
        // For the very first load, we might not be able to autoplay.
        // Some browsers might allow muted autoplay.
        // Or, we wait for a click on the player itself.
        setError('Click play to start audio.');
    }
    

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false); // Or loop: audio.play();

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => {
        console.error("Audio Error:", e);
        setError('Error loading audio.');
        setIsPlaying(false);
    });
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      // audio.removeEventListener('error', ...); // Consider how to handle error listener removal
    };
  }, [src, isUserInteracted]);

  const handlePlayPauseClick = () => {
    if (!isUserInteracted) {
        setIsUserInteracted(true); // Mark user interaction
    }
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(err => {
            console.error("Error on manual play:", err);
            setError("Could not play audio.");
            setIsPlaying(false);
        });
      }
    }
  };
  
  // This effect handles the initial user interaction for autoplay.
  // It's a common pattern to enable audio after the first click anywhere.
  useEffect(() => {
    const enableAudioOnInteraction = () => {
      if (!isUserInteracted) {
        setIsUserInteracted(true);
      }
      window.removeEventListener('click', enableAudioOnInteraction);
      window.removeEventListener('touchstart', enableAudioOnInteraction);
    };

    window.addEventListener('click', enableAudioOnInteraction);
    window.addEventListener('touchstart', enableAudioOnInteraction);

    return () => {
      window.removeEventListener('click', enableAudioOnInteraction);
      window.removeEventListener('touchstart', enableAudioOnInteraction);
    };
  }, [isUserInteracted]);


  if (!src) return null;

  return (
    <div className="persistent-audio-player">
      <audio ref={audioRef} src={src} preload="auto" loop />
      <button onClick={handlePlayPauseClick} className="play-pause-button">
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      {error && <span className="audio-error-message">{error}</span>}
      <div className="song-title">Now Playing: kekosong.mp3</div>
    </div>
  );
};

export default PersistentAudioPlayer;