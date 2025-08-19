
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, MessageCircle, Loader2, CheckCircle, AlertCircle, Bot, User, Database } from 'lucide-react';

const HomePage = () => {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [currentSteps, setCurrentSteps] = useState([]); // For real-time step display
  const [textAreaContent, setTextAreaContent] = useState('');
  const [webContent, setWebsiteUrl] = useState('');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'website'
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentSteps]);

  // Simulate Perplexity-style steps for better UX while processing
  const simulateProcessingSteps = async (query, hasFetchedContent = false) => {
    const baseSteps = [
      { type: 'thinking', content: `Understanding your question: "${query}"` },
      { type: 'searching', content: 'Searching through knowledge base...' },
    ];

    if (hasFetchedContent) {
      baseSteps.push(
        { type: 'processing', content: 'Knowledge base has limited info, fetching live content...' },
        { type: 'analyzing', content: 'Analyzing both stored and live content...' },
        { type: 'synthesizing', content: 'Combining information from multiple sources...' }
      );
    } else {
      baseSteps.push(
        { type: 'analyzing', content: 'Analyzing relevant documents...' },
        { type: 'synthesizing', content: 'Generating response...' }
      );
    }

    setCurrentSteps([]);
    
    for (let i = 0; i < baseSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setCurrentSteps(prev => [...prev, baseSteps[i]]);
    }
  };

  const getStepTypeForDisplay = (stepType) => {
    const typeMap = {
      'start': 'thinking',
      'think': 'analyzing', 
      'tool': 'processing',
      'observe': 'searching',
      'answer': 'synthesizing'
    };
    return typeMap[stepType] || stepType;
  };
  
  const handleFileUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setUploadStatus('error');
      setUploadMessage('Please select a valid PDF file.');
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('Processing PDF...');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setUploadMessage(result.message);
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toLocaleString()
        }]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(`Error: ${error.message}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSubmitText = async () => {
    if (!textAreaContent.trim()) return;

    setUploadStatus('uploading');
    setUploadMessage('Processing text data...');

    try {
      const response = await fetch('/api/submit-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textContent: textAreaContent }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setUploadMessage(result.message);
        setUploadedFiles(prev => [...prev, {
          name: 'Text Input',
          size: textAreaContent.length,
          uploadedAt: new Date().toLocaleString()
        }]);
        setTextAreaContent('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(`Error: ${error.message}`);
    }
  };

  const handleSubmitWebsite = async () => {
    if (!webContent.trim()) return;

    setUploadStatus('uploading');
    setUploadMessage('Processing website...');

    try {
      const response = await fetch('/api/submit-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({webContent }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setUploadMessage(result.message);
        setUploadedFiles(prev => [...prev, {
          name: `Website: ${webContent}`,
          size: webContent.length,
          uploadedAt: new Date().toLocaleString()
        }]);
        setWebsiteUrl('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(`Error: ${error.message}`);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!currentQuery.trim() || isQuerying) return;

    const userMessage = { role: 'user', content: currentQuery, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setIsQuerying(true);
    setCurrentSteps([]);
    
    const queryToSend = currentQuery;
    setCurrentQuery('');

    try {
      // Make the actual API call
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userQuery: queryToSend }),
      });

      const result = await response.json();

      if (response.ok) {
        // Start processing steps based on whether content was fetched
        const processingPromise = simulateProcessingSteps(queryToSend, result.fetchedContent);
        await processingPromise;
        
        // Show final answer after steps
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Ensure we only use sources from this specific response
        let formattedSources = [];
        if (result.sources && Array.isArray(result.sources) && result.sources.length > 0) {
          formattedSources = result.sources.map(source => {
            // If source is already a string, return as is
            if (typeof source === 'string') {
              return source;
            }
            
            let sourceText = '';
            
            // If source is an object with URL
            if (source.url && (source.url.startsWith('http://') || source.url.startsWith('https://'))) {
              sourceText = `${source.title} (${source.url})`;
            } else {
              // Return just the title/page info without invalid URL
              sourceText = `${source.title} - Page ${source.page}`;
            }

            // Add indicator if this was fetched live
            if (source.isFetched) {
              sourceText += ' 🔴 Live';
            }

            return sourceText;
          });

          // Remove any duplicate sources (additional safety)
          formattedSources = [...new Set(formattedSources)];
        }

        const botMessage = { 
          role: 'assistant', 
          content: result.response || result.message,
          sources: formattedSources, // Only use sources from this specific response
          timestamp: new Date(),
          isPerplexityStyle: true,
          hasFetchedContent: result.fetchedContent || false
        };
        setChatMessages(prev => [...prev, botMessage]);
        setCurrentSteps([]); // Clear steps after completion

      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Sorry, there was an error processing your query: ${error.message}`, 
        timestamp: new Date(),
        isError: true,
        sources: [] // Ensure no sources for error messages
      };
      setChatMessages(prev => [...prev, errorMessage]);
      setCurrentSteps([]);
    } finally {
      setIsQuerying(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStepIcon = (type) => {
    switch (type) {
      case 'thinking': return '🤔';
      case 'searching': return '🔍';
      case 'processing': return '⚡';
      case 'analyzing': return '🧠';
      case 'synthesizing': return '✨';
      default: return '💭';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white ">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm"></div>
          </div>
          <h1 className="text-2xl font-light tracking-wide">
            TEXTBOOK<span className="font-normal">LM</span>
          </h1>
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>

      <div className="flex-1 p-6 h-[calc(100vh-140px)] overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
          
          {/* Data Source Panel */}
          <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
            {/* TextArea Section */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-[calc(50%-12px)] flex flex-col overflow-hidden">
              <div className="flex items-center space-x-3 mb-6 flex-shrink-0">
                {inputMode === 'text' ? (
                  <FileText className="w-5 h-5 text-white" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
                <h2 className="text-lg font-light">
                  {inputMode === 'text' ? 'Text Input' : 'Website Input'}
                </h2>
                <div className="flex-1 h-px bg-zinc-800"></div>
                
                {/* Toggle Switch */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                      inputMode === 'text' 
                        ? 'bg-white text-black' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setInputMode('website')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                      inputMode === 'website' 
                        ? 'bg-white text-black' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Website
                  </button>
                </div>
              </div>
              
              {inputMode === 'text' ? (
                // Text Input Mode
                <>
                  <textarea
                    value={textAreaContent}
                    onChange={(e) => setTextAreaContent(e.target.value)}
                    placeholder="Enter your content here..."
                    className="w-full flex-1 bg-black border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700"
                  />
                  
                  <button
                    onClick={handleSubmitText}
                    disabled={!textAreaContent.trim() || uploadStatus === 'uploading'}
                    className="mt-4 w-full px-6 py-3 bg-white text-black rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 hover:bg-zinc-200 flex-shrink-0"
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Text</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                // Website Input Mode
                <>
                  <textarea
                     type="url"
                    value={webContent}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="Enter website URL here..."
                    className="w-full flex-1 bg-black border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700"
                  />
                  
                  <button
                    onClick={handleSubmitWebsite}
                    disabled={!webContent.trim() || uploadStatus === 'uploading'}
                    className="mt-4 w-full px-6 py-3 bg-white text-black rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 hover:bg-zinc-200 flex-shrink-0"
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Website</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Upload Files Section */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-[calc(50%-12px)] flex flex-col mt-6 overflow-hidden">
              <div className="flex items-center space-x-3 mb-6 flex-shrink-0">
                <Upload className="w-5 h-5 text-white" />
                <h2 className="text-lg font-light">Upload PDF</h2>
                <div className="flex-1 h-px bg-zinc-800"></div>
              </div>
              
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 flex-1 flex flex-col items-center justify-center min-h-0 ${
                  uploadStatus === 'uploading' 
                    ? 'border-zinc-600 bg-zinc-900' 
                    : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {uploadStatus === 'uploading' ? (
                  <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
                ) : (
                  <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                )}
                
                <p className="text-sm text-zinc-500 mb-2">
                  {uploadStatus === 'uploading' ? 'Processing...' : 'Drop PDF or click to browse'}
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadStatus === 'uploading'}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-all duration-200 disabled:opacity-50"
                >
                  Choose File
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {uploadStatus !== 'idle' && (
                <div className={`mt-4 p-3 rounded-xl flex items-center space-x-2 text-sm border flex-shrink-0 ${
                  uploadStatus === 'success' ? 'bg-zinc-900 text-zinc-300 border-zinc-700' :
                  uploadStatus === 'error' ? 'bg-red-950/50 text-red-400 border-red-900' :
                  'bg-zinc-900 text-zinc-400 border-zinc-700'
                }`}>
                  {uploadStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                  {uploadStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                  {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{uploadMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* RAG Store Panel */}
          <div className="lg:col-span-1 h-full overflow-hidden">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-full shadow-lg shadow-white/5 flex flex-col overflow-hidden">
              <div className="flex items-center space-x-3 mb-6">
                <Database className="w-5 h-5 text-white" />
                <h2 className="text-lg font-light">Knowledge Base</h2>
                <div className="flex-1 h-px bg-zinc-800"></div>
                {uploadedFiles.length > 0 && (
                  <div className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-400 font-medium shadow-md shadow-white/10">
                    {uploadedFiles.length}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-h-0">
                {uploadedFiles.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Database className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                      <p className="text-zinc-500 text-sm">No documents stored</p>
                      <p className="text-zinc-600 text-xs mt-1">Upload files to build knowledge base</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto space-y-3 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:shadow-md hover:shadow-white/10 transition-all">
                        <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm shadow-white/5">
                          <FileText className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{file.name}</p>
                          <p className="text-xs text-zinc-500">
                            {formatFileSize(file.size)} • {file.uploadedAt}
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-white rounded-full shadow-sm shadow-white/20"></div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 flex-shrink-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Documents</span>
                      <span className="text-white font-medium">{uploadedFiles.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-1 h-full overflow-hidden">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center space-x-3 p-6 border-b border-zinc-800 flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
                <h2 className="text-lg font-light">Chat</h2>
                <div className="flex-1 h-px bg-zinc-800"></div>
                {chatMessages.length > 0 && (
                  <div className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-400 font-medium">
                    {chatMessages.length}
                  </div>
                )}
              </div>

              {/* Chat area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700 min-h-0">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Bot className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                      <p className="text-zinc-500 text-sm">Start conversation</p>
                      <p className="text-zinc-600 text-xs mt-1">Ask questions about your documents</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex space-x-3 max-w-md ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === 'user' ? 'bg-white' : message.isError ? 'bg-red-900' : 'bg-zinc-800'
                          }`}>
                            {message.role === 'user' ? <User className="w-4 h-4 text-black" /> : <Bot className="w-4 h-4 text-white" />}
                          </div>
                          <div className="max-w-full">
                            {/* User messages or error messages */}
                            {(message.role === 'user' || message.isError) && (
                              <div className={`px-4 py-3 rounded-2xl border ${
                                message.role === 'user' 
                                  ? 'bg-white text-black border-zinc-300' 
                                  : 'bg-red-950/50 text-red-300 border-red-900'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <p className="text-xs mt-2 opacity-60">{message.timestamp.toLocaleTimeString()}</p>
                              </div>
                            )}

                            {/* Assistant messages with Perplexity style */}
                            {message.role === 'assistant' && !message.isError && (
                              <div className="space-y-3">
                                {/* Main answer in highlighted box */}
                                <div className={`px-4 py-4 border rounded-2xl backdrop-blur-sm ${
                                  message.hasFetchedContent 
                                    ? 'bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-800/30'
                                    : 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/30'
                                }`}>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                                      message.hasFetchedContent ? 'bg-green-400' : 'bg-blue-400'
                                    }`}></div>
                                    <span className={`text-xs font-medium uppercase tracking-wide ${
                                      message.hasFetchedContent ? 'text-green-400' : 'text-blue-400'
                                    }`}>
                                      {message.hasFetchedContent ? 'Answer (with live content)' : 'Answer'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                  <p className="text-xs mt-3 text-zinc-400">{message.timestamp.toLocaleTimeString()}</p>
                                </div>

                                {/* Sources */}
                                {message.sources && (
                                  <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <div className="w-2 h-2 bg-zinc-400 rounded-full"></div>
                                      <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Sources</span>
                                    </div>
                                    <div className="space-y-1">
                                      {message.sources.map((source, idx) => {
                                        // Extract URL from source string if it exists
                                        let sourceUrl = '#';
                                        let sourceTitle = source;
                                        
                                        // Check if source contains a URL in parentheses
                                        const urlMatch = source.match(/\((https?:\/\/[^\)]+)\)/);
                                        if (urlMatch) {
                                          sourceUrl = urlMatch[1];
                                          sourceTitle = source.replace(/\s*\([^)]+\)/, '');
                                        } else if (source.includes('http://') || source.includes('https://')) {
                                          // Check if source contains a direct URL
                                          const directUrlMatch = source.match(/(https?:\/\/[^\s]+)/);
                                          if (directUrlMatch) {
                                            sourceUrl = directUrlMatch[1];
                                            sourceTitle = source.replace(directUrlMatch[1], '').trim();
                                          }
                                        }

                                        return (
                                          <div key={idx} className="text-xs text-zinc-300 flex items-center space-x-2">
                                            <span className="text-zinc-500">•</span>
                                            {sourceUrl !== '#' ? (
                                              <a 
                                                href={sourceUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 transition-colors"
                                              >
                                                {sourceTitle || 'Source'}
                                              </a>
                                            ) : (
                                              <span className="text-zinc-400">
                                                {sourceTitle}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Real-time processing steps (Perplexity style) */}
                    {isQuerying && (
                      <div className="flex space-x-3 justify-start">
                        <div className="flex space-x-3 max-w-md">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-800">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="space-y-2">
                            {currentSteps.map((step, index) => (
                              <div key={index} className="flex items-center space-x-3 text-zinc-400 text-sm animate-fade-in">
                                <span className="text-lg">{getStepIcon(step.type)}</span>
                                <span>{step.content}</span>
                              </div>
                            ))}
                            {currentSteps.length > 0 && (
                              <div className="flex items-center space-x-3 text-zinc-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-zinc-800 flex-shrink-0">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={currentQuery}
                    onChange={(e) => setCurrentQuery(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isQuerying}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuery(e)}
                    className="flex-1 px-4 py-3 bg-black border border-zinc-700 rounded-xl focus:outline-none focus:border-zinc-500 disabled:opacity-50 text-white placeholder-zinc-500 transition-colors"
                  />
                  <button
                    onClick={handleQuery}
                    disabled={!currentQuery.trim() || isQuerying}
                    className="px-6 py-3 bg-white text-black rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-zinc-200"
                  >
                    {isQuerying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-track-zinc-900::-webkit-scrollbar-track {
          background: #18181b;
        }
        .scrollbar-thumb-zinc-700::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 2px;
        }
        .scrollbar-thumb-zinc-700::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
};

export default HomePage;