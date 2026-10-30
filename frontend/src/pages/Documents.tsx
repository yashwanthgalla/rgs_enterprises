import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Search,
  Upload,
  Download,
  Trash2,
  FileText,
  Building,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { documentApi, godownApi } from '../services/api';
import { DocumentItem, Godown } from '../types';

export const Documents: React.FC = () => {
  const { success, error } = useToast();

  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Upload Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    documentType: 'LEASE_AGREEMENT',
    godownId: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const [dRes, gRes] = await Promise.all([
        documentApi.getAll({ size: 100 }),
        godownApi.getAllList().catch(() => godownApi.getAll(0, 100)),
      ]);

      const docList = Array.isArray(dRes) ? dRes : (dRes as any)?.content || [];
      const gList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setDocs(docList);
      setGodowns(gList);
    } catch (err: any) {
      error('Failed to load documents: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !uploadData.title) {
      error('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadData.title);
      formData.append('documentType', uploadData.documentType);
      if (uploadData.godownId) {
        formData.append('godownId', uploadData.godownId);
      }

      await documentApi.upload(formData);
      success('Document securely uploaded to vault');
      setIsModalOpen(false);
      setFile(null);
      fetchDocs();
    } catch (err: any) {
      error('Upload failed: ' + (err.message || 'Error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentApi.delete(id);
      success('Document removed');
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      error('Failed to delete document: ' + err.message);
    }
  };

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.godownName && d.godownName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || d.documentType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Encrypted Document Vault
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Store lease contracts, property tax receipts, NOCs, and municipal approvals
          </p>
        </div>

        <Button
          onClick={() => {
            setUploadData({
              title: '',
              documentType: 'LEASE_AGREEMENT',
              godownId: '',
            });
            setFile(null);
            setIsModalOpen(true);
          }}
          icon={<Upload className="w-4 h-4" />}
          className="rounded-xl shadow-apple-sm"
        >
          Upload Document
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by title, filename, or godown..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="ALL">All Categories</option>
          <option value="LEASE_AGREEMENT">Lease Agreement</option>
          <option value="TAX_RECEIPT">Tax Receipt</option>
          <option value="UTILITY_BILL">Utility Bill</option>
          <option value="INSURANCE">Insurance Policy</option>
          <option value="IDENTITY">KYC / Identity</option>
          <option value="OTHER">Other Documents</option>
        </Select>
      </div>

      {/* Documents Table */}
      <Card className="p-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Document Title</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Associated Godown</th>
                <th className="py-3 px-3">Uploaded Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Accessing document vault...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-apple-accent/10 text-apple-accent">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{doc.title}</p>
                          <p className="text-[11px] text-gray-400">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant="accent" size="sm">
                        {doc.documentType}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-gray-600 dark:text-gray-300">
                      {doc.godownName || (doc.godownId ? `Godown #${doc.godownId}` : 'Portfolio General')}
                    </td>
                    <td className="py-3.5 px-3 text-gray-400">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-apple-accent"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Legal Document"
        description="Attach a lease agreement, tax receipt, or inspection file."
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <FormField label="Document Title" required>
            <Input
              placeholder="e.g. Reliance Retail 3-Year Master Lease 2026"
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Document Type">
              <Select
                value={uploadData.documentType}
                onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
              >
                <option value="LEASE_AGREEMENT">Lease Agreement</option>
                <option value="TAX_RECEIPT">Property Tax Receipt</option>
                <option value="UTILITY_BILL">Electricity / Water Bill</option>
                <option value="INSURANCE">Insurance Policy</option>
                <option value="IDENTITY">Tenant KYC / ID</option>
                <option value="OTHER">Other Document</option>
              </Select>
            </FormField>

            <FormField label="Godown Facility">
              <Select
                value={uploadData.godownId}
                onChange={(e) => setUploadData({ ...uploadData, godownId: e.target.value })}
              >
                <option value="">General Portfolio</option>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Choose File" required>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-apple-accent file:text-white hover:file:bg-apple-accentHover cursor-pointer"
              required
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={uploading}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

