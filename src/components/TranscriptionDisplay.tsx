'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface TranscriptionDisplayProps {
  transcription: string
  isRecording: boolean
  isLoading: boolean
  error?: string | null
  isEmpty: boolean
}

function TranscriptionDisplay({
  transcription,
  isRecording,
  isLoading,
  error,
  isEmpty,
}: TranscriptionDisplayProps) {
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="h-5 w-5 mr-2 text-gold-500 animate-spin" />
        <p className="text-gray-300 text-sm">Transcrevendo áudio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-gray-400 text-sm">A transcrição aparecerá aqui quando a gravação iniciar</p>
      </div>
    )
  }

  if (transcription) {
    return (
      <div className="absolute inset-0 p-3 overflow-y-auto">
        <p className="text-white text-sm font-medium">
          {transcription}
          {isRecording && (
            <span className="inline-block w-2 h-4 ml-1 bg-gold-500 animate-pulse"></span>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-gray-300 text-sm">Gravando áudio... Começe a falar.</p>
      <span className="ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
    </div>
  )
}

interface RealtimeTranscriptionProps {
  isRecording: boolean
  transcription: string
  isTranscribing: boolean
  error?: string | null
}

function RealtimeTranscription({
  isRecording,
  transcription,
  isTranscribing,
  error,
}: RealtimeTranscriptionProps) {
  const isEmpty = !isRecording && !transcription && !isTranscribing && !error

  return (
    <div
      className={`w-full h-20 rounded-md overflow-hidden ${
        isRecording ? 'bg-darkblue-800/80' : 'bg-darkblue-900/50'
      } relative border border-darkblue-700`}
    >
      <TranscriptionDisplay
        transcription={transcription}
        isRecording={isRecording}
        isLoading={isTranscribing}
        error={error}
        isEmpty={isEmpty}
      />
    </div>
  )
}

export default RealtimeTranscription
