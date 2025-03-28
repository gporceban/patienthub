
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import RealtimeTranscription from './RealtimeTranscription'
import { supabase } from '@/integrations/supabase/client'

interface RealtimeAudioRecorderProps {
  onTranscriptionComplete?: (transcription: string) => void
  onError?: (error: Error) => void
}

interface TokenResponse {
  token: string
  expires_at: number
  session_id: string
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
  const sessionSetupCompletedRef = useRef<boolean>(false)
  
  // Call the Edge Function to get an ephemeral token
  const getEphemeralToken = async (): Promise<{ token: string, expires_at: number, session_id: string } | null> => {
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
      
      // Return the token data in the expected format
      return {
        token: data.token || data.client_secret?.value,
        expires_at: data.expires_at || data.client_secret?.expires_at,
        session_id: data.session_id || data.id
      }
    } catch (error) {
      console.error('Error fetching token:', error)
      setError(`Error fetching token: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsFetchingToken(false)
      return null
    } finally {
      setIsFetchingToken(false)
    }
  }

  // Initialize WebSocket connection with the ephemeral token
  const initializeWebSocket = useCallback(async () => {
    try {
      setIsFetchingToken(true)
      
      // Get ephemeral token from our Edge Function
      const tokenData = await getEphemeralToken()
      if (!tokenData) {
        setIsFetchingToken(false)
        return null
      }
      
      console.log(`Token obtained, expires at: ${new Date(tokenData.expires_at * 1000).toISOString()}`)
      
      // According to the latest documentation, the correct format is:
      // wss://api.openai.com/v1/realtime?intent=transcription
      const wsUrl = `wss://api.openai.com/v1/realtime?intent=transcription`;

      const ws = new WebSocket(wsUrl, [
        "realtime",
        `openai-ephemeral-client-token.${tokenData.token}`,
        "openai-beta.realtime-v1",
      ]);
            
      console.log('Connecting to OpenAI Realtime API WebSocket with correct parameters')
      
      // Create WebSocket connection with the properly formatted URL
      websocketRef.current = ws
      
      ws.onopen = () => {
        console.log('WebSocket connection established with OpenAI')
        
        // Configure the transcription session with the correct message format exactly as shown in the docs
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
                
        setIsTranscribing(true)
        setError(null)
        sessionSetupCompletedRef.current = true
      }
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message.type)
          
          // Handle different event types according to the OpenAI Realtime API documentation
          switch (message.type) {
            case 'transcription_session.created':
              console.log('Transcription session created')
              break
              
            case 'transcription_session.updated':
              console.log('Transcription session updated')
              sessionSetupCompletedRef.current = true
              break
              
            case 'input_audio_buffer.speech_started':
              console.log('Speech started detected by VAD')
              break
              
            case 'input_audio_buffer.speech_stopped':
              console.log('Speech stopped detected by VAD')
              break
              
            case 'response.audio_transcript.delta':
              // Handle the incremental transcription updates
              if (message.delta) {
                console.log('Transcription delta:', message.delta)
                setTranscription(prev => prev + message.delta)
              }
              break
              
            case 'response.audio_transcript.done':
              // Final transcription for a segment
              if (message.transcript) {
                console.log('Final transcription:', message.transcript)
                onTranscriptionComplete?.(message.transcript)
              }
              break
              
            case 'error':
              console.error('Error from WebSocket:', message.error)
              if (message.error.type === 'invalid_request_error' && 
                  message.error.code === 'input_audio_buffer.commit_empty') {
                console.warn('Empty audio buffer - this is normal if no speech was detected')
              } else {
                onError?.(new Error(`WebSocket error: ${JSON.stringify(message.error)}`))
              }
              break
              
            default:
              // Log other message types for debugging
              console.log('Message received:', message.type, message)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
        setError('Error with the transcription service connection')
        setIsTranscribing(false)
      }
      
      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason)
        if (event.code !== 1000) {
          setError(`Connection to transcription service closed: ${event.reason || 'Unknown reason'}`)
        }
        setIsTranscribing(false)
        sessionSetupCompletedRef.current = false
      }
      
      setIsFetchingToken(false)
      return ws
    } catch (err) {
      console.error('Error initializing WebSocket:', err)
      setError(`Could not connect to transcription service: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsFetchingToken(false)
      setIsTranscribing(false)
      return null
    }
  }, [onError, onTranscriptionComplete]);
  
  // Helper function to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    // Use a more reliable method to convert ArrayBuffer to Base64
    // that works consistently across browsers
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
  
  const startRecording = useCallback(async () => {
    try {
      setError(null);
  
      // Initialize audio context
      if (!audioContextRef.current) {
        // Use standard AudioContext (no need for webkitAudioContext)
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
      console.log('Requesting microphone access...');
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
  
      // Initialize WebSocket
      const ws = await initializeWebSocket();
      if (!ws) throw new Error('Failed to initialize WebSocket connection');
      websocketRef.current = ws;
  
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
  
      // Create audio process handler with debug output
      let accumulatedSampleCount = 0;
      let lastSendTime = Date.now();
      const MIN_BUFFER_SIZE = 1024; // ~64ms at 16kHz
      const MAX_BUFFER_DURATION_MS = 200; // Send every 200ms

      processor.onaudioprocess = (e) => {
        if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN || !isRecording) {
          console.log("Cannot send audio: WebSocket not ready or not recording");
          return;
        }
        
        if (!sessionSetupCompletedRef.current) {
          console.log("Session not fully setup yet, waiting...");
          return;
        }

        const inputBuffer = e.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Log audio levels to debug
        const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
        if (accumulatedSampleCount % 10 === 0) { // Log every 10 chunks to avoid console spam
          console.log(`Audio chunk ${accumulatedSampleCount}:`, 
            `length=${inputData.length}, ` +
            `max amplitude=${maxAmplitude.toFixed(4)}, ` + 
            `time=${new Date().toISOString()}`);
        }
        
        accumulatedSampleCount++;

        // Convert Float32Array to PCM16 format (Int16Array)
        const pcmBuffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767) range
          pcmBuffer[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
        }

        // Encode audio data as base64
        const base64Audio = arrayBufferToBase64(pcmBuffer.buffer);
        
        // Send audio data to the WebSocket with a unique event ID
        const eventId = `audio_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const appendMessage = {
          type: "input_audio_buffer.append",
          event_id: eventId,
          audio: base64Audio,
        };
        
        try {
          websocketRef.current.send(JSON.stringify(appendMessage));
          console.log(`Sent audio buffer ${accumulatedSampleCount}: ${base64Audio.length} bytes, event_id: ${eventId}`);
        } catch (err) {
          console.error("Error sending audio data:", err);
        }
      };
  
      source.connect(processor);
      processor.connect(audioContext.destination);
  
      setIsRecording(true);
      setTranscription('');
      console.log('Recording started successfully');
  
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Could not start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [initializeWebSocket, isRecording]);

  const stopRecording = useCallback(() => {
    try {
      console.log("Stopping recording...");
      // Stop the media recorder and close streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      // Disconnect the audio processor
      if (processorRef.current && audioContextRef.current) {
        processorRef.current.disconnect()
        processorRef.current = null
      }
      
      // Close the WebSocket connection
      if (websocketRef.current) {
        if (websocketRef.current.readyState === WebSocket.OPEN) {
          websocketRef.current.close(1000, "Recording stopped by user");
          websocketRef.current = null;
        }
      }
      
      setIsRecording(false)
      sessionSetupCompletedRef.current = false;
      console.log("Recording stopped successfully");
    } catch (err) {
      console.error('Error stopping recording:', err)
      setError(`Error stopping recording: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])
  
  // Clean up resources when the component unmounts
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up resources...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      if (processorRef.current && audioContextRef.current) {
        processorRef.current.disconnect()
      }
      
      if (websocketRef.current) {
        websocketRef.current.close()
      }
      
      sessionSetupCompletedRef.current = false;
    }
  }, [])
  
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
