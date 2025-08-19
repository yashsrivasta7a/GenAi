import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, MessageCircle, Loader2, CheckCircle, AlertCircle, Bot, User, Database } from 'lucide-react';

const HomePage = () => {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [textAreaContent, setTextAreaContent] = useState('');
  const [webContent, setWebsiteUrl] = useState('');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'website'
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
    
    const queryToSend = currentQuery;
    setCurrentQuery('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userQuery: queryToSend }),
      });

      const result = await response.json();

      if (response.ok) {
        const botMessage = { 
          role: 'assistant', 
          content: result.response || result.message, 
          timestamp: new Date() 
        };
        setChatMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Sorry, there was an error processing your query: ${error.message}`, 
        timestamp: new Date(),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
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
                  <input
                    type="url"
                    value={webContent}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="Enter website URL here..."
                    className="w-full flex-1 bg-black border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
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
                      <div key={index} className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex space-x-3 max-w-xs ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === 'user' ? 'bg-white' : message.isError ? 'bg-red-900' : 'bg-zinc-800'
                          }`}>
                            {message.role === 'user' ? (
                              <User className="w-4 h-4 text-black" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className={`px-4 py-3 rounded-2xl max-w-full border ${
                            message.role === 'user' 
                              ? 'bg-white text-black border-zinc-300' 
                              : message.isError 
                                ? 'bg-red-950/50 text-red-300 border-red-900'
                                : 'bg-zinc-900 text-zinc-200 border-zinc-800'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p className="text-xs mt-2 opacity-60">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isQuerying && (
                      <div className="flex space-x-3 justify-start">
                        <div className="flex space-x-3 max-w-xs">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-800">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                              <span className="text-zinc-400 text-sm">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

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