import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { assistantApi } from '../../services/api/assistantApi';
import { agentsApi } from '../../services/api/agentsApi';
import { AssistantMessage, LangGraphAgent } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AudioWaveform } from '../../components/visualizer/AudioWaveform';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import {
  CpuIcon,
  MicIcon,
  StopIcon,
  SendIcon,
  VolumeIcon,
  VolumeXIcon,
  RefreshIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  FileTextIcon,
  NetworkIcon,
  CameraIcon,
  ClockIcon,
  UserIcon,
} from '../../components/icons/Icons';

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: 'CrimeMind Intelligence Assistant initialized. All 9 LangGraph agents are synced to the active investigative ledger. You can speak hands-free or type queries regarding suspect dossiers, multimodal evidence, or cross-case graph anomalies.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activeAgent: 'Synthesis Agent',
      sources: ['CASE-2024-2390', 'Midnight Syndicate Ledger', 'CCTV Frame Index'],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeAgentName, setActiveAgentName] = useState<string>('Planner');
  const [agentsList, setAgentsList] = useState<LangGraphAgent[]>([]);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Speech Hooks
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const { speak, stop: stopSpeaking, isSpeaking, isMuted, toggleMute } = useSpeechSynthesis();

  // Load agents status
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const ags = await agentsApi.getAll();
        setAgentsList(ags);
      } catch (err) {
        console.error('Failed to load agents', err);
      }
    };
    loadAgents();
  }, []);

  // Scroll to bottom on new messages or streaming tokens
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Handle Voice Transcript submission
  useEffect(() => {
    if (isVoiceMode && transcript && !isListening) {
      handleSend(transcript);
      resetTranscript();
    }
  }, [isVoiceMode, transcript, isListening]);

  const { navigateTo, setSelectedCaseId, setSelectedPersonId } = useApp();

  const handleSend = async (queryText?: string) => {
    const query = queryText || inputText;
    if (!query.trim() || isStreaming) return;

    const userMessage: AssistantMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsStreaming(true);
    setStreamingText('');

    try {
      let accumulated = '';
      const fullMsg = await assistantApi.streamAssistantResponse(
        query,
        (token: string) => {
          accumulated += token;
          setStreamingText(accumulated);
        },
        (event) => {
          setActiveAgentName(event.agent);
        }
      );

      const assistantMsg: AssistantMessage = {
        id: fullMsg?.id || `msg-asst-${Date.now()}`,
        sender: 'assistant',
        text: fullMsg?.content || accumulated,
        timestamp: fullMsg?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        activeAgent: fullMsg?.activeAgent || 'Synthesis Agent',
        sources: fullMsg?.sources || ['Central Ledger', 'LangGraph Swarm v2.4'],
        citations: fullMsg?.citations,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setStreamingText('');
      setIsStreaming(false);
      setActiveAgentName('Synthesis Agent');

      // If voice mode, stream back as audio
      if (isVoiceMode && !isMuted) {
        speak(assistantMsg.text);
      }
    } catch (err) {
      console.error('Assistant error', err);
      setIsStreaming(false);
    }
  };

  const handleStopAll = () => {
    stopListening();
    stopSpeaking();
    setIsStreaming(false);
    setStreamingText('');
  };

  const presetQueries = [
    'Show all open, closed, and reopened cases in the ledger',
    'Summarize Midnight Syndicate findings and known hideouts',
    'Locate Dodge Charger SYN-7X91 on recent CCTV feeds',
    'Cross-examine Evelyn Reed call records with Trevor Bennett',
    'List all high-priority pending forensic evidence items',
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* Left Main Assistant Chat Interface */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 12, 18, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--color-glass-border)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Assistant Header & Mode Controls */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 42, 66, 0.1)',
                border: '1px solid rgba(255, 42, 66, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CpuIcon size={20} color="var(--color-crimson)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  CrimeMind Intelligence Assistant
                </span>
                <Badge variant="crimson" pulse>
                  LangGraph v2.4
                </Badge>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Active Agent: <strong style={{ color: 'var(--color-crimson-bright)' }}>{activeAgentName}</strong>
              </span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setIsVoiceMode(false);
                stopListening();
                stopSpeaking();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: !isVoiceMode ? 'rgba(255, 42, 66, 0.15)' : 'transparent',
                border: !isVoiceMode ? '1px solid #FF2A42' : '1px solid var(--color-glass-border)',
                color: !isVoiceMode ? '#fff' : 'var(--color-text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Text Mode
            </button>

            <button
              onClick={() => {
                setIsVoiceMode(true);
                startListening();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isVoiceMode ? 'rgba(255, 42, 66, 0.15)' : 'transparent',
                border: isVoiceMode ? '1px solid #FF2A42' : '1px solid var(--color-glass-border)',
                color: isVoiceMode ? '#fff' : 'var(--color-text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <MicIcon size={14} color={isVoiceMode ? 'var(--color-crimson)' : 'currentColor'} />
              Hands-Free Voice
            </button>

            {isVoiceMode && (
              <Button variant="ghost" size="small" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeXIcon size={16} /> : <VolumeIcon size={16} />}
              </Button>
            )}

            {(isStreaming || isListening || isSpeaking) && (
              <Button variant="danger" size="small" icon={<StopIcon size={14} />} onClick={handleStopAll}>
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Voice/Waveform Banner (Visible in voice mode or while speaking) */}
        {isVoiceMode && (
          <div
            style={{
              padding: '16px 20px',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 42, 66, 0.08) 0%, transparent 100%)',
              borderBottom: '1px solid var(--color-glass-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isListening ? '#FF2A42' : isSpeaking ? '#10B981' : '#94A3B8',
                  boxShadow: isListening ? '0 0 10px #FF2A42' : isSpeaking ? '0 0 10px #10B981' : 'none',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isListening
                  ? 'Listening for voice prompt...'
                  : isSpeaking
                  ? 'Streaming audio response...'
                  : isStreaming
                  ? 'LangGraph agents orchestrating...'
                  : 'Microphone Standby (Hands-Free Active)'}
              </span>
            </div>

            <AudioWaveform isPlaying={isListening || isSpeaking || isStreaming} barCount={48} height={40} />

            {transcript && (
              <div
                style={{
                  fontSize: '12px',
                  fontStyle: 'italic',
                  color: 'var(--color-crimson-bright)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '4px',
                }}
              >
                "{transcript}"
              </div>
            )}
          </div>
        )}

        {/* Message Thread History */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Message Bubble Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span>{msg.sender === 'user' ? 'Lead Investigator' : 'CrimeMind AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
                {msg.activeAgent && (
                  <>
                    <span>•</span>
                    <Badge variant="crimson">{msg.activeAgent}</Badge>
                  </>
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background:
                    msg.sender === 'user'
                      ? 'rgba(255, 42, 66, 0.12)'
                      : 'rgba(255, 255, 255, 0.03)',
                  border:
                    msg.sender === 'user'
                      ? '1px solid rgba(255, 42, 66, 0.3)'
                      : '1px solid var(--color-glass-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>

              {/* Sources footer if available */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircleIcon size={10} color="var(--color-success)" />
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Verified Citations with Deep Navigation */}
              {msg.citations && msg.citations.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {msg.citations.map((cite, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (cite.type === 'CASE') {
                          setSelectedCaseId(cite.link);
                          navigateTo('investigations', { caseId: cite.link });
                        } else if (cite.type === 'PERSON') {
                          setSelectedPersonId(cite.link);
                          navigateTo('person-profile', { personId: cite.link });
                        } else if (cite.type === 'EVIDENCE') {
                          navigateTo('evidence');
                        } else if (cite.type === 'GRAPH') {
                          navigateTo('relationship-graph');
                        } else if (cite.type === 'DASHBOARD') {
                          navigateTo('dashboard');
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38BDF8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                      }}
                    >
                      <span>📎</span>
                      <span>{cite.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Currently Streaming Message Bubble */}
          {isStreaming && (
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '85%', alignSelf: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>CrimeMind AI</span>
                <span>•</span>
                <Badge variant="crimson" pulse>{activeAgentName}</Badge>
              </div>

              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 42, 66, 0.4)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                {streamingText || 'Routing prompt across LangGraph agents...'}
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '14px',
                    background: '#FF2A42',
                    marginLeft: '4px',
                    verticalAlign: 'middle',
                    animation: 'pulse 1s infinite',
                  }}
                />
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Preset Prompt Suggestions */}
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid var(--color-glass-border)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pq)}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {pq}
            </button>
          ))}
        </div>

        {/* Bottom Input Area */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--color-glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ flex: 1 }}>
            <Input
              placeholder={isVoiceMode ? 'Listening hands-free or type here...' : 'Ask assistant about cases, suspects, CCTV, calls, or evidence...'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={isStreaming}
            />
          </div>

          <Button
            variant={isListening ? 'danger' : 'ghost'}
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            title="Toggle Mic"
          >
            <MicIcon size={18} />
          </Button>

          <Button
            variant="primary"
            icon={<SendIcon size={16} />}
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isStreaming}
          >
            Send
          </Button>
        </div>
      </div>

      {/* Right Sidebar: LangGraph 9-Agent Swarm Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <Card variant="glass" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>
                LangGraph Multi-Agent DAG
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                9 Autonomous Cooperating Nodes
              </span>
            </div>
            <Badge variant="crimson">ACTIVE</Badge>
          </div>

          {/* List of 9 Agents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Planner', desc: 'Query decomposition & plan orchestration' },
              { name: 'Evidence Agent', desc: 'Multimodal vector search & forensic custody' },
              { name: 'Case Agent', desc: 'Case file cross-correlation & metadata' },
              { name: 'Person Agent', desc: 'Biometric dossiers, aliases & associates' },
              { name: 'CCTV Agent', desc: 'Optical facial recognition & ANPR plates' },
              { name: 'Graph Agent', desc: 'Graph traversal & syndicate topology' },
              { name: 'Law/Policy Retrieval Agent', desc: 'Statute verification & warrant bounds' },
              { name: 'Timeline Agent', desc: 'Chronological event sequencing' },
              { name: 'Synthesis Agent', desc: 'Final hypothesis deduction & reporting' },
            ].map((agent, i) => {
              const isActive = activeAgentName.toLowerCase().includes(agent.name.toLowerCase());
              return (
                <div
                  key={i}
                  style={{
                    background: isActive ? 'rgba(255, 42, 66, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid #FF2A42' : '1px solid var(--color-glass-border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isActive ? '#FF2A42' : 'rgba(255, 255, 255, 0.3)',
                          boxShadow: isActive ? '0 0 6px #FF2A42' : 'none',
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? '#FF2A42' : 'var(--color-text-primary)' }}>
                        {agent.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {agent.desc}
                    </span>
                  </div>

                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: isActive ? 'var(--color-crimson-bright)' : 'var(--color-text-muted)' }}>
                    {isActive ? 'INVOKED' : 'READY'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
