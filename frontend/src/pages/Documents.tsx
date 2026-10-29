import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  FileText,
  FileCode,
  Image,
  FileSpreadsheet,
  File,
  Search,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { DocumentItem, DocumentType, Godown, ApiResponse, PagedResponse } from '../types';
import { formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';

export const Documents: React.FC = () => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedGodownId, setSelectedGodownId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadGodownId, setUploadGodownId] = useState<number | ''>('');
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('LEASE_AGREEMENT');
  const [uploadDescription, setUploadDescription] = useState('');

  // Fetch Godowns
  const { data: godowns } = useQuery({
    queryKey: ['activeGodownsDropdown'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Godown[]>>('/godowns/all');
      return res.data.data;
    },
  });

  // Fetch Documents
  const { data: docData, isLoading } = useQuery({
    queryKey: ['documents', selectedType, selectedGodownId, searchQuery, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        size: 15,
      };
      if (selectedType !== 'ALL') params.documentType = selectedType;
      if (selectedGodownId !== 'ALL') params.godownId = selectedGodownId;
      if (searchQuery) params.query = searchQuery;

      const res = await apiClient.get<ApiResponse<PagedResponse<DocumentItem>>>('/documents', { params });
      return res.data.data;
    },
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('File uploaded to vault successfully');
      setIsUploadOpen(false);
      setFile(null);
      setUploadDescription('');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Upload failed');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Document deleted');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        toastError('File size exceeds the 5MB limit');
        return;
      }
      setFile(selected);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toastError('Please choose a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (uploadGodownId) formData.append('godownId', String(uploadGodownId));
    formData.append('documentType', uploadDocType);
    if (uploadDescription) formData.append('description', uploadDescription);

    uploadMutation.mutate(formData);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg'))
      return <Image className="w-5 h-5 text-sky-500" />;
    if (fileType.includes('sheet') || fileType.includes('xls') || fileType.includes('csv'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    return <File className="w-5 h-5 text-apple-secondary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Document Vault
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Securely store and retrieve lease deeds, utility invoices, and facility inspection photos.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsUploadOpen(true)}
          icon={<Upload className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SegmentedControl
          value={selectedType}
          onChange={(val) => {
            setSelectedType(val);
            setPage(0);
          }}
          options={[
            { value: 'ALL', label: 'All Files' },
            { value: 'LEASE_AGREEMENT', label: 'Lease Deeds' },
            { value: 'BILL_INVOICE', label: 'Invoices' },
            { value: 'PROPERTY_TAX', label: 'Taxes' },
            { value: 'INSPECTION_REPORT', label: 'Inspections' },
          ]}
        />

        <div className="flex items-center gap-2">
          <select
            value={selectedGodownId}
            onChange={(e) => {
              setSelectedGodownId(e.target.value);
              setPage(0);
            }}
            className="px-3.5 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-xs text-apple-text dark:text-apple-darkText focus:outline-none focus:ring-2 focus:ring-apple-accent/20"
          >
            <option value="ALL">All Warehouses</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-black/5 dark:bg-white/5 rounded-apple-lg animate-pulse" />
          ))}
        </div>
      ) : (docData?.content || []).length === 0 ? (
        <Card className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-apple-secondary opacity-40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-apple-text dark:text-apple-darkText">
            Vault is empty
          </h3>
          <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary max-w-sm mx-auto mt-1 mb-6">
            Upload lease deeds, utility receipts, or compliance documents to this portfolio.
          </p>
          <Button size="sm" onClick={() => setIsUploadOpen(true)} icon={<Upload className="w-3.5 h-3.5" />}>
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(docData?.content || []).map((doc) => (
            <Card
              key={doc.id}
              className="p-4 hover:shadow-apple-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-apple-bg dark:bg-white/[0.06] shrink-0">
                      {getFileIcon(doc.fileType)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-apple-text dark:text-apple-darkText truncate">
                        {doc.fileName}
                      </h4>
                      <p className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary truncate">
                        {doc.godownName}
                      </p>
                    </div>
                  </div>
                  <Badge variant="neutral" className="text-[9px] uppercase shrink-0">
                    {doc.documentType.replace('_', ' ')}
                  </Badge>
                </div>

                {doc.description && (
                  <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary my-2 line-clamp-2">
                    {doc.description}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-[11px] text-apple-secondary">
                  {(doc.fileSize / 1024).toFixed(0)} KB • {formatDate(doc.createdAt)}
                </span>
                <div className="flex items-center gap-1">
                  <a
                    href={`http://localhost:8080/api/v1/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-apple-accent hover:bg-apple-accent/10 transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete document?')) deleteMutation.mutate(doc.id);
                    }}
                    className="p-1.5 rounded-lg text-apple-secondary hover:text-apple-danger hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Sheet */}
      <Sheet
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Document to Vault"
        description="Supported: PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, XLSX (Max 5MB)"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-apple-border dark:border-apple-darkBorder rounded-2xl p-6 text-center hover:border-apple-accent/50 transition-colors bg-apple-bg/50 dark:bg-white/[0.02]">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-apple-secondary mb-2" />
              <span className="text-xs font-semibold text-apple-text dark:text-apple-darkText">
                {file ? file.name : 'Click to select document'}
              </span>
              <span className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Up to 5MB file size'}
              </span>
            </label>
          </div>

          <FormField
            label="Associate Warehouse (Optional)"
            as="select"
            value={uploadGodownId}
            onChange={(e) => setUploadGodownId(Number(e.target.value))}
          >
            <option value="">General Portfolio Document</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </FormField>

          <FormField
            label="Document Classification"
            as="select"
            required
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
            options={[
              { value: 'LEASE_AGREEMENT', label: 'Lease Agreement / Deed' },
              { value: 'BILL_INVOICE', label: 'Bill / Utility Invoice' },
              { value: 'PROPERTY_TAX', label: 'Property Tax Receipt' },
              { value: 'INSPECTION_REPORT', label: 'Inspection / Audit Report' },
              { value: 'OTHER', label: 'Other Document' },
            ]}
          />

          <FormField
            label="Description / Purpose"
            as="textarea"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            placeholder="e.g. 2-year registered lease agreement signed with Flipkart India..."
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={uploadMutation.isPending}>
              Upload Document
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

