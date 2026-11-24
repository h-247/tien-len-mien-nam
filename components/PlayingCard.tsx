'use client';

import React from 'react';
import { Card, Suit } from '@/lib/tienlen/types';
import { getCard } from '@/lib/tienlen/cards';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
};

const RANK_LABELS: Record<number, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
};

interface PlayingCardProps {
  cardId?: string;
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: (e: React.PointerEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dimmed?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  cardId,
  card: cardProp,
  faceDown = false,
  selected = false,
  onClick,
  onDoubleClick,
  onPointerDown,
  onPointerEnter,
  size = 'md',
  className = '',
  dimmed = false,
}) => {
  const cardData = cardProp || (cardId ? getCard(cardId) : null);

  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded',
    md: 'w-13 h-19 sm:w-16 sm:h-23 text-sm sm:text-base rounded-md',
    lg: 'w-18 h-26 sm:w-20 sm:h-29 text-base sm:text-lg rounded-lg',
  }[size];

  if (faceDown || !cardData) {
    return (
      <div
        className={`relative select-none border border-neutral-700 bg-neutral-800 shadow-md flex items-center justify-center overflow-hidden transition-all duration-150 ${sizeClasses} ${className}`}
      >
        <div className="absolute inset-1 rounded border border-neutral-600 bg-linear-to-br from-neutral-800 via-neutral-900 to-neutral-800 flex items-center justify-center">
          <span className="text-neutral-500 font-bold text-xs select-none">TL</span>
        </div>
      </div>
    );
  }

  const isRed = cardData.color === 'red';
  const suitSymbol = SUIT_SYMBOLS[cardData.suit];
  const rankLabel = RANK_LABELS[cardData.rank];

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative select-none font-sans font-bold shadow-md transition-all duration-150 flex flex-col justify-between p-1 sm:p-1.5 border ${sizeClasses} ${
        selected
          ? '-translate-y-5 shadow-xl border-amber-400 ring-2 ring-amber-400/90 bg-amber-50'
          : 'bg-white border-neutral-300 hover:-translate-y-1 hover:shadow-lg'
      } ${onClick ? 'cursor-pointer active:scale-95' : ''} ${
        dimmed ? 'opacity-40 grayscale' : ''
      } ${className}`}
    >
      {/* Top Left Corner */}
      <div className={`leading-none flex flex-col items-center self-start ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
        <span className="text-xs sm:text-sm font-extrabold">{rankLabel}</span>
        <span className="text-xs sm:text-sm leading-none">{suitSymbol}</span>
      </div>

      {/* Center Big Symbol */}
      <div
        className={`absolute inset-0 flex items-center justify-center text-lg sm:text-2xl pointer-events-none select-none ${
          isRed ? 'text-red-600' : 'text-neutral-900'
        }`}
      >
        {suitSymbol}
      </div>

      {/* Bottom Right Inverted Corner */}
      <div
        className={`leading-none flex flex-col items-center self-end rotate-180 ${
          isRed ? 'text-red-600' : 'text-neutral-900'
        }`}
      >
        <span className="text-xs sm:text-sm font-extrabold">{rankLabel}</span>
        <span className="text-xs sm:text-sm leading-none">{suitSymbol}</span>
      </div>
    </div>
  );
};
