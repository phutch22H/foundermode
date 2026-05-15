import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ProductContext() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [doc, setDoc] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    api.getContext(id)
      .then(data => {
        setProductName(data.name);
        setDoc(data.context_doc);
        setOriginal(data.context_doc);
      })
      .catch(() => navigate('/products'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [doc]);

  const isDirty = doc !== original;

  async function handleSave() {
    if (!id || !isDirty) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateContext(id, doc);
      setOriginal(updated.context_doc);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Cmd/Ctrl+S to save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/products/${id}`)}
          className="text-neutral-600 hover:text-neutral-300 text-sm transition-colors"
        >
          &larr; {productName}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-100">Context</h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            CLAUDE.md — read by Claude Code at the start of each session
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-400 font-medium">Saved</span>}
          {isDirty && !saved && <span className="text-xs text-neutral-600">Unsaved changes</span>}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 bg-neutral-950/50">
          <span className="text-xs font-mono text-neutral-500">CLAUDE.md</span>
          <span className="text-xs text-neutral-700">·</span>
          <span className="text-xs text-neutral-600">Markdown</span>
          <span className="ml-auto text-xs text-neutral-700">⌘S to save</span>
        </div>
        <textarea
          ref={textareaRef}
          value={doc}
          onChange={e => setDoc(e.target.value)}
          spellCheck={false}
          placeholder={`# ${productName}\n\n## Overview\nDescribe this product...\n\n## Tech Stack\nKey technologies...\n\n## Current State\nWhere things stand...\n\n## Session Log\n_Sessions will be appended here automatically._`}
          className="w-full p-6 text-sm font-mono text-neutral-300 bg-transparent leading-relaxed resize-none focus:outline-none min-h-[600px] placeholder-neutral-700"
          style={{ height: 'auto' }}
        />
      </div>

      <p className="text-xs text-neutral-700 mt-3 text-center">
        This document is automatically updated at the end of each Claude Code session.
        Edit freely — your changes will be preserved and appended to.
      </p>
    </div>
  );
}
