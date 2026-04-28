import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, FileImage, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { analyzeImage } from '../lib/api';

export const UploadPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // New state for extended fields
  const [category, setCategory] = useState('building');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const clearFile = () => {
    setFile(null);
    setPreview('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const response = await analyzeImage(file, category, description, locationName);
      const reportId = response.data.report_id || response.data.id;
      
      navigate(`/report/${reportId}`, { 
        state: { 
          reportData: { ...response.data, id: reportId },
          imagePreview: preview
        }
      });
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center -mt-10">
      <div className="text-center mb-10">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-orange/10 mb-4 ring-1 ring-brand-orange/20"
        >
          <ShieldAlert className="w-8 h-8 text-brand-orange" />
        </motion.div>
        <h2 className="text-4xl font-bold mb-3 tracking-tight">AI Infrastructure Analysis</h2>
        <p className="text-slate-400 max-w-lg mx-auto text-lg">
          Upload an image of an infrastructure issue. Our AI will instantly detect anomalies, assess severity, and evaluate risk.
        </p>
      </div>

      <GlassCard className="w-full max-w-2xl relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-300 ${
                dragActive ? 'border-brand-orange bg-brand-orange/5' : 'border-white/10 hover:border-brand-orange/50 hover:bg-white/5'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Drag & Drop Image</h3>
              <p className="text-slate-400 mb-6 text-sm">Supports JPG, PNG, WEBP (Max 10MB)</p>
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                Browse Files
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="preview-zone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              {!isAnalyzing && (
                <button
                  onClick={clearFile}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full backdrop-blur-md transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="relative rounded-xl overflow-hidden bg-black/50 aspect-video flex items-center justify-center">
                {isAnalyzing ? (
                  <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div className="relative w-20 h-20 mb-6">
                      <div className="absolute inset-0 border-4 border-brand-orange/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-brand-orange rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-xl font-medium text-white mb-2 animate-pulse">Running Diagnostic AI...</p>
                    <p className="text-slate-400 text-sm">Consulting Knowledge Base & Generating Explanation</p>
                  </div>
                ) : null}
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Issue Category</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50 appearance-none"
                    >
                      <option value="building" className="bg-brand-dark">Building Damage</option>
                      <option value="road" className="bg-brand-dark">Road Issue / Pothole</option>
                      <option value="infrastructure" className="bg-brand-dark">General Infrastructure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Area / Location</label>
                    <input 
                      type="text"
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="e.g., Chennai, T. Nagar"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Optional Description</label>
                    <input 
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g., Deep pothole near crosswalk"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2 bg-brand-orange/20 rounded-lg">
                      <FileImage className="w-6 h-6 text-brand-orange" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-white truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button 
                    onClick={onAnalyze} 
                    disabled={isAnalyzing}
                    className="min-w-[160px]"
                  >
                    Analyze Issue
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
};
