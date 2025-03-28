
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import RealtimeTranscription from './RealtimeTranscription'
import { supabase } from '@/integrations/supabase/client'
import { encodeAudioForAPI, encodeToBase64, hasAudioContent } from '@/utils/audioUtils'

interface RealtimeAudioRecorderProps {
  onTranscriptionComplete?: (transcription: string) => void
  onError?: (error: Error) => void
}

interface TokenResponse {
  token: string
  expires_at: number
}

function RealtimeAudioRecorder({
  onTranscriptionComplete,
  onError
}: RealtimeAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isFetchingToken, setIsFetchingToken] = useState(false)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const sessionSetupCompletedRef = useRef(false)
  
  // Call the Edge Function to get an ephemeral token
  const getEphemeralToken = async (): Promise<TokenResponse | null> => {
    try {
      setIsFetchingToken(true)
      
      // Use the supabase client to call the function - this handles authentication properly
      const { data, error } = await supabase.functions.invoke('realtime-transcription-token')
      
      if (error) {
        console.error('Failed to get token:', error)
        setError(`Failed to get token: ${error.message || 'Unknown error'}`)
        setIsFetchingToken(false)
        return null
      }
      
      if (!data) {
        console.error('Empty response from token function')
        setError('Empty response from token function')
        setIsFetchingToken(false)
        return null
      }
      
      console.log('Token response:', data)
      
      setIsFetchingToken(false)
      return {
        token: data.token,
        expires_at: data.expires_at
      }
    } catch (error) {
      console.error('Error fetching token:', error)
      setError(`Error fetching token: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsFetchingToken(false)
      return null
    }
  }

  const startRecording = useCallback(async () => {
    try {
      setError(null);
  
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({
          latencyHint: 'interactive',
          sampleRate: 16000,
        });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed');
      } else {
        console.log('AudioContext state:', audioContextRef.current.state);
      }
  
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      console.log('Microphone stream active:', stream.active);
      console.log('Audio tracks:', stream.getAudioTracks());
  
      // Get ephemeral token
      const tokenData = await getEphemeralToken();
      if (!tokenData) {
        throw new Error('Failed to get authentication token');
      }
  
      // Set up WebSocket connection
      const wsUrl = `wss://api.openai.com/v1/realtime?intent=transcription`;
      const ws = new WebSocket(wsUrl, [
        "realtime",
        `openai-ephemeral-client-token.${tokenData.token}`,
        "openai-beta.realtime-v1",
      ]);
      websocketRef.current = ws;
      console.log('Connecting to OpenAI Realtime API WebSocket with correct parameters');
  
      ws.onopen = () => {
        console.log('WebSocket connection established with OpenAI');
        setIsTranscribing(true);
      };
  
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Message received:", message.type);
  
          // Handle different event types
          switch (message.type) {
            case 'transcription_session.created':
              console.log('Transcription session created');
              // Now that the session is created, we can configure it
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  "type": "transcription_session.update",
                  "session": {
                    "input_audio_format": "pcm16",
                    "input_audio_transcription": {
                      "model": "gpt-4o-transcribe",
                      "prompt": "Esta é uma consulta médica em português do Brasil.",
                      "language": "pt"
                    },
                    "turn_detection": {
                      "type": "server_vad",
                      "threshold": 0.3,
                      "prefix_padding_ms": 300,
                      "silence_duration_ms": 500
                    },
                    "input_audio_noise_reduction": {
                      "type": "far_field"
                    },
                    "include": [
                      "item.input_audio_transcription.logprobs"
                    ]
                  }
                }));
              }
              break;
  
            case 'transcription_session.updated':
              console.log('Transcription session updated');
              sessionSetupCompletedRef.current = true;
              setupAudioProcessing();
              break;
  
            case 'input_audio_buffer.speech_started':
              console.log('Speech started detected by VAD');
              break;
  
            case 'input_audio_buffer.speech_stopped':
              console.log('Speech stopped detected by VAD');
              break;
  
            case 'response.audio_transcript.delta':
              if (message.delta) {
                console.log('Transcription delta:', message.delta);
                setTranscription(prev => prev + message.delta);
              }
              break;
  
            case 'response.audio_transcript.done':
              if (message.transcript) {
                console.log('Final transcription:', message.transcript);
                onTranscriptionComplete?.(message.transcript);
              }
              break;
  
            case 'error':
              console.error('Error from WebSocket:', message.error);
              if (message.error.type === 'invalid_request_error' && 
                  message.error.code === 'input_audio_buffer.commit_empty') {
                console.warn('Empty audio buffer - this is normal if no speech was detected');
              } else {
                onError?.(new Error(`WebSocket error: ${JSON.stringify(message.error)}`));
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
  
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Error with the transcription service connection');
        setIsTranscribing(false);
      };
  
      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        if (event.code !== 1000) {
          setError(`Connection to transcription service closed: ${event.reason || 'Unknown reason'}`);
        }
        setIsTranscribing(false);
      };
  
      setIsRecording(true);
      setTranscription('');
  
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Could not start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [getEphemeralToken, onError, onTranscriptionComplete]);

  const setupAudioProcessing = () => {
    if (!audioContextRef.current || !streamRef.current || !websocketRef.current || !sessionSetupCompletedRef.current) {
      console.error('Cannot setup audio processing: Missing required references');
      return;
    }

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(streamRef.current);
    sourceRef.current = source;
    
    // Create a script processor to process audio
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!websocketRef.current || !isRecording || !sessionSetupCompletedRef.current) return;
      if (websocketRef.current.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert to PCM16 format as required by OpenAI
      const pcmData = encodeAudioForAPI(inputData);
      
      // Check if audio has content (for debugging)
      const hasContent = hasAudioContent(pcmData);
      if (hasContent) {
        console.log('Audio contains data');
      }

      // Convert to base64 for sending
      const base64Audio = encodeToBase64(pcmData);
      
      // Send to WebSocket
      try {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const message = {
            type: "input_audio_buffer.append",
            audio: base64Audio
          };
          websocketRef.current.send(JSON.stringify(message));
          console.log('Audio chunk sent, length:', base64Audio.length);
        }
      } catch (error) {
        console.error('Error sending audio data:', error);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    
    console.log('Audio processing setup complete');
  };

  const stopRecording = useCallback(() => {
    try {
      // Close and cleanup WebSocket
      if (websocketRef.current) {
        if (websocketRef.current.readyState === WebSocket.OPEN) {
          websocketRef.current.close(1000, "Recording stopped by user");
        }
        websocketRef.current = null;
      }
      
      // Stop and cleanup audio processing
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Reset session setup flag
      sessionSetupCompletedRef.current = false;
      
      setIsRecording(false);
      setIsTranscribing(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(`Error stopping recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);
  
  // Clean up resources when the component unmounts
  useEffect(() => {
    return () => {
      // Stop recording if still active
      if (isRecording) {
        stopRecording();
      }
      
      // Close audio context if open
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    }
  }, [isRecording, stopRecording]);
  
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`rounded-full p-2 ${
            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-darkblue-600 hover:bg-darkblue-700'
          }`}
          disabled={isFetchingToken}
        >
          {isFetchingToken ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>
      
      <RealtimeTranscription
        isRecording={isRecording}
        transcription={transcription}
        isTranscribing={isTranscribing}
        error={error}
      />
    </div>
  )
}

export default RealtimeAudioRecorder
