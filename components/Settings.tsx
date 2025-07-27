
import React, { useState, useRef, useEffect } from 'react';
import { uploadData, LogCallback } from '../services/uploadService';
import Card from './Card';
import ConsolidateTool from './ConsolidateTool';
import DuplicateSacFinder from './DuplicateSacFinder';
import type { SAC } from '../types';

interface SettingsProps {
  allSacs: SAC[];
}

const Settings: React.FC<SettingsProps> = ({ allSacs }) => {
  const [uploaderEmail, setUploaderEmail] = useState('');
  const [uploaderPassword, setUploaderPassword] = useState('');
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [logs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDataFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!dataFile || !uploaderEmail || !uploaderPassword) {
      setError("Please fill in all fields and select a data.json file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setLogs([]);

    const logCallback: LogCallback = (message) => {
      setLogs(prev => [...prev, message]);
    };

    try {
      const fileContent = await dataFile.text();
      const jsonData = JSON.parse(fileContent);
      await uploadData(jsonData, uploaderEmail, uploaderPassword, logCallback);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      // The service already logs the error, so no need to call logCallback here
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="card-title">Upload Data to PocketBase</h3>
        <p className="mt-1 mb-4 text-base-content/70">
          This utility allows an administrator to upload a `data.json` file containing all SAC and Test information directly to the PocketBase backend. This will create new records and update existing ones.
        </p>
        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">1. Select `data.json` file</span>
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">2. Enter Uploader Credentials</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Uploader Email"
                value={uploaderEmail}
                onChange={(e) => setUploaderEmail(e.target.value)}
                className="input input-bordered"
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Uploader Password"
                value={uploaderPassword}
                onChange={(e) => setUploaderPassword(e.target.value)}
                className="input input-bordered"
                autoComplete="current-password"
              />
            </div>
          </div>
          
          <div className="card-actions justify-end">
            <button
              onClick={handleUpload}
              disabled={isUploading || !dataFile || !uploaderEmail || !uploaderPassword}
              className={`btn btn-primary ${isUploading ? 'btn-disabled' : ''}`}
            >
              {isUploading && <span className="loading loading-spinner"></span>}
              {isUploading ? 'Uploading...' : 'Start Upload'}
            </button>
          </div>
        </div>
      </Card>
      
      {error && !isUploading && (
        <div role="alert" className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {logs.length > 0 && (
         <Card>
            <h4 className="card-title">Upload Log</h4>
            <pre className="mt-2 p-4 bg-base-300 rounded-box text-sm whitespace-pre-wrap overflow-x-auto h-64">
              {logs.join('\n')}
              <div ref={logsEndRef} />
            </pre>
         </Card>
      )}

      <div className="divider"></div>

      <ConsolidateTool
        uploaderEmail={uploaderEmail}
        uploaderPassword={uploaderPassword}
      />

      <div className="divider"></div>

      <DuplicateSacFinder allSacs={allSacs} />
    </div>
  );
};

export default Settings;
