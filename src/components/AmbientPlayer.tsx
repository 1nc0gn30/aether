import { useMemo, useState } from 'react';
import { Headphones, Music2, X } from 'lucide-react';
import { getSfxEnabled, setSfxEnabled } from '../lib/sfx';

const DEFAULT_STREAM = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

type ParseResult = { valid: boolean; embedUrl: string; label: string };

function parseYouTubeUrl(input: string): ParseResult {
  const clean = input.trim();
  if (!clean) return { valid: false, embedUrl: '', label: '' };

  let url: URL;
  try {
    url = new URL(clean);
  } catch {
    return { valid: false, embedUrl: '', label: '' };
  }

  const listId = url.searchParams.get('list');
  if (listId) {
    return {
      valid: true,
      label: `Playlist ${listId}`,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}&autoplay=1&controls=1&rel=0`,
    };
  }

  const host = url.hostname.replace('www.', '');
  let videoId = '';
  if (host === 'youtu.be') {
    videoId = url.pathname.replace('/', '');
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    videoId = url.searchParams.get('v') ?? '';
  }

  if (!videoId) return { valid: false, embedUrl: '', label: '' };

  return {
    valid: true,
    label: `Video ${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=1&loop=1&playlist=${encodeURIComponent(videoId)}&rel=0`,
  };
}

export default function AmbientPlayer() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [urlInput, setUrlInput] = useState(DEFAULT_STREAM);
  const [sfx, setSfx] = useState(getSfxEnabled());

  const parsed = useMemo(() => parseYouTubeUrl(urlInput), [urlInput]);

  const toggleSfx = () => {
    const next = !sfx;
    setSfx(next);
    setSfxEnabled(next);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-[min(92vw,24rem)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex items-center gap-2 px-3 py-2 border border-white/20 bg-void/80 backdrop-blur-sm text-xs font-mono uppercase tracking-[0.12em] hover:border-acid-green transition-colors"
      >
        {open ? <X className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
        Audio
      </button>

      {open && (
        <div className="mt-2 glass-panel border border-white/20 p-3 sm:p-4">
          <p className="section-kicker mb-2">Ambient Stream</p>
          <p className="font-mono text-[11px] text-white/70 mb-3 leading-relaxed">
            Paste a YouTube song or playlist URL. Music only plays if you enable it.
          </p>

          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-void/75 border border-white/20 focus:border-cyan outline-none px-2.5 py-2 font-mono text-xs mb-3"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              disabled={!parsed.valid}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border font-mono text-xs uppercase tracking-[0.1em] transition-colors border-acid-green/70 text-acid-green hover:bg-acid-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Music2 className="w-3.5 h-3.5" />
              {enabled ? 'Stop Music' : 'Play Music'}
            </button>
            <button
              type="button"
              onClick={toggleSfx}
              className={`px-3 py-2 border font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                sfx ? 'border-cyan/70 text-cyan hover:bg-cyan/10' : 'border-white/25 text-white/70 hover:border-white/50'
              }`}
            >
              SFX {sfx ? 'ON' : 'OFF'}
            </button>
          </div>

          {!parsed.valid && <p className="font-mono text-[11px] text-crimson mt-2">Enter a valid YouTube URL.</p>}

          {enabled && parsed.valid && (
            <iframe
              className="w-full mt-3 aspect-video border border-white/20"
              src={parsed.embedUrl}
              title="AETHER Ambient YouTube Player"
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>
      )}
    </div>
  );
}
