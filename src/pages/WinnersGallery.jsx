import React, { useState, useEffect } from "react";
import { WinnerPhoto } from "@/entities/WinnerPhoto";
import { Trophy, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WinnersGallery() {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    WinnerPhoto.list("-created_date", 100).then(data => {
      setPhotos(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen p-6 relative" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at top, rgba(220,38,38,0.08), transparent 40%)"}} />
      <div className="max-w-5xl mx-auto relative">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900/60 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Winners Gallery</h1>
            <p className="text-gray-400 text-sm">Celebrating our champions</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No winner photos yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.id}
                className="relative group rounded-xl overflow-hidden border border-gray-800 bg-gray-900 cursor-pointer"
                onClick={() => setSelected(photo)}>
                <img src={photo.photo_url} alt={photo.winner_name || "Winner"}
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  {photo.winner_name && <div className="text-white text-sm font-bold">{photo.winner_name}</div>}
                  {photo.location && <div className="text-gray-300 text-xs">{photo.location}</div>}
                  {photo.game_date && <div className="text-gray-400 text-xs">{new Date(photo.game_date).toLocaleDateString()}</div>}
                </div>
                {/* Always-visible name strip at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 group-hover:opacity-0 transition-opacity">
                  {photo.winner_name && <div className="text-white text-xs font-semibold truncate">{photo.winner_name}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelected(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)}
              className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            <img src={selected.photo_url} alt={selected.winner_name || "Winner"}
              className="w-full rounded-xl object-contain max-h-[70vh]" />
            <div className="mt-4 text-center">
              {selected.winner_name && (
                <div className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-red-400" />
                  {selected.winner_name}
                </div>
              )}
              {(selected.location || selected.game_date) && (
                <div className="text-gray-400 text-sm mt-1">
                  {selected.location}{selected.location && selected.game_date ? " · " : ""}
                  {selected.game_date && new Date(selected.game_date).toLocaleDateString()}
                </div>
              )}
              {selected.title && <div className="text-red-300 italic mt-1">{selected.title}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}