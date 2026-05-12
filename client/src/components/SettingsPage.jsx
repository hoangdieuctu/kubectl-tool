import { useState } from 'react';
import { saveSettings } from '../api';
import { Settings, FolderOpen, Check } from 'lucide-react';

export default function SettingsPage({ settings, onSaved }) {
  const [dir, setDir] = useState(settings?.kubeconfigDir || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await saveSettings({ kubeconfigDir: dir });
      if (updated.error) throw new Error(updated.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-16 px-6">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={22} className="text-violet-500 dark:text-violet-400" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Kubeconfig directory
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={dir}
                onChange={e => setDir(e.target.value)}
                placeholder="/app/configs"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saved ? <Check size={16} /> : null}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Path inside the container. Mount your kubeconfig folder here via Docker volume.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </form>

      <div className="mt-10 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Docker run example</p>
        <code className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
          docker run -v ~/my-configs:/app/configs -p 3008:3008 kubectl-tool
        </code>
      </div>
    </div>
  );
}
