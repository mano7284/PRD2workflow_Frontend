import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [document, setDocument] = useState('');
  const [analysisType, setAnalysisType] = useState('gap_analysis');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Workflow generator state
  const [showWorkflowGenerator, setShowWorkflowGenerator] = useState(false);
  const [workflowType, setWorkflowType] = useState('user_journey');
  const [workflowResult, setWorkflowResult] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserInfo(token);
    }
    fetchRecentAnalyses();
  }, []);

  const fetchUserInfo = async (token) => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (err) {
      localStorage.removeItem('token');
    }
  };

  const fetchRecentAnalyses = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API}/analyses`, { headers });
      setRecentAnalyses(response.data.slice(0, 5));
    } catch (err) {
      console.error('Error fetching recent analyses:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login' 
        ? { email: authData.email, password: authData.password }
        : { email: authData.email, password: authData.password, name: authData.name };

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setShowAuth(false);
      setAuthData({ email: '', password: '', name: '' });
      
      fetchRecentAnalyses();
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setRecentAnalyses([]);
    fetchRecentAnalyses();
  };

  const handleAnalyze = async () => {
    if (!document.trim()) {
      setError('Please enter a document to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API}/analyze-document`, {
        document_content: document,
        analysis_type: analysisType
      }, { headers });

      setAnalysisResult(response.data);
      fetchRecentAnalyses();
    } catch (err) {
      let errorMessage = 'Analysis failed';
      
      if (err.response?.status === 503) {
        errorMessage = '🔄 AI service is experiencing high demand. Retrying automatically...';
        
        // Auto-retry after a short delay for 503 errors
        setTimeout(() => {
          if (!loading) return; // Don't retry if user has moved on
          handleAnalyze();
        }, 5000);
        
        return; // Don't set loading to false, keep the retry going
      } else if (err.response?.status === 429) {
        errorMessage = '⏳ Rate limit reached. Please wait a moment and try again.';
      } else if (err.response?.status === 504) {
        errorMessage = '⏱️ Request timed out. The AI is taking longer than expected. Please try again.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('analysis_type', analysisType);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'multipart/form-data'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post(`${API}/analyze-document-file`, formData, { headers });

      setAnalysisResult(response.data);
      fetchRecentAnalyses();
      setSelectedFile(null);
    } catch (err) {
      let errorMessage = 'File analysis failed';
      
      if (err.response?.status === 503) {
        errorMessage = '🔄 AI service is experiencing high demand. Retrying automatically...';
        
        // Auto-retry after a short delay for 503 errors
        setTimeout(() => {
          if (!loading) return;
          handleFileUpload(e);
        }, 5000);
        
        return;
      } else if (err.response?.status === 429) {
        errorMessage = '⏳ Rate limit reached. Please wait a moment and try again.';
      } else if (err.response?.status === 504) {
        errorMessage = '⏱️ Request timed out. The AI is taking longer than expected. Please try again.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkflow = async () => {
    if (!document.trim()) {
      setError('Please enter a document to generate workflow from');
      return;
    }

    setWorkflowLoading(true);
    setError(null);
    setWorkflowResult(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API}/generate-workflow`, {
        document_content: document,
        workflow_type: workflowType
      }, { headers });

      setWorkflowResult(response.data);
    } catch (err) {
      let errorMessage = 'Workflow generation failed';
      
      if (err.response?.status === 503) {
        errorMessage = '🔄 AI service is experiencing high demand. Retrying automatically...';
        setTimeout(() => {
          if (!workflowLoading) return;
          handleGenerateWorkflow();
        }, 5000);
        return;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const renderWorkflowNodes = (workflow) => {
    if (!workflow?.workflow_nodes) return null;

    return (
      <div className="relative bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-8 border border-purple-500/20 min-h-96">
        <h3 className="text-xl font-semibold text-primary mb-6 capitalize">
          🔄 {workflow.workflow_type.replace('_', ' ')} Workflow
        </h3>
        
        <div className="relative">
          <svg width="800" height="600" className="w-full h-auto">
            {/* Render connections */}
            {workflow.workflow_nodes.map(node => 
              node.connections?.map(targetId => {
                const targetNode = workflow.workflow_nodes.find(n => n.id === targetId);
                if (!targetNode) return null;
                
                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={node.x + 75}
                    y1={node.y + 25}
                    x2={targetNode.x + 75}
                    y2={targetNode.y + 25}
                    stroke="rgba(139, 92, 246, 0.6)"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}
            
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="rgba(139, 92, 246, 0.6)"
                />
              </marker>
            </defs>
          </svg>
          
          {/* Render nodes */}
          {workflow.workflow_nodes.map(node => (
            <div
              key={node.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-sm font-medium border ${
                node.type === 'start' ? 'bg-green-900/40 border-green-500/50 text-green-300' :
                node.type === 'end' ? 'bg-red-900/40 border-red-500/50 text-red-300' :
                node.type === 'decision' ? 'bg-yellow-900/40 border-yellow-500/50 text-yellow-300' :
                'bg-blue-900/40 border-blue-500/50 text-blue-300'
              }`}
              style={{
                left: `${(node.x / 800) * 100}%`,
                top: `${(node.y / 600) * 100}%`,
                maxWidth: '150px',
                zIndex: 10
              }}
            >
              {node.label}
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-sm text-secondary">
          <p><strong>Workflow Type:</strong> {workflow.workflow_type.replace('_', ' ')}</p>
          <p><strong>Nodes:</strong> {workflow.workflow_nodes.length}</p>
          <p><strong>Generated:</strong> {new Date(workflow.timestamp).toLocaleString()}</p>
        </div>
      </div>
    );
  };
    if (!analysis.analysis_result) return null;

    const result = analysis.analysis_result;
    
    return (
      <div className="space-y-6">
        <div className="analysis-section analysis-gaps">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-300">
            <span className="mr-3 text-2xl">⚠️</span>
            Business Gaps
          </h3>
          <ul className="space-y-3">
            {result.business_gaps?.map((gap, index) => (
              <li key={index} className="flex items-start text-red-200">
                <span className="mr-3 text-red-400 font-bold">•</span>
                <span className="leading-relaxed">{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="analysis-section analysis-ambiguities">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-yellow-300">
            <span className="mr-3 text-2xl">🔍</span>
            Design Ambiguities
          </h3>
          <ul className="space-y-3">
            {result.design_ambiguities?.map((ambiguity, index) => (
              <li key={index} className="flex items-start text-yellow-200">
                <span className="mr-3 text-yellow-400 font-bold">•</span>
                <span className="leading-relaxed">{ambiguity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="analysis-section analysis-requirements">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-300">
            <span className="mr-3 text-2xl">📋</span>
            Missing Requirements
          </h3>
          <ul className="space-y-3">
            {result.missing_requirements?.map((requirement, index) => (
              <li key={index} className="flex items-start text-blue-200">
                <span className="mr-3 text-blue-400 font-bold">•</span>
                <span className="leading-relaxed">{requirement}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="analysis-section analysis-edges">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-300">
            <span className="mr-3 text-2xl">🔄</span>
            Edge Cases
          </h3>
          <ul className="space-y-3">
            {result.edge_cases?.map((edge_case, index) => (
              <li key={index} className="flex items-start text-purple-200">
                <span className="mr-3 text-purple-400 font-bold">•</span>
                <span className="leading-relaxed">{edge_case}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="analysis-section analysis-recommendations">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-green-300">
            <span className="mr-3 text-2xl">💡</span>
            Recommendations
          </h3>
          <ul className="space-y-3">
            {result.recommendations?.map((recommendation, index) => (
              <li key={index} className="flex items-start text-green-200">
                <span className="mr-3 text-green-400 font-bold">•</span>
                <span className="leading-relaxed">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="analysis-section analysis-assessment">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-300">
            <span className="mr-3 text-2xl">📊</span>
            Overall Assessment
          </h3>
          <p className="text-gray-200 leading-relaxed text-base">{result.overall_assessment}</p>
        </div>
      </div>
    );
  };

  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    if (analysisType === 'gap_analysis') {
      return renderGapAnalysis(analysisResult);
    } else {
      return (
        <div className="card">
          <h3 className="text-lg font-semibold text-primary mb-6">Analysis Result</h3>
          <pre className="text-sm text-secondary bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-6 rounded-lg overflow-x-auto border border-purple-500/20">
            {JSON.stringify(analysisResult.analysis_result, null, 2)}
          </pre>
        </div>
      );
    }
  };

  const loadSampleDocument = () => {
    const sample = `# Social Media Management Platform - PRD

## Executive Summary
Build a comprehensive social media management platform that allows businesses to manage multiple social media accounts, schedule posts, track analytics, and engage with their audience from a single dashboard.

## Business Goals
- Increase social media engagement for small to medium businesses
- Provide unified social media management solution
- Generate revenue through subscription-based model

## Target Audience
- Small to medium businesses (1-50 employees)
- Social media managers
- Marketing agencies

## Core Features
- Multi-platform social media account integration
- Post scheduling and publishing
- Analytics dashboard
- Content calendar
- Team collaboration tools

## User Stories
- As a social media manager, I want to schedule posts across multiple platforms
- As a business owner, I want to see analytics for all my social media accounts
- As a team member, I want to collaborate on content creation

## Technical Requirements
- Web-based application
- Mobile responsive design
- API integrations with major social platforms
- Real-time notifications

## Success Metrics
- User adoption rate
- Monthly active users
- Post engagement rates
- Customer satisfaction scores`;

    setDocument(sample);
  };

  return (
    <div className="App">
      {/* Header */}
      <div className="header">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                PRD/BRD AI Analyzer
              </h1>
              <p className="text-secondary text-lg">
                Analyze your Product Requirements Documents and Business Requirements Documents with AI
              </p>
            </div>
            <div className="flex items-center space-x-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="glass-effect px-4 py-2 rounded-full">
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">{user.name}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn-primary"
                >
                  Sign In
                </button>
              )}
              <div className="text-right">
                <div className="text-sm text-secondary">Powered by Gemini AI</div>
                <div className="text-xs text-muted flex items-center space-x-2">
                  <span>📄 PDF</span>
                  <span>📝 DOCX</span>
                  <span>📋 TXT</span>
                  <span>📖 MD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-3xl font-bold text-primary mb-8 text-center">
              {authMode === 'login' ? 'Welcome Back' : 'Join Us'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-6">
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Full Name</label>
                  <input
                    type="text"
                    value={authData.name}
                    onChange={(e) => setAuthData({...authData, name: e.target.value})}
                    className="input-field w-full"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Email Address</label>
                <input
                  type="email"
                  value={authData.email}
                  onChange={(e) => setAuthData({...authData, email: e.target.value})}
                  className="input-field w-full"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Password</label>
                <input
                  type="password"
                  value={authData.password}
                  onChange={(e) => setAuthData({...authData, password: e.target.value})}
                  className="input-field w-full"
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              {error && (
                <div className={`mt-4 p-4 rounded-lg border transition-all duration-300 ${
                  error.includes('🔄') ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' :
                  error.includes('⏳') ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                  error.includes('⏱️') ? 'bg-orange-900/20 border-orange-500/30 text-orange-300' :
                  'bg-red-900/20 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-center">
                    {error.includes('🔄') && (
                      <div className="loading-spinner mr-3 w-4 h-4"></div>
                    )}
                    <span>{error}</span>
                  </div>
                  {error.includes('🔄') && (
                    <div className="mt-2 text-sm opacity-80">
                      The AI service is currently experiencing high demand. We're automatically retrying your request...
                    </div>
                  )}
                  {error.includes('⏳') && (
                    <div className="mt-2 text-sm opacity-80">
                      This happens during peak usage times. Please wait 30-60 seconds before trying again.
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuth(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <div className="lg:col-span-1 space-y-8">
            <div className="card p-8">
              <h2 className="text-2xl font-semibold text-primary mb-6">Document Input</h2>
              
              {/* Analysis Type Selector */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-secondary mb-3">Analysis Type</label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="gap_analysis">🔍 Gap Analysis</option>
                  <option value="requirements_extraction">📋 Requirements Extraction</option>
                  <option value="summary">📊 Document Summary</option>
                </select>
              </div>

              {/* Workflow Generator Toggle */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-secondary">Mode</label>
                  <button
                    onClick={() => setShowWorkflowGenerator(!showWorkflowGenerator)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      showWorkflowGenerator 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
                    }`}
                  >
                    {showWorkflowGenerator ? '📊 Analysis Mode' : '🔄 Workflow Mode'}
                  </button>
                </div>
                
                {showWorkflowGenerator && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-secondary mb-3">Workflow Type</label>
                    <select
                      value={workflowType}
                      onChange={(e) => setWorkflowType(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="user_journey">👤 User Journey</option>
                      <option value="service_blueprint">🏗️ Service Blueprint</option>
                      <option value="feature_flow">⚡ Feature Flow</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-secondary mb-3">Document Content</label>
                <textarea
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Paste your PRD/BRD document here..."
                  className="textarea-field w-full h-80"
                />
                <button
                  onClick={loadSampleDocument}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  ✨ Load Sample Document
                </button>
              </div>

              {/* File Upload */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-secondary mb-3">Or Upload File</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="input-field w-full"
                />
                <p className="text-xs text-muted mt-2 flex items-center space-x-3">
                  <span>📄 PDF</span>
                  <span>📝 DOCX</span>
                  <span>📋 TXT</span>
                  <span>📖 MD</span>
                </p>
              </div>

              {/* Analyze Buttons */}
              <div className="space-y-4">
                {!showWorkflowGenerator ? (
                  <>
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="btn-primary w-full"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="loading-spinner mr-3"></div>
                          Analyzing...
                        </div>
                      ) : (
                        '🚀 Analyze Document'
                      )}
                    </button>

                    {selectedFile && (
                      <button
                        onClick={handleFileUpload}
                        disabled={loading}
                        className="btn-success w-full"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="loading-spinner mr-3"></div>
                            Analyzing File...
                          </div>
                        ) : (
                          `📁 Analyze ${selectedFile.name}`
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleGenerateWorkflow}
                    disabled={workflowLoading}
                    className="btn-primary w-full bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {workflowLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner mr-3"></div>
                        Generating Workflow...
                      </div>
                    ) : (
                      '🔄 Generate Workflow'
                    )}
                  </button>
                )}
              </div>

              {error && (
                <div className={`mt-4 p-4 rounded-lg border transition-all duration-300 ${
                  error.includes('🔄') ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' :
                  error.includes('⏳') ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                  error.includes('⏱️') ? 'bg-orange-900/20 border-orange-500/30 text-orange-300' :
                  'bg-red-900/20 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-center">
                    {error.includes('🔄') && (
                      <div className="loading-spinner mr-3 w-4 h-4"></div>
                    )}
                    <span>{error}</span>
                  </div>
                  {error.includes('🔄') && (
                    <div className="mt-2 text-sm opacity-80">
                      The AI service is currently experiencing high demand. We're automatically retrying your request...
                    </div>
                  )}
                  {error.includes('⏳') && (
                    <div className="mt-2 text-sm opacity-80">
                      This happens during peak usage times. Please wait 30-60 seconds before trying again.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Analyses */}
            {recentAnalyses.length > 0 && (
              <div className="card p-6">
                <h3 className="text-xl font-semibold text-primary mb-6">
                  {user ? '📊 Your Recent Analyses' : '📊 Recent Analyses'}
                </h3>
                <div className="space-y-4">
                  {recentAnalyses.map((analysis) => (
                    <div key={analysis.id} className="recent-item">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-secondary">
                            {new Date(analysis.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-sm font-medium text-primary capitalize">
                            {analysis.analysis_type.replace('_', ' ')}
                          </div>
                        </div>
                        <div className="text-xs text-muted">
                          {analysis.document_length} chars
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="card p-12 text-center">
                <div className="loading-spinner mx-auto mb-6"></div>
                <h3 className="text-xl font-medium text-primary mb-2">AI Analysis in Progress</h3>
                <p className="text-secondary">Analyzing your document with advanced AI...</p>
              </div>
            )}

            {analysisResult && !loading && (
              <div className="card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold text-primary">Analysis Results</h2>
                  <div className="flex items-center space-x-4">
                    <div className="badge badge-primary">
                      {analysisResult.analysis_type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted">
                      {analysisResult.document_length} characters
                    </div>
                  </div>
                </div>
                
                {renderAnalysisResult()}
              </div>
            )}

            {!analysisResult && !loading && (
              <div className="card p-12 text-center">
                <div className="text-purple-400 mb-6">
                  <svg className="w-20 h-20 mx-auto opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-medium text-primary mb-4">Ready to Analyze</h3>
                <p className="text-secondary text-lg leading-relaxed">
                  Upload a document (PDF, DOCX, TXT, MD) or paste your PRD/BRD content to get started with AI-powered analysis.
                </p>
                <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-muted">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    Gap Analysis
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    Requirements Extraction
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Document Summary
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

export default App;