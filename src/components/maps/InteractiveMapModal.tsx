'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  zoom?: number;
  locationName: string;
}

interface MapProps {
  lat: number;
  lng: number;
  zoom: number;
  locationName: string;
}

// Dynamically import the Map component to prevent SSR issues with Leaflet
const Map = dynamic(() => import('./Map').then((mod) => mod.default), { 
  ssr: false, 
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[500px]">
      Loading...
    </div>
  )
});

const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({ isOpen, onClose, lat, lng, zoom = 15, locationName }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{locationName}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow w-full h-full">
          <Map lat={lat} lng={lng} zoom={zoom} locationName={locationName} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InteractiveMapModal;
