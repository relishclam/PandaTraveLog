'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp } from 'lucide-react';

interface SearchResultCardProps {
  result: {
    id: string;
    score: number | null;
    metadata?: {
      originalText?: string;
      city?: string;
      country?: string;
      type?: string;
    };
  };
  index: number;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ result, index }) => {
  const { score, metadata } = result;

  if (!metadata || !metadata.originalText) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <p className="text-sm text-gray-800 font-medium">{metadata.originalText}</p>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {(metadata.city || metadata.country) && (
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{metadata.city}{metadata.city && metadata.country ? ', ' : ''}{metadata.country}</span>
            </div>
          )}
        </div>
        {score && (
          <div className="flex items-center text-green-600">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>Relevance: {score.toFixed(2)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};