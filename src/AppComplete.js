import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfessionalFlowchart from './ProfessionalFlowchart';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // State management
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
        setTimeout(() => {
          if (!loading) return;
          handleAnalyze();
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

    const nodes = workflow.workflow_nodes;
    
    // Enhanced workflow data for better demonstration
    const enhancedWorkflows = {
      'user_journey': {
        title: '👤 User Journey Workflow',
        description: 'Step-by-step user experience flow through your product',
        nodes: [
          { id: 'start', type: 'start', label: 'User Entry Point', description: 'User begins their journey' },
          { id: 'process1', type: 'process', label: 'Discover & Browse', description: 'User explores available options' },
          { id: 'process2', type: 'process', label: 'Select & Configure', description: 'User makes choices and customizes' },
          { id: 'decision1', type: 'decision', label: 'Authentication Required?', description: 'System checks if login needed' },
          { id: 'process3', type: 'process', label: 'Complete Action', description: 'User completes their intended task' },
          { id: 'end', type: 'end', label: 'Success & Confirmation', description: 'User receives confirmation' }
        ]
      },
      'service_blueprint': {
        title: '🏗️ Service Blueprint Workflow',
        description: 'Backend service delivery and support processes',
        nodes: [
          { id: 'start', type: 'start', label: 'Service Request', description: 'Initial service demand' },
          { id: 'process1', type: 'process', label: 'Request Validation', description: 'System validates and routes request' },
          { id: 'decision1', type: 'decision', label: 'Priority Assessment', description: 'Determine service priority level' },
          { id: 'process2', type: 'process', label: 'Resource Allocation', description: 'Assign appropriate resources' },
          { id: 'process3', type: 'process', label: 'Service Delivery', description: 'Execute core service functionality' },
          { id: 'end', type: 'end', label: 'Service Complete', description: 'Service delivered successfully' }
        ]
      },
      'feature_flow': {
        title: '⚡ Feature Flow Workflow',
        description: 'How product features connect and interact',
        nodes: [
          { id: 'start', type: 'start', label: 'Feature Trigger', description: 'Feature activation point' },
          { id: 'process1', type: 'process', label: 'Data Processing', description: 'Core feature logic execution' },
          { id: 'process2', type: 'process', label: 'Integration Points', description: 'Connect with other features' },
          { id: 'decision1', type: 'decision', label: 'Conditional Logic', description: 'Feature behavior branching' },
          { id: 'process3', type: 'process', label: 'Output Generation', description: 'Generate feature results' },
          { id: 'end', type: 'end', label: 'Feature Complete', description: 'Feature execution finished' }
        ]
      }
    };

    // Use enhanced data if available, otherwise fall back to actual data
    const workflowData = enhancedWorkflows[workflow.workflow_type] || {
      title: `🔄 ${workflow.workflow_type.replace('_', ' ')} Workflow`,
      description: 'AI-generated workflow from your PRD/BRD document',
      nodes: nodes.map(node => ({
        ...node,
        description: `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} step in the workflow`
      }))
    };
    
    return (
      <div className="space-y-8">
        {/* Enhanced Workflow Header */}
        <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-2xl p-8 border border-purple-500/40">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-primary mb-3">{workflowData.title}</h3>
              <p className="text-lg text-secondary leading-relaxed">{workflowData.description}</p>
            </div>
            <div className="text-right">
              <div className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                {workflow.workflow_type.replace('_', ' ')}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-600/30">
              <div className="text-2xl font-bold text-purple-400">{workflowData.nodes.length}</div>
              <div className="text-sm text-gray-300">Total Steps</div>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-600/30">
              <div className="text-2xl font-bold text-green-400">
                {workflowData.nodes.filter(n => n.type === 'start').length + workflowData.nodes.filter(n => n.type === 'end').length}
              </div>
              <div className="text-sm text-gray-300">Entry/Exit Points</div>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-600/30">
              <div className="text-2xl font-bold text-yellow-400">
                {workflowData.nodes.filter(n => n.type === 'decision').length}
              </div>
              <div className="text-sm text-gray-300">Decision Points</div>
            </div>
          </div>
        </div>

        {/* Detailed Workflow Steps */}
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
          <h4 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <span className="mr-3">📋</span>
            Workflow Steps Breakdown
          </h4>
          
          <div className="space-y-6">
            {workflowData.nodes.map((node, index) => (
              <div key={node.id || index} className={`relative flex items-start p-6 rounded-xl border-l-4 transition-all duration-300 hover:transform hover:scale-[1.02] ${
                node.type === 'start' ? 'bg-green-900/20 border-l-green-500 hover:bg-green-900/30' :
                node.type === 'end' ? 'bg-red-900/20 border-l-red-500 hover:bg-red-900/30' :
                node.type === 'decision' ? 'bg-yellow-900/20 border-l-yellow-500 hover:bg-yellow-900/30' :
                'bg-blue-900/20 border-l-blue-500 hover:bg-blue-900/30'
              }`}>
                {/* Step Number & Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-6 ${
                  node.type === 'start' ? 'bg-green-500/30 text-green-300 border-2 border-green-500/50' :
                  node.type === 'end' ? 'bg-red-500/30 text-red-300 border-2 border-red-500/50' :
                  node.type === 'decision' ? 'bg-yellow-500/30 text-yellow-300 border-2 border-yellow-500/50' :
                  'bg-blue-500/30 text-blue-300 border-2 border-blue-500/50'
                }`}>
                  {index + 1}
                </div>
                
                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mr-4 ${
                      node.type === 'start' ? 'bg-green-500/30 text-green-300' :
                      node.type === 'end' ? 'bg-red-500/30 text-red-300' :
                      node.type === 'decision' ? 'bg-yellow-500/30 text-yellow-300' :
                      'bg-blue-500/30 text-blue-300'
                    }`}>
                      {node.type}
                    </span>
                    <h5 className="text-xl font-bold text-primary">{node.label}</h5>
                  </div>
                  
                  <p className="text-secondary leading-relaxed mb-4">{node.description}</p>
                  
                  {/* Step metadata */}
                  <div className="flex items-center text-sm text-muted space-x-4">
                    <span>Step {index + 1} of {workflowData.nodes.length}</span>
                    {node.type === 'decision' && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                        ⚡ Decision Point
                      </span>
                    )}
                    {(node.type === 'start' || node.type === 'end') && (
                      <span className={`px-2 py-1 rounded ${
                        node.type === 'start' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {node.type === 'start' ? '🚀 Entry Point' : '🎯 Exit Point'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Connection Arrow */}
                {index < workflowData.nodes.length - 1 && (
                  <div className="absolute -bottom-3 left-6 transform translate-x-0">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-purple-400 to-transparent"></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full transform -translate-x-1 -mt-1"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visual Flow Diagram */}
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
          <h4 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <span className="mr-3">🔄</span>
            Visual Flow Diagram
          </h4>
          
          <div className="overflow-x-auto pb-4">
            <div className="flex items-center space-x-6 min-w-max">
              {workflowData.nodes.map((node, index) => (
                <React.Fragment key={node.id || index}>
                  {/* Enhanced Flow Node */}
                  <div className={`relative flex flex-col items-center p-6 rounded-2xl border-2 min-w-[140px] max-w-[180px] transition-all duration-300 hover:transform hover:scale-105 ${
                    node.type === 'start' ? 'bg-green-900/40 border-green-500/60 hover:border-green-400' :
                    node.type === 'end' ? 'bg-red-900/40 border-red-500/60 hover:border-red-400' :
                    node.type === 'decision' ? 'bg-yellow-900/40 border-yellow-500/60 hover:border-yellow-400' :
                    'bg-blue-900/40 border-blue-500/60 hover:border-blue-400'
                  }`}>
                    
                    {/* Node Type Badge */}
                    <div className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 py-1 rounded-full ${
                      node.type === 'start' ? 'bg-green-500/40 text-green-200' :
                      node.type === 'end' ? 'bg-red-500/40 text-red-200' :
                      node.type === 'decision' ? 'bg-yellow-500/40 text-yellow-200' :
                      'bg-blue-500/40 text-blue-200'
                    }`}>
                      {node.type}
                    </div>
                    
                    {/* Node Label */}
                    <div className={`text-sm font-bold text-center leading-tight ${
                      node.type === 'start' ? 'text-green-200' :
                      node.type === 'end' ? 'text-red-200' :
                      node.type === 'decision' ? 'text-yellow-200' :
                      'text-blue-200'
                    }`}>
                      {node.label}
                    </div>
                    
                    {/* Step Number */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Enhanced Arrow */}
                  {index < workflowData.nodes.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="text-purple-400 text-2xl animate-pulse">→</div>
                      <div className="text-xs text-purple-300 mt-1">NEXT</div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Summary & Insights */}
        <div className="bg-gradient-to-r from-gray-900/40 to-purple-900/40 rounded-2xl p-8 border border-gray-500/30">
          <h4 className="text-2xl font-bold text-primary mb-6 flex items-center">
            <span className="mr-3">📊</span>
            Workflow Analysis & Insights
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-6 rounded-xl bg-green-900/30 border border-green-500/40">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {workflowData.nodes.filter(n => n.type === 'start').length}
              </div>
              <div className="text-sm text-green-300 font-medium">Start Points</div>
              <div className="text-xs text-green-200/70 mt-1">Entry paths</div>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-blue-900/30 border border-blue-500/40">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {workflowData.nodes.filter(n => n.type === 'process').length}
              </div>
              <div className="text-sm text-blue-300 font-medium">Process Steps</div>
              <div className="text-xs text-blue-200/70 mt-1">Core actions</div>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-yellow-900/30 border border-yellow-500/40">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                {workflowData.nodes.filter(n => n.type === 'decision').length}
              </div>
              <div className="text-sm text-yellow-300 font-medium">Decisions</div>
              <div className="text-xs text-yellow-200/70 mt-1">Choice points</div>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-red-900/30 border border-red-500/40">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {workflowData.nodes.filter(n => n.type === 'end').length}
              </div>
              <div className="text-sm text-red-300 font-medium">End Points</div>
              <div className="text-xs text-red-200/70 mt-1">Exit paths</div>
            </div>
          </div>
          
          {/* Workflow Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-500/30">
              <h5 className="text-lg font-bold text-purple-300 mb-4">🎯 Key Insights</h5>
              <ul className="space-y-2 text-sm text-secondary">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>Workflow has {workflowData.nodes.length} clearly defined steps</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>{workflowData.nodes.filter(n => n.type === 'decision').length} decision points require user/system choices</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>Linear flow with minimal complexity branches</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/30">
              <h5 className="text-lg font-bold text-blue-300 mb-4">⚡ Optimization Tips</h5>
              <ul className="space-y-2 text-sm text-secondary">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Consider adding validation steps before decisions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Add error handling paths for robustness</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Include user feedback loops for UX improvement</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <div className="text-sm text-muted">
              Generated on {new Date(workflow.timestamp).toLocaleDateString()} • 
              Document: {workflow.document_length} characters • 
              Type: {workflow.workflow_type.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGapAnalysis = (analysis) => {
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
    if (!analysisResult && !workflowResult) return null;

    if (workflowResult) {
      return (
        <div className="space-y-8">
          {/* Professional Flowchart Component */}
          <ProfessionalFlowchart workflow={workflowResult} />
          
          {/* Enhanced Workflow Details */}
          {renderWorkflowNodes(workflowResult)}
        </div>
      );
    }

    if (analysisResult && analysisType === 'gap_analysis') {
      return renderGapAnalysis(analysisResult);
    } else if (analysisResult) {
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
                Analyze documents and generate workflows with AI
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
                  <span>🔄 Workflows</span>
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
                <div className="error-message">
                  {error}
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
              
              {/* Mode Toggle - Enhanced Toggle Button */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-secondary mb-4">Mode Selection</label>
                
                {/* Toggle Button Container */}
                <div className="relative">
                  <div className="flex items-center bg-gray-900/60 rounded-2xl p-2 border border-purple-500/30">
                    {/* Analysis Mode Button */}
                    <button
                      onClick={() => {
                        setShowWorkflowGenerator(false);
                        setAnalysisResult(null);
                        setWorkflowResult(null);
                        setError(null);
                      }}
                      className={`flex-1 relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        !showWorkflowGenerator
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg">📊</span>
                        <span>Analysis Mode</span>
                      </div>
                      {!showWorkflowGenerator && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
                      )}
                    </button>
                    
                    {/* Workflow Mode Button */}
                    <button
                      onClick={() => {
                        setShowWorkflowGenerator(true);
                        setAnalysisResult(null);
                        setWorkflowResult(null);
                        setError(null);
                      }}
                      className={`flex-1 relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        showWorkflowGenerator
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg">🔄</span>
                        <span>Workflow Mode</span>
                      </div>
                      {showWorkflowGenerator && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 animate-pulse"></div>
                      )}
                    </button>
                  </div>
                  
                  {/* Mode Description */}
                  <div className="mt-3 text-sm text-muted text-center">
                    {!showWorkflowGenerator ? (
                      <span>📊 Analyze documents for gaps, requirements, and insights</span>
                    ) : (
                      <span>🔄 Generate visual workflows from your PRD/BRD documents</span>
                    )}
                  </div>
                </div>
                
                {/* Mode-specific Selector */}
                {!showWorkflowGenerator ? (
                  <div className="mt-6">
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
                ) : (
                  <div className="mt-6">
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

              {/* Action Buttons */}
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
                    className="btn-primary w-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-glow"
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
            {(loading || workflowLoading) && (
              <div className="card p-12 text-center">
                <div className="loading-spinner mx-auto mb-6"></div>
                <h3 className="text-xl font-medium text-primary mb-2">
                  {showWorkflowGenerator ? 'AI Workflow Generation in Progress' : 'AI Analysis in Progress'}
                </h3>
                <p className="text-secondary">
                  {showWorkflowGenerator ? 'Creating visual workflow from your document...' : 'Analyzing your document with advanced AI...'}
                </p>
                {showWorkflowGenerator && (
                  <div className="mt-4 text-sm text-muted">
                    <p>✨ Generating {workflowType.replace('_', ' ')} workflow</p>
                    <p>📊 This may take 10-30 seconds</p>
                  </div>
                )}
              </div>
            )}

            {(analysisResult || workflowResult) && !loading && !workflowLoading && (
              <div className="card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold text-primary">
                    {showWorkflowGenerator ? 'Generated Workflow' : 'Analysis Results'}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="badge badge-primary">
                      {showWorkflowGenerator ? workflowType.replace('_', ' ') : analysisType.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted">
                      {(analysisResult?.document_length || workflowResult?.document_length)} characters
                    </div>
                  </div>
                </div>
                
                {renderAnalysisResult()}
              </div>
            )}

            {!analysisResult && !workflowResult && !loading && !workflowLoading && (
              <div className="card p-12 text-center">
                <div className="text-purple-400 mb-6">
                  <svg className="w-20 h-20 mx-auto opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-medium text-primary mb-4">Ready to Analyze</h3>
                <p className="text-secondary text-lg leading-relaxed">
                  Upload a document (PDF, DOCX, TXT, MD) or paste your PRD/BRD content to get started with AI-powered analysis and workflow generation.
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
                    Workflow Generation
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;