import React, { useState } from 'react';
import { Printer, Layout as LayoutLandscape, Layout as LayoutPortrait } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Match } from '../types';

interface BracketProps {
  rounds: Match[][];
  onWinnerSelect: (matchId: string, winnerId: string) => void;
}

export function Bracket({ rounds, onWinnerSelect }: BracketProps) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showPreview, setShowPreview] = useState(false);

  const handlePrint = async () => {
    const element = document.getElementById('bracket-container');
    if (!element) return;

    try {
      const scale = orientation === 'landscape' ? 1.5 : 1.2;
      const canvas = await html2canvas(element, {
        scale,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        useCORS: true,
        logging: false,
      });

      // Calculate dimensions based on orientation
      const pageWidth = orientation === 'landscape' ? 297 : 210; // A4 dimensions in mm
      const pageHeight = orientation === 'landscape' ? 210 : 297;
      const margin = 10;

      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);

      const ratio = Math.min(
        availableWidth / canvas.width,
        availableHeight / canvas.height
      );

      const width = canvas.width * ratio;
      const height = canvas.height * ratio;

      // Center the image on the page
      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;

      const pdf = new jsPDF(orientation, 'mm', 'a4');

      // Split into pages if needed (for tournaments > 16 players)
      if (rounds[0].length > 8) {
        // Upper bracket
        const upperHalf = canvas.height / 2;
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          x,
          y,
          width,
          height / 2,
          undefined,
          'FAST'
        );
        
        pdf.addPage();
        
        // Lower bracket
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          x,
          -height / 2 + y,
          width,
          height,
          undefined,
          'FAST'
        );
      } else {
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          x,
          y,
          width,
          height,
          undefined,
          'FAST'
        );
      }

      pdf.save('tournament-bracket.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Calculate total number of players (excluding byes)
  const totalPlayers = rounds[0].reduce((count, match) => {
    return count + (match.player1?.isBye ? 0 : 1) + (match.player2?.isBye ? 0 : 1);
  }, 0);

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold text-gray-700">
          Total Players: {totalPlayers}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrientation('landscape')}
              className={`p-2 rounded-lg transition-colors ${
                orientation === 'landscape'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <LayoutLandscape size={20} />
            </button>
            <button
              onClick={() => setOrientation('portrait')}
              className={`p-2 rounded-lg transition-colors ${
                orientation === 'portrait'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <LayoutPortrait size={20} />
            </button>
          </div>
          <button
            onClick={handlePrint}
            className="print:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer size={20} />
            Download PDF
          </button>
        </div>
      </div>

      <div 
        id="bracket-container" 
        className={`flex gap-32 p-8 min-w-max overflow-x-auto ${
          orientation === 'portrait' ? 'flex-col' : ''
        }`}
      >
        {rounds.map((round, roundIndex) => (
          <div
            key={roundIndex}
            className={`flex flex-col justify-around min-w-[300px] relative ${
              roundIndex > 0 ? `mt-[${roundIndex * 60}px]` : ''
            }`}
          >
            <h3 className="text-lg font-semibold mb-6 text-center text-gray-800">
              {roundIndex === rounds.length - 1
                ? 'Final'
                : roundIndex === rounds.length - 2
                ? 'Semi-Finals'
                : `Round ${roundIndex + 1}`}
            </h3>
            <div className="space-y-32 relative">
              {round.map((match, matchIndex) => (
                <div key={match.id} className="relative">
                  {/* Connection lines with curves */}
                  {roundIndex < rounds.length - 1 && (
                    <>
                      <div 
                        className="absolute right-0 w-32 border-t-2 border-gray-300"
                        style={{ 
                          top: '50%',
                          transform: 'translateX(100%)',
                          borderRadius: '0 8px 8px 0'
                        }}
                      />
                      {matchIndex % 2 === 0 && (
                        <div 
                          className="absolute border-r-2 border-gray-300"
                          style={{
                            right: '128px',
                            top: '50%',
                            height: '160px',
                            transform: 'translateY(-50%)',
                            borderRadius: '0 8px 8px 0'
                          }}
                        />
                      )}
                    </>
                  )}
                  <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <div 
                      onClick={() => !match.player1?.isBye && !match.player2?.isBye && match.player1 && onWinnerSelect(match.id, match.player1.id)}
                      className={`p-3 rounded cursor-pointer transition-all border-l-4 
                        ${match.player1?.isBye ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'hover:bg-blue-50'} 
                        ${match.winner?.id === match.player1?.id ? 'bg-green-100 border-l-green-500' : 'border-l-blue-500'}
                        ${!match.player1 ? 'text-gray-400 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{match.player1?.name || 'TBD'}</span>
                        {match.winner?.id === match.player1?.id && (
                          <span className="text-green-600 text-sm font-semibold">Winner</span>
                        )}
                      </div>
                    </div>
                    <div className="my-2 border-t border-gray-200"></div>
                    <div 
                      onClick={() => !match.player1?.isBye && !match.player2?.isBye && match.player2 && onWinnerSelect(match.id, match.player2.id)}
                      className={`p-3 rounded cursor-pointer transition-all border-l-4
                        ${match.player2?.isBye ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'hover:bg-blue-50'}
                        ${match.winner?.id === match.player2?.id ? 'bg-green-100 border-l-green-500' : 'border-l-red-500'}
                        ${!match.player2 ? 'text-gray-400 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{match.player2?.name || 'TBD'}</span>
                        {match.winner?.id === match.player2?.id && (
                          <span className="text-green-600 text-sm font-semibold">Winner</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 text-center mt-2 font-medium">
                      Match {match.id.split('-')[1]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}