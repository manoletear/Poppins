'use client';

import { useState, useCallback } from 'react';
import { CreditCard, X, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { lookupBin, BANK_THEMES } from '@/lib/pagos/bin-lookup';
import type { BinLookupResult } from '@/lib/pagos/types';

interface Props {
  onSave: (card: { bin: string; ultimos4: string; detected: BinLookupResult }) => Promise<void>;
  onClose: () => void;
}

export default function CardSetup({ onSave, onClose }: Props) {
  const [cardNumber, setCardNumber] = useState('');
  const [detected, setDetected] = useState<BinLookupResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCardInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    if (digits.length >= 6) {
      const result = lookupBin(digits);
      setDetected(result);
    } else {
      setDetected(null);
    }
  }, []);

  const handleSave = async () => {
    if (!detected) return;
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 8) return;

    setSaving(true);
    try {
      await onSave({
        bin: digits.substring(0, 6),
        ultimos4: digits.substring(digits.length - 4),
        detected,
      });
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const theme = detected ? BANK_THEMES[detected.banco] : null;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Tarjeta Registrada</h3>
          <p className="text-sm text-zinc-500 mb-2">
            {detected?.banco} — {detected?.programa_puntos}
          </p>
          <p className="text-sm text-violet-600 font-medium mb-6">
            Acumularas {detected?.tasa_puntos} puntos por cada $1.000 pagados
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Registrar Tarjeta</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className={`rounded-xl p-5 ${theme?.bg || 'bg-gradient-to-br from-zinc-800 to-zinc-900'} transition-colors`}>
            <div className="flex items-center justify-between mb-8">
              <span className={`text-sm font-semibold ${theme?.text || 'text-white'}`}>
                {detected?.banco || 'Tu banco'}
              </span>
              <CreditCard className={`h-6 w-6 ${theme?.text || 'text-white/60'}`} />
            </div>
            <p className={`text-lg font-mono tracking-widest ${theme?.text || 'text-white'}`}>
              {cardNumber || '•••• •••• •••• ••••'}
            </p>
            <div className="flex justify-between mt-4">
              <span className={`text-xs ${theme?.text || 'text-white/60'}`}>
                {detected?.tipo_tarjeta?.toUpperCase() || 'TARJETA'}
              </span>
              <span className={`text-xs ${theme?.text || 'text-white/60'}`}>
                {detected?.categoria?.toUpperCase() || ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Numero de tarjeta
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => handleCardInput(e.target.value)}
              placeholder="4051 6100 0000 0000"
              maxLength={19}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-zinc-400 mt-1">
              Solo almacenamos los primeros 6 y ultimos 4 digitos para identificar tu banco
            </p>
          </div>

          {detected && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-semibold text-violet-800">Detectado</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500">Banco</span>
                  <p className="font-medium text-zinc-900">{detected.banco}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Programa</span>
                  <p className="font-medium text-zinc-900">{detected.programa_puntos}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Tarjeta</span>
                  <p className="font-medium text-zinc-900">{detected.tipo_tarjeta} {detected.categoria}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Tasa</span>
                  <p className="font-medium text-violet-700">{detected.tasa_puntos} pts / $1.000</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!detected || saving}
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Registrar Tarjeta'}
          </button>
        </div>
      </div>
    </div>
  );
}
