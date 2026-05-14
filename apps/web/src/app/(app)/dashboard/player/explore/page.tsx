"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Award, ArrowRight, ArrowLeft } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";

const mockFarms = [
  {
    id: 1,
    farmName: "Finca Zafiro",
    country: "Honduras",
    region: "Comayagua",
    altitude: 1300,
    varieties: ["Parainema"],
    photoUrl: null,
    rating: "4.8",
    coeScore: null,
    availableLots: 2,
  },
  {
    id: 2,
    farmName: "Finca El Roble",
    country: "Honduras",
    region: "Santa Bárbara",
    altitude: 1450,
    varieties: ["Geisha", "Bourbon"],
    photoUrl: null,
    rating: "4.6",
    coeScore: "87",
    availableLots: 1,
  },
  {
    id: 3,
    farmName: "Finca Los Pinos",
    country: "Guatemala",
    region: "Huehuetenango",
    altitude: 1600,
    varieties: ["Catuai", "Typica"],
    photoUrl: null,
    rating: null,
    coeScore: null,
    availableLots: 3,
  },
];

const selectClasses =
  "w-full bg-black/20 border border-white/10 text-white p-2 rounded";

export default function ExplorePage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedVariety, setSelectedVariety] = useState("All");

  const countries = ["All", ...new Set(mockFarms.map((f) => f.country))];
  const varieties = [
    "All",
    ...new Set(mockFarms.flatMap((f) => f.varieties)),
  ];

  const filteredFarms = mockFarms.filter((farm) => {
    if (selectedCountry !== "All" && farm.country !== selectedCountry) {
      return false;
    }
    if (
      selectedVariety !== "All" &&
      !farm.varieties.includes(selectedVariety)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/dashboard/player")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <h1 className="text-4xl font-bold mb-8">Explore Farms</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className={selectClasses}
            style={{ colorScheme: "dark" }}
          >
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Coffee Variety
          </label>
          <select
            value={selectedVariety}
            onChange={(e) => setSelectedVariety(e.target.value)}
            className={selectClasses}
            style={{ colorScheme: "dark" }}
          >
            {varieties.map((variety) => (
              <option key={variety} value={variety}>
                {variety}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredFarms.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">No farms match your filters</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarms.map((farm) => (
            <GlassCard
              key={farm.id}
              className="overflow-hidden border-primary/20 cursor-pointer"
              onClick={() => router.push(`/farms/${farm.id}`)}
            >
              <div className="h-40 overflow-hidden">
                <img
                  src="/logo-square.png"
                  alt={farm.farmName}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  {farm.rating && (
                    <>
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm">{farm.rating}</span>
                    </>
                  )}
                  {farm.coeScore && (
                    <>
                      <Award className="w-4 h-4 text-primary" />
                      <span className="text-sm">{farm.coeScore}</span>
                    </>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-2">{farm.farmName}</h3>
                <p className="text-gray-400 text-sm mb-3">
                  📍 {farm.region}, {farm.country}
                </p>
                <p className="text-gray-400 text-xs mb-4">
                  {farm.varieties.join(", ")}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  ⛰️ {farm.altitude} MASL
                </p>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] text-sm"
                  onClick={() => router.push(`/farms/${farm.id}`)}
                >
                  View Farm
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
