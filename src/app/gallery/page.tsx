"use client";

import { useEffect, useState } from "react";
import { 
  ImageIcon, Loader2, Camera, Calendar, 
  X, Download 
} from "lucide-react";

interface GalleryImage {
  url: string;
  source: string;
  title: string;
  date: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/club-gallery", {
          cache: "no-store"
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setImages(data);
        } else {
          setImages([]);
        }
      } catch (error) {
        console.error("Error fetching gallery:", error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [hydrated]);

  return (
    <main className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-4 duration-700">
            <Camera size={14} /> Visual Archives
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight animate-in fade-in slide-in-from-top-6 duration-1000">
            Club <span className="text-primary">Gallery</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base animate-in fade-in duration-1000 delay-300">
            A comprehensive visual journey through our club's history, events, and remarkable achievements.
          </p>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-gray-500 font-mono text-sm tracking-widest animate-pulse">Initializing Visual Assets...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-32 card border-dashed border-2 border-white/10">
            <ImageIcon size={64} className="mx-auto text-gray-800 mb-4" />
            <h3 className="text-2xl font-bold text-gray-500">No images available</h3>
            <p className="text-gray-600 mt-2">Check back later for new updates.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 animate-in fade-in duration-1000">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedImage(img)}
                className="group relative break-inside-avoid rounded-2xl overflow-hidden border border-white/5 cursor-zoom-in bg-white/5 transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
              >
                <img 
                  src={img.url} 
                  alt={img.title}
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                  <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2 block">
                      {img.source}
                    </span>
                    <h3 className="text-sm font-bold text-white mb-2 leading-tight">
                      {img.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <Calendar size={12} />
                      {new Date(img.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Badge (Source) */}
                <div className="absolute top-4 left-4 p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                   <span className="text-[8px] font-bold uppercase tracking-widest text-gray-300">{img.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all border border-white/10 z-50"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>

            <div className="relative max-w-6xl w-full max-h-[85vh] flex flex-col items-center justify-center gap-6" onClick={e => e.stopPropagation()}>
              <div className="relative group/modal w-full flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-primary/10">
                <img 
                  src={selectedImage.url} 
                  className="max-w-full max-h-[75vh] object-contain animate-in zoom-in-95 duration-500"
                  alt={selectedImage.title}
                />
              </div>

              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                      {selectedImage.source}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(selectedImage.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedImage.title}</h2>
                </div>

                <div className="flex gap-3">
                  <a 
                    href={selectedImage.url} 
                    download={`club_gallery_${selectedImage.title.replace(/\s+/g, '_')}`}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all active:scale-95"
                  >
                    <Download size={16} /> Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        {!loading && images.length > 0 && (
          <div className="mt-24 text-center border-t border-white/5 pt-12">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mb-4">Capturing moments that define excellence</p>
            <div className="h-1 w-12 bg-primary mx-auto rounded-full"></div>
          </div>
        )}
      </div>
    </main>
  );
}
