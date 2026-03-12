import { MapPin, Clock, ChevronRight, Timer, Flame, Eye, BadgeCheck } from "lucide-react";
import { useRadar } from "@/contexts/RadarContext";

interface PromoCardProps {
  store: string;
  branch: string;
  discount: string;
  product: string;
  price: string;
  distance: string;
  time: string;
  expiry: string;
  views: number;
  trending?: boolean;
  verified?: boolean;
}

const PromoCard = ({ store, branch, discount, product, price, distance, time, expiry, views, trending, verified }: PromoCardProps) => (
  <div className="relative min-w-[260px] rounded-xl border border-neon-red/30 bg-card p-3 animate-pulse-red">
    {/* LIVE indicator */}
    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-neon-red/20 px-1.5 py-0.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-red opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon-red" />
      </span>
      <span className="text-[8px] font-bold text-neon-red">LIVE</span>
    </div>
    <div className="flex items-start justify-between mb-2 pr-12">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-display text-sm font-bold text-foreground">{store}</p>
          {verified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5">
              <BadgeCheck size={9} className="text-blue-400" />
              <span className="text-[7px] font-bold text-blue-400">Verified</span>
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{branch}</p>
      </div>
    </div>
    <div className="inline-block rounded-md bg-neon-red px-2 py-0.5 font-display text-xs font-bold text-accent-foreground glow-red animate-pulse-red mb-1">
      {discount}
    </div>
    {/* STOK TERBATAS */}
    <p className="text-[9px] font-bold text-neon-red glow-red-text animate-pulse mb-1">🔥 STOK TERBATAS!</p>
    <p className="text-xs text-foreground font-medium">{product}</p>
    <p className="text-sm font-bold text-primary mt-1">{price}</p>

    {/* Trust & urgency row */}
    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
      {trending && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 px-1.5 py-0.5">
          <Flame size={9} className="text-orange-400" />
          <span className="text-[8px] font-bold text-orange-400">Trending</span>
        </span>
      )}
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
        <Eye size={9} />
        <span>{views} Orang Dilihat</span>
      </span>
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
        <Clock size={9} />
        <span>{time}</span>
      </span>
    </div>

    {/* Urgency Timer */}
    <div className="mt-1.5 flex items-center gap-1 rounded-md bg-neon-red/10 border border-neon-red/20 px-2 py-1">
      <Timer size={10} className="text-neon-red animate-pulse" />
      <span className="text-[10px] font-bold text-neon-red glow-red-text">Berakhir dalam {expiry}</span>
    </div>
    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin size={10} />
        <span>{distance}</span>
      </div>
      <button className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
        Lihat Peta <ChevronRight size={10} />
      </button>
    </div>
  </div>
);

const LiveFeed = () => {
  const { promoCount } = useRadar();
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-red" />
          </span>
          <h2 className="font-display text-sm font-bold text-foreground">Promo Merah di Sekitarmu</h2>
        </div>
      </div>
      {/* Radar Cuan: sadece kampanya sayısı */}
      <div className="px-4 mb-3 flex justify-center">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <p className="text-sm font-bold text-primary glow-green-text">
            {promoCount} Promo Aktif
          </p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        <PromoCard
          store="Indomaret"
          branch="Sudirman"
          discount="-50%"
          product="Indomie Goreng 5-pack"
          price="Rp 12.500"
          distance="500m dari kamu"
          time="5 menit lalu"
          expiry="4 jam"
          views={24}
          trending={true}
          verified={true}
        />
        <PromoCard
          store="Alfamart"
          branch="Thamrin"
          discount="-50%"
          product="Ayam Potong Segar 1kg"
          price="Rp 15.200"
          distance="1.2km dari kamu"
          time="2 menit lalu"
          expiry="2 jam"
          views={12}
          trending={false}
          verified={true}
        />
      </div>
    </div>
  );
};

export default LiveFeed;