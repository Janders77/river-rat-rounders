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
         {/* Header */}
         <div className="mb-6 flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
             <Trophy className="w-5 h-5 text-white/80" />
           </div>
           <div>
             <h1 className="text-lg font-semibold text-white leading-tight">Winners Gallery</h1>
             <p className="text-base text-white/50 mt-0.5">Celebrating our champions</p>
           </div>
         </div>

         {/* Gallery Grid */}
         {isLoading ? (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
             {Array(8).fill(0).map((_, i) => (
               <Skeleton key={i} className="aspect-square rounded-xl bg-white/5" />
             ))}
           </div>
         ) : photos.length === 0 ? (
           <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
             <Trophy className="w-8 h-8 mx-auto mb-2 text-white/20" />
             <p className="text-base text-white/60">No winners posted yet</p>
           </div>
         ) : (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
             {photos.map(photo => (
               <div
                 key={photo.id}
                 className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 cursor-pointer group aspect-square"
                 onClick={() => setSelected(photo)}
               >
                 <img
                   src={photo.photo_url}
                   alt={photo.winner_name || "Winner"}
                   className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                 />
                 {/* Premium gradient overlay */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3">
                   <div className="text-white text-base font-semibold truncate">
                     {photo.winner_name || "Winner"}
                   </div>
                   {(photo.location || photo.game_date) && (
                     <div className="text-white/50 text-base mt-1 truncate">
                       {photo.location}
                       {photo.location && photo.game_date ? " · " : ""}
                       {photo.game_date && new Date(photo.game_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                     </div>
                   )}
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
                  <Trophy className="w-5 h-5 text-white/80" />
                  {selected.winner_name}
                </div>
              )}
              {(selected.location || selected.game_date) && (
                <div className="text-gray-400 text-base mt-1">
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