import React, { useState, useCallback } from 'react';
import { Plus, Upload, Trash2, AlertCircle, Users, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useTournamentStore } from '../store/tournamentStore';
import type { Player } from '../types';

const ALLOWED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls']
};

const FILE_TYPE_ICONS = {
  'text/csv': <FileText className="w-6 h-6" />,
  'application/json': <FileJson className="w-6 h-6" />,
  'text/plain': <FileText className="w-6 h-6" />,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': <FileSpreadsheet className="w-6 h-6" />,
  'application/vnd.ms-excel': <FileSpreadsheet className="w-6 h-6" />
};

export function PlayerInput({ onGenerateBracket }: { onGenerateBracket: (players: Player[]) => void }) {
  const { players, addPlayer, removePlayer, importPlayers } = useTournamentStore();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  // Calculate pool requirements
  const getPoolInfo = () => {
    const count = players.length;
    if (count <= 8) return { pools: 1, playersPerPool: count };
    if (count <= 16) return { pools: 2, playersPerPool: Math.ceil(count / 2) };
    if (count <= 32) return { pools: 4, playersPerPool: Math.ceil(count / 4) };
    return { pools: 8, playersPerPool: Math.ceil(count / 8) };
  };

  const poolInfo = getPoolInfo();
  const isAtCapacity = players.length >= poolInfo.pools * 8;
  const capacityWarning = players.length >= poolInfo.pools * 6; // 75% capacity warning

  const validatePlayerName = (name: string): boolean => {
    if (!name.trim()) {
      setError('Player name cannot be empty');
      return false;
    }
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError('Player name already exists');
      return false;
    }
    if (isAtCapacity) {
      setError(`Maximum ${poolInfo.pools * 8} players allowed for ${poolInfo.pools} pools`);
      return false;
    }
    return true;
  };

  const handleAddPlayer = () => {
    if (!validatePlayerName(newPlayerName)) return;
    
    addPlayer({
      id: crypto.randomUUID(),
      name: newPlayerName.trim(),
      seed: players.length + 1
    });
    
    setNewPlayerName('');
    setError(null);
  };

  const handleBulkImport = () => {
    const names = bulkInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name && validatePlayerName(name));

    const newPlayers = names.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      seed: players.length + index + 1
    }));

    importPlayers(newPlayers);
    setBulkInput('');
    setShowBulkInput(false);
  };

  const processFileContent = (content: string, fileType: string) => {
    let playerNames: string[] = [];

    try {
      switch (fileType) {
        case 'text/csv':
          Papa.parse(content, {
            complete: (results) => {
              playerNames = results.data
                .flat()
                .filter(name => typeof name === 'string' && name.trim())
                .map(name => name.trim());
            }
          });
          break;

        case 'application/json':
          const jsonData = JSON.parse(content);
          playerNames = Array.isArray(jsonData) 
            ? jsonData.map(item => typeof item === 'string' ? item : item.name).filter(Boolean)
            : Object.values(jsonData).map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
          break;

        case 'text/plain':
          playerNames = content.split('\n').filter(name => name.trim());
          break;

        default:
          throw new Error('Unsupported file type');
      }

      const validNames = playerNames.filter(name => validatePlayerName(name));
      const newPlayers = validNames.map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        seed: players.length + index + 1
      }));

      importPlayers(newPlayers);
      setImporting(false);
      setImportProgress(100);
    } catch (err) {
      setError('Error processing file. Please check the format.');
      setImporting(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setError(null);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setImportProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = () => {
      const content = reader.result as string;
      processFileContent(content, file.type);
    };

    reader.onerror = () => {
      setError('Error reading file');
      setImporting(false);
    };

    reader.readAsText(file);
  }, [players.length, importPlayers]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    multiple: false
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Players</h2>
          <div className="flex items-center gap-2 mt-2">
            <Users className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              {players.length} Players • {poolInfo.pools} {poolInfo.pools === 1 ? 'Pool' : 'Pools'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FileText size={20} />
            Bulk Input
          </button>
          <div {...getRootProps()} className="relative">
            <input {...getInputProps()} />
            <button
              className={`flex items-center gap-2 px-4 py-2 ${
                isDragActive ? 'bg-blue-100' : 'bg-gray-100'
              } text-gray-700 rounded-lg hover:bg-gray-200 transition-colors`}
              disabled={isAtCapacity}
            >
              <Upload size={20} />
              Import File
            </button>
          </div>
        </div>
      </div>

      {showBulkInput && (
        <div className="mb-4">
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Enter player names (one per line)"
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleBulkImport}
              disabled={!bulkInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Import Names
            </button>
          </div>
        </div>
      )}

      {importing && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Importing players...</span>
            <span className="text-sm text-gray-500">{importProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {capacityWarning && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-700">
              Pool capacity warning
            </p>
            <p className="text-sm text-yellow-600">
              {players.length}/{poolInfo.pools * 8} players ({Math.round((players.length / (poolInfo.pools * 8)) * 100)}% full)
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto mb-6 pr-2 scrollbar-thin">
        {players.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
              <span className="font-medium text-gray-700">{player.name}</span>
            </div>
            <button
              onClick={() => removePlayer(player.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-white pt-4 border-t">
        <div className="flex gap-3">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Enter player name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAtCapacity}
          />
          <button
            onClick={handleAddPlayer}
            disabled={!newPlayerName.trim() || isAtCapacity}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Add Player
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        
        {players.length >= 2 && (
          <button
            onClick={() => onGenerateBracket(players)}
            className="mt-4 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Generate Bracket with {players.length} Players
          </button>
        )}
      </div>
    </div>
  );
}