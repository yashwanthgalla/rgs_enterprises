import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Mail,
  Send,
  Lock,
  RotateCcw,
  Eye,
  FileEdit,
  Sparkles,
  ArrowLeft,
  Paperclip,
  Image as ImageIcon,
  FolderUp,
  Link2,
  Smile,
  PenTool,
  MoreVertical,
  Type,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading,
  List,
  ListOrdered,
  Quote,
  X,
  FileText,
  ShieldAlert,
  Check,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { mailingApi } from '../services/api';

interface AttachmentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Base64
  isImage: boolean;
  folderName?: string;
  previewUrl?: string;
}

const EMOJI_LIST = ['😊', '👍', '🤝', '📦', '🏢', '📑', '✉️', '⚠️', '✅', '🕒', '💼', '📞', '📍', '🔒', '🏷️', '📢'];

const SMART_TEMPLATES = [
  {
    title: 'Formal Warehouse Announcement',
    subject: 'Official Notice: Warehouse Facility Inspection Schedule',
    body: 'Dear Client / Partner,\n\nPlease be advised that our management team will conduct a comprehensive facility and safety inspection of the godown premises in the coming week.\n\nKindly ensure relevant on-site supervisors are available during this scheduled visit.\n\nWarm regards,\nSai Babu P',
  },
  {
    title: 'Urgent Payment / Due Notice',
    subject: 'Monthly Rental Invoice & Account Statement — RGS Enterprises',
    body: 'Dear Tenant,\n\nWe would like to remind you that your monthly lease payment is due for the current cycle. Please review your account statement and clear any pending dues at your earliest convenience.\n\nIf payment has already been processed, please disregard this notice.\n\nSincerely,\nSai Babu P',
  },
  {
    title: 'Operations & Maintenance Memo',
    subject: 'Operational Notice: Scheduled Maintenance & Security Review',
    body: 'Dear Team,\n\nThis is an official communication regarding our upcoming periodic infrastructure maintenance and CCTV surveillance audit.\n\nPlease coordinate with your local godown supervisors to ensure smooth operations.\n\nBest regards,\nSai Babu P',
  },
  {
    title: 'Polite Partnership Inquiry',
    subject: 'Inquiry Regarding Commercial Warehouse Allocation',
    body: 'Dear Business Partner,\n\nThank you for reaching out regarding warehouse space availability at RGS Enterprises. We would be pleased to schedule a discussion to review your capacity requirements and logistics timeline.\n\nPlease let us know your preferred meeting schedule.\n\nBest regards,\nSai Babu P',
  },
];

export const Mailing: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // User authorization check
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userName = (user?.username || '').toLowerCase().trim();
  const userFullName = (user?.fullName || '').toLowerCase().trim();

  const isSaiBabu =
    userEmail === 'rgsenterprise2026@gmail.com' ||
    userName === 'saibabu' ||
    userName === 'sai babu p' ||
    userFullName.includes('sai babu');

  // Form states
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');

  // Toolbar & interactive states
  const [showFormatting, setShowFormatting] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSmartTemplates, setShowSmartTemplates] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Email flags
  const [isConfidential, setIsConfidential] = useState(false);
  const [hasSignature, setHasSignature] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Refs for DOM inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // TipTap WYSIWYG Editor Instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#0071E3] underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Compose your executive message here...',
      }),
    ],
    content: message,
    onUpdate: ({ editor }) => {
      setMessage(editor.getHTML());
    },
  });

  // Utility to format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Convert File to Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Insert emoji into TipTap editor
  const insertEmoji = (emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
    } else {
      setMessage((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Apply Smart Template into TipTap editor
  const applySmartTemplate = (tmpl: { title: string; subject: string; body: string }) => {
    setSubject(tmpl.subject);
    const paragraphs = tmpl.body
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    if (editor) {
      editor.commands.setContent(paragraphs);
    }
    setMessage(paragraphs);
    setShowSmartTemplates(false);
    success(`Applied "${tmpl.title}" template.`);
  };

  // Handle generic files attachment (Paperclip icon)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newItems: AttachmentItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await readFileAsBase64(file);
        const isImg = file.type.startsWith('image/');
        newItems.push({
          id: `${Date.now()}-${i}-${file.name}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          content: base64,
          isImage: isImg,
          previewUrl: isImg ? base64 : undefined,
        });
      }
      setAttachments((prev) => [...prev, ...newItems]);
      success(`Added ${newItems.length} file(s) to attachments.`);
    } catch {
      error('Failed to process one or more files.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle picture / photo upload (Image icon)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newItems: AttachmentItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await readFileAsBase64(file);
        newItems.push({
          id: `img-${Date.now()}-${i}-${file.name}`,
          name: file.name,
          type: file.type || 'image/jpeg',
          size: file.size,
          content: base64,
          isImage: true,
          previewUrl: base64,
        });
      }
      setAttachments((prev) => [...prev, ...newItems]);
      success(`Added ${newItems.length} picture(s) with live preview.`);
    } catch {
      error('Failed to process image uploads.');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Handle entire folder upload (Drive / Folder icon)
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newItems: AttachmentItem[] = [];
      let detectedFolder = 'Folder';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = (file as any).webkitRelativePath || file.name;
        const parts = relativePath.split('/');
        if (parts.length > 1) {
          detectedFolder = parts[0];
        }
        const base64 = await readFileAsBase64(file);
        const isImg = file.type.startsWith('image/');

        newItems.push({
          id: `fld-${Date.now()}-${i}-${file.name}`,
          name: relativePath,
          type: file.type || 'application/octet-stream',
          size: file.size,
          content: base64,
          isImage: isImg,
          folderName: detectedFolder,
          previewUrl: isImg ? base64 : undefined,
        });
      }

      setAttachments((prev) => [...prev, ...newItems]);
      success(`Uploaded folder "${detectedFolder}" containing ${newItems.length} file(s).`);
    } catch {
      error('Failed to upload directory contents.');
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Remove single attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Clear all form fields
  const handleClear = () => {
    setTo('');
    setCc('');
    setSubject('');
    setMessage('');
    if (editor) {
      editor.commands.clearContent();
    }
    setAttachments([]);
    setIsConfidential(false);
    setIsUrgent(false);
    setActiveTab('compose');
  };

  // Insert Link confirmation
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const href = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const text = linkText.trim() || linkUrl.trim();

    if (editor) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href })
        .insertContent(text)
        .run();
    }
    setLinkText('');
    setLinkUrl('');
    setShowLinkModal(false);
  };

  // Dispatch email through backend
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!to.trim() || !to.includes('@') || !to.includes('.')) {
      error('Please enter a valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      error('Please enter an email subject.');
      return;
    }

    const currentContent = editor ? editor.getHTML() : message;
    const isContentEmpty = !editor || editor.isEmpty || !currentContent || currentContent === '<p></p>';

    if (isContentEmpty) {
      error('Please write your email message content.');
      return;
    }

    setIsSending(true);
    try {
      await mailingApi.send({
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        message: currentContent,
        confidential: isConfidential,
        signature: hasSignature,
        urgent: isUrgent,
        attachments: attachments.map((a) => ({
          name: a.name,
          type: a.type,
          size: a.size,
          content: a.content,
        })),
      });

      success('Email Sent');
      handleClear();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to dispatch email. Please check your network connection and try again.';
      error(msg);
    } finally {
      setIsSending(false);
    }
  };

  // Locked View for non-authorized users
  if (!isSaiBabu) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fadeIn">
        <Card className="max-w-sm w-full p-8 text-center rounded-[20px] shadow-apple-lg border border-black/[0.08] dark:border-white/[0.08]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-apple-sm">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
            Available soon
          </h2>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            This section is currently locked.
          </p>

          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full rounded-xl"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Calculate total attachment size
  const totalAttachmentSize = attachments.reduce((sum, item) => sum + item.size, 0);
  const imageAttachments = attachments.filter((a) => a.isImage);
  const documentAttachments = attachments.filter((a) => !a.isImage);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn pb-12">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        multiple
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderUpload}
        className="hidden"
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Executive Mailing Terminal
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Service Active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Official communications for <strong>Sai Babu P</strong>. Direct dispatch with working file, photo & folder attachments.
          </p>
        </div>

        {/* Tab switcher: Compose / Preview */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compose'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-apple-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            Compose
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-apple-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Preview
            {attachments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-apple-accent text-white text-[10px] rounded-full">
                {attachments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <Card className="p-6 rounded-[20px] shadow-apple-sm border border-black/[0.06] dark:border-white/[0.08]">
        {activeTab === 'compose' ? (
          <form onSubmit={handleSend} className="space-y-4">
            {/* Sender Identity Card */}
            <div className="p-3.5 rounded-2xl bg-apple-accent/5 border border-apple-accent/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs select-none">
                  SP
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Sai Babu P <span className="font-normal text-gray-500">‹nagayashwanthgalla@outlook.com›</span>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Managing Director • RGS Enterprises
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                    URGENT
                  </span>
                )}
                {isConfidential && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    CONFIDENTIAL
                  </span>
                )}
              </div>
            </div>

            {/* Recipient Field + CC Toggle */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="To: recipient@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="pl-9 pr-14 font-medium"
                  required
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="absolute right-3 top-2.5 text-xs font-semibold text-apple-accent hover:underline px-1 py-0.5"
                >
                  {showCc ? 'Hide CC' : 'CC'}
                </button>
              </div>

              {/* CC Field (expandable) */}
              {showCc && (
                <div className="relative animate-fadeIn">
                  <Input
                    type="text"
                    placeholder="Cc: manager@example.com, accountant@example.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="pl-9 text-xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Subject Field */}
            <div>
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="font-semibold text-sm"
                required
              />
            </div>

            {/* TipTap WYSIWYG Formatting Sub-Bar (Real Rich Text Controls) */}
            {showFormatting && editor && (
              <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 animate-fadeIn">
                {/* Bold */}
                <button
                  type="button"
                  title="Bold (Ctrl+B)"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('bold')
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  title="Italic (Ctrl+I)"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('italic')
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  title="Underline (Ctrl+U)"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('underline')
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <UnderlineIcon className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

                {/* Heading */}
                <button
                  type="button"
                  title="Heading"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('heading', { level: 3 })
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Heading className="w-3.5 h-3.5" />
                </button>

                {/* Bullet List */}
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('bulletList')
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('orderedList')
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                {/* Blockquote */}
                <button
                  type="button"
                  title="Blockquote"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    editor.isActive('blockquote')
                      ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent font-bold'
                      : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TipTap Rich Text Editor Container */}
            <div className="relative rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-gray-900 p-3.5 min-h-[220px] focus-within:ring-2 focus-within:ring-apple-accent/20 focus-within:border-apple-accent transition-all">
              <EditorContent editor={editor} />

              {/* Confidential Badge Indicator inside Compose */}
              {isConfidential && (
                <div className="absolute top-2 right-3 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldAlert className="w-3 h-3" /> Confidential
                </div>
              )}
            </div>

            {/* GMAIL-STYLE ACTION TOOLBAR (Matching user's toolbar) */}
            <div className="relative flex items-center gap-1 py-1 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              {/* 1. Aa (Formatting) */}
              <button
                type="button"
                onClick={() => setShowFormatting(!showFormatting)}
                className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors ${
                  showFormatting ? 'bg-slate-200 dark:bg-slate-700 text-apple-accent' : ''
                }`}
                title="Formatting options (Aa)"
              >
                <Type className="w-4 h-4 font-bold" />
              </button>

              {/* 2. Magic Wand (AI Polish / Smart Templates) */}
              <button
                type="button"
                onClick={() => {
                  setShowSmartTemplates(!showSmartTemplates);
                  setShowEmojiPicker(false);
                  setShowMoreMenu(false);
                }}
                className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors ${
                  showSmartTemplates ? 'bg-slate-200 dark:bg-slate-700 text-purple-600' : ''
                }`}
                title="Smart compose templates & AI tone polish"
              >
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </button>

              {/* 3. Paperclip (Attach Files) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                title="Attach files (PDF, DOCX, XLSX, ZIP, etc.)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* 4. Link (Insert Link) */}
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                title="Insert link"
              >
                <Link2 className="w-4 h-4" />
              </button>

              {/* 5. Emoji (Insert Emoji) */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowSmartTemplates(false);
                  setShowMoreMenu(false);
                }}
                className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors ${
                  showEmojiPicker ? 'bg-slate-200 dark:bg-slate-700 text-amber-500' : ''
                }`}
                title="Insert emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* 6. Drive / Folder (Upload entire Folder) */}
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors relative"
                title="Upload entire Folder (directory picker)"
              >
                <FolderUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>

              {/* 7. Image / Picture (Upload pics) */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
                title="Insert pictures / photos"
              >
                <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>

              {/* 8. Lock with Clock (Confidential Mode) */}
              <button
                type="button"
                onClick={() => {
                  setIsConfidential(!isConfidential);
                  success(
                    !isConfidential
                      ? 'Confidential Mode Enabled: Privileged communication banner active.'
                      : 'Confidential Mode Disabled.'
                  );
                }}
                className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors ${
                  isConfidential ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 font-bold' : ''
                }`}
                title={isConfidential ? 'Confidential mode ON' : 'Toggle confidential mode'}
              >
                <Lock className={`w-4 h-4 ${isConfidential ? 'text-amber-600 dark:text-amber-400' : ''}`} />
              </button>

              {/* 9. Pen / Signature (Executive Signature Toggle) */}
              <button
                type="button"
                onClick={() => {
                  setHasSignature(!hasSignature);
                  success(
                    !hasSignature
                      ? 'Executive signature enabled.'
                      : 'Executive signature disabled.'
                  );
                }}
                className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors ${
                  hasSignature ? 'bg-blue-100 dark:bg-blue-950/60 text-apple-accent font-bold' : ''
                }`}
                title={hasSignature ? 'Signature attached' : 'Attach executive signature'}
              >
                <PenTool className={`w-4 h-4 ${hasSignature ? 'text-apple-accent' : ''}`} />
              </button>

              {/* 10. More Options */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu);
                  setShowSmartTemplates(false);
                  setShowEmojiPicker(false);
                }}
                className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors ml-auto ${
                  showMoreMenu ? 'bg-slate-200 dark:bg-slate-700' : ''
                }`}
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown 1: Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute left-28 bottom-12 z-30 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-8 gap-1.5 animate-fadeIn">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown 2: Smart Compose & AI Tone Polish */}
              {showSmartTemplates && (
                <div className="absolute left-10 bottom-12 z-30 w-72 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 space-y-1 animate-fadeIn">
                  <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Executive Templates:
                  </p>
                  {SMART_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.title}
                      type="button"
                      onClick={() => applySmartTemplate(tmpl)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-apple-accent/10 hover:text-apple-accent transition-colors"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown 3: More Options Menu */}
              {showMoreMenu && (
                <div className="absolute right-2 bottom-12 z-30 w-56 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 space-y-1 animate-fadeIn text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUrgent(!isUrgent);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span>High Priority (Urgent)</span>
                    {isUrgent && <Check className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCc(!showCc);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <span>{showCc ? 'Hide CC field' : 'Show CC field'}</span>
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      handleClear();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Discard draft
                  </button>
                </div>
              )}
            </div>

            {/* Insert Link Inline Popover Modal */}
            {showLinkModal && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Insert Hyperlink
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Link Text (e.g. Godown Portal)"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="URL (e.g. https://...)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLinkModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleInsertLink}>
                    Insert Link
                  </Button>
                </div>
              </div>
            )}

            {/* UPLOADED PICTURES PREVIEW GALLERY */}
            {imageAttachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Uploaded Pictures ({imageAttachments.length}):
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Will be attached in high quality
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {imageAttachments.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square shadow-sm"
                    >
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeAttachment(img.id)}
                          className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                          title="Remove picture"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white truncate">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UPLOADED FILES & FOLDERS LIST */}
            {documentAttachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    Attached Files & Folders ({documentAttachments.length}):
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Total: {formatSize(totalAttachmentSize)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documentAttachments.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                    >
                      {item.folderName ? (
                        <FolderUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-apple-accent shrink-0" />
                      )}
                      <span className="max-w-[180px] truncate font-medium" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400">({formatSize(item.size)})</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isSending}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Clear Form
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('preview')}
                  disabled={!subject && !message}
                  icon={<Eye className="w-3.5 h-3.5" />}
                >
                  Preview
                </Button>
                <Button
                  type="submit"
                  loading={isSending}
                  icon={<Send className="w-4 h-4" />}
                  className="rounded-xl shadow-apple-sm"
                >
                  {isSending ? 'Dispatching…' : 'Send Email'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          /* Live Executive Preview */
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-900 border border-black/[0.08] dark:border-white/[0.08] max-w-xl mx-auto shadow-sm font-sans">
              {/* Header */}
              <div className="border-b-2 border-apple-accent pb-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-1 bg-apple-accent text-white font-bold text-xs rounded-lg tracking-tight">
                    RGS ENTERPRISES
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                    Official Executive Communication
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-400">
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Confidential Badge in Preview */}
              {isConfidential && (
                <div className="mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-center">
                  <p className="text-[11px] font-bold text-red-700 dark:text-red-300 tracking-wider uppercase">
                    🔒 Privileged & Strictly Confidential Communication
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="space-y-1 mb-4 text-xs text-gray-600 dark:text-gray-400">
                <p>
                  <strong>To:</strong>{' '}
                  {to || <span className="italic text-gray-400">(Recipient email)</span>}
                </p>
                {cc && (
                  <p>
                    <strong>Cc:</strong> {cc}
                  </p>
                )}
                <p>
                  <strong>From:</strong> Sai Babu P &lt;nagayashwanthgalla@outlook.com&gt;
                </p>
                <p className="flex items-center gap-2">
                  <strong>Subject:</strong>{' '}
                  <span className="font-semibold">{subject || <span className="italic text-gray-400 font-normal">(No subject)</span>}</span>
                  {isUrgent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                      URGENT
                    </span>
                  )}
                </p>
              </div>

              {/* Message Rendered as Real HTML */}
              <div
                className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed min-h-[120px] mb-6 prose dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[#0071E3] [&_blockquote]:pl-3 [&_blockquote]:italic [&_strong]:font-bold [&_u]:underline"
                dangerouslySetInnerHTML={{
                  __html: message || '<p class="italic text-gray-400">Message content appears here...</p>',
                }}
              />

              {/* Attached Pictures in Preview */}
              {imageAttachments.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Attached Pictures ({imageAttachments.length}):
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {imageAttachments.map((img) => (
                      <div
                        key={img.id}
                        className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video"
                      >
                        <img
                          src={img.previewUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Files & Folders in Preview */}
              {documentAttachments.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs">
                  <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Attached Documents ({documentAttachments.length}):
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-500">
                    {documentAttachments.map((doc) => (
                      <li key={doc.id}>
                        {doc.name} ({formatSize(doc.size)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Executive Signature in Preview (Logo beside Name) */}
              {hasSignature && (
                <>
                  <hr className="border-t border-black/[0.06] dark:border-white/[0.08] my-4" />
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-white p-1 shadow-apple-sm flex items-center justify-center shrink-0">
                      <img
                        src="/2.jpeg"
                        alt="RGS Enterprises Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Sai Babu P</p>
                      <p className="text-[11px] font-semibold text-apple-accent">
                        Managing Director • RGS Enterprises
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Warehouse & Facility Management Operations
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('compose')}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Editing
              </Button>
              <Button
                type="button"
                onClick={() => handleSend()}
                loading={isSending}
                icon={<Send className="w-4 h-4" />}
              >
                {isSending ? 'Dispatching…' : 'Confirm & Send Email'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
