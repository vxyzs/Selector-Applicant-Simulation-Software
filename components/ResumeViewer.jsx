'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Spinner, Link, Chip } from '@nextui-org/react';

/**
 * ResumeViewer component displays resume files inline (for PDFs)
 * or presents a clean details card with a download option (for DOC/DOCX).
 * 
 * @param {object} props
 * @param {string} props.resumeUrl - The Cloudinary secure_url.
 * @param {object} props.resumeMetadata - The database metadata.
 */
export default function ResumeViewer({ resumeUrl, resumeMetadata }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!resumeUrl) {
    return (
      <Card className="border-dashed border-2 border-gray-200 shadow-none">
        <CardBody className="py-8 text-center text-gray-500">
          <p className="font-semibold">No resume uploaded</p>
          <p className="text-xs text-gray-400 mt-1">Please upload a resume (PDF, DOC, or DOCX) to get started.</p>
        </CardBody>
      </Card>
    );
  }

  // Determine file type
  const getFileType = () => {
    if (resumeMetadata && resumeMetadata.fileType) {
      return resumeMetadata.fileType.toLowerCase();
    }
    const parts = resumeUrl.split('.');
    const ext = parts[parts.length - 1].split('?')[0];
    return ext ? ext.toLowerCase() : '';
  };

  const fileType = getFileType();
  const isPdf = fileType === 'pdf';
  const isWord = fileType === 'doc' || fileType === 'docx';
  
  const originalName = (resumeMetadata && resumeMetadata.originalFilename) || 'Resume';
  const uploadDate = resumeMetadata && resumeMetadata.uploadedAt 
    ? new Date(resumeMetadata.uploadedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Info Card */}
      <Card className="border border-gray-150 shadow-sm bg-gray-50/50 p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            {/* File Icon */}
            <div className={`p-2.5 rounded-xl text-white ${
              isPdf ? 'bg-rose-500' : isWord ? 'bg-blue-500' : 'bg-gray-500'
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-gray-800 text-sm truncate max-w-[280px] sm:max-w-md" title={originalName}>
                {originalName}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Chip size="sm" color={isPdf ? 'danger' : isWord ? 'primary' : 'default'} variant="flat" className="capitalize text-[10px] font-bold">
                  {fileType.toUpperCase()}
                </Chip>
                {uploadDate && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    Uploaded: {uploadDate}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              as={Link}
              href={resumeUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              variant="solid"
              size="sm"
              className="text-xs font-bold"
              startContent={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Download
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Preview/Details Area */}
      {isPdf ? (
        <div className="flex flex-col gap-2">
          <div className="w-full h-[600px] border border-gray-150 rounded-2xl overflow-hidden bg-gray-100 relative">
            {loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="lg" />
                  <p className="text-xs text-gray-500 font-medium">Loading PDF Preview...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-4 text-center">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold text-gray-700">Preview Failed to Load</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">Your browser or security settings blocked the embedded viewer.</p>
                <Button as={Link} href={resumeUrl} download size="sm" color="primary" variant="flat">
                  Download & View Offline
                </Button>
              </div>
            )}
            <iframe
              src={`${resumeUrl}#toolbar=1`}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => setError(true)}
              title="Resume Preview"
            />
          </div>
        </div>
      ) : (
        /* Word or Generic Document View */
        <Card className="border border-gray-150 shadow-sm">
          <CardBody className="py-12 flex flex-col items-center text-center p-6 gap-4">
            <div className={`p-4 rounded-full text-white ${
              isWord ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {isWord ? (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="max-w-md">
              <h5 className="font-bold text-gray-800 text-md">Document Preview Not Supported</h5>
              <p className="text-xs text-gray-500 mt-2">
                We cannot render Word files (.doc, .docx) directly inline. You can download the file to view it in Microsoft Word, Google Docs, or Pages.
              </p>
            </div>
            <Button
              as={Link}
              href={resumeUrl}
              download
              color="primary"
              variant="flat"
              size="md"
              className="font-bold"
              startContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Download & Open Document
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
