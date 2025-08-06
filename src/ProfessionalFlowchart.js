import React, { useRef, useEffect } from 'react';

const ProfessionalFlowchart = ({ workflow, onDownload }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (workflow?.workflow_nodes) {
      drawFlowchart();
    }
  }, [workflow]);

  const drawFlowchart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size - much larger for better resolution
    canvas.width = 2000;
    canvas.height = 1200;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const nodes = workflow.workflow_nodes;
    
    // Calculate better positioning
    const nodeWidth = 180;
    const nodeHeight = 80;
    const startX = 50;
    const startY = 150;
    const horizontalGap = 250;
    const verticalGap = 200;
    
    // Position nodes in a better layout
    const positionedNodes = nodes.map((node, index) => ({
      ...node,
      x: startX + (index % 5) * horizontalGap,
      y: startY + Math.floor(index / 5) * verticalGap,
      width: nodeWidth,
      height: nodeHeight
    }));
    
    // Draw connections first
    positionedNodes.forEach(node => {
      if (node.connections && node.connections.length > 0) {
        node.connections.forEach(targetId => {
          const targetNode = positionedNodes.find(n => n.id === targetId);
          if (targetNode) {
            drawConnection(ctx, node, targetNode);
          }
        });
      }
    });
    
    // Draw nodes
    positionedNodes.forEach((node, index) => {
      drawNode(ctx, node, index + 1);
    });
    
    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${workflow.workflow_type.replace('_', ' ').toUpperCase()} WORKFLOW`, canvas.width / 2, 40);
  };

  const drawConnection = (ctx, fromNode, toNode) => {
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    const fromX = fromNode.x + fromNode.width;
    const fromY = fromNode.y + fromNode.height / 2;
    const toX = toNode.x;
    const toY = toNode.y + toNode.height / 2;
    
    // Draw curved line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    
    if (Math.abs(fromY - toY) > 50) {
      // Curved line for different levels
      const midX = fromX + (toX - fromX) / 2;
      ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
    } else {
      // Straight line for same level
      ctx.lineTo(toX, toY);
    }
    ctx.stroke();
    
    // Draw arrowhead
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 15;
    
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle - Math.PI / 6),
      toY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle + Math.PI / 6),
      toY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  const drawNode = (ctx, node, stepNumber) => {
    const x = node.x;
    const y = node.y;
    const width = node.width;
    const height = node.height;
    
    // Set colors and styles based on node type
    let fillColor, strokeColor, textColor;
    
    switch (node.type) {
      case 'start':
        fillColor = '#22c55e';
        strokeColor = '#16a34a';
        textColor = '#ffffff';
        break;
      case 'end':
        fillColor = '#ef4444';
        strokeColor = '#dc2626';
        textColor = '#ffffff';
        break;
      case 'decision':
        fillColor = '#f59e0b';
        strokeColor = '#d97706';
        textColor = '#ffffff';
        break;
      default: // process
        fillColor = '#3b82f6';
        strokeColor = '#2563eb';
        textColor = '#ffffff';
        break;
    }
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    if (node.type === 'decision') {
      // Diamond shadow
      ctx.beginPath();
      ctx.moveTo(x + width/2 + 3, y + 3);
      ctx.lineTo(x + width + 3, y + height/2 + 3);
      ctx.lineTo(x + width/2 + 3, y + height + 3);
      ctx.lineTo(x + 3, y + height/2 + 3);
      ctx.closePath();
      ctx.fill();
    } else if (node.type === 'start' || node.type === 'end') {
      // Oval shadow
      ctx.beginPath();
      ctx.ellipse(x + width/2 + 3, y + height/2 + 3, width/2, height/2, 0, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Rectangle shadow
      ctx.fillRect(x + 3, y + 3, width, height);
    }
    
    // Draw main shape
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    
    if (node.type === 'decision') {
      // Draw diamond for decision
      ctx.beginPath();
      ctx.moveTo(x + width/2, y);
      ctx.lineTo(x + width, y + height/2);
      ctx.lineTo(x + width/2, y + height);
      ctx.lineTo(x, y + height/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (node.type === 'start' || node.type === 'end') {
      // Draw oval for start/end
      ctx.beginPath();
      ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      // Draw rectangle for process
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
    
    // Draw step number in top-left corner
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stepNumber.toString(), x + 8, y + 8);
    
    // Draw node type badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + width - 60, y + 5, 55, 20);
    ctx.fillStyle = textColor;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.type.toUpperCase(), x + width - 32, y + 15);
    
    // Draw main text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap the label text
    const words = node.label.split(' ');
    const maxWidth = width - 20;
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, truncate it
          lines.push(word.substring(0, 15) + '...');
          currentLine = '';
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw the text lines
    const lineHeight = 14;
    const totalTextHeight = lines.length * lineHeight;
    const startTextY = y + height/2 - totalTextHeight/2 + lineHeight/2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, x + width/2, startTextY + index * lineHeight);
    });
  };

  const downloadAsImage = (format) => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `workflow-${workflow.workflow_type}-${Date.now()}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, 0.9);
    link.click();
  };

  if (!workflow?.workflow_nodes) return null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-2xl font-bold text-primary flex items-center">
            <span className="mr-3">📊</span>
            Professional Flowchart
          </h4>
          
          <div className="flex space-x-3">
            <button
              onClick={() => downloadAsImage('png')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Download PNG</span>
            </button>
            <button
              onClick={() => downloadAsImage('jpeg')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Download JPG</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto bg-gray-900/40 rounded-xl p-4">
          <canvas
            ref={canvasRef}
            className="border border-gray-600/30 rounded-lg max-w-full h-auto"
            style={{ width: '100%', maxWidth: '100%' }}
          />
        </div>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-6 bg-green-500 border border-green-400 rounded-full"></div>
            <span className="text-sm text-secondary">Start/End</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-6 bg-blue-500 border border-blue-400"></div>
            <span className="text-sm text-secondary">Process</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-yellow-500 border border-yellow-400 transform rotate-45"></div>
            <span className="text-sm text-secondary">Decision</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-1 bg-purple-500"></div>
            <span className="text-sm text-secondary">Flow</span>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-muted">
          <p><strong>Workflow:</strong> {workflow.workflow_type.replace('_', ' ')}</p>
          <p><strong>Nodes:</strong> {workflow.workflow_nodes.length}</p>
          <p><strong>Generated:</strong> {new Date(workflow.timestamp).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalFlowchart;